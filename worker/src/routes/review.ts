import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { getChapterDetail } from '../db/queries/curriculum.js'
import {
  approveChapter,
  approveQuestion,
  approveTopic,
  editQuestion,
  editTopic,
  listOpenFlagsForChapter,
  listReviewableChapters,
  rejectQuestion,
  rejectTopic,
  resolveFlag,
} from '../db/queries/review.js'

export const review = new Hono<{ Bindings: Env }>()

review.get('/queue', async (c) => {
  const rows = await listReviewableChapters(getDb(c.env))
  return c.json(rows)
})

review.get('/chapters/:id', async (c) => {
  const db = getDb(c.env)
  const chapterId = c.req.param('id')
  const [detail, flags] = await Promise.all([getChapterDetail(db, chapterId), listOpenFlagsForChapter(db, chapterId)])
  if (!detail) return c.json({ error: 'not found' }, 404)
  return c.json({ ...detail, flags })
})

review.post('/chapters/:id/approve', async (c) => {
  const chapter = await approveChapter(getDb(c.env), c.req.param('id'))
  return c.json(chapter)
})

interface TopicAction {
  action: 'approve' | 'edit' | 'reject'
  title?: string
  summary?: string | null
  contentMd?: string
}

review.patch('/topics/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json<TopicAction>()
  const { action, ...patch } = body
  switch (action) {
    case 'approve':
      return c.json(await approveTopic(db, id, patch))
    case 'edit':
      return c.json(await editTopic(db, id, patch))
    case 'reject':
      return c.json(await rejectTopic(db, id))
    default:
      return c.json({ error: `unknown action "${action}"` }, 400)
  }
})

interface QuestionAction {
  action: 'approve' | 'edit' | 'reject'
  promptMd?: string
  answerMd?: string | null
  difficulty?: string | null
}

review.patch('/questions/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json<QuestionAction>()
  const { action, ...patch } = body
  switch (action) {
    case 'approve':
      return c.json(await approveQuestion(db, id, patch))
    case 'edit':
      return c.json(await editQuestion(db, id, patch))
    case 'reject':
      return c.json(await rejectQuestion(db, id))
    default:
      return c.json({ error: `unknown action "${action}"` }, 400)
  }
})

// For flags on items with no reviewable status column of their own (worked_examples), or as a
// manual override: resolve the flag directly without touching curriculum tables.
review.patch('/flags/:id', async (c) => {
  const flag = await resolveFlag(getDb(c.env), c.req.param('id'))
  return c.json(flag)
})
