import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { createSession, getClassByJoinCode, listClasses } from '../db/queries/classroom.js'
import { requireAccess } from '../middleware/requireAccess.js'

export const classroom = new Hono<{ Bindings: Env }>()

classroom.get('/classes', async (c) => {
  const rows = await listClasses(getDb(c.env))
  return c.json(rows)
})

classroom.get('/classes/:joinCode', async (c) => {
  const result = await getClassByJoinCode(getDb(c.env), c.req.param('joinCode').toUpperCase())
  if (!result) return c.json({ error: 'not found' }, 404)
  return c.json(result)
})

classroom.post('/sessions', requireAccess, async (c) => {
  const body = await c.req.json<{ classId: string; chapterId: string }>()
  const session = await createSession(getDb(c.env), body)
  return c.json(session)
})
