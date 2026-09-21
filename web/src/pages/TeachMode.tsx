import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAgent } from 'agents/react'
import type { ClassroomState, TeacherMessage } from 'ncert-core'
import { api, type ChapterDetail, type ClassRow, type LibrarySubject } from '../lib/api.js'
import { MarkdownContent } from '../components/MarkdownContent.js'

function TeachModeSetup() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<LibrarySubject[]>([])
  const [classId, setClassId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.listClasses(), api.getLibrary()])
      .then(([classRows, subjectRows]) => {
        setClasses(classRows)
        setSubjects(subjectRows)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const chapterOptions = subjects.flatMap((subject) =>
    subject.books.flatMap((book) =>
      book.chapters.map((chapter) => ({
        id: chapter.id,
        label: `${subject.name} — ${book.title} — Ch. ${chapter.number}: ${chapter.title}`,
      })),
    ),
  )

  async function start() {
    if (!classId || !chapterId) return
    const session = await api.startSession({ classId, chapterId })
    navigate(`/teach/${session.id}`, { state: { classId, chapterId } })
  }

  if (error) return <p className="error">{error}</p>

  return (
    <div className="teach-setup">
      <h1>Start a class session</h1>
      <label>
        Class
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (code {c.joinCode})
            </option>
          ))}
        </select>
      </label>
      <label>
        Chapter
        <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
          <option value="">Select…</option>
          {chapterOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button disabled={!classId || !chapterId} onClick={() => void start()}>
        Start session
      </button>
    </div>
  )
}

function TeachModeSession({ sessionId, classId, chapterId }: { sessionId: string; classId: string; chapterId: string }) {
  const navigate = useNavigate()
  const [chapter, setChapter] = useState<ChapterDetail | null>(null)

  useEffect(() => {
    api.getChapter(chapterId).then(setChapter)
  }, [chapterId])

  const agent = useAgent<ClassroomState>({
    agent: 'classroom-agent',
    name: sessionId,
    query: { role: 'teacher', sessionId, classId, chapterId },
  })

  const send = useCallback((message: TeacherMessage) => agent.send(JSON.stringify(message)), [agent])

  const topics = chapter?.topics ?? []
  const currentIndex = topics.findIndex((t) => t.id === agent.state?.currentTopicId)
  const currentTopic = currentIndex >= 0 ? topics[currentIndex] : topics[0]

  const goNext = useCallback(() => {
    const next = topics[currentIndex + 1] ?? topics[0]
    if (next) send({ type: 'goToTopic', topicId: next.id })
  }, [topics, currentIndex, send])

  const askFirstQuestion = useCallback(() => {
    const question = currentTopic?.questions[0]
    if (question) send({ type: 'askQuestion', questionId: question.id, questionTable: 'textbook_questions' })
  }, [currentTopic, send])

  const reveal = useCallback(() => send({ type: 'revealAnswer' }), [send])
  const end = useCallback(() => {
    send({ type: 'endSession' })
    navigate('/teach')
  }, [send, navigate])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key.toLowerCase() === 'q') askFirstQuestion()
      else if (e.key.toLowerCase() === 'r') reveal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, askFirstQuestion, reveal])

  // Auto-select the first topic once both the chapter and the connection are ready.
  useEffect(() => {
    if (chapter && agent.state && !agent.state.currentTopicId && topics[0]) {
      send({ type: 'goToTopic', topicId: topics[0].id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, agent.state?.currentTopicId])

  if (!chapter || !agent.state) return <p>Connecting…</p>

  const activeQuestion = currentTopic?.questions.find((q) => q.id === agent.state?.activeQuestionId)

  return (
    <div className="teach-mode">
      <div className="teach-header">
        <span>{agent.state.connectedStudentCount} student(s) connected</span>
        <span>{agent.state.answeredCount} answered</span>
        <button onClick={end}>End session</button>
      </div>

      <h1>{currentTopic?.title}</h1>
      {currentTopic && <MarkdownContent>{currentTopic.contentMd}</MarkdownContent>}

      {agent.state.mode !== 'teach' && activeQuestion && (
        <div className="active-question">
          <h2>Question</h2>
          <MarkdownContent>{activeQuestion.promptMd}</MarkdownContent>
          {agent.state.mode === 'review' && activeQuestion.answerMd && (
            <MarkdownContent aiGenerated={activeQuestion.answerSource === 'ai_worked'}>{activeQuestion.answerMd}</MarkdownContent>
          )}
        </div>
      )}

      <p className="teach-shortcuts">→ next topic · Q ask question · R reveal answer</p>
    </div>
  )
}

export function TeachMode() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const location = useLocation()

  if (!sessionId) return <TeachModeSetup />

  const state = location.state as { classId?: string; chapterId?: string } | null
  if (!state?.classId || !state?.chapterId) {
    return <p className="error">Missing session context — start a new session instead of reloading this page directly.</p>
  }

  return <TeachModeSession sessionId={sessionId} classId={state.classId} chapterId={state.chapterId} />
}
