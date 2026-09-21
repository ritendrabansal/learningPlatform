import { useEffect, useState } from 'react'

type HealthStatus = { db: 'ok' | 'error'; r2: 'ok' | 'error' } | null

function App() {
  const [health, setHealth] = useState<HealthStatus>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>NCERT Class 9 AI Learning Platform</h1>
      <p>Phase 1 scaffold — worker, D1, R2, and Durable Object bindings are wired up.</p>
      <h2>/api/health</h2>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {!error && !health && <p>Loading...</p>}
      {health && (
        <ul>
          <li>D1 (DB): {health.db}</li>
          <li>R2 (PDFS): {health.r2}</li>
        </ul>
      )}
    </main>
  )
}

export default App
