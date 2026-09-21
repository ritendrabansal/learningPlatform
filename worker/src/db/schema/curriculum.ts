import { newId } from 'ncert-core'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Curriculum tables (IMPLEMENTATION_PLAN.md §3). Frozen at runtime — CLAUDE.md hard rule 1:
// only the digest CLI's seed step and the Phase 4 Review Queue approve/edit route may write
// these. Worker code in every other phase gets read-only query helpers only
// (worker/src/db/queries/curriculum.ts), never insert/update/delete.

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey().$defaultFn(() => newId()),
  name: text('name').notNull(),
  grade: integer('grade').notNull(),
})

export const books = sqliteTable(
  'books',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    subjectId: text('subject_id').notNull().references(() => subjects.id),
    title: text('title').notNull(),
    pdfR2Key: text('pdf_r2_key').notNull(),
    pageCount: integer('page_count'),
    // Pipeline stage tracking (P0-P9); values are set by the digest CLI as passes complete.
    // Not enumerated in IMPLEMENTATION_PLAN.md §3, so left unconstrained here rather than
    // guessing a fixed set of stage names.
    digestStatus: text('digest_status'),
  },
  (table) => [index('books_subject_id_idx').on(table.subjectId)],
)

// draft|in_review|approved per IMPLEMENTATION_PLAN.md §3's explicit comment on `chapters`,
// and §4's review-gate description ("nothing moves from draft to approved without passing
// through the Review Queue"). `topics` shares this exact lifecycle (same review gate, same
// "frozen after approval" curriculum family) even though §3 doesn't repeat the comment there.
const curriculumStatus = ['draft', 'in_review', 'approved'] as const

export const chapters = sqliteTable(
  'chapters',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    bookId: text('book_id').notNull().references(() => books.id),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    pageStart: integer('page_start').notNull(),
    pageEnd: integer('page_end').notNull(),
    status: text('status', { enum: curriculumStatus }).notNull().default('draft'),
  },
  (table) => [
    index('chapters_book_id_idx').on(table.bookId),
    // d1-schema-engineer.md: index (chapter_id, status) — chapters' own closest analogue,
    // since this table doesn't have a chapter_id column, is (book_id, status).
    index('chapters_book_id_status_idx').on(table.bookId, table.status),
    check('chapters_status_check', sql`${table.status} in ('draft','in_review','approved')`),
  ],
)

export const topics = sqliteTable(
  'topics',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    chapterId: text('chapter_id').notNull().references(() => chapters.id),
    orderIndex: integer('order_index').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    contentMd: text('content_md').notNull(),
    sourcePages: text('source_pages', { mode: 'json' }).$type<number[]>().notNull(),
    status: text('status', { enum: curriculumStatus }).notNull().default('draft'),
  },
  (table) => [
    index('topics_chapter_id_idx').on(table.chapterId),
    check('topics_status_check', sql`${table.status} in ('draft','in_review','approved')`),
  ],
)

export const keyTerms = sqliteTable(
  'key_terms',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    topicId: text('topic_id').notNull().references(() => topics.id),
    term: text('term').notNull(),
    meaning: text('meaning').notNull(),
  },
  (table) => [index('key_terms_topic_id_idx').on(table.topicId)],
)

export const questionKind = ['mcq', 'short', 'long', 'numeric', 'fill', 'match'] as const
const answerSource = ['textbook', 'ai_worked'] as const

export const textbookQuestions = sqliteTable(
  'textbook_questions',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    topicId: text('topic_id').notNull().references(() => topics.id),
    chapterId: text('chapter_id').notNull().references(() => chapters.id),
    kind: text('kind', { enum: questionKind }).notNull(),
    promptMd: text('prompt_md').notNull(),
    answerMd: text('answer_md'),
    answerSource: text('answer_source', { enum: answerSource }).notNull(),
    difficulty: text('difficulty'),
    sourcePages: text('source_pages', { mode: 'json' }).$type<number[]>().notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('textbook_questions_topic_id_idx').on(table.topicId),
    index('textbook_questions_chapter_id_idx').on(table.chapterId),
    check('textbook_questions_kind_check', sql`${table.kind} in ('mcq','short','long','numeric','fill','match')`),
    check('textbook_questions_answer_source_check', sql`${table.answerSource} in ('textbook','ai_worked')`),
  ],
)

export const workedExamples = sqliteTable(
  'worked_examples',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    topicId: text('topic_id').notNull().references(() => topics.id),
    promptMd: text('prompt_md').notNull(),
    solutionMd: text('solution_md').notNull(),
    sourcePages: text('source_pages', { mode: 'json' }).$type<number[]>().notNull(),
  },
  (table) => [index('worked_examples_topic_id_idx').on(table.topicId)],
)

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    chapterId: text('chapter_id').notNull().references(() => chapters.id),
    label: text('label').notNull(),
    orderIndex: integer('order_index').notNull(),
  },
  (table) => [index('exercises_chapter_id_idx').on(table.chapterId)],
)

export const exerciseItems = sqliteTable(
  'exercise_items',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id),
    // Polymorphic reference: points into textbook_questions (the only source at digest time).
    questionId: text('question_id').notNull().references(() => textbookQuestions.id),
  },
  (table) => [index('exercise_items_exercise_id_idx').on(table.exerciseId)],
)
