import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, type ChapterDetail } from '../lib/api.js'
import { MarkdownContent } from '../components/MarkdownContent.js'

export function ChapterView() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const [detail, setDetail] = useState<ChapterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chapterId) return
    setDetail(null)
    api
      .getChapter(chapterId)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [chapterId])

  if (error) return <p className="error">{error}</p>
  if (!detail) return <p>Loading…</p>

  return (
    <div className="chapter-view">
      <p>
        <Link to="/">← Library</Link>
      </p>
      <h1>
        Chapter {detail.chapter.number}: {detail.chapter.title}
      </h1>

      {detail.topics.map((topic) => (
        <section key={topic.id} className="topic">
          <h2>{topic.title}</h2>
          {topic.summary && <p className="topic-summary">{topic.summary}</p>}
          <MarkdownContent verified={topic.status === 'approved'}>{topic.contentMd}</MarkdownContent>

          {topic.keyTerms.length > 0 && (
            <dl className="key-terms">
              {topic.keyTerms.map((term) => (
                <div key={term.id}>
                  <dt>{term.term}</dt>
                  <dd>{term.meaning}</dd>
                </div>
              ))}
            </dl>
          )}

          {topic.workedExamples.map((example) => (
            <div key={example.id} className="worked-example">
              <h4>Worked example</h4>
              <MarkdownContent>{example.promptMd}</MarkdownContent>
              <MarkdownContent>{example.solutionMd}</MarkdownContent>
            </div>
          ))}

          {topic.questions.length > 0 && (
            <div className="questions">
              <h3>Questions</h3>
              {topic.questions.map((q) => (
                <div key={q.id} className="question">
                  {q.exerciseLabel && <p className="exercise-label">{q.exerciseLabel}</p>}
                  <MarkdownContent>{q.promptMd}</MarkdownContent>
                  {q.answerMd && (
                    <details>
                      <summary>Answer</summary>
                      <MarkdownContent aiGenerated={q.answerSource === 'ai_worked'} verified={q.verified}>
                        {q.answerMd}
                      </MarkdownContent>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
