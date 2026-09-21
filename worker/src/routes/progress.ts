import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { getProgressGrid, getStudentTopicSummary } from '../db/queries/progress.js'
import { getStudent } from '../db/queries/people.js'
import { summarizeProgress } from '../ai/summarizeProgress.js'

export const progress = new Hono<{ Bindings: Env }>()

progress.get('/classes/:classId', async (c) => {
  const rows = await getProgressGrid(getDb(c.env), c.req.param('classId'))
  return c.json(rows)
})

progress.get('/students/:studentId/summary', async (c) => {
  const db = getDb(c.env)
  const studentId = c.req.param('studentId')
  const [student, topics] = await Promise.all([getStudent(db, studentId), getStudentTopicSummary(db, studentId)])
  if (!student) return c.json({ error: 'not found' }, 404)
  if (topics.length === 0) return c.json({ summary: `${student.name} has no recorded attempts yet.` })

  const summary = await summarizeProgress(c.env, db, { studentName: student.name, topics })
  return c.json({ summary })
})
