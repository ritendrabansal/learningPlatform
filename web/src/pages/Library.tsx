import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api, type LibrarySubject } from '../lib/api.js'

const statusLabel: Record<string, string> = { draft: 'Draft', in_review: 'In review', approved: 'Approved' }

export function Library() {
  const [subjects, setSubjects] = useState<LibrarySubject[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getLibrary()
      .then(setSubjects)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) return <p className="error">{error}</p>

  return (
    <div className="library">
      <h1>Library</h1>
      {subjects.map((subject) => (
        <section key={subject.id}>
          <h2>
            {subject.name} — Class {subject.grade}
          </h2>
          {subject.books.map((book) => (
            <div key={book.id} className="book">
              <h3>{book.title}</h3>
              <ul className="chapter-list">
                {book.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Link to={`/chapters/${chapter.id}`}>
                      Chapter {chapter.number}: {chapter.title}
                    </Link>
                    <span className={`status-pill status-${chapter.status}`}>{statusLabel[chapter.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      {subjects.length === 0 && !error && <p>No chapters digested yet.</p>}
    </div>
  )
}
