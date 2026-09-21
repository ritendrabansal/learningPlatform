import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// One document load per pdfUrl, shared across every <PdfPage> rendering a different page of the
// same chapter (Review Queue renders several source pages beside their digested items at once).
const documentCache = new Map<string, Promise<PDFDocumentProxy>>()
function loadDocument(pdfUrl: string): Promise<PDFDocumentProxy> {
  let cached = documentCache.get(pdfUrl)
  if (!cached) {
    cached = pdfjsLib.getDocument({ url: pdfUrl }).promise
    documentCache.set(pdfUrl, cached)
  }
  return cached
}

interface PdfPageProps {
  pdfUrl: string
  /** 1-indexed page number, matching source_pages values throughout the schema. */
  pageNumber: number
  width?: number
}

export function PdfPage({ pdfUrl, pageNumber, width = 360 }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    loadDocument(pdfUrl)
      .then((doc) => doc.getPage(pageNumber))
      .then((page) => {
        if (cancelled) return
        const viewport = page.getViewport({ scale: 1 })
        const scale = width / viewport.width
        const scaledViewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        const context = canvas.getContext('2d')
        if (!context) return
        return page.render({ canvas, canvasContext: context, viewport: scaledViewport }).promise
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [pdfUrl, pageNumber, width])

  if (error) return <div className="pdf-page-error">Could not load page {pageNumber}: {error}</div>
  return <canvas ref={canvasRef} className="pdf-page" aria-label={`Source PDF page ${pageNumber}`} />
}
