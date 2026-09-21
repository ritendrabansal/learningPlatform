import { eq, inArray } from 'drizzle-orm'
import type { Db } from '../client.js'
import { books, chapters, exerciseItems, exercises, keyTerms, subjects, textbookQuestions, topics, workedExamples } from '../schema/index.js'

// Read-only by design (CLAUDE.md hard rule 1): this module exposes no insert/update/delete on
// curriculum tables. Those only ever happen via SQL migrations/seed or the Phase 4 Review
// Queue approve/edit route (worker/src/db/queries/review.ts).

export async function listSubjects(db: Db) {
  return db.select().from(subjects)
}

export async function listChaptersForBook(db: Db, bookId: string) {
  return db
    .select({
      id: chapters.id,
      number: chapters.number,
      title: chapters.title,
      status: chapters.status,
      bookTitle: books.title,
    })
    .from(chapters)
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.number)
}

/** Subject -> book -> chapter tree for the Library page. Flat rows; the caller groups them. */
export async function getLibraryTree(db: Db) {
  return db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      grade: subjects.grade,
      bookId: books.id,
      bookTitle: books.title,
      chapterId: chapters.id,
      chapterNumber: chapters.number,
      chapterTitle: chapters.title,
      chapterStatus: chapters.status,
    })
    .from(subjects)
    .innerJoin(books, eq(books.subjectId, subjects.id))
    .innerJoin(chapters, eq(chapters.bookId, books.id))
    .orderBy(subjects.name, chapters.number)
}

export async function getChapter(db: Db, chapterId: string) {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId))
  return chapter
}

/**
 * Full chapter detail for the Library/ChapterView and Review Queue pages: ordered topics (with
 * their key terms and worked examples) and every textbook question, joined to its exercise
 * label where it has one. Used by both `/api/library/chapters/:id` (read) and
 * `/api/review/chapters/:id` (read + the review.ts flags overlay) so there's one source of truth
 * for "what does this chapter contain."
 */
export async function getChapterDetail(db: Db, chapterId: string) {
  const chapter = await getChapter(db, chapterId)
  if (!chapter) return null

  const chapterTopics = await db.select().from(topics).where(eq(topics.chapterId, chapterId)).orderBy(topics.orderIndex)
  const topicIds = chapterTopics.map((t) => t.id)

  const terms = topicIds.length ? await db.select().from(keyTerms).where(inArray(keyTerms.topicId, topicIds)) : []
  const examples = topicIds.length ? await db.select().from(workedExamples).where(inArray(workedExamples.topicId, topicIds)) : []

  const questions = await db
    .select({
      id: textbookQuestions.id,
      topicId: textbookQuestions.topicId,
      kind: textbookQuestions.kind,
      promptMd: textbookQuestions.promptMd,
      answerMd: textbookQuestions.answerMd,
      answerSource: textbookQuestions.answerSource,
      difficulty: textbookQuestions.difficulty,
      sourcePages: textbookQuestions.sourcePages,
      verified: textbookQuestions.verified,
      exerciseLabel: exercises.label,
      exerciseOrderIndex: exercises.orderIndex,
    })
    .from(textbookQuestions)
    .leftJoin(exerciseItems, eq(exerciseItems.questionId, textbookQuestions.id))
    .leftJoin(exercises, eq(exercises.id, exerciseItems.exerciseId))
    .where(eq(textbookQuestions.chapterId, chapterId))

  return {
    chapter,
    topics: chapterTopics.map((topic) => ({
      ...topic,
      keyTerms: terms.filter((term) => term.topicId === topic.id),
      workedExamples: examples.filter((ex) => ex.topicId === topic.id),
      questions: questions.filter((q) => q.topicId === topic.id),
    })),
  }
}
