const STOPWORDS = new Set(
  'a an the and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must can this that these those it its'.split(' ')
)

const STRONG_VERBS = new Set(
  'led delivered improved built achieved increased reduced managed developed implemented created launched optimized streamlined transformed executed coordinated designed established expanded generated'.split(' ')
)

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
}

function extractKeywords(jobDesc: string): string[] {
  const tokens = tokenize(jobDesc)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function keywordScore(resumeText: string, jobDesc: string): number {
  const keywords = extractKeywords(jobDesc)
  if (keywords.length === 0) return 100
  const lower = resumeText.toLowerCase()
  let match = 0
  for (const k of keywords) {
    if (lower.includes(k)) match++
  }
  return Math.round((match / keywords.length) * 100)
}

function verbStrengthScore(resumeText: string): number {
  const tokens = tokenize(resumeText)
  let count = 0
  for (const t of tokens) {
    if (STRONG_VERBS.has(t)) count++
  }
  const bulletCount = (resumeText.match(/^[\s•\-*]\s/m) || []).length || 1
  const perBullet = count / bulletCount
  return Math.min(100, Math.round(perBullet * 15))
}

function lengthScore(resumeText: string): number {
  const bullets = resumeText.split(/\n/).filter((l) => /^[\s•\-*]|\w+/.test(l))
  let score = 100
  for (const line of bullets) {
    const len = line.trim().length
    if (len > 0 && len < 20) score -= 5
    if (len > 200) score -= 10
  }
  return Math.max(0, score)
}

function atsSafetyScore(resumeText: string): number {
  let score = 100
  if (/\t[\t\s]+|\s{4,}/.test(resumeText)) score -= 20
  if (/│|┌|┐|└|┘|═|║/.test(resumeText)) score -= 25
  if (/^#{2,}\s/m.test(resumeText)) score -= 15
  if (/[\u0000-\u001F\u007F-\u009F]/.test(resumeText)) score -= 20
  return Math.max(0, score)
}

export type ScoreResult = {
  score: number
  breakdown: { keyword: number; verbStrength: number; length: number; atsSafety: number }
  keywords: string[]
}

const WEIGHTS = { keyword: 0.4, verbStrength: 0.25, length: 0.15, atsSafety: 0.2 }

export function computeScore(resumeText: string, jobDescription: string): ScoreResult {
  const keyword = keywordScore(resumeText, jobDescription)
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
  const keywords = extractKeywords(jobDescription)
  return { score: Math.min(100, Math.max(0, score)), breakdown, keywords }
}
