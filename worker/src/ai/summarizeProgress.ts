import { MODELS, MODEL_PRICING } from 'ncert-core'
import { logAiRun } from '../db/queries/audit.js'
import type { Db } from '../db/client.js'
import systemPrompt from '../prompts/v1/summarize-progress.txt'

// ProgressAnalyst (IMPLEMENTATION_PLAN.md §5): "Numbers come from SQL; Claude only writes the
// words around them." No structured output needed — free text, no forced tool use.
export async function summarizeProgress(
  env: Env,
  db: Db,
  params: { studentName: string; topics: { title: string; score: number | null; attempts: number }[] },
): Promise<string> {
  const purpose = 'ProgressAnalyst summary'
  const promptVersion = 'v1'
  const lines = params.topics
    .map((t) => `- ${t.title}: ${t.score === null ? 'not yet attempted' : `score ${t.score.toFixed(2)}`} (${t.attempts} attempt(s))`)
    .join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELS.CLASSIFY,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Student: ${params.studentName}\n\nPer-topic mastery:\n${lines}` }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    await logAiRun(db, { purpose, model: MODELS.CLASSIFY, promptVersion, inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, error: `${response.status} ${body}` })
    throw new Error(`summarizeProgress failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const text = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const pricing = MODEL_PRICING[MODELS.CLASSIFY]
  const costUsd = data.usage.input_tokens * pricing.input + data.usage.output_tokens * pricing.output
  await logAiRun(db, { purpose, model: MODELS.CLASSIFY, promptVersion, inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, costUsd, ok: true })

  return text
}
