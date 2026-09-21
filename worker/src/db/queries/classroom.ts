import { and, desc, eq, isNull } from 'drizzle-orm'
import type { Db } from '../client.js'
import { attempts, classes, coverage, mastery, sessions, students, textbookQuestions } from '../schema/index.js'

export async function listClasses(db: Db) {
  return db.select().from(classes)
}

export async function getClassByJoinCode(db: Db, joinCode: string) {
  const [classRow] = await db.select().from(classes).where(eq(classes.joinCode, joinCode))
  if (!classRow) return null

  const roster = await db.select().from(students).where(eq(students.classId, classRow.id))
  const [activeSession] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.classId, classRow.id), isNull(sessions.endedAt)))
    .orderBy(desc(sessions.startedAt))
    .limit(1)

  return { class: classRow, students: roster, activeSessionId: activeSession?.id ?? null }
}

export async function createSession(db: Db, input: { classId: string; chapterId: string }) {
  const [session] = await db
    .insert(sessions)
    .values({ ...input, startedAt: new Date() })
    .returning()
  return session!
}

export async function endSession(db: Db, sessionId: string) {
  const [session] = await db.update(sessions).set({ endedAt: new Date() }).where(eq(sessions.id, sessionId)).returning()
  return session!
}

export async function recordTopicShown(db: Db, sessionId: string, topicId: string) {
  await db
    .insert(coverage)
    .values({ sessionId, topicId, shownAt: new Date() })
    .onConflictDoUpdate({ target: [coverage.sessionId, coverage.topicId], set: { shownAt: new Date() } })
}

export async function setCoverageDuration(db: Db, sessionId: string, topicId: string, durationS: number) {
  await db.update(coverage).set({ durationS }).where(and(eq(coverage.sessionId, sessionId), eq(coverage.topicId, topicId)))
}

export async function recordAttempt(
  db: Db,
  input: {
    sessionId: string
    studentId: string
    questionId: string
    questionTable: 'textbook_questions' | 'generated_questions'
    response: string
    correct: boolean
    score: number
    feedback: string
  },
) {
  const [attempt] = await db
    .insert(attempts)
    .values({ ...input, answeredAt: new Date() })
    .returning()
  return attempt!
}

/**
 * Rolls up this session's attempts into `mastery`, blending into any existing per-(student,
 * topic) score. Only `textbook_questions` attempts are considered — `generated_questions`
 * (Phase 7's practice bank) doesn't exist yet, so there's nothing to join against.
 */
export async function rollUpMastery(db: Db, sessionId: string) {
  const sessionAttempts = await db
    .select({ studentId: attempts.studentId, topicId: textbookQuestions.topicId, score: attempts.score })
    .from(attempts)
    .innerJoin(textbookQuestions, eq(textbookQuestions.id, attempts.questionId))
    .where(and(eq(attempts.sessionId, sessionId), eq(attempts.questionTable, 'textbook_questions')))

  const byStudentTopic = new Map<string, { studentId: string; topicId: string; scores: number[] }>()
  for (const row of sessionAttempts) {
    if (row.score === null) continue
    const key = `${row.studentId}:${row.topicId}`
    const entry = byStudentTopic.get(key) ?? { studentId: row.studentId, topicId: row.topicId, scores: [] }
    entry.scores.push(row.score)
    byStudentTopic.set(key, entry)
  }

  for (const { studentId, topicId, scores } of byStudentTopic.values()) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const [existing] = await db.select().from(mastery).where(and(eq(mastery.studentId, studentId), eq(mastery.topicId, topicId)))
    const newAttempts = (existing?.attempts ?? 0) + scores.length
    const newScore = existing ? (existing.score * existing.attempts + avgScore * scores.length) / newAttempts : avgScore

    await db
      .insert(mastery)
      .values({ studentId, topicId, score: newScore, attempts: newAttempts, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: [mastery.studentId, mastery.topicId],
        set: { score: newScore, attempts: newAttempts, lastSeen: new Date() },
      })
  }
}
