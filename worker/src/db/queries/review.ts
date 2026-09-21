import { and, count, eq } from 'drizzle-orm'
import type { Db } from '../client.js'
import { chapters, reviewFlags, textbookQuestions, topics } from '../schema/index.js'

// The one sanctioned write path onto curriculum tables per CLAUDE.md hard rule 1: every mutation
// here is "the Review Queue approve/edit route." Approving or editing an item resolves any open
// flag against it; rejecting sends it back to draft/unverified and re-opens the flag, since an
// unfixed item must stay visible as a known open flag (IMPLEMENTATION_PLAN.md §6 Phase 5's
// done-when: "every chapter is approved or has a known list of open flags").

export async function listReviewableChapters(db: Db) {
  return db
    .select({
      chapterId: chapters.id,
      chapterNumber: chapters.number,
      chapterTitle: chapters.title,
      chapterStatus: chapters.status,
      openFlags: count(reviewFlags.id),
    })
    .from(chapters)
    .leftJoin(reviewFlags, and(eq(reviewFlags.chapterId, chapters.id), eq(reviewFlags.resolved, false)))
    .groupBy(chapters.id)
    .orderBy(chapters.number)
}

export async function listOpenFlagsForChapter(db: Db, chapterId: string) {
  return db
    .select()
    .from(reviewFlags)
    .where(and(eq(reviewFlags.chapterId, chapterId), eq(reviewFlags.resolved, false)))
}

async function resolveFlagsForItem(db: Db, itemId: string) {
  await db.update(reviewFlags).set({ resolved: true }).where(eq(reviewFlags.itemId, itemId))
}

async function reopenFlagsForItem(db: Db, itemId: string) {
  await db.update(reviewFlags).set({ resolved: false }).where(eq(reviewFlags.itemId, itemId))
}

export async function resolveFlag(db: Db, flagId: string) {
  const [flag] = await db.update(reviewFlags).set({ resolved: true }).where(eq(reviewFlags.id, flagId)).returning()
  return flag!
}

export interface TopicPatch {
  title?: string
  summary?: string | null
  contentMd?: string
}

export async function approveTopic(db: Db, topicId: string, patch: TopicPatch = {}) {
  const [topic] = await db
    .update(topics)
    .set({ ...patch, status: 'approved' })
    .where(eq(topics.id, topicId))
    .returning()
  await resolveFlagsForItem(db, topicId)
  return topic!
}

export async function editTopic(db: Db, topicId: string, patch: TopicPatch) {
  const [topic] = await db.update(topics).set(patch).where(eq(topics.id, topicId)).returning()
  await resolveFlagsForItem(db, topicId)
  return topic!
}

export async function rejectTopic(db: Db, topicId: string) {
  const [topic] = await db.update(topics).set({ status: 'draft' }).where(eq(topics.id, topicId)).returning()
  await reopenFlagsForItem(db, topicId)
  return topic!
}

export interface QuestionPatch {
  promptMd?: string
  answerMd?: string | null
  difficulty?: string | null
}

export async function approveQuestion(db: Db, questionId: string, patch: QuestionPatch = {}) {
  const [question] = await db
    .update(textbookQuestions)
    .set({ ...patch, verified: true })
    .where(eq(textbookQuestions.id, questionId))
    .returning()
  await resolveFlagsForItem(db, questionId)
  return question!
}

export async function editQuestion(db: Db, questionId: string, patch: QuestionPatch) {
  const [question] = await db.update(textbookQuestions).set(patch).where(eq(textbookQuestions.id, questionId)).returning()
  await resolveFlagsForItem(db, questionId)
  return question!
}

export async function rejectQuestion(db: Db, questionId: string) {
  const [question] = await db
    .update(textbookQuestions)
    .set({ verified: false })
    .where(eq(textbookQuestions.id, questionId))
    .returning()
  await reopenFlagsForItem(db, questionId)
  return question!
}

/** Chapter-level sign-off: this phase's actual done-when action. Cascades to its topics. */
export async function approveChapter(db: Db, chapterId: string) {
  const [chapter] = await db.update(chapters).set({ status: 'approved' }).where(eq(chapters.id, chapterId)).returning()
  await db.update(topics).set({ status: 'approved' }).where(eq(topics.chapterId, chapterId))
  return chapter!
}
