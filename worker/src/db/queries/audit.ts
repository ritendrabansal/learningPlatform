import { desc, sql } from 'drizzle-orm'
import type { Db } from '../client.js'
import { aiRuns } from '../schema/index.js'

// CLAUDE.md hard rule 3: every AI call is logged. digest/'s equivalent (aiRunsLog.ts) appends to
// a local JSONL file since it's a Node CLI with no D1 access; runtime agents write straight to
// the ai_runs table since they already have `env.DB`.
export async function logAiRun(
  db: Db,
  input: { purpose: string; model: string; promptVersion: string; inputTokens: number; outputTokens: number; costUsd: number; ok: boolean; error?: string },
) {
  await db.insert(aiRuns).values(input)
}

// Phase 8's cost view: numbers computed in SQL (mirrors §5 ProgressAnalyst's own "numbers come
// from SQL" discipline — this route has no AI-written prose at all, just raw totals).
export async function getAiRunsSummary(db: Db) {
  return db
    .select({
      purpose: aiRuns.purpose,
      model: aiRuns.model,
      count: sql<number>`count(*)`,
      totalCostUsd: sql<number>`sum(${aiRuns.costUsd})`,
      okCount: sql<number>`sum(case when ${aiRuns.ok} then 1 else 0 end)`,
    })
    .from(aiRuns)
    .groupBy(aiRuns.purpose, aiRuns.model)
    .orderBy(sql`sum(${aiRuns.costUsd}) desc`)
}

export async function listRecentAiRuns(db: Db, limit = 50) {
  return db.select().from(aiRuns).orderBy(desc(aiRuns.createdAt)).limit(limit)
}
