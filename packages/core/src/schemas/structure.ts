import { z } from 'zod'

// P1: chapter title + exercise labels extracted from the chapter's own pages. Chapter number
// and page range are computed by our own code (see digest/src/cli.ts), not sent to Claude —
// these single-chapter source files have no contents page to read.
export const structureSchema = z.object({
  title: z.string(),
  exercises: z.array(
    z.object({
      label: z.string(),
      orderIndex: z.number().int(),
    }),
  ),
})

export type Structure = z.infer<typeof structureSchema>
