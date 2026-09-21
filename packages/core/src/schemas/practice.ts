import { z } from 'zod'
import { questionKindSchema } from './questions.js'

// HomeworkAgent's last-resort practice generation (IMPLEMENTATION_PLAN.md §5: "only if still
// short, generates new ones with Sonnet ... grounded in the frozen content_md, saves them to
// generated_questions as draft"). Mirrors generated_questions' columns 1:1 (minus id/model/
// prompt_version/verified/status, which the caller fills in at insert time).
export const practiceQuestionSchema = z.object({
  kind: questionKindSchema,
  promptMd: z.string(),
  answerMd: z.string(),
  difficulty: z.string().nullable(),
})

export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>
