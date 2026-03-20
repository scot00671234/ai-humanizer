import { config } from '../config'

const LANGUAGE_MAP: Record<string, string> = {
  same: 'the same language as the input text',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  ja: 'Japanese',
  zh: 'Chinese',
}

export type HumanizeIntensity = 'light' | 'medium' | 'strong'

export type RewriteOptions = {
  language?: string
  context?: string
  tone?: string
  /** Optional audience, channel, or assignment - steers vocabulary and formality. */
  documentContext?: string
  intensity?: HumanizeIntensity
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Tone: Clear and professional. Polished but still human - avoid stiff corporatese.',
  'business-casual': 'Tone: Approachable and confident. Conversational without being sloppy.',
  academic: 'Tone: Scholarly and precise. Appropriate for papers, grants, and formal academic settings.',
  technical: 'Tone: Direct and precise. Favor concrete terms; keep explanations tight.',
  concise: 'Tone: Short and punchy. Cut filler; keep every sentence earning its place.',
  'achievement-focused': 'Tone: Outcome-led. Emphasize results and specifics where the source supports them.',
  casual: 'Tone: Relaxed and friendly. Like a knowledgeable peer - not stiff, not slang-heavy.',
  creative: 'Tone: Vivid and engaging. Slightly more personality and rhythm; still truthful to the source.',
  simple: 'Tone: Plain language. Short words, simple sentences, easy for any reader to follow.',
}

const INTENSITY_HINTS: Record<HumanizeIntensity, string> = {
  light: 'Make light edits: fix obvious AI-ish phrasing and rhythm, preserve most original wording and structure.',
  medium: 'Balanced rewrite: noticeably more natural rhythm and vocabulary while keeping meaning and structure similar.',
  strong: 'Strong pass: vary sentence length aggressively, replace generic AI patterns, restructure where it helps clarity - still no new facts.',
}

function buildRewritePrompt(text: string, options: RewriteOptions): string {
  const langKey = (options.language || 'same').toLowerCase()
  const languageInstruction = LANGUAGE_MAP[langKey] ?? (langKey === 'same' ? 'the same language as the input text' : langKey)
  const intensityKey: HumanizeIntensity =
    options.intensity === 'light' || options.intensity === 'strong' ? options.intensity : 'medium'
  const intensityHint = INTENSITY_HINTS[intensityKey]

  const ctx = options.documentContext?.trim()
  const ctxBlock = ctx
    ? [
        '',
        'CONTEXT FROM USER (use to steer audience, channel, and formality - do not invent facts):',
        ctx.slice(0, 8000),
      ].join('\n')
    : ''

  const extraInstructions = options.context?.trim() ?? ''
  const userRequestedEmDash =
    /em\s*-?\s*dash|u\+?2014/.test(extraInstructions.toLowerCase())

  const parts: string[] = [
    `You are an expert editor helping people make writing sound more natural and human.`,
    `Rewrite the passage so it reads like a thoughtful human wrote it: varied sentence length, more natural word choice, and smoother flow.`,
    `Reduce "template AI" phrasing and stock transitions. Watch for phrases like: "delve into", "landscape", "leverage", "it is important to note", "furthermore", "moreover", "in conclusion", "in summary", "robust", "employ".`,
    ``,
    `Rules:`,
    `- Output in ${languageInstruction}.`,
    `- Preserve meaning, facts, numbers, and claims - do NOT add employers, credentials, or events not present in the source.`,
    `- Keep the same general format (bullets stay bullets, paragraphs stay paragraphs). Do not add or remove bullet items or headings.`,
    `- Vary sentence openings and structure. Avoid repeating the same grammatical pattern back-to-back.`,
    `- Prefer active voice when it fits the meaning. Avoid passive constructions unless they are already in the source.`,
    `- Use concrete verbs and specific nouns where they already exist in the source. Do not introduce new details.`,
    `- Keep the same grammatical person (first/third) as the source; do not switch "I" vs neutral voice unless the source does.`,
    `- Use contractions where the source would naturally use them (avoid switching to unnatural formality).`,
    userRequestedEmDash
      ? `- Em dash punctuation (U+2014) is allowed when it naturally fits.`
      : `- Do NOT use em dash punctuation (U+2014). If the source contains em dashes, replace them with commas, periods, or semicolons.`,
    `- Avoid hedge-stacking and generic certainty (e.g., "it is important to note", "it is crucial", "this highlights").`,
    `- ${intensityHint}`,
    `- Do NOT add a preamble, title, or meta-commentary.`,
    `- Return ONLY the rewritten text.`,
  ]

  const toneKey = (options.tone || 'professional').toLowerCase().replace(/\s+/g, '-')
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] ?? TONE_INSTRUCTIONS.professional
  parts.push('', toneInstruction)
  if (options.context?.trim()) {
    parts.push('', 'Additional instructions from the user:', options.context.trim().slice(0, 500))
  }
  if (ctxBlock) parts.push(ctxBlock)
  parts.push('', '---', '', 'TEXT TO HUMANIZE:', '', text)
  return parts.join('\n')
}

export type DeepSeekResult = { text: string; usage: { prompt_tokens: number; completion_tokens: number } }

export async function rewriteWithDeepSeek(text: string, options: RewriteOptions = {}): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const userContent = buildRewritePrompt(text, options)
  const intensityKey: HumanizeIntensity =
    options.intensity === 'light' || options.intensity === 'strong' ? options.intensity : 'medium'
  // Slightly higher temps help the model escape "same-cadence" rewrites while the prompt rules prevent fact drift.
  const temperature = intensityKey === 'light' ? 0.3 : intensityKey === 'strong' ? 0.58 : 0.42

  const maxTokens = Math.min(2048, 600 + Math.ceil(text.length / 4))

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `DeepSeek API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  const usage = data.usage ?? {}
  const prompt_tokens = usage.prompt_tokens ?? 0
  const completion_tokens = usage.completion_tokens ?? 0

  return {
    text: content,
    usage: { prompt_tokens, completion_tokens },
  }
}

/** Breakdown: higher = more natural / less AI-like in that dimension. */
export type NaturalnessBreakdown = {
  rhythm: number
  specificity: number
  voice: number
  toneFit: number
}

export type ScoreAiResult = {
  /** 0–100: higher = reads more natural / less generically AI-like */
  score: number
  breakdown: NaturalnessBreakdown
  /** Phrases that often read as generic or overused - user can humanize these */
  keywords: string[]
  notes?: string
  usage: { prompt_tokens: number; completion_tokens: number }
}

function clamp01to100(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return ''
  return text.slice(start, end + 1)
}

export type AnalyzeOptions = {
  documentContext?: string
  targetTone?: string
}

function buildNaturalnessScorePrompt(text: string, options: AnalyzeOptions): string {
  const ctx = options.documentContext?.trim()
  const tone = options.targetTone?.trim()
  const ctxBlock = ctx
    ? `\nUSER CONTEXT (audience/channel - use only to judge tone fit, not to invent facts):\n${ctx.slice(0, 4000)}\n`
    : ''
  const toneBlock = tone
    ? `\nTARGET TONE HINT: "${tone.slice(0, 80)}" - score toneFit how well the text matches this intent.\n`
    : ''

  return [
    `You are an expert writing coach focused on clarity and natural human voice.`,
    `Task: rate how natural and human-like the following text reads (not factual accuracy).`,
    `Higher scores = less generic, less "template AI" cadence, more varied rhythm, more specific wording.`,
    ``,
    `Return ONLY valid JSON (no markdown, no commentary) with this shape:`,
    `{"score":0-100,"breakdown":{"rhythm":0-100,"specificity":0-100,"voice":0-100,"toneFit":0-100},"keywords":["..."],"notes":"optional short note"}`,
    ``,
    `Field meanings (all 0-100, higher is better for naturalness):`,
    `- rhythm: sentence length variety and flow; penalize monotonous same-length sentences.`,
    `- specificity: concrete nouns/verbs vs vague filler ("various", "robust", "leverage").`,
    `- voice: human connective tissue; penalize clichés and stock AI transitions.`,
    `- toneFit: if context or tone hint given, alignment with that audience; if none, set toneFit to the same as voice (neutral target).`,
    `- keywords: up to 24 short phrases (2-5 words) in the text that are the best candidates to rewrite - generic, repetitive, or AI-flavored.`,
    `- score: overall naturalness; should be roughly consistent with the breakdown.`,
    ctxBlock,
    toneBlock,
    ``,
    `TEXT:`,
    text.trim().slice(0, 12_000),
  ].join('\n')
}

export async function scoreWithDeepSeek(
  documentText: string,
  options: AnalyzeOptions = {}
): Promise<ScoreAiResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set')

  const userContent = buildNaturalnessScorePrompt(documentText, options)

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 520,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `DeepSeek API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
  const jsonText = extractFirstJsonObject(raw)
  if (!jsonText) throw new Error('AI analysis returned no JSON')

  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('AI analysis returned invalid JSON')
  }

  const breakdownRaw = parsed?.breakdown ?? {}
  const result: ScoreAiResult = {
    score: clamp01to100(parsed?.score),
    breakdown: {
      rhythm: clamp01to100(breakdownRaw?.rhythm),
      specificity: clamp01to100(breakdownRaw?.specificity),
      voice: clamp01to100(breakdownRaw?.voice),
      toneFit: clamp01to100(breakdownRaw?.toneFit),
    },
    keywords: Array.isArray(parsed?.keywords)
      ? parsed.keywords.filter((x: any) => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean).slice(0, 30)
      : [],
    notes: typeof parsed?.notes === 'string' ? parsed.notes.slice(0, 280) : undefined,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  }

  const approx = Math.round(
    result.breakdown.rhythm * 0.28 +
      result.breakdown.specificity * 0.27 +
      result.breakdown.voice * 0.25 +
      result.breakdown.toneFit * 0.2
  )
  if (Math.abs(result.score - approx) > 18) {
    result.score = approx
  }

  return result
}

export type LengthAdjustDirection = 'shorten' | 'expand'

export async function adjustLengthWithDeepSeek(
  documentText: string,
  direction: LengthAdjustDirection,
  documentContext?: string
): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const ctx = documentContext?.trim()
  const ctxTail = ctx
    ? `\n\nCONTEXT (steer register and audience only; do not invent facts):\n${ctx.slice(0, 6000)}`
    : ''

  const shortenPrompt = `You are an expert editor. Shorten the following text while preserving all important meaning, facts, and structure type (keep lists as lists). Remove redundancy and filler. Aim for roughly 60-75% of the length. Do NOT use em dash punctuation (U+2014). Return ONLY the shortened text, no preamble.${ctxTail}

---
Text:
${documentText.slice(0, 24_000)}`

  const expandPrompt = `You are an expert editor. Expand the following text with useful detail and smoother transitions while preserving all original facts - do NOT invent statistics, employers, or credentials. Aim for roughly 125-150% of the length. Do NOT use em dash punctuation (U+2014). Return ONLY the expanded text, no preamble.${ctxTail}

---
Text:
${documentText.slice(0, 20_000)}`

  const userContent = direction === 'expand' ? expandPrompt : shortenPrompt

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: direction === 'expand' ? 4096 : 3072,
      temperature: 0.35,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `DeepSeek API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  const usage = data.usage ?? {}
  return {
    text: content,
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
    },
  }
}
