import { z } from 'zod'

// P5: an independent check against source pages only — must not see P2's reasoning, only the
// source pages and the extracted items (digest-engineer.md). Flags are surfaced, never
// auto-fixed (IMPLEMENTATION_PLAN.md §4).
export const verifyItemSchema = z.object({
  itemType: z.enum(['topic', 'textbook_question', 'worked_example']),
  // Descriptive pointer back into content.json/questions.json, e.g. "topic[2]" or
  // "textbookQuestion[5]" — items don't have real D1 ids yet at verification time.
  itemRef: z.string(),
  pass: z.enum(['P2', 'P3', 'P4']),
  ok: z.boolean(),
  issue: z.string().nullable(),
  // Maths numeric re-computation only (code_execution tool).
  recomputed: z
    .object({
      expected: z.string(),
      computed: z.string(),
    })
    .nullable(),
})

export const verifyReportSchema = z.object({
  items: z.array(verifyItemSchema),
})

export type VerifyItem = z.infer<typeof verifyItemSchema>
export type VerifyReport = z.infer<typeof verifyReportSchema>
