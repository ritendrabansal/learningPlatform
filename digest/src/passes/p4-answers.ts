import { questionsSchema, type Questions } from 'ncert-core'
import { callStrict } from '../lib/anthropic.js'
import { inspectPdf } from '../lib/pdf.js'
import { type BookRef, readJson, readPrompt, writeJson } from '../lib/outPaths.js'

const PROMPT_VERSION = 'v1'

export async function runP4(ref: BookRef): Promise<Questions> {
  const original = await readJson<Questions>(ref, 'questions.json')
  const pendingCount = original.textbookQuestions.filter((q) => q.answerMd === null).length
  if (pendingCount === 0) {
    // Nothing needs an ai_worked answer (every question already has a printed one).
    return original
  }

  const { base64 } = await inspectPdf(ref.pdfPath)
  const systemPrompt = await readPrompt(`p4-answers.${ref.subject}.md`)

  const result = await callStrict({
    purpose: 'P4 answers',
    promptVersion: PROMPT_VERSION,
    pdf: { base64 },
    systemPrompt,
    userPrompt: `Questions:\n${JSON.stringify(original.textbookQuestions, null, 2)}\n\nFill answerMd for every question where it is currently null.`,
    toolName: 'record_questions',
    toolDescription: "Records the chapter's exercise questions with answers filled in.",
    schema: questionsSchema,
  })

  // Never trust the model to leave already-answered questions untouched — enforce it in code.
  // Falls back to the model's own output if the array shape changed (should not happen with
  // strict tool use, but a length mismatch means index-wise merging isn't safe).
  const merged: Questions =
    result.textbookQuestions.length === original.textbookQuestions.length
      ? {
          textbookQuestions: original.textbookQuestions.map((orig, i) =>
            orig.answerSource === 'textbook' ? orig : result.textbookQuestions[i]!,
          ),
          workedExamples: original.workedExamples,
        }
      : result

  await writeJson(ref, 'questions.json', merged)
  return merged
}
