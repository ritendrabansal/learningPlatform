import { newId } from 'ncert-core'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { questionKind, topics } from './curriculum.js'

// AI-generated practice (IMPLEMENTATION_PLAN.md §3). Never overwrites curriculum tables —
// this is a separate table specifically so generation can never touch frozen content.

// 'draft' | 'approved' is directly evidenced by §5 HomeworkAgent: "generates new ones with
// Sonnet ..., saves them to generated_questions as draft, and uses them."
const generatedQuestionStatus = ['draft', 'approved'] as const

export const generatedQuestions = sqliteTable(
  'generated_questions',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    topicId: text('topic_id').notNull().references(() => topics.id),
    kind: text('kind', { enum: questionKind }).notNull(),
    promptMd: text('prompt_md').notNull(),
    answerMd: text('answer_md').notNull(),
    difficulty: text('difficulty'),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: generatedQuestionStatus }).notNull().default('draft'),
  },
  (table) => [
    index('generated_questions_topic_id_idx').on(table.topicId),
    check('generated_questions_kind_check', sql`${table.kind} in ('mcq','short','long','numeric','fill','match')`),
    check('generated_questions_status_check', sql`${table.status} in ('draft','approved')`),
  ],
)
