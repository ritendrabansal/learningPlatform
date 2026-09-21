import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

type HealthStatus = { db: 'ok' | 'error'; r2: 'ok' | 'error' } | null

function HealthStatusFooter() {
  const [health, setHealth] = useState<HealthStatus>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth({ db: 'error', r2: 'error' }))
  }, [])

  if (!health) return null
  const ok = health.db === 'ok' && health.r2 === 'ok'
  return (
    <footer className={`health-footer ${ok ? 'ok' : 'error'}`}>
      D1: {health.db} · R2: {health.r2}
    </footer>
  )
}

function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-title">NCERT Class 9 AI Learning Platform</span>
        <NavLink to="/" end>
          Library
        </NavLink>
        <NavLink to="/review">Review Queue</NavLink>
        <NavLink to="/teach">Teach Mode</NavLink>
        <NavLink to="/join">Join Class</NavLink>
        <NavLink to="/progress">Progress</NavLink>
        <NavLink to="/homework">Homework</NavLink>
        <NavLink to="/admin/costs">AI Costs</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
      <HealthStatusFooter />
    </div>
  )
}

export default App
