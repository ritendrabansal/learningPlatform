import { useEffect, useState } from 'react'
import { api, type AiRun, type AiRunsSummaryRow } from '../lib/api.js'

export function AdminCosts() {
  const [summary, setSummary] = useState<AiRunsSummaryRow[]>([])
  const [recent, setRecent] = useState<AiRun[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getAiRunsSummary(), api.getRecentAiRuns()])
      .then(([s, r]) => {
        setSummary(s)
        setRecent(r)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) return <p className="error">{error}</p>

  const totalCost = summary.reduce((sum, row) => sum + row.totalCostUsd, 0)

  return (
    <div className="admin-costs">
      <h1>AI cost view</h1>
      <p>
        Total spend: <strong>${totalCost.toFixed(4)}</strong>
      </p>

      <h2>By purpose / model</h2>
      <table className="progress-grid">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Model</th>
            <th>Calls</th>
            <th>Ok</th>
            <th>Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <tr key={`${row.purpose}:${row.model}`}>
              <td>{row.purpose}</td>
              <td>{row.model}</td>
              <td>{row.count}</td>
              <td>{row.okCount}</td>
              <td>${row.totalCostUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent runs</h2>
      <table className="progress-grid">
        <thead>
          <tr>
            <th>When</th>
            <th>Purpose</th>
            <th>Model</th>
            <th>Tokens (in/out)</th>
            <th>Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((run) => (
            <tr key={run.id}>
              <td>{new Date(run.createdAt).toLocaleString()}</td>
              <td>{run.purpose}</td>
              <td>{run.model}</td>
              <td>
                {run.inputTokens}/{run.outputTokens}
              </td>
              <td>${run.costUsd.toFixed(4)}</td>
              <td>{run.ok ? 'ok' : `error: ${run.error}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
