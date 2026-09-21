import { z } from 'zod'

// P2: topics in reading order, book's wording kept (lightly cleaned), maths -> LaTeX.
// Mirrors worker/src/db/schema/curriculum.ts's `topics` columns directly.
export const topicSchema = z.object({
  orderIndex: z.number().int(),
  title: z.string(),
  contentMd: z.string(),
  sourcePages: z.array(z.number().int()).min(1),
})

export const contentSchema = z.object({
  topics: z.array(topicSchema).min(1),
})

export type Topic = z.infer<typeof topicSchema>
export type Content = z.infer<typeof contentSchema>
