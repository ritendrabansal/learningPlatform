import { contentSchema, type Content } from 'ncert-core'
import { callStrict } from '../lib/anthropic.js'
import { inspectPdf } from '../lib/pdf.js'
import { type BookRef, readPrompt, writeJson } from '../lib/outPaths.js'

const PROMPT_VERSION = 'v1'

export async function runP2(ref: BookRef): Promise<Content> {
  const { base64 } = await inspectPdf(ref.pdfPath)
  const systemPrompt = await readPrompt(`p2-content.${ref.subject}.md`)

  const result = await callStrict({
    purpose: 'P2 content',
    promptVersion: PROMPT_VERSION,
    pdf: { base64 },
    systemPrompt,
    userPrompt: 'Extract this chapter into topics, in reading order.',
    toolName: 'record_content',
    toolDescription: "Records the chapter's topics, in reading order.",
    schema: contentSchema,
  })

  await writeJson(ref, 'content.json', result)
  return result
}
