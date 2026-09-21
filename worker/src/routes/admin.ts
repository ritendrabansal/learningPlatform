import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { getAiRunsSummary, listRecentAiRuns } from '../db/queries/audit.js'
import { requireAccess } from '../middleware/requireAccess.js'

export const admin = new Hono<{ Bindings: Env }>()
admin.use('*', requireAccess) // Cost data is teacher/admin-only.

admin.get('/ai-runs/summary', async (c) => {
  const rows = await getAiRunsSummary(getDb(c.env))
  return c.json(rows)
})

admin.get('/ai-runs/recent', async (c) => {
  const rows = await listRecentAiRuns(getDb(c.env))
  return c.json(rows)
})
