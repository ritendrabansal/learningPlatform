import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { getHomeworkForStudent, getHomeworkItem, recordHomeworkSubmission } from '../db/queries/homework.js'
import { scoreAnswerLocally, scoreAnswerWithAi } from '../lib/scoreAnswer.js'

export const homework = new Hono<{ Bindings: Env }>()

homework.get('/students/:studentId', async (c) => {
  const sets = await getHomeworkForStudent(getDb(c.env), c.req.param('studentId'))
  return c.json(sets)
})

homework.post('/items/:itemId/submit', async (c) => {
  const db = getDb(c.env)
  const itemId = c.req.param('itemId')
  const { response } = await c.req.json<{ response: string }>()

  const found = await getHomeworkItem(db, itemId)
  if (!found?.question) return c.json({ error: 'not found' }, 404)

  const { question } = found
  const result =
    question.kind === 'mcq' || question.kind === 'numeric'
      ? scoreAnswerLocally(question.answerMd ?? '', response)
      : await scoreAnswerWithAi(c.env, db, { questionPromptMd: question.promptMd, modelAnswerMd: question.answerMd ?? '', studentResponse: response })

  const submission = await recordHomeworkSubmission(db, { itemId, response, correct: result.correct, score: result.score, feedback: result.feedback })
  return c.json(submission)
})
