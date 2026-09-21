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
