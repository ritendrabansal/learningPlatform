import { and, eq, inArray } from 'drizzle-orm'
import type { Db } from '../client.js'
import {
  attempts,
  coverage,
  generatedQuestions,
  homeworkItems,
  homeworkSets,
  homeworkSubmissions,
  keyTerms,
  mastery,
  textbookQuestions,
  topics,
} from '../schema/index.js'

// A topic counts as "weak" (IMPLEMENTATION_PLAN.md §5) if this student's rolled-up mastery score
// is below this bar, or if it was covered this session but never attempted. Not specified by the
// plan — a tunable heuristic.
const WEAK_MASTERY_THRESHOLD = 0.7

/** Weakest-first, capped to `limit`. A topic with no mastery row at all yet is treated as
 * score 0 only if it was covered this session without any attempt — a topic the student
 * already has *some* mastery signal on (even an old, high score) isn't "never attempted" in
 * the meaningful sense just because this particular session didn't re-test it. */
export async function findWeakTopics(db: Db, studentId: string, sessionId: string, limit = 3) {
  const allMasteryRows = await db.select({ topicId: mastery.topicId, score: mastery.score }).from(mastery).where(eq(mastery.studentId, studentId))
  const masteryByTopic = new Map(allMasteryRows.map((row) => [row.topicId, row.score]))

  const coveredTopics = await db.select({ topicId: coverage.topicId }).from(coverage).where(eq(coverage.sessionId, sessionId))

  const attemptedTopicRows = await db
    .select({ topicId: textbookQuestions.topicId })
    .from(attempts)
    .innerJoin(textbookQuestions, eq(textbookQuestions.id, attempts.questionId))
    .where(and(eq(attempts.sessionId, sessionId), eq(attempts.studentId, studentId), eq(attempts.questionTable, 'textbook_questions')))
  const attemptedTopicIds = new Set(attemptedTopicRows.map((r) => r.topicId))

  const scoreByTopic = new Map<string, number>()
  for (const [topicId, score] of masteryByTopic) {
    if (score < WEAK_MASTERY_THRESHOLD) scoreByTopic.set(topicId, score)
  }
  for (const row of coveredTopics) {
    if (attemptedTopicIds.has(row.topicId) || masteryByTopic.has(row.topicId)) continue
    scoreByTopic.set(row.topicId, 0)
  }

  const topicIds = [...scoreByTopic.keys()]
  if (topicIds.length === 0) return []

  const topicRows = await db.select().from(topics).where(inArray(topics.id, topicIds))
  const withScore = topicRows.map((topic) => ({ topic, score: scoreByTopic.get(topic.id)! }))
  withScore.sort((a, b) => a.score - b.score)
  return withScore.slice(0, limit)
}

export async function getKeyTermsForTopic(db: Db, topicId: string) {
  return db.select().from(keyTerms).where(eq(keyTerms.topicId, topicId))
}

/** "Unused" = not already attempted by this student, and not already assigned as homework. */
export async function findUnusedTextbookQuestions(db: Db, studentId: string, topicId: string, limit: number) {
  const attemptedIds = (
    await db
      .select({ id: attempts.questionId })
      .from(attempts)
      .where(and(eq(attempts.studentId, studentId), eq(attempts.questionTable, 'textbook_questions')))
  ).map((r) => r.id)
  const assignedIds = (
    await db
      .select({ id: homeworkItems.questionId })
      .from(homeworkItems)
      .innerJoin(homeworkSets, eq(homeworkSets.id, homeworkItems.setId))
      .where(and(eq(homeworkSets.studentId, studentId), eq(homeworkItems.questionTable, 'textbook_questions')))
  ).map((r) => r.id)
  const usedIds = new Set([...attemptedIds, ...assignedIds])

  const candidates = await db.select().from(textbookQuestions).where(eq(textbookQuestions.topicId, topicId))
  return candidates.filter((q) => !usedIds.has(q.id)).slice(0, limit)
}

export async function findApprovedGeneratedQuestions(db: Db, topicId: string, limit: number) {
  return db
    .select()
    .from(generatedQuestions)
    .where(and(eq(generatedQuestions.topicId, topicId), eq(generatedQuestions.status, 'approved')))
    .limit(limit)
}

export async function insertGeneratedQuestion(
  db: Db,
  input: { topicId: string; kind: (typeof textbookQuestions.$inferSelect)['kind']; promptMd: string; answerMd: string; difficulty: string | null; model: string; promptVersion: string },
) {
  const [question] = await db
    .insert(generatedQuestions)
    .values({ ...input, status: 'draft' })
    .returning()
  return question!
}

export async function createHomeworkSet(db: Db, input: { studentId: string; sessionId: string; dueAt: Date; model: string; promptVersion: string }) {
  const [set] = await db
    .insert(homeworkSets)
    .values({ ...input, status: 'pending' })
    .returning()
  return set!
}

export async function addHomeworkItem(
  db: Db,
  input: { setId: string; questionId: string; questionTable: 'textbook_questions' | 'generated_questions'; reason: string },
) {
  const [item] = await db.insert(homeworkItems).values(input).returning()
  return item!
}

export async function getHomeworkForStudent(db: Db, studentId: string) {
  const sets = await db.select().from(homeworkSets).where(eq(homeworkSets.studentId, studentId))
  if (sets.length === 0) return []

  const setIds = sets.map((s) => s.id)
  const items = await db.select().from(homeworkItems).where(inArray(homeworkItems.setId, setIds))
  const submissions = await db.select().from(homeworkSubmissions).where(
    inArray(
      homeworkSubmissions.itemId,
      items.map((i) => i.id),
    ),
  )

  const textbookIds = items.filter((i) => i.questionTable === 'textbook_questions').map((i) => i.questionId)
  const generatedIds = items.filter((i) => i.questionTable === 'generated_questions').map((i) => i.questionId)
  const textbookRows = textbookIds.length ? await db.select().from(textbookQuestions).where(inArray(textbookQuestions.id, textbookIds)) : []
  const generatedRows = generatedIds.length ? await db.select().from(generatedQuestions).where(inArray(generatedQuestions.id, generatedIds)) : []

  return sets.map((set) => ({
    set,
    items: items
      .filter((item) => item.setId === set.id)
      .map((item) => ({
        item,
        question:
          item.questionTable === 'textbook_questions'
            ? textbookRows.find((q) => q.id === item.questionId)
            : generatedRows.find((q) => q.id === item.questionId),
        submission: submissions.find((s) => s.itemId === item.id) ?? null,
      })),
  }))
}

export async function getHomeworkItem(db: Db, itemId: string) {
  const [item] = await db.select().from(homeworkItems).where(eq(homeworkItems.id, itemId))
  if (!item) return null
  const [question] =
    item.questionTable === 'textbook_questions'
      ? await db.select().from(textbookQuestions).where(eq(textbookQuestions.id, item.questionId))
      : await db.select().from(generatedQuestions).where(eq(generatedQuestions.id, item.questionId))
  return { item, question: question ?? null }
}

export async function recordHomeworkSubmission(
  db: Db,
  input: { itemId: string; response: string; correct: boolean; score: number; feedback: string },
) {
  const [submission] = await db
    .insert(homeworkSubmissions)
    .values({ ...input, submittedAt: new Date() })
    .returning()
  return submission!
}

/** Marks a set overdue if its due date has passed and not every item has a submission yet. */
export async function markSetOverdueIfIncomplete(db: Db, setId: string) {
  const [set] = await db.select().from(homeworkSets).where(eq(homeworkSets.id, setId))
  if (!set || set.dueAt.getTime() > Date.now()) return

  const items = await db.select().from(homeworkItems).where(eq(homeworkItems.setId, setId))
  const submissions = await db.select().from(homeworkSubmissions).where(
    inArray(
      homeworkSubmissions.itemId,
      items.map((i) => i.id),
    ),
  )
  if (submissions.length < items.length) {
    await db.update(homeworkSets).set({ status: 'overdue' }).where(eq(homeworkSets.id, setId))
  }
}
