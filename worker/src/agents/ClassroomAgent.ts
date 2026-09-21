import { Agent, getAgentByName, type Connection, type ConnectionContext, type WSMessage } from 'agents'
import { eq } from 'drizzle-orm'
import { studentMessageSchema, teacherMessageSchema, type AnswerResult, type ClassroomState } from 'ncert-core'
import { getDb } from '../db/client.js'
import { textbookQuestions } from '../db/schema/index.js'
import { endSession, recordAttempt, recordTopicShown, rollUpMastery, setCoverageDuration } from '../db/queries/classroom.js'
import { listStudentsForClass } from '../db/queries/people.js'
import { scoreAnswerLocally, scoreAnswerWithAi } from '../lib/scoreAnswer.js'
import type { HomeworkAgent } from './HomeworkAgent.js'

export type { ClassroomState } from 'ncert-core'

// Not part of the broadcast `state` (would either leak per-student info or is pure bookkeeping):
// when the current topic started, for `coverage.duration_s`, and which students already
// answered the active question, so a resend/reconnect can't double-count `answeredCount`.
interface Bookkeeping {
  topicShownAt: number | null
  answeredStudentIds: Set<string>
}

export class ClassroomAgent extends Agent<Env, ClassroomState> {
  initialState: ClassroomState = {
    sessionId: null,
    classId: null,
    chapterId: null,
    currentTopicId: null,
    mode: 'teach',
    activeQuestionId: null,
    connectedStudentCount: 0,
    answeredCount: 0,
  }

  private bookkeeping: Bookkeeping = { topicShownAt: null, answeredStudentIds: new Set() }

  getConnectionTags(connection: Connection, context: ConnectionContext): string[] {
    const url = new URL(context.request.url)
    const role = url.searchParams.get('role')
    const studentId = url.searchParams.get('studentId')
    const tags: string[] = []
    if (role === 'teacher') tags.push('teacher')
    if (role === 'student') tags.push('student')
    if (studentId) tags.push(`student:${studentId}`)
    return tags
  }

  onConnect(connection: Connection, context: ConnectionContext): void {
    if (connection.tags.includes('student')) {
      this.setState({ ...this.state, connectedStudentCount: this.state.connectedStudentCount + 1 })
    }
    // The Durable Object's instance name IS the session id (see routes/classroom.ts's
    // POST /sessions and web's useAgent({ name: sessionId })), but the instance has no built-in
    // way to read its own name back — the teacher's first connection passes it (plus classId/
    // chapterId) as query params so every client, including students who only know the session
    // id, can rely on state instead of a separate lookup.
    if (!this.state.sessionId) {
      const url = new URL(context.request.url)
      const sessionId = url.searchParams.get('sessionId')
      const classId = url.searchParams.get('classId')
      const chapterId = url.searchParams.get('chapterId')
      if (sessionId) this.setState({ ...this.state, sessionId, classId, chapterId })
    }
  }

  onClose(connection: Connection): void {
    if (connection.tags.includes('student')) {
      this.setState({ ...this.state, connectedStudentCount: Math.max(0, this.state.connectedStudentCount - 1) })
    }
  }

  async onMessage(connection: Connection, raw: WSMessage): Promise<void> {
    if (typeof raw !== 'string') return
    const isTeacher = connection.tags.includes('teacher')
    const parsed = JSON.parse(raw) as unknown

    if (isTeacher) {
      const result = teacherMessageSchema.safeParse(parsed)
      if (!result.success) return
      await this.handleTeacherMessage(result.data)
      return
    }

    const result = studentMessageSchema.safeParse(parsed)
    if (!result.success) return
    await this.handleStudentMessage(connection, result.data)
  }

  private async handleTeacherMessage(message: import('ncert-core').TeacherMessage): Promise<void> {
    const db = getDb(this.env)

    switch (message.type) {
      case 'goToTopic': {
        if (this.state.currentTopicId && this.state.sessionId && this.bookkeeping.topicShownAt) {
          const durationS = Math.round((Date.now() - this.bookkeeping.topicShownAt) / 1000)
          await setCoverageDuration(db, this.state.sessionId, this.state.currentTopicId, durationS)
        }
        this.bookkeeping.topicShownAt = Date.now()
        this.bookkeeping.answeredStudentIds = new Set()
        if (this.state.sessionId) await recordTopicShown(db, this.state.sessionId, message.topicId)
        this.setState({ ...this.state, currentTopicId: message.topicId, mode: 'teach', activeQuestionId: null, answeredCount: 0 })
        break
      }
      case 'askQuestion': {
        this.bookkeeping.answeredStudentIds = new Set()
        this.setState({ ...this.state, mode: 'question', activeQuestionId: message.questionId, answeredCount: 0 })
        break
      }
      case 'revealAnswer': {
        this.setState({ ...this.state, mode: 'review' })
        break
      }
      case 'endSession': {
        if (this.state.sessionId) {
          if (this.state.currentTopicId && this.bookkeeping.topicShownAt) {
            const durationS = Math.round((Date.now() - this.bookkeeping.topicShownAt) / 1000)
            await setCoverageDuration(db, this.state.sessionId, this.state.currentTopicId, durationS)
          }
          await endSession(db, this.state.sessionId)
          await rollUpMastery(db, this.state.sessionId)

          if (this.state.classId) {
            const sessionId = this.state.sessionId
            const roster = await listStudentsForClass(db, this.state.classId)
            for (const student of roster) {
              const homeworkAgent = await getAgentByName<Env, HomeworkAgent>(this.env.HOMEWORK_AGENT, student.id)
              await homeworkAgent.generateHomework({ studentId: student.id, sessionId })
            }
          }
        }
        break
      }
    }
  }

  private async handleStudentMessage(connection: Connection, message: import('ncert-core').StudentMessage): Promise<void> {
    if (message.type === 'join') return // Presence is already tracked via connection tags/count.

    const studentId = connection.tags.find((tag) => tag.startsWith('student:'))?.slice('student:'.length)
    if (!studentId) return
    if (!this.state.sessionId || this.state.mode !== 'question' || message.questionId !== this.state.activeQuestionId) return
    if (this.bookkeeping.answeredStudentIds.has(studentId)) return // One answer per question per student.

    const db = getDb(this.env)
    const [question] =
      message.questionTable === 'textbook_questions'
        ? await db.select().from(textbookQuestions).where(eq(textbookQuestions.id, message.questionId))
        : []
    if (!question || !question.answerMd) return

    const result =
      question.kind === 'mcq' || question.kind === 'numeric'
        ? scoreAnswerLocally(question.answerMd, message.response)
        : await scoreAnswerWithAi(this.env, db, { questionPromptMd: question.promptMd, modelAnswerMd: question.answerMd, studentResponse: message.response })

    await recordAttempt(db, {
      sessionId: this.state.sessionId,
      studentId,
      questionId: message.questionId,
      questionTable: message.questionTable,
      response: message.response,
      correct: result.correct,
      score: result.score,
      feedback: result.feedback,
    })

    this.bookkeeping.answeredStudentIds.add(studentId)
    this.setState({ ...this.state, answeredCount: this.state.answeredCount + 1 })

    const answerResult: AnswerResult = { type: 'answerResult', correct: result.correct, score: result.score, feedback: result.feedback }
    connection.send(JSON.stringify(answerResult))
  }
}
