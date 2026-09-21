import { Agent } from 'agents'
import { MODELS } from 'ncert-core'
import { getDb } from '../db/client.js'
import {
  addHomeworkItem,
  createHomeworkSet,
  findApprovedGeneratedQuestions,
  findUnusedTextbookQuestions,
  findWeakTopics,
  getKeyTermsForTopic,
  insertGeneratedQuestion,
  markSetOverdueIfIncomplete,
} from '../db/queries/homework.js'
import { generatePracticeQuestion } from '../ai/generatePracticeQuestion.js'

const PROMPT_VERSION = 'v1'
const QUESTIONS_PER_TOPIC = 2
const DUE_IN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

// One instance per student (IMPLEMENTATION_PLAN.md §5). `generateHomework` is called by
// ClassroomAgent.endSession via getAgentByName(env.HOMEWORK_AGENT, studentId) — a plain public
// method, i.e. standard Durable Object server-to-server RPC, not the client-facing
// `unstable_callable` decorator ClassroomAgent's own client protocol deliberately avoids.
export interface HomeworkState {
  studentId: string | null
  activeSetId: string | null
  reminderSentAt: number | null
}

export class HomeworkAgent extends Agent<Env, HomeworkState> {
  initialState: HomeworkState = {
    studentId: null,
    activeSetId: null,
    reminderSentAt: null,
  }

  async generateHomework({ studentId, sessionId }: { studentId: string; sessionId: string }): Promise<void> {
    const db = getDb(this.env)
    const weakTopics = await findWeakTopics(db, studentId, sessionId)
    if (weakTopics.length === 0) return // Nothing weak this session — no homework to assign.

    const now = new Date()
    const dueAt = new Date(now.getTime() + DUE_IN_MS)
    const set = await createHomeworkSet(db, { studentId, sessionId, dueAt, model: MODELS.GENERATE, promptVersion: PROMPT_VERSION })

    for (const { topic, score } of weakTopics) {
      const reason = `weak on topic "${topic.title}" (mastery ${score.toFixed(2)})`
      let remaining = QUESTIONS_PER_TOPIC

      const unused = await findUnusedTextbookQuestions(db, studentId, topic.id, remaining)
      for (const question of unused) {
        await addHomeworkItem(db, { setId: set.id, questionId: question.id, questionTable: 'textbook_questions', reason })
      }
      remaining -= unused.length

      if (remaining > 0) {
        const approved = await findApprovedGeneratedQuestions(db, topic.id, remaining)
        for (const question of approved) {
          await addHomeworkItem(db, { setId: set.id, questionId: question.id, questionTable: 'generated_questions', reason })
        }
        remaining -= approved.length
      }

      for (let i = 0; i < remaining; i += 1) {
        const keyTerms = await getKeyTermsForTopic(db, topic.id)
        const generated = await generatePracticeQuestion(this.env, db, { topicTitle: topic.title, contentMd: topic.contentMd, keyTerms })
        const saved = await insertGeneratedQuestion(db, { topicId: topic.id, model: MODELS.GENERATE, promptVersion: PROMPT_VERSION, ...generated })
        await addHomeworkItem(db, { setId: set.id, questionId: saved.id, questionTable: 'generated_questions', reason })
      }
    }

    this.setState({ studentId, activeSetId: set.id, reminderSentAt: null })

    const reminderAt = new Date(now.getTime() + (dueAt.getTime() - now.getTime()) / 2)
    await this.schedule(reminderAt, 'sendReminder', { setId: set.id })
    await this.schedule(dueAt, 'markOverdue', { setId: set.id })
  }

  // There's no notification channel yet (email/push is a later phase) — this is a structural
  // placeholder for where a reminder would be sent, not an actual delivery.
  async sendReminder(_payload: { setId: string }): Promise<void> {
    this.setState({ ...this.state, reminderSentAt: Date.now() })
  }

  async markOverdue(payload: { setId: string }): Promise<void> {
    await markSetOverdueIfIncomplete(getDb(this.env), payload.setId)
  }
}
