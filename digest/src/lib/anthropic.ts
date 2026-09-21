import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { MODELS, type ModelName } from 'ncert-core'
import { logAiRun } from './aiRunsLog.js'

export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

let client: Anthropic | undefined
function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export interface PdfDocument {
  base64: string
}

function documentBlock(pdf: PdfDocument): Anthropic.Messages.DocumentBlockParam {
  return {
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: pdf.base64 },
    cache_control: { type: 'ephemeral' },
  }
}

// Strict tool use only supports a subset of JSON Schema (platform.claude.com/docs/en/
// build-with-claude/structured-outputs#json-schema-limitations): no minimum/maximum/multipleOf,
// no minLength/maxLength, no maxItems, and minItems only as 0 or 1. Zod's own toJSONSchema()
// emits bounds like minimum/maximum for every z.number().int(), which the API rejects outright
// (400 invalid_request_error) — strip them recursively before building the tool.
const UNSUPPORTED_KEYS = new Set(['minimum', 'maximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems'])
function stripUnsupportedSchemaKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedSchemaKeywords)
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (UNSUPPORTED_KEYS.has(key)) continue
      if (key === 'minItems' && value !== 0 && value !== 1) continue
      out[key] = stripUnsupportedSchemaKeywords(value)
    }
    return out
  }
  return node
}

/**
 * Sends a chapter PDF + prompt to Claude, forcing a strict-schema tool call, and Zod-validates
 * the result. Retries once with the validation error appended; on a second failure, logs to
 * ai_runs.jsonl and throws (CLAUDE.md rule 2). Every call — success or failure — is logged.
 */
export async function callStrict<T extends z.ZodTypeAny>(params: {
  purpose: string
  promptVersion: string
  pdf?: PdfDocument
  systemPrompt: string
  userPrompt: string
  toolName: string
  toolDescription: string
  schema: T
  model?: ModelName
}): Promise<z.infer<T>> {
  const model = params.model ?? MODELS.DIGEST
  const { $schema: _drop, ...rawSchema } = z.toJSONSchema(params.schema) as Record<string, unknown>
  const inputSchema = stripUnsupportedSchemaKeywords(rawSchema)

  const tool: Anthropic.Messages.Tool = {
    name: params.toolName,
    description: params.toolDescription,
    input_schema: inputSchema as Anthropic.Messages.Tool.InputSchema,
    strict: true,
  }

  const runOnce = async (userPrompt: string) => {
    const content: Anthropic.Messages.ContentBlockParam[] = []
    if (params.pdf) content.push(documentBlock(params.pdf))
    content.push({ type: 'text', text: userPrompt })

    // A 64000 max_tokens ceiling can legitimately take past the SDK's 10-minute non-streaming
    // limit (github.com/anthropics/anthropic-sdk-typescript#long-requests), so this must stream.
    const response = await getClient()
      .messages.stream({
        model,
        max_tokens: 64000,
        system: params.systemPrompt,
        messages: [{ role: 'user', content }],
        tools: [tool],
        tool_choice: { type: 'tool', name: params.toolName },
      })
      .finalMessage()
    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use' && block.name === params.toolName,
    )
    if (!toolUse) throw new Error(`Model did not call ${params.toolName}`)
    return { input: toolUse.input, usage: response.usage }
  }

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = attempt === 0 ? params.userPrompt : `${params.userPrompt}\n\nYour previous response failed schema validation: ${String(lastError)}\nRetry, matching the schema exactly.`
    try {
      const { input, usage } = await runOnce(prompt)
      const parsed = params.schema.safeParse(input)
      if (parsed.success) {
        await logAiRun({ purpose: params.purpose, model, promptVersion: params.promptVersion, usage, ok: true })
        return parsed.data
      }
      lastError = parsed.error
      await logAiRun({
        purpose: params.purpose,
        model,
        promptVersion: params.promptVersion,
        usage,
        ok: false,
        error: `schema validation failed (attempt ${attempt + 1}): ${parsed.error.message}`,
      })
    } catch (err) {
      lastError = err
      await logAiRun({
        purpose: params.purpose,
        model,
        promptVersion: params.promptVersion,
        usage: { input_tokens: 0, output_tokens: 0 },
        ok: false,
        error: `request failed (attempt ${attempt + 1}): ${String(err)}`,
      })
    }
  }
  throw new Error(`${params.purpose} failed after retry: ${String(lastError)}`)
}

/**
 * Free-text call with an optional tool set (used for P5-maths' first call, which must be free
 * to use the code_execution tool before the second call forces the strict verify_report tool).
 */
export async function callWithTools(params: {
  purpose: string
  promptVersion: string
  pdf?: PdfDocument
  systemPrompt: string
  userPrompt: string
  tools: Anthropic.Messages.ToolUnion[]
  model?: ModelName
}): Promise<string> {
  const model = params.model ?? MODELS.DIGEST
  const content: Anthropic.Messages.ContentBlockParam[] = []
  if (params.pdf) content.push(documentBlock(params.pdf))
  content.push({ type: 'text', text: params.userPrompt })

  const response = await getClient()
    .messages.stream({
      model,
      max_tokens: 64000,
      system: params.systemPrompt,
      messages: [{ role: 'user', content }],
      tools: params.tools,
    })
    .finalMessage()

  await logAiRun({ purpose: params.purpose, model, promptVersion: params.promptVersion, usage: response.usage, ok: true })

  return response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
