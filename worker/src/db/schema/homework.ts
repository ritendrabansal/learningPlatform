import { newId } from 'ncert-core'
import { sql } from 'drizzle-orm'
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sessions } from './teaching.js'
import { students } from './people.js'

export const homeworkSets = sqliteTable(
  'homework_sets',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    studentId: text('student_id').notNull().references(() => students.id),
    sessionId: text('session_id').notNull().references(() => sessions.id),
    dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
    // Only 'overdue' is textually evidenced (§5 HomeworkAgent: "mark the set overdue at the
    // due date"); not enough to safely enumerate the full lifecycle, so left unconstrained.
    status: text('status').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
  },
  (table) => [
    index('homework_sets_student_id_idx').on(table.studentId),
    index('homework_sets_session_id_idx').on(table.sessionId),
  ],
)

const questionTable = ['textbook_questions', 'generated_questions'] as const

export const homeworkItems = sqliteTable(
  'homework_items',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    setId: text('set_id').notNull().references(() => homeworkSets.id),
    questionId: text('question_id').notNull(),
    questionTable: text('question_table', { enum: questionTable }).notNull(),
    reason: text('reason').notNull(),
  },
  (table) => [
    index('homework_items_set_id_idx').on(table.setId),
    check('homework_items_question_table_check', sql`${table.questionTable} in ('textbook_questions','generated_questions')`),
  ],
)

export const homeworkSubmissions = sqliteTable(
  'homework_submissions',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    itemId: text('item_id').notNull().references(() => homeworkItems.id),
    response: text('response'),
    correct: integer('correct', { mode: 'boolean' }),
    score: real('score'),
    feedback: text('feedback'),
    submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('homework_submissions_item_id_idx').on(table.itemId)],
)
