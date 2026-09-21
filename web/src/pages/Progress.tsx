import { useEffect, useState } from 'react'
import { api, type ClassRow, type ProgressCell } from '../lib/api.js'

function scoreColor(score: number): string {
  // Simple red -> green heat-map, 0 to 1.
  const hue = Math.max(0, Math.min(1, score)) * 120
  return `hsl(${hue}, 70%, 45%)`
}

export function Progress() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [grid, setGrid] = useState<ProgressCell[]>([])
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listClasses().then(setClasses).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  useEffect(() => {
    if (!classId) return
    api.getProgressGrid(classId).then(setGrid).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [classId])

  const studentIds = [...new Set(grid.map((c) => c.studentId))]
  const topicIds = [...new Set(grid.map((c) => c.topicId))]
  const cellByKey = new Map(grid.map((c) => [`${c.studentId}:${c.topicId}`, c]))
  const studentNames = new Map(grid.map((c) => [c.studentId, c.studentName]))
  const topicTitles = new Map(grid.map((c) => [c.topicId, c.topicTitle]))

  async function loadSummary(studentId: string) {
    const { summary } = await api.getProgressSummary(studentId)
    setSummaries((prev) => ({ ...prev, [studentId]: summary }))
  }

  if (error) return <p className="error">{error}</p>

  return (
    <div className="progress-page">
      <h1>Progress</h1>
      <label>
        Class
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {classId && grid.length === 0 && <p>No attempts recorded yet for this class.</p>}

      {studentIds.length > 0 && (
        <table className="progress-grid">
          <thead>
            <tr>
              <th>Student</th>
              {topicIds.map((topicId) => (
                <th key={topicId}>{topicTitles.get(topicId)}</th>
              ))}
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {studentIds.map((studentId) => (
              <tr key={studentId}>
                <td>{studentNames.get(studentId)}</td>
                {topicIds.map((topicId) => {
                  const cell = cellByKey.get(`${studentId}:${topicId}`)
                  return (
                    <td key={topicId} style={cell ? { background: scoreColor(cell.score) } : undefined}>
                      {cell ? `${(cell.score * 100).toFixed(0)}%` : '—'}
                    </td>
                  )
                })}
                <td>
                  {summaries[studentId] ? (
                    <span>{summaries[studentId]}</span>
                  ) : (
                    <button onClick={() => void loadSummary(studentId)}>Summarize</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
