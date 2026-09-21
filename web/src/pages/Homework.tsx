import { useEffect, useState } from 'react'
import { api, type ClassByCode, type HomeworkSetWithItems, type StudentRow } from '../lib/api.js'
import { MarkdownContent } from '../components/MarkdownContent.js'

function StudentPicker({ onPicked }: { onPicked: (studentId: string) => void }) {
  const [joinCode, setJoinCode] = useState('')
  const [classInfo, setClassInfo] = useState<ClassByCode | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function lookUp() {
    setError(null)
    try {
      setClassInfo(await api.getClassByCode(joinCode.trim().toUpperCase()))
    } catch {
      setError('No class found with that code.')
    }
  }

  if (classInfo) {
    return (
      <div className="join-roster">
        <h1>{classInfo.class.name}</h1>
        <p>Tap your name to see your homework:</p>
        <ul>
          {classInfo.students.map((student: StudentRow) => (
            <li key={student.id}>
              <button onClick={() => onPicked(student.id)}>{student.name}</button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="join-form">
      <h1>Homework</h1>
      <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Class code" maxLength={8} autoCapitalize="characters" />
      <button disabled={!joinCode.trim()} onClick={() => void lookUp()}>
        Find class
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function HomeworkItemCard({ item, onSubmitted }: { item: HomeworkSetWithItems['items'][number]; onSubmitted: () => void }) {
  const [response, setResponse] = useState('')

  if (!item.question) return null

  async function submit() {
    if (!response.trim()) return
    await api.submitHomework(item.item.id, response.trim())
    onSubmitted()
  }

  return (
    <div className="homework-item">
      <p className="reason">{item.item.reason}</p>
      <MarkdownContent>{item.question.promptMd}</MarkdownContent>
      {item.submission ? (
        <div className={`answer-result ${item.submission.correct ? 'correct' : 'incorrect'}`}>
          <strong>{item.submission.correct ? 'Correct!' : 'Not quite.'}</strong> {item.submission.feedback}
        </div>
      ) : (
        <div className="answer-box">
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Your answer" />
          <button disabled={!response.trim()} onClick={() => void submit()}>
            Submit
          </button>
        </div>
      )}
    </div>
  )
}

function HomeworkList({ studentId }: { studentId: string }) {
  const [sets, setSets] = useState<HomeworkSetWithItems[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    api.getHomeworkForStudent(studentId).then(setSets).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(load, [studentId])

  if (error) return <p className="error">{error}</p>
  if (sets.length === 0) return <p>No homework yet — it's created automatically when your teacher ends a class session.</p>

  return (
    <div className="homework-list">
      {sets.map(({ set, items }) => (
        <section key={set.id} className="homework-set">
          <h2>
            Due {new Date(set.dueAt).toLocaleDateString()} — <span className={`status-pill status-${set.status}`}>{set.status}</span>
          </h2>
          {items.map((item) => (
            <HomeworkItemCard key={item.item.id} item={item} onSubmitted={load} />
          ))}
        </section>
      ))}
    </div>
  )
}

export function Homework() {
  const [studentId, setStudentId] = useState<string | null>(null)
  if (!studentId) return <StudentPicker onPicked={setStudentId} />
  return <HomeworkList studentId={studentId} />
}
