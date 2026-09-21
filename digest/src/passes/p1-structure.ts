import { structureSchema, type Structure } from 'ncert-core'
import { callStrict } from '../lib/anthropic.js'
import { inspectPdf } from '../lib/pdf.js'
import { type BookRef, readPrompt, writeJson } from '../lib/outPaths.js'

const PROMPT_VERSION = 'v1'

export async function runP1(ref: BookRef): Promise<Structure> {
  const { base64 } = await inspectPdf(ref.pdfPath)
  const systemPrompt = await readPrompt('p1-structure.md')

  const result = await callStrict({
    purpose: 'P1 structure',
    promptVersion: PROMPT_VERSION,
    pdf: { base64 },
    systemPrompt,
    userPrompt: 'Extract this chapter\'s title and exercise labels.',
    toolName: 'record_structure',
    toolDescription: "Records the chapter's title and exercise labels.",
    schema: structureSchema,
  })

  await writeJson(ref, 'structure.json', result)
  return result
}
