import { z } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Never call the real Claude API in tests (test-engineer.md) — mock the SDK client and the
// file-based ai_runs logger (so a failing test doesn't scribble into the real digest/out/
// ai_runs.jsonl that real digest runs also write to).
const streamMock = vi.fn()
class FakeAnthropic {
  messages = { stream: streamMock }
}
vi.mock('@anthropic-ai/sdk', () => ({ default: FakeAnthropic }))
vi.mock('../../src/lib/aiRunsLog.js', () => ({ logAiRun: vi.fn().mockResolvedValue(undefined) }))

const { callStrict } = await import('../../src/lib/anthropic.js')

function mockResponse(input: unknown) {
  return {
    finalMessage: () =>
      Promise.resolve({
        content: [{ type: 'tool_use', name: 'record_thing', input }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
  }
}

describe('callStrict', () => {
  beforeEach(() => {
    streamMock.mockReset()
  })

  it('retries once on schema-invalid output, then throws if it stays invalid', async () => {
    streamMock.mockReturnValue(mockResponse({ wrongField: true }))

    await expect(
      callStrict({
        purpose: 'test',
        promptVersion: 'v1',
        systemPrompt: 'system',
        userPrompt: 'user',
        toolName: 'record_thing',
        toolDescription: 'records a thing',
        schema: z.object({ requiredField: z.string() }),
      }),
    ).rejects.toThrow('test failed after retry')

    expect(streamMock).toHaveBeenCalledTimes(2) // One retry, per CLAUDE.md rule 2.
  })

  it('succeeds without retrying when the first response already validates', async () => {
    streamMock.mockReturnValue(mockResponse({ requiredField: 'ok' }))

    const result = await callStrict({
      purpose: 'test',
      promptVersion: 'v1',
      systemPrompt: 'system',
      userPrompt: 'user',
      toolName: 'record_thing',
      toolDescription: 'records a thing',
      schema: z.object({ requiredField: z.string() }),
    })

    expect(result).toEqual({ requiredField: 'ok' })
    expect(streamMock).toHaveBeenCalledTimes(1)
  })
})
