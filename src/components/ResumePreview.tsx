import { useMemo, type ReactNode } from 'react'

type ResumePreviewProps = {
  originalContent: string
  currentContent: string
  keywords?: string[]
  className?: string
}

function highlightKeywords(text: string, keywords: string[]): ReactNode[] {
  if (!keywords?.length) return [text]
  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const sorted = [...keywords].sort((a, b) => b.length - a.length)
  for (const kw of sorted) {
    const idx = lower.indexOf(kw.toLowerCase(), lastIndex)
    if (idx === -1) continue
    parts.push(text.slice(lastIndex, idx))
    parts.push(<mark key={`${idx}-${kw}`} className="resumePreviewHighlight">{text.slice(idx, idx + kw.length)}</mark>)
    lastIndex = idx + kw.length
  }
  parts.push(text.slice(lastIndex))
  return parts
}

export default function ResumePreview({ originalContent, currentContent, keywords, className }: ResumePreviewProps) {
  const originalLines = useMemo(() => originalContent.split(/\n/).filter(Boolean), [originalContent])
  const currentLines = useMemo(() => currentContent.split(/\n/).filter(Boolean), [currentContent])

  return (
    <div className={`resumePreview ${className ?? ''}`}>
      <div className="resumePreviewPanel">
        <h3 className="resumePreviewTitle">Original</h3>
        <div className="resumePreviewContent">
          {originalLines.length ? originalLines.map((l, i) => <p key={i}>{l}</p>) : <p className="resumePreviewMuted">No content yet.</p>}
        </div>
      </div>
      <div className="resumePreviewPanel">
        <h3 className="resumePreviewTitle">Current</h3>
        <div className="resumePreviewContent resumePreviewCurrent">
          {currentLines.length
            ? currentLines.map((line, i) => (
                <p key={i}>{keywords?.length ? highlightKeywords(line, keywords) : line}</p>
              ))
            : <p className="resumePreviewMuted">No content yet.</p>}
        </div>
      </div>
    </div>
  )
}
