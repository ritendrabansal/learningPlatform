import { eq } from 'drizzle-orm'
import type { Db } from '../client.js'
import { mastery, students, topics } from '../schema/index.js'

/** Per-student x per-topic mastery grid for the Progress heat-map. Only topics with at least
 * one attempt (i.e. a mastery row) appear — an empty cell means "not yet attempted." */
export async function getProgressGrid(db: Db, classId: string) {
  return db
    .select({
      studentId: students.id,
      studentName: students.name,
      topicId: topics.id,
      topicTitle: topics.title,
      score: mastery.score,
      attempts: mastery.attempts,
    })
    .from(students)
    .innerJoin(mastery, eq(mastery.studentId, students.id))
    .innerJoin(topics, eq(topics.id, mastery.topicId))
    .where(eq(students.classId, classId))
}

export async function getStudentTopicSummary(db: Db, studentId: string) {
  return db
    .select({ topicId: topics.id, title: topics.title, score: mastery.score, attempts: mastery.attempts })
    .from(mastery)
    .innerJoin(topics, eq(topics.id, mastery.topicId))
    .where(eq(mastery.studentId, studentId))
}
