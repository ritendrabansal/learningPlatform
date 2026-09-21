import { newId } from 'ncert-core'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { chapters } from './curriculum.js'

// Not one of IMPLEMENTATION_PLAN.md §3's frozen curriculum tables, so it isn't covered by
// CLAUDE.md hard rule 1 — but it exists only to surface P5's verify.json flags (which the
// deployed Worker can never read directly from digest/out/) in the Review Queue, and is written
// by the same two places: P9's seed step (from verify.json) and the Review Queue's
// approve/edit/reject route (resolving a flag). Mirrors packages/core/src/schemas/verify.ts's
// item shape so P9's mapping stays a rename, not a transform.
export const reviewFlags = sqliteTable(
  'review_flags',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    chapterId: text('chapter_id').notNull().references(() => chapters.id),
    itemType: text('item_type', { enum: ['topic', 'textbook_question', 'worked_example'] }).notNull(),
    // The real D1 id of the flagged row (topics.id / textbook_questions.id / worked_examples.id).
    itemId: text('item_id').notNull(),
    pass: text('pass', { enum: ['P2', 'P3', 'P4'] }).notNull(),
    issue: text('issue').notNull(),
    // Maths numeric re-computation only (code_execution tool); JSON { expected, computed }.
    recomputed: text('recomputed', { mode: 'json' }).$type<{ expected: string; computed: string } | null>(),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('review_flags_chapter_id_idx').on(table.chapterId),
    index('review_flags_chapter_id_resolved_idx').on(table.chapterId, table.resolved),
    check('review_flags_item_type_check', sql`${table.itemType} in ('topic','textbook_question','worked_example')`),
    check('review_flags_pass_check', sql`${table.pass} in ('P2','P3','P4')`),
  ],
)
