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

export type EditorMode = 'resume' | 'job_application'

export type RewriteOptions = {
  language?: string
  context?: string
  tone?: string
  mode?: EditorMode
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Tone: Formal and polished. Sound authoritative and experienced. Standard for corporate roles.',
  'business-casual': 'Tone: Approachable and confident but still polished. Slightly warmer than formal corporate; good for startups and culture-fit roles.',
  academic: 'Tone: Formal and scholarly. Emphasize research, publications, teaching, and credentials. Suited for academic or research positions.',
  technical: 'Tone: Precise and impact-focused. Lead with metrics, tools, and systems. Emphasize scale, performance, and concrete outcomes.',
  concise: 'Tone: Short and punchy. Fewer words per bullet; maximum impact. Cut filler and redundancy.',
  'achievement-focused': 'Tone: Lead with results and numbers. Start bullets with outcomes (%, $, time saved). Quantify impact wherever possible.',
}

function buildRewritePrompt(text: string, options: RewriteOptions): string {
  const langKey = (options.language || 'same').toLowerCase()
  const languageInstruction = LANGUAGE_MAP[langKey] ?? (langKey === 'same' ? 'the same language as the input text' : langKey)
  const mode = options.mode === 'job_application' ? 'job_application' : 'resume'

  const resumeIntro = `You are an expert resume editor. Rewrite the following resume content so it is strong, ATS-friendly, and professional.`
  const jobAppIntro = `You are an expert at job applications and cover letters. The following text is from a job application (e.g. cover letter, application form answers, or personal statement). Rewrite it to be strong, tailored to the role, and professional. For cover letters: keep a letter tone and address the reader. For application answers: keep answers concise and impact-focused.`

  const parts: string[] = [
    mode === 'job_application' ? jobAppIntro : resumeIntro,
    `Rules:`,
    `- Output in ${languageInstruction}.`,
    `- PRESERVE STRUCTURE: Keep the same number of bullets, paragraphs, and line breaks. Do NOT merge multiple bullets or paragraphs into one sentence. Improve each bullet/paragraph in place.`,
    `- Use strong action verbs (e.g. Led, Delivered, Improved, Built, Launched).`,
    `- Add or keep concrete metrics and outcomes where relevant (%, $, time saved, team size).`,
    `- Be concise; remove filler. No generic phrases.`,
    `- Return ONLY the rewritten text, no preamble or explanation.`,
  ]
  const toneKey = (options.tone || 'professional').toLowerCase().replace(/\s+/g, '-')
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] ?? TONE_INSTRUCTIONS.professional
  parts.push('', toneInstruction)
  if (options.context?.trim()) {
    parts.push('', 'Additional instructions from the user:', options.context.trim())
  }
  const contentLabel = mode === 'job_application' ? 'Job application content to rewrite:' : 'Resume content to rewrite:'
  parts.push('', '---', '', contentLabel, '', text)
  return parts.join('\n')
}

export type DeepSeekResult = { text: string; usage: { prompt_tokens: number; completion_tokens: number } }

export async function rewriteWithDeepSeek(text: string, options: RewriteOptions = {}): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const userContent = buildRewritePrompt(text, options)
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
  const prompt_tokens = usage.prompt_tokens ?? 0
  const completion_tokens = usage.completion_tokens ?? 0

  return {
    text: content,
    usage: { prompt_tokens, completion_tokens },
  }
}

export type ScoreAiResult = {
  score: number
  breakdown: { keyword: number; verbStrength: number; length: number; atsSafety: number }
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

function buildScorePrompt(resumeText: string, jobDescription: string, mode: EditorMode): string {
  const doc = mode === 'job_application' ? 'job application text' : 'resume'
  return [
    `You are an expert recruiter and ATS specialist.`,
    `Task: score how well this ${doc} matches the job description.`,
    ``,
    `Return ONLY valid JSON (no markdown, no commentary) with this shape:`,
    `{"score":0-100,"breakdown":{"keyword":0-100,"verbStrength":0-100,"length":0-100,"atsSafety":0-100},"keywords":["..."],"notes":"optional short note"}`,
    ``,
    `Rules:`,
    `- Be strict: if the ${doc} is mostly nonsense/typos, the score should be very low.`,
    `- "keywords" should be important role terms (max 30) pulled from the job description (skills, tools, responsibilities).`,
    `- breakdown meanings:`,
    `  - keyword: overlap of important terms (not stopwords)`,
    `  - verbStrength: action-led, specific bullet language`,
    `  - length: concise, scannable lines (not too short, not rambling)`,
    `  - atsSafety: plain text readability (no weird characters, easy to parse)`,
    `- Avoid hallucinating facts; judge only what is written.`,
    ``,
    `JOB DESCRIPTION:`,
    jobDescription.trim().slice(0, 6000),
    ``,
    `DOCUMENT:`,
    resumeText.trim().slice(0, 9000),
  ].join('\n')
}

export async function scoreWithDeepSeek(
  resumeText: string,
  jobDescription: string,
  mode: EditorMode = 'resume'
): Promise<ScoreAiResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set')

  const userContent = buildScorePrompt(resumeText, jobDescription, mode)

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 420,
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
  if (!jsonText) throw new Error('AI scoring returned no JSON')

  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('AI scoring returned invalid JSON')
  }

  const breakdownRaw = parsed?.breakdown ?? {}
  const result: ScoreAiResult = {
    score: clamp01to100(parsed?.score),
    breakdown: {
      keyword: clamp01to100(breakdownRaw?.keyword),
      verbStrength: clamp01to100(breakdownRaw?.verbStrength),
      length: clamp01to100(breakdownRaw?.length),
      atsSafety: clamp01to100(breakdownRaw?.atsSafety),
    },
    keywords: Array.isArray(parsed?.keywords) ? parsed.keywords.filter((x: any) => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean).slice(0, 30) : [],
    notes: typeof parsed?.notes === 'string' ? parsed.notes.slice(0, 220) : undefined,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  }

  // Consistency: overall score should roughly follow the weighted breakdown.
  // If the model gives something wildly inconsistent, recompute a conservative aggregate.
  const approx = Math.round(
    result.breakdown.keyword * 0.42 +
      result.breakdown.verbStrength * 0.22 +
      result.breakdown.length * 0.16 +
      result.breakdown.atsSafety * 0.2
  )
  if (Math.abs(result.score - approx) > 18) {
    result.score = approx
  }

  return result
}

/** Generate a 2–4 sentence professional summary (resume) or opening paragraph (job application). Optional job description for tailoring. */
export async function generateSummaryWithDeepSeek(
  resumeText: string,
  jobDescription?: string,
  mode: EditorMode = 'resume'
): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const jobContext = jobDescription?.trim()
    ? `\n\nThe target job description (use to align the output):\n${jobDescription.trim().slice(0, 2000)}`
    : ''

  const resumePrompt = `You are an expert resume writer. Write a short professional summary (2–4 sentences, 50–80 words) for the top of this resume. It should highlight the candidate's key experience, strengths, and value. Use third person or first person consistently; prefer third person for a formal resume. Be specific, not generic. Do not repeat the word "summary" or "professional summary". Return ONLY the summary text, no heading or labels.${jobContext}

---
Resume content:
${resumeText.slice(0, 6000)}`

  const jobAppPrompt = `You are an expert at cover letters and job applications. Write a strong opening paragraph (2–4 sentences, 50–80 words) for a cover letter or job application. It should hook the reader, show fit for the role, and lead into the rest of the application. Be specific to the candidate and the job. Do not use "I am writing to apply" or similar clichés. Return ONLY the paragraph text, no greeting or labels.${jobContext}

---
Application/cover letter content:
${resumeText.slice(0, 6000)}`

  const userContent = mode === 'job_application' ? jobAppPrompt : resumePrompt

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 256,
      temperature: 0.4,
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
