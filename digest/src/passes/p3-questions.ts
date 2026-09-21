import { questionsSchema, type Content, type Questions } from 'ncert-core'
import { callStrict } from '../lib/anthropic.js'
import { inspectPdf } from '../lib/pdf.js'
import { type BookRef, readJson, readPrompt, writeJson } from '../lib/outPaths.js'

const PROMPT_VERSION = 'v1'

export async function runP3(ref: BookRef): Promise<Questions> {
  const { base64 } = await inspectPdf(ref.pdfPath)
  const content = await readJson<Content>(ref, 'content.json')
  const systemPrompt = await readPrompt(`p3-questions.${ref.subject}.md`)

  const topicList = content.topics.map((t) => `${t.orderIndex}: ${t.title}`).join('\n')

  const result = await callStrict({
    purpose: 'P3 questions',
    promptVersion: PROMPT_VERSION,
    pdf: { base64 },
    systemPrompt,
    userPrompt: `This chapter's topics:\n${topicList}\n\nExtract every exercise question (and, for maths, every worked example) from this chapter.`,
    toolName: 'record_questions',
    toolDescription: "Records the chapter's exercise questions and worked examples.",
    schema: questionsSchema,
  })

  await writeJson(ref, 'questions.json', result)
  return result
}
