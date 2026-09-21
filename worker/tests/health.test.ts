import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'

describe('GET /api/health', () => {
  it('reports D1 and R2 bindings as ok', async () => {
    const response = await SELF.fetch('https://example.com/api/health')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ db: 'ok', r2: 'ok' })
  })
})
