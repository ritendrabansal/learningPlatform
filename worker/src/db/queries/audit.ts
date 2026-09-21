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
