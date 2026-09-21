import { describe, expect, it } from 'vitest'
import { scoreAnswerLocally } from '../../src/lib/scoreAnswer.js'

describe('scoreAnswerLocally (mcq/numeric — no AI call)', () => {
  it('matches text answers case- and whitespace-insensitively', () => {
    expect(scoreAnswerLocally('Paris', '  paris  ').correct).toBe(true)
    expect(scoreAnswerLocally('Paris', 'London').correct).toBe(false)
  })

  it('matches numeric answers by value, not exact string', () => {
    expect(scoreAnswerLocally('4', '4.0').correct).toBe(true)
    expect(scoreAnswerLocally('4', '5').correct).toBe(false)
  })

  it('gives full score on correct and zero on incorrect', () => {
    expect(scoreAnswerLocally('4', '4').score).toBe(1)
    expect(scoreAnswerLocally('4', '5').score).toBe(0)
  })
})
