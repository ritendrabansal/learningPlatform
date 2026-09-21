import { useCallback, useEffect, useState } from 'react'
import { api, type ReviewChapterDetail, type ReviewFlag, type ReviewQueueRow, type TextbookQuestion, type Topic } from '../lib/api.js'
import { MarkdownContent } from '../components/MarkdownContent.js'
import { PdfPage } from '../components/PdfPage.js'

function flagFor(flags: ReviewFlag[], itemId: string): ReviewFlag | undefined {
  return flags.find((f) => f.itemId === itemId && !f.resolved)
}

function FlagBanner({ flag }: { flag: ReviewFlag }) {
  return (
    <div className="flag-banner">
      <strong>{flag.pass} flag:</strong> {flag.issue}
      {flag.recomputed && (
        <div className="recomputed">
          expected: <code>{flag.recomputed.expected}</code> — recomputed: <code>{flag.recomputed.computed}</code>
        </div>
      )}
    </div>
  )
}

function SourcePages({ pdfUrl, pages }: { pdfUrl: string; pages: number[] }) {
  return (
    <div className="source-pages">
      {pages.map((page) => (
        <PdfPage key={page} pdfUrl={pdfUrl} pageNumber={page} width={320} />
      ))}
    </div>
  )
}

function TopicReviewCard({ topic, flag, pdfUrl, onChanged }: { topic: Topic; flag?: ReviewFlag; pdfUrl: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(topic.contentMd)

  return (
    <div className={`review-item ${flag ? 'flagged' : ''}`}>
      <div className="review-item-source">
        <SourcePages pdfUrl={pdfUrl} pages={topic.sourcePages} />
      </div>
      <div className="review-item-content">
        <h4>Topic: {topic.title}</h4>
        {flag && <FlagBanner flag={flag} />}
        {editing ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} />
        ) : (
          <MarkdownContent verified={topic.status === 'approved'}>{topic.contentMd}</MarkdownContent>
        )}
        <div className="review-actions">
          {editing ? (
            <>
              <button onClick={() => api.approveTopic(topic.id, { contentMd: draft }).then(onChanged)}>Save &amp; approve</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => api.approveTopic(topic.id).then(onChanged)}>Approve</button>
              <button onClick={() => setEditing(true)}>Edit</button>
              <button onClick={() => api.rejectTopic(topic.id).then(onChanged)}>Reject</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionReviewCard({
  question,
  flag,
  pdfUrl,
  onChanged,
}: {
  question: TextbookQuestion
  flag?: ReviewFlag
  pdfUrl: string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [promptDraft, setPromptDraft] = useState(question.promptMd)
  const [answerDraft, setAnswerDraft] = useState(question.answerMd ?? '')

  return (
    <div className={`review-item ${flag ? 'flagged' : ''}`}>
      <div className="review-item-source">
        <SourcePages pdfUrl={pdfUrl} pages={question.sourcePages} />
      </div>
      <div className="review-item-content">
        <h4>Question{question.exerciseLabel ? ` (${question.exerciseLabel})` : ''}</h4>
        {flag && <FlagBanner flag={flag} />}
        {editing ? (
          <>
            <textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} rows={4} placeholder="Question" />
            <textarea value={answerDraft} onChange={(e) => setAnswerDraft(e.target.value)} rows={6} placeholder="Answer" />
          </>
        ) : (
          <>
            <MarkdownContent>{question.promptMd}</MarkdownContent>
            {question.answerMd && (
              <MarkdownContent aiGenerated={question.answerSource === 'ai_worked'} verified={question.verified}>
                {question.answerMd}
              </MarkdownContent>
            )}
          </>
        )}
        <div className="review-actions">
          {editing ? (
            <>
              <button
                onClick={() => api.approveQuestion(question.id, { promptMd: promptDraft, answerMd: answerDraft }).then(onChanged)}
              >
                Save &amp; approve
              </button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => api.approveQuestion(question.id).then(onChanged)}>Approve</button>
              <button onClick={() => setEditing(true)}>Edit</button>
              <button onClick={() => api.rejectQuestion(question.id).then(onChanged)}>Reject</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReviewQueue() {
  const [queue, setQueue] = useState<ReviewQueueRow[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ReviewChapterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadQueue = useCallback(() => {
    api
      .getReviewQueue()
      .then((rows) => {
        setQueue(rows)
        setSelectedChapterId((current) => current ?? rows[0]?.chapterId ?? null)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  useEffect(loadQueue, [loadQueue])

  const loadDetail = useCallback(() => {
    if (!selectedChapterId) return
    api
      .getReviewChapter(selectedChapterId)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [selectedChapterId])

  useEffect(loadDetail, [loadDetail])

  const refresh = useCallback(() => {
    loadQueue()
    loadDetail()
  }, [loadQueue, loadDetail])

  if (error) return <p className="error">{error}</p>

  return (
    <div className="review-queue">
      <h1>Review Queue</h1>

      <div className="chapter-tabs">
        {queue.map((row) => (
          <button
            key={row.chapterId}
            className={row.chapterId === selectedChapterId ? 'active' : ''}
            onClick={() => setSelectedChapterId(row.chapterId)}
          >
            Ch. {row.chapterNumber}: {row.chapterTitle} ({row.openFlags} open flag{row.openFlags === 1 ? '' : 's'})
            {row.chapterStatus === 'approved' && ' ✓'}
          </button>
        ))}
      </div>

      {detail && (
        <>
          <div className="chapter-header">
            <h2>{detail.chapter.title}</h2>
            <span className={`status-pill status-${detail.chapter.status}`}>{detail.chapter.status}</span>
            <button onClick={() => api.approveChapter(detail.chapter.id).then(refresh)} disabled={detail.chapter.status === 'approved'}>
              Approve chapter
            </button>
          </div>

          {[...detail.topics]
            .flatMap((topic) => [
              { kind: 'topic' as const, topic, flag: flagFor(detail.flags, topic.id) },
              ...topic.questions.map((question) => ({ kind: 'question' as const, question, flag: flagFor(detail.flags, question.id) })),
            ])
            .sort((a, b) => Number(!!b.flag) - Number(!!a.flag))
            .map((entry) =>
              entry.kind === 'topic' ? (
                <TopicReviewCard
                  key={`topic-${entry.topic.id}`}
                  topic={entry.topic}
                  flag={entry.flag}
                  pdfUrl={api.chapterPdfUrl(detail.chapter.id)}
                  onChanged={refresh}
                />
              ) : (
                <QuestionReviewCard
                  key={`question-${entry.question.id}`}
                  question={entry.question}
                  flag={entry.flag}
                  pdfUrl={api.chapterPdfUrl(detail.chapter.id)}
                  onChanged={refresh}
                />
              ),
            )}
        </>
      )}
    </div>
  )
}
