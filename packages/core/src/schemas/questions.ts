import { z } from 'zod'

// Matches worker/src/db/schema/curriculum.ts's `questionKind` vocabulary exactly.
export const questionKindSchema = z.enum(['mcq', 'short', 'long', 'numeric', 'fill', 'match'])

// P3 extracts these with answerMd/answerSource null wherever the book prints no answer; P4
// (run second, same file) fills them in. `topicOrderIndex`/`exerciseLabel` are join keys back
// into structure.json/content.json (both keyed by orderIndex/label, not real ids yet — P9
// resolves them to the real chapter/topic ids at seed time).
export const textbookQuestionSchema = z.object({
  topicOrderIndex: z.number().int(),
  exerciseLabel: z.string().nullable(),
  kind: questionKindSchema,
  promptMd: z.string(),
  answerMd: z.string().nullable(),
  answerSource: z.enum(['textbook', 'ai_worked']).nullable(),
  difficulty: z.string().nullable(),
  sourcePages: z.array(z.number().int()).min(1),
})

// Maths only.
export const workedExampleSchema = z.object({
  topicOrderIndex: z.number().int(),
  promptMd: z.string(),
  solutionMd: z.string(),
  sourcePages: z.array(z.number().int()).min(1),
})

export const questionsSchema = z.object({
  textbookQuestions: z.array(textbookQuestionSchema),
  workedExamples: z.array(workedExampleSchema),
})

export type TextbookQuestion = z.infer<typeof textbookQuestionSchema>
export type WorkedExample = z.infer<typeof workedExampleSchema>
export type Questions = z.infer<typeof questionsSchema>
