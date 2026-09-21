import { MODELS, MODEL_PRICING, practiceQuestionSchema, type PracticeQuestion } from 'ncert-core'
import { logAiRun } from '../db/queries/audit.js'
import type { Db } from '../db/client.js'
import systemPrompt from '../prompts/v1/generate-practice-question.txt'

// HomeworkAgent's last resort when a weak topic has no unused textbook question and no approved
// generated_questions left (IMPLEMENTATION_PLAN.md §5). Direct fetch, not @anthropic-ai/sdk —
// same reasoning as scoreAnswer.ts (Worker code is Workers-runtime only, CLAUDE.md hard rule 6).
const inputSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['mcq', 'short', 'long', 'numeric', 'fill', 'match'] },
    promptMd: { type: 'string', description: 'The practice question, in the style of the chapter.' },
    answerMd: { type: 'string', description: 'A model answer.' },
    difficulty: { type: ['string', 'null'], description: 'e.g. "easy"/"medium"/"hard", or null.' },
  },
  required: ['kind', 'promptMd', 'answerMd', 'difficulty'],
  additionalProperties: false,
}

export async function generatePracticeQuestion(
  env: Env,
  db: Db,
  params: { topicTitle: string; contentMd: string; keyTerms: { term: string; meaning: string }[] },
): Promise<PracticeQuestion> {
  const keyTermsText = params.keyTerms.map((t) => `- ${t.term}: ${t.meaning}`).join('\n')
  const purpose = 'HomeworkAgent practice generation'
  const promptVersion = 'v1'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELS.GENERATE,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Topic: ${params.topicTitle}\n\nContent:\n${params.contentMd}\n\nKey terms:\n${keyTermsText || '(none)'}\n\nWrite one new practice question with its answer.`,
        },
      ],
      tools: [{ name: 'record_practice_question', description: 'Records the generated practice question.', input_schema: inputSchema }],
      tool_choice: { type: 'tool', name: 'record_practice_question' },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    await logAiRun(db, { purpose, model: MODELS.GENERATE, promptVersion, inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, error: `${response.status} ${body}` })
    throw new Error(`generatePracticeQuestion failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const toolUse = data.content.find((block) => block.type === 'tool_use' && block.name === 'record_practice_question')
  if (!toolUse) throw new Error('generatePracticeQuestion: model did not call record_practice_question')

  // CLAUDE.md hard rule 2: every AI response is Zod-validated before use — strict tool use
  // narrows the shape but doesn't replace validating it.
  const parsed = practiceQuestionSchema.safeParse(toolUse.input)
  const pricing = MODEL_PRICING[MODELS.GENERATE]
  const costUsd = data.usage.input_tokens * pricing.input + data.usage.output_tokens * pricing.output
  await logAiRun(db, {
    purpose,
    model: MODELS.GENERATE,
    promptVersion,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    costUsd,
    ok: parsed.success,
    error: parsed.success ? undefined : `schema validation failed: ${parsed.error.message}`,
  })
  if (!parsed.success) throw new Error(`generatePracticeQuestion: invalid response shape: ${parsed.error.message}`)

  return parsed.data
}
