import { Hono } from 'hono'

export const health = new Hono<{ Bindings: Env }>()

health.get('/', async (c) => {
  let db: 'ok' | 'error' = 'error'
  let r2: 'ok' | 'error' = 'error'

  try {
    await c.env.DB.prepare('SELECT 1').first()
    db = 'ok'
  } catch {
    db = 'error'
  }

  try {
    await c.env.PDFS.list({ limit: 1 })
    r2 = 'ok'
  } catch {
    r2 = 'error'
  }

  const ok = db === 'ok' && r2 === 'ok'
  return c.json({ db, r2 }, ok ? 200 : 503)
})
