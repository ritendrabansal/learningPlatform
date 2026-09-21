import { newId } from 'ncert-core'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// CLAUDE.md hard rule 3: every AI call is logged here.
export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey().$defaultFn(() => newId()),
  purpose: text('purpose').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  ok: integer('ok', { mode: 'boolean' }).notNull(),
  error: text('error'),
})
