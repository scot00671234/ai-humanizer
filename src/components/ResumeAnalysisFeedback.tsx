import { useMemo } from 'react'

const BREAKDOWN_LABELS: Record<string, string> = {
  rhythm: 'Sentence rhythm',
  specificity: 'Specificity',
  voice: 'Natural voice',
  toneFit: 'Tone fit',
}

type ResumeAnalysisFeedbackProps = {
  score: number
  breakdown: Record<string, number> | null
  keywords: string[]
  resumeText: string
  notes?: string
  className?: string
}

/** Naturalness score, breakdown, and phrases the model flags for humanizing. */
export default function ResumeAnalysisFeedback({
  score,
  breakdown,
  keywords,
  resumeText,
  notes,
  className = '',
}: ResumeAnalysisFeedbackProps) {
  const lowerText = resumeText.toLowerCase()

  const focusPhrases = useMemo(() => {
    if (!keywords.length) return []
    return keywords.filter((k) => lowerText.includes(k.toLowerCase()))
  }, [keywords, lowerText])

  const tips = useMemo(() => {
    const list: string[] = []
    if (!breakdown) return list
    if ((breakdown.rhythm ?? 100) < 65) {
      list.push('Mix short, direct sentences with a few longer ones so the rhythm feels less uniform.')
    }
    if ((breakdown.specificity ?? 100) < 65) {
      list.push('Swap vague words (e.g. “various”, “robust”, “leverage”) for concrete nouns and verbs.')
    }
    if ((breakdown.voice ?? 100) < 65) {
      list.push('Cut stock transitions and AI clichés; use simpler connectors you’d say out loud.')
    }
    if ((breakdown.toneFit ?? 100) < 60) {
      list.push('Adjust formality and word choice so they match your audience (see optional context).')
    }
    return list
  }, [breakdown])

  return (
    <div className={`resumeAnalysisFeedback ${className}`}>
      <div className="resumeAnalysisScoreRow">
        <span className="resumeAnalysisScoreLabel">Naturalness</span>
        <span className="resumeAnalysisScoreValue">
          {score}<span className="resumeAnalysisScoreMax">/100</span>
        </span>
      </div>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="resumeAnalysisBreakdown">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="resumeAnalysisBreakdownItem">
              <span className="resumeAnalysisBreakdownLabel">{BREAKDOWN_LABELS[key] ?? key}</span>
              <div className="resumeAnalysisBreakdownBarWrap">
                <div
                  className="resumeAnalysisBreakdownBar"
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                  role="presentation"
                />
              </div>
              <span className="resumeAnalysisBreakdownValue">{value}</span>
            </div>
          ))}
        </div>
      )}

      {(focusPhrases.length > 0 || keywords.length > 0) && (
        <div className="resumeAnalysisBlock">
          <h4 className="resumeAnalysisBlockTitle">Phrases to refine</h4>
          <p className="resumeAnalysisBlockHint">
            {focusPhrases.length > 0
              ? 'Select these in the editor and run Humanize, or rewrite them manually.'
              : 'Candidates from the model — search for them in your text if they don’t match exactly.'}
          </p>
          <div className="resumeAnalysisTags">
            {(focusPhrases.length > 0 ? focusPhrases : keywords).slice(0, 24).map((kw) => (
              <span key={kw} className="resumeAnalysisTag">{kw}</span>
            ))}
            {(focusPhrases.length > 0 ? focusPhrases : keywords).length > 24 && (
              <span className="resumeAnalysisTag resumeAnalysisTagMuted">
                +{(focusPhrases.length > 0 ? focusPhrases : keywords).length - 24} more
              </span>
            )}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="resumeAnalysisBlock">
          <h4 className="resumeAnalysisBlockTitle">Suggestions</h4>
          <ul className="resumeAnalysisTips">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {typeof notes === 'string' && notes.trim() && (
        <div className="resumeAnalysisBlock">
          <h4 className="resumeAnalysisBlockTitle">Coach notes</h4>
          <p className="resumeAnalysisBlockHint">{notes.trim()}</p>
        </div>
      )}
    </div>
  )
}
