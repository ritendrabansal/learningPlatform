import { describe, expect, it } from 'vitest'
// @ts-expect-error -- Vite's `?raw` suffix inlines the file's text at bundle time (no runtime
// filesystem access, which the Workers test runtime doesn't have); no type declaration for it.
import curriculumSource from '../../src/db/queries/curriculum.ts?raw'

// CLAUDE.md hard rule 1: curriculum tables are frozen at runtime — only the digest CLI's seed
// step and the Review Queue approve/edit route (worker/src/db/queries/review.ts) may write to
// them. This turns that invariant into something that fails loudly if anyone ever adds a write
// helper to curriculum.ts by mistake, rather than relying solely on code review to catch it.
describe('curriculum.ts stays read-only', () => {
  it('contains no db.insert/update/delete calls', () => {
    expect(curriculumSource).not.toMatch(/db\.(insert|update|delete)\(/)
  })
})
