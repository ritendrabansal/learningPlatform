import { MODELS, scoreResultSchema, type ScoreResult } from 'ncert-core'
import { logAiRun } from '../db/queries/audit.js'
import type { Db } from '../db/client.js'
// CLAUDE.md hard rule 5: prompts are versioned files, not inline strings. Workers' bundler
// supports .txt as a raw-string import by default (unlike .md, which needs a custom bundling
// rule) — developers.cloudflare.com/workers/wrangler/bundling/.
import systemPrompt from '../prompts/v1/score-answer.txt'

// Calls the Anthropic Messages API directly via fetch rather than @anthropic-ai/sdk — Worker
// code is Workers-runtime only (CLAUDE.md hard rule 6: no node-specific assumptions), and a
// plain fetch call needs no SDK-compat verification. Version header confirmed against the
// installed @anthropic-ai/sdk's own client (node_modules/@anthropic-ai/sdk/client.mjs), not
// guessed. Short/long answers only — mcq/numeric are scored without AI (scoreAnswerLocally).

const inputSchema = {
  type: 'object',
  properties: {
    correct: { type: 'boolean', description: 'Whether the answer is substantively correct.' },
    score: { type: 'number', description: '0 to 1, partial credit allowed.' },
    feedback: { type: 'string', description: 'One sentence of feedback for the student.' },
  },
  required: ['correct', 'score', 'feedback'],
  additionalProperties: false,
}

export async function scoreAnswerWithAi(
  env: Env,
  db: Db,
  params: { questionPromptMd: string; modelAnswerMd: string; studentResponse: string },
): Promise<ScoreResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELS.CLASSIFY,
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Question:\n${params.questionPromptMd}\n\nModel answer:\n${params.modelAnswerMd}\n\nStudent's answer:\n${params.studentResponse}`,
        },
      ],
      tools: [{ name: 'record_score', description: "Records the student's score.", input_schema: inputSchema }],
      tool_choice: { type: 'tool', name: 'record_score' },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    await logAiRun(db, { purpose: 'ClassroomAgent answer scoring', model: MODELS.CLASSIFY, promptVersion: 'v1', inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, error: `${response.status} ${body}` })
    throw new Error(`scoreAnswerWithAi failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const toolUse = data.content.find((block) => block.type === 'tool_use' && block.name === 'record_score')
  if (!toolUse) throw new Error('scoreAnswerWithAi: model did not call record_score')

  // CLAUDE.md hard rule 2: every AI response is Zod-validated before use — strict tool use
  // narrows the shape but doesn't replace validating it.
  const parsed = scoreResultSchema.safeParse(toolUse.input)
  await logAiRun(db, {
    purpose: 'ClassroomAgent answer scoring',
    model: MODELS.CLASSIFY,
    promptVersion: 'v1',
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    costUsd: 0, // Negligible per-call cost for Haiku classification; not worth the pricing import here.
    ok: parsed.success,
    error: parsed.success ? undefined : `schema validation failed: ${parsed.error.message}`,
  })
  if (!parsed.success) throw new Error(`scoreAnswerWithAi: invalid response shape: ${parsed.error.message}`)

  return parsed.data
}

/** mcq/numeric: normalized comparison against the stored answer, no AI call. */
export function scoreAnswerLocally(modelAnswerMd: string, studentResponse: string): ScoreResult {
  const normalize = (s: string) => s.trim().toLowerCase()
  const expected = normalize(modelAnswerMd)
  const actual = normalize(studentResponse)

  const expectedNum = Number.parseFloat(expected)
  const actualNum = Number.parseFloat(actual)
  const correct = !Number.isNaN(expectedNum) && !Number.isNaN(actualNum) ? expectedNum === actualNum : expected === actual

  return {
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Correct!' : `Not quite — the answer is ${modelAnswerMd}.`,
  }
}
