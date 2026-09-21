// Single source of truth for model names (CLAUDE.md hard rule 4: never hardcode
// model strings anywhere else — digest passes, runtime agents, etc. import from here).
export const MODELS = {
  // Digest extraction and verification (P1-P5): quality matters most, runs once.
  DIGEST: 'claude-opus-5',
  // Homework and practice generation (HomeworkAgent, P6-P7): everyday runtime generation.
  GENERATE: 'claude-sonnet-5',
  // Cheap classification, tagging, short feedback (ClassroomAgent answer scoring).
  CLASSIFY: 'claude-haiku-4-5-20251001',
} as const

export type ModelKey = keyof typeof MODELS
export type ModelName = (typeof MODELS)[ModelKey]

// USD per token (checked against platform.claude.com/docs/en/about-claude/pricing, not
// guessed). Cache write/read are multipliers on base input price; kept as raw per-token USD
// here so ai_runs cost calculations (digest and, later, the Phase 8 cost view) are one multiply.
export const MODEL_PRICING: Record<ModelName, {
  input: number
  output: number
  cacheWrite5m: number
  cacheRead: number
}> = {
  'claude-opus-5': { input: 5 / 1e6, output: 25 / 1e6, cacheWrite5m: 6.25 / 1e6, cacheRead: 0.5 / 1e6 },
  'claude-sonnet-5': { input: 2 / 1e6, output: 10 / 1e6, cacheWrite5m: 2.5 / 1e6, cacheRead: 0.2 / 1e6 },
  'claude-haiku-4-5-20251001': { input: 1 / 1e6, output: 5 / 1e6, cacheWrite5m: 1.25 / 1e6, cacheRead: 0.1 / 1e6 },
}
