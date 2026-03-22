/**
 * Deterministic surface signals aligned with features commonly used in AI-generated
 * text detection research (variance / "burstiness", repetition, vocabulary diversity,
 * stock discourse markers). Not a classifier — feeds the LLM rubric with hard metrics.
 */

const STOCK_PHRASES = [
  'it is important to note',
  "it's important to note",
  'it is worth noting',
  "it's worth noting",
  'it is crucial to',
  'delve into',
  'delve deeper',
  'robust framework',
  'robust solution',
  'leverage the',
  'leveraging the',
  'in conclusion',
  'in summary',
  'to summarize',
  'furthermore',
  'moreover',
  'plays a crucial role',
  'play a crucial role',
  'pivotal role',
  'holistic approach',
  'deep dive',
  'cutting-edge',
  'cutting edge',
  'ever-evolving',
  'ever evolving',
  'seamless integration',
  'paradigm shift',
  'moving forward',
  'going forward',
  'at the end of the day',
  'tapestry of',
  'multifaceted',
  'underscores the importance',
  'sheds light on',
  'unlock value',
  'foster collaboration',
  'rich tapestry',
  'in today\'s fast-paced',
  'in today’s fast-paced',
  'stands as a testament',
  'testament to the',
]

function stripHtml(s: string): string {
  return s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeWords(s: string): string[] {
  const m = s.toLowerCase().match(/\b[a-z0-9']{2,}\b/g)
  return m ?? []
}

function splitSentences(s: string): string[] {
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t) return []
  const parts = t.split(/(?<=[.!?])\s+/)
  return parts.map((x) => x.trim()).filter(Boolean)
}

function mean(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0
  const m = mean(nums)
  const v = mean(nums.map((x) => (x - m) ** 2))
  return Math.sqrt(v)
}

function countPhraseHits(normalized: string): { phrase: string; count: number }[] {
  const hits: { phrase: string; count: number }[] = []
  for (const phrase of STOCK_PHRASES) {
    const needle = phrase.toLowerCase()
    let count = 0
    let i = 0
    while (i < normalized.length) {
      const j = normalized.indexOf(needle, i)
      if (j === -1) break
      const before = j === 0 || !/\w/.test(normalized[j - 1]!)
      const after = j + needle.length >= normalized.length || !/\w/.test(normalized[j + needle.length]!)
      if (before && after) count++
      i = j + Math.max(1, needle.length)
    }
    if (count > 0) hits.push({ phrase, count })
  }
  hits.sort((a, b) => b.count - a.count)
  return hits.slice(0, 12)
}

function repeatedBigrams(tokens: string[]): { bigram: string; count: number }[] {
  const counts = new Map<string, number>()
  for (let i = 0; i < tokens.length - 1; i++) {
    const key = `${tokens[i]} ${tokens[i + 1]}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([bigram, count]) => ({ bigram, count }))
}

export type NaturalnessSignalBundle = {
  wordCount: number
  sentenceCount: number
  sentenceLengthMean: number
  sentenceLengthStdev: number
  /** stdev/mean; very low often indicates uniform cadence (machine-like in stylometry). */
  sentenceLengthCv: number
  /** Unique / total tokens (length ≥2); very low suggests repetitive/smooth surface. */
  typeTokenRatio: number
  /** Share of tokens that are stopwords (rough register signal). */
  stopwordRatio: number
  stockPhraseTotalHits: number
  stockPhraseTop: { phrase: string; count: number }[]
  repeatedBigrams: { bigram: string; count: number }[]
  meanWordLength: number
}

const STOPWORDS = new Set(
  [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'by', 'with', 'from',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its',
    'i', 'you', 'we', 'they', 'he', 'she', 'them', 'our', 'your', 'their', 'not', 'no', 'so', 'if', 'than',
    'then', 'there', 'here', 'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'into', 'over',
    'also', 'just', 'about', 'out', 'up', 'down',
  ].map((w) => w.toLowerCase()),
)

/**
 * Computes metrics from plain or HTML-ish text (HTML tags stripped).
 * Safe to call on user drafts up to ~12k chars (aligned with score prompt cap).
 */
export function computeNaturalnessSignalBundle(raw: string): NaturalnessSignalBundle {
  const plain = stripHtml(raw).slice(0, 12_000)
  const normalized = plain.toLowerCase().replace(/\s+/g, ' ')
  const sentences = splitSentences(plain)
  const sentenceWordCounts = sentences.map((sent) => {
    const w = sent.match(/\b[a-z0-9']+\b/gi)
    return w?.length ?? 0
  })
  const sc = sentenceWordCounts.filter((n) => n > 0)
  const sentenceCount = sc.length
  const sentenceLengthMean = sc.length ? mean(sc) : 0
  const sentenceLengthStdev = sc.length >= 2 ? stdev(sc) : 0
  const sentenceLengthCv =
    sentenceLengthMean > 0.5 ? Math.round((sentenceLengthStdev / sentenceLengthMean) * 1000) / 1000 : 0

  const tokens = tokenizeWords(plain)
  const wordCount = tokens.length
  const unique = new Set(tokens)
  const typeTokenRatio =
    wordCount > 0 ? Math.round((unique.size / wordCount) * 1000) / 1000 : 0

  let stop = 0
  for (const t of tokens) {
    if (STOPWORDS.has(t)) stop++
  }
  const stopwordRatio = wordCount > 0 ? Math.round((stop / wordCount) * 1000) / 1000 : 0

  const stockTop = countPhraseHits(normalized)
  const stockPhraseTotalHits = stockTop.reduce((a, h) => a + h.count, 0)

  const bigrams = repeatedBigrams(tokens)

  const wordsForLen = plain.match(/\b[a-z0-9']+\b/gi) ?? []
  const meanWordLength =
    wordsForLen.length > 0
      ? Math.round((wordsForLen.reduce((sum, w) => sum + w.length, 0) / wordsForLen.length) * 10) / 10
      : 0

  return {
    wordCount,
    sentenceCount,
    sentenceLengthMean: Math.round(sentenceLengthMean * 10) / 10,
    sentenceLengthStdev: Math.round(sentenceLengthStdev * 10) / 10,
    sentenceLengthCv,
    typeTokenRatio,
    stopwordRatio,
    stockPhraseTotalHits,
    stockPhraseTop: stockTop,
    repeatedBigrams: bigrams,
    meanWordLength,
  }
}

/** Compact JSON block for the scoring LLM (keeps prompt size bounded). */
export function formatSignalBundleForPrompt(bundle: NaturalnessSignalBundle): string {
  return JSON.stringify(bundle)
}
