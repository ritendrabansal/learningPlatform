import { useCallback, useEffect, useState } from 'react'
import { useAgent } from 'agents/react'
import type { AnswerResult, ClassroomState, StudentMessage } from 'ncert-core'
import { api, type ChapterDetail, type ClassByCode, type StudentRow } from '../lib/api.js'
import { MarkdownContent } from '../components/MarkdownContent.js'

function JoinForm({ onJoined }: { onJoined: (info: ClassByCode & { joinCode: string; studentId: string }) => void }) {
  const [joinCode, setJoinCode] = useState('')
  const [classInfo, setClassInfo] = useState<ClassByCode | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function lookUp() {
    setError(null)
    try {
      const info = await api.getClassByCode(joinCode.trim().toUpperCase())
      setClassInfo(info)
    } catch {
      setError('No class found with that code.')
    }
  }

  if (classInfo) {
    if (!classInfo.activeSessionId) {
      return <p>No live class right now for {classInfo.class.name}. Ask your teacher to start one.</p>
    }
    return (
      <div className="join-roster">
        <h1>{classInfo.class.name}</h1>
        <p>Tap your name to join:</p>
        <ul>
          {classInfo.students.map((student: StudentRow) => (
            <li key={student.id}>
              <button onClick={() => onJoined({ ...classInfo, joinCode: classInfo.class.joinCode, studentId: student.id })}>
                {student.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="join-form">
      <h1>Join a class</h1>
      <input
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
        placeholder="Class code"
        maxLength={8}
        autoCapitalize="characters"
      />
      <button disabled={!joinCode.trim()} onClick={() => void lookUp()}>
        Find class
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function StudentSession({ sessionId, classId, studentId }: { sessionId: string; classId: string; studentId: string }) {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [response, setResponse] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)

  const agent = useAgent<ClassroomState>({
    agent: 'classroom-agent',
    name: sessionId,
    // chapterId is deliberately omitted — only the teacher's connection seeds it (see
    // ClassroomAgent.onConnect); the student learns it from agent.state once connected.
    query: { role: 'student', studentId, sessionId, classId },
    onMessage: (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const parsed = JSON.parse(event.data) as AnswerResult
        if (parsed.type === 'answerResult') setResult(parsed)
      } catch {
        // Not an AnswerResult — ignore (e.g. the SDK's own internal protocol frames).
      }
    },
  })

  const send = useCallback((message: StudentMessage) => agent.send(JSON.stringify(message)), [agent])

  useEffect(() => {
    send({ type: 'join', studentId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (agent.state?.chapterId) api.getChapter(agent.state.chapterId).then(setChapter)
  }, [agent.state?.chapterId])

  const topics = chapter?.topics ?? []
  const currentTopic = topics.find((t) => t.id === agent.state?.currentTopicId) ?? topics[0]
  const activeQuestion = currentTopic?.questions.find((q) => q.id === agent.state?.activeQuestionId)

  // Reset the answer box each time a new question is asked.
  useEffect(() => {
    setResponse('')
    setResult(null)
  }, [agent.state?.activeQuestionId])

  function submit() {
    if (!activeQuestion || !response.trim()) return
    send({ type: 'answer', questionId: activeQuestion.id, questionTable: 'textbook_questions', response: response.trim() })
  }

  if (!chapter || !agent.state) return <p>Connecting…</p>

  return (
    <div className="student-view">
      {agent.state.mode === 'teach' && currentTopic && (
        <>
          <h1>{currentTopic.title}</h1>
          <MarkdownContent>{currentTopic.contentMd}</MarkdownContent>
        </>
      )}

      {agent.state.mode !== 'teach' && activeQuestion && (
        <div className="active-question">
          <h1>Question</h1>
          <MarkdownContent>{activeQuestion.promptMd}</MarkdownContent>

          {agent.state.mode === 'question' && !result && (
            <div className="answer-box">
              <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Your answer" />
              <button disabled={!response.trim()} onClick={submit}>
                Submit
              </button>
            </div>
          )}

          {result && (
            <div className={`answer-result ${result.correct ? 'correct' : 'incorrect'}`}>
              <strong>{result.correct ? 'Correct!' : 'Not quite.'}</strong> {result.feedback}
            </div>
          )}

          {agent.state.mode === 'review' && activeQuestion.answerMd && (
            <MarkdownContent aiGenerated={activeQuestion.answerSource === 'ai_worked'}>{activeQuestion.answerMd}</MarkdownContent>
          )}
        </div>
      )}
    </div>
  )
}

export function StudentView() {
  const [joined, setJoined] = useState<(ClassByCode & { joinCode: string; studentId: string }) | null>(null)

  if (!joined) return <JoinForm onJoined={setJoined} />
  if (!joined.activeSessionId) return <p>The session ended.</p>

  return <StudentSession sessionId={joined.activeSessionId} classId={joined.class.id} studentId={joined.studentId} />
}
