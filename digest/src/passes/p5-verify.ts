import { verifyReportSchema, type Content, type Questions, type VerifyReport } from 'ncert-core'
import { callStrict, callWithTools } from '../lib/anthropic.js'
import { inspectPdf } from '../lib/pdf.js'
import { type BookRef, readJson, readPrompt, writeJson } from '../lib/outPaths.js'

const PROMPT_VERSION = 'v1'

function buildItemDump(content: Content, questions: Questions): string {
  const topics = content.topics.map((t, i) => ({ itemRef: `topic[${i}]`, pass: 'P2', ...t }))
  const textbookQuestions = questions.textbookQuestions.map((q, i) => ({
    itemRef: `textbookQuestion[${i}]`,
    pass: q.answerSource === 'ai_worked' ? 'P4' : 'P3',
    ...q,
  }))
  const workedExamples = questions.workedExamples.map((e, i) => ({ itemRef: `workedExample[${i}]`, pass: 'P3', ...e }))
  return JSON.stringify({ topics, textbookQuestions, workedExamples }, null, 2)
}

export async function runP5(ref: BookRef): Promise<VerifyReport> {
  const content = await readJson<Content>(ref, 'content.json')
  const questions = await readJson<Questions>(ref, 'questions.json')
  const itemDump = buildItemDump(content, questions)

  let result: VerifyReport
  if (ref.subject === 'english') {
    const { base64 } = await inspectPdf(ref.pdfPath)
    const systemPrompt = await readPrompt('p5-verify.english.md')
    result = await callStrict({
      purpose: 'P5 verify',
      promptVersion: PROMPT_VERSION,
      pdf: { base64 },
      systemPrompt,
      userPrompt: `Extracted data:\n${itemDump}\n\nVerify every item.`,
      toolName: 'record_verify_report',
      toolDescription: 'Records the verification findings for every item checked.',
      schema: verifyReportSchema,
    })
  } else {
    // Two calls: (1) free-form with code_execution so Claude can recompute numeric answers
    // before reporting, since a forced tool_choice would block it from using any other tool
    // first; (2) structure those findings into the strict schema (no PDF needed for this step).
    const { base64 } = await inspectPdf(ref.pdfPath)
    const findingsPrompt = await readPrompt('p5-verify.maths.md')
    const findings = await callWithTools({
      purpose: 'P5 verify (findings)',
      promptVersion: PROMPT_VERSION,
      pdf: { base64 },
      systemPrompt: findingsPrompt,
      userPrompt: `Extracted data:\n${itemDump}\n\nVerify every item.`,
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    })

    result = await callStrict({
      purpose: 'P5 verify (structure)',
      promptVersion: PROMPT_VERSION,
      systemPrompt: 'Convert the following verification findings into the structured report schema. Do not add or remove items.',
      userPrompt: findings,
      toolName: 'record_verify_report',
      toolDescription: 'Records the verification findings for every item checked.',
      schema: verifyReportSchema,
    })
  }

  await writeJson(ref, 'verify.json', result)
  return result
}
