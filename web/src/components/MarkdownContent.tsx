import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MarkdownContentProps {
  children: string
  /** Shows an "AI-generated" badge — set when the content's answerSource is 'ai_worked'. */
  aiGenerated?: boolean
  /** Shows a verified tick — set from a row's `verified` boolean or `status === 'approved'`. */
  verified?: boolean
}

export function MarkdownContent({ children, aiGenerated, verified }: MarkdownContentProps) {
  return (
    <div className="markdown-content">
      {(aiGenerated || verified) && (
        <div className="content-badges">
          {aiGenerated && <span className="badge badge-ai">AI-generated</span>}
          {verified && (
            <span className="badge badge-verified" title="Verified">
              ✓ Verified
            </span>
          )}
        </div>
      )}
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
