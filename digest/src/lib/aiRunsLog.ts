import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { MODEL_PRICING, type ModelName } from 'ncert-core'
import type { Usage } from './anthropic.js'

// CLAUDE.md hard rule 3: every AI call is logged (purpose, model, prompt_version, tokens, ok/error).
export interface AiRunLogEntry {
  purpose: string
  model: ModelName
  promptVersion: string
  usage: Usage
  ok: boolean
  error?: string
}

const OUT_DIR = path.resolve(import.meta.dirname, '../../out')
const LOG_PATH = path.join(OUT_DIR, 'ai_runs.jsonl')

function costUsd(model: ModelName, usage: Usage): number {
  const price = MODEL_PRICING[model]
  return (
    usage.input_tokens * price.input +
    usage.output_tokens * price.output +
    (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite5m +
    (usage.cache_read_input_tokens ?? 0) * price.cacheRead
  )
}

export async function logAiRun(entry: AiRunLogEntry): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })
  const line = {
    purpose: entry.purpose,
    model: entry.model,
    prompt_version: entry.promptVersion,
    input_tokens: entry.usage.input_tokens,
    output_tokens: entry.usage.output_tokens,
    cache_creation_input_tokens: entry.usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: entry.usage.cache_read_input_tokens ?? 0,
    cost_usd: Number(costUsd(entry.model, entry.usage).toFixed(6)),
    created_at: new Date().toISOString(),
    ok: entry.ok,
    error: entry.error ?? null,
  }
  await appendFile(LOG_PATH, JSON.stringify(line) + '\n', 'utf-8')
}
