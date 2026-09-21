import { newId } from 'ncert-core'
import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { chapters, topics } from './curriculum.js'
import { classes, students } from './people.js'

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    classId: text('class_id').notNull().references(() => classes.id),
    chapterId: text('chapter_id').notNull().references(() => chapters.id),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('sessions_class_id_idx').on(table.classId),
    index('sessions_chapter_id_idx').on(table.chapterId),
  ],
)

// What the teacher covered during a session. No synthetic id — a (session, topic) pair is
// naturally unique, per IMPLEMENTATION_PLAN.md §3.
export const coverage = sqliteTable(
  'coverage',
  {
    sessionId: text('session_id').notNull().references(() => sessions.id),
    topicId: text('topic_id').notNull().references(() => topics.id),
    shownAt: integer('shown_at', { mode: 'timestamp_ms' }).notNull(),
    durationS: integer('duration_s'),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.topicId] })],
)

const questionTable = ['textbook_questions', 'generated_questions'] as const

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    sessionId: text('session_id').notNull().references(() => sessions.id),
    studentId: text('student_id').notNull().references(() => students.id),
    // Polymorphic reference disambiguated by questionTable; no FK constraint since it can
    // point into either textbook_questions or generated_questions.
    questionId: text('question_id').notNull(),
    questionTable: text('question_table', { enum: questionTable }).notNull(),
    response: text('response'),
    correct: integer('correct', { mode: 'boolean' }),
    score: real('score'),
    feedback: text('feedback'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    // d1-schema-engineer.md: index (session_id).
    index('attempts_session_id_idx').on(table.sessionId),
    index('attempts_student_id_idx').on(table.studentId),
    check('attempts_question_table_check', sql`${table.questionTable} in ('textbook_questions','generated_questions')`),
  ],
)

// Rolled up after each session (IMPLEMENTATION_PLAN.md §3, §5 ClassroomAgent "On endSession").
export const mastery = sqliteTable(
  'mastery',
  {
    studentId: text('student_id').notNull().references(() => students.id),
    topicId: text('topic_id').notNull().references(() => topics.id),
    score: real('score').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastSeen: integer('last_seen', { mode: 'timestamp_ms' }).notNull(),
  },
  // d1-schema-engineer.md: index (student_id, topic_id) — this composite primary key
  // already gives that index for free.
  (table) => [primaryKey({ columns: [table.studentId, table.topicId] })],
)
