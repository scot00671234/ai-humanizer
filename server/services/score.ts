const STOPWORDS = new Set(
  'a an the and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must can this that these those it its we you our your they their them not all any some more most other such than then into out up down over also just only very when where what which who how why about into through during before after above below between under again further once here there each few both same own than'.split(
    ' '
  )
)

const STRONG_VERBS = new Set(
  'led delivered improved built achieved increased reduced managed developed implemented created launched optimized streamlined transformed executed coordinated designed established expanded generated drove spearheaded accelerated scaled mentored negotiated resolved strengthened automated migrated architected refined pioneered exceeded surpassed owned shipped deployed analyzed facilitated mentored recruited hired trained'.split(
    ' '
  )
)

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
}

/** Job-desc terms weighted by repetition (what the posting emphasizes). Capped for a fair match rate. */
function extractKeywords(jobDesc: string): string[] {
  const tokens = tokenize(jobDesc)
  const freq = new Map<string, number>()
  for (const t of tokens) {
    if (t.length < 3 || STOPWORDS.has(t)) continue
    freq.set(t, (freq.get(t) || 0) + 1)
  }
  if (freq.size === 0) return []
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return sorted.slice(0, 55).map(([w]) => w)
}

function keywordScore(resumeText: string, keywords: string[]): number {
  if (keywords.length === 0) return 75
  const lower = resumeText.toLowerCase()
  let match = 0
  for (const k of keywords) {
    if (lower.includes(k)) match++
  }
  return Math.round((match / keywords.length) * 100)
}

/** Strong action verbs as a share of resume words (typical good resumes ~2–6%). */
function verbStrengthScore(resumeText: string): number {
  const tokens = tokenize(resumeText)
  if (tokens.length < 8) return 45
  let count = 0
  for (const t of tokens) {
    if (STRONG_VERBS.has(t)) count++
  }
  const ratio = count / tokens.length
  const scaled = Math.round(ratio * 2200)
  return Math.min(100, Math.max(35, scaled))
}

function lengthScore(resumeText: string): number {
  const lines = resumeText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return 55
  let penalty = 0
  for (const line of lines) {
    if (line.length < 10) penalty += 4
    if (line.length > 240) penalty += 6
  }
  return Math.max(45, 100 - Math.min(50, penalty))
}

function atsSafetyScore(resumeText: string): number {
  let score = 100
  if (/\t[\t\s]+|\s{4,}/.test(resumeText)) score -= 18
  if (/│|┌|┐|└|┘|═|║/.test(resumeText)) score -= 22
  if (/^#{2,}\s/m.test(resumeText)) score -= 12
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(resumeText)) score -= 15
  return Math.max(40, score)
}

export type ScoreResult = {
  score: number
  breakdown: { keyword: number; verbStrength: number; length: number; atsSafety: number }
  keywords: string[]
}

const WEIGHTS = { keyword: 0.42, verbStrength: 0.22, length: 0.16, atsSafety: 0.2 }

export function computeScore(resumeText: string, jobDescription: string): ScoreResult {
  const keywords = extractKeywords(jobDescription)
  const keyword = keywordScore(resumeText, keywords)
  const verbStrength = verbStrengthScore(resumeText)
  const length = lengthScore(resumeText)
  const atsSafety = atsSafetyScore(resumeText)
  const breakdown = { keyword, verbStrength, length, atsSafety }
  const score = Math.round(
    keyword * WEIGHTS.keyword +
      verbStrength * WEIGHTS.verbStrength +
      length * WEIGHTS.length +
      atsSafety * WEIGHTS.atsSafety
  )
  return { score: Math.min(100, Math.max(0, score)), breakdown, keywords }
}
