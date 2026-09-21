import { z } from 'zod'

// ClassroomAgent's WebSocket message contracts (IMPLEMENTATION_PLAN.md §5,
// realtime-agent-engineer.md: "a typed message protocol lives in packages/core", every incoming
// message Zod-validated). questionTable mirrors attempts.question_table's CHECK constraint.
const questionTable = z.enum(['textbook_questions', 'generated_questions'])

export const teacherMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('goToTopic'), topicId: z.string() }),
  z.object({ type: z.literal('askQuestion'), questionId: z.string(), questionTable }),
  z.object({ type: z.literal('revealAnswer') }),
  z.object({ type: z.literal('endSession') }),
])

export const studentMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), studentId: z.string() }),
  z.object({ type: z.literal('answer'), questionId: z.string(), questionTable, response: z.string() }),
])

export type TeacherMessage = z.infer<typeof teacherMessageSchema>
export type StudentMessage = z.infer<typeof studentMessageSchema>

// Sent privately (connection.send, never broadcast) to the student who submitted an answer —
// other students only ever see the aggregate answeredCount in shared state.
export interface AnswerResult {
  type: 'answerResult'
  correct: boolean
  score: number
  feedback: string
}

// ClassroomAgent's shared state (IMPLEMENTATION_PLAN.md §5). A plain TS type, not a Zod schema —
// it's produced by the trusted server and synced to clients via the Agents SDK's own state
// channel, never parsed from untrusted input. Shared between worker/ (the agent that owns it)
// and web/ (useAgent<ClassroomState>) so both sides describe the same shape from one place.
export type ClassroomMode = 'teach' | 'question' | 'review'

export interface ClassroomState {
  sessionId: string | null
  classId: string | null
  chapterId: string | null
  currentTopicId: string | null
  mode: ClassroomMode
  activeQuestionId: string | null
  connectedStudentCount: number
  answeredCount: number
}
