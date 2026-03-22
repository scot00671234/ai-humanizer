import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { aiRateLimiter } from '../middleware/rateLimit'
import { checkRewriteLimits, checkScoreCooldown, checkScoreLimits, insertUsageLog } from '../middleware/usage'
import type { JwtPayload } from '../middleware/auth'
import { config } from '../config'
import { rewriteWithDeepSeek, adjustLengthWithDeepSeek, scoreWithDeepSeek } from '../services/deepseek'
import type { HumanizeIntensity } from '../services/deepseek'
import { getCachedScore, setCachedScore, hashJobDesc } from '../services/jobDescCache'

const router = Router()

router.use(aiRateLimiter)
router.use(requireAuth)

function parseIntensity(raw: unknown): HumanizeIntensity | undefined {
  if (raw === 'light' || raw === 'strong') return raw
  if (raw === 'medium') return 'medium'
  return undefined
}

/** POST /api/ai/rewrite — humanize selection */
router.post('/rewrite', checkRewriteLimits, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const body = req.body as {
    text?: string
    language?: string
    context?: string
    tone?: string
    jobDescription?: string
    documentContext?: string
    intensity?: string
  }
  const { text, language, context, tone, jobDescription, documentContext, intensity } = body
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid text' })
    return
  }
  // Keep this intentionally smaller than the full-document summary limit to control cost.
  // Still large enough for most paragraphs / short drafts.
  const MAX_HUMANIZE_CHARS = 12_000
  if (text.length > MAX_HUMANIZE_CHARS) {
    res.status(400).json({ error: `Text is too long. Select a shorter passage (max ${MAX_HUMANIZE_CHARS} chars) or use Shorten/Expand.` })
    return
  }
  const contextStr = typeof context === 'string' ? context.slice(0, 500) : undefined
  const toneStr = typeof tone === 'string' ? tone.slice(0, 50) : undefined
  const docCtx =
    typeof documentContext === 'string'
      ? documentContext.trim().slice(0, 12_000)
      : typeof jobDescription === 'string'
        ? jobDescription.trim().slice(0, 12_000)
        : undefined

  if (!config.deepseek?.apiKey) {
    res.status(503).json({ error: 'AI service is not configured. Please set DEEPSEEK_API_KEY.' })
    return
  }

  try {
    const result = await rewriteWithDeepSeek(text, {
      language,
      context: contextStr,
      tone: toneStr,
      documentContext: docCtx,
      intensity: parseIntensity(intensity),
    })
    const tokensUsed = result.usage.prompt_tokens + result.usage.completion_tokens
    await insertUsageLog(user.userId, 'rewrite', tokensUsed)
    res.json({ rewritten: result.text, tokensUsed })
  } catch (err) {
    console.error('Rewrite error:', err)
    res.status(502).json({ error: 'Something went wrong. Please try again.' })
  }
})

/** POST /api/ai/summary — shorten or expand full document (same daily cap as rewrite). */
router.post('/summary', checkRewriteLimits, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const body = req.body as {
    resumeText?: string
    documentText?: string
    jobDescription?: string
    documentContext?: string
    direction?: string
  }
  const rawText = typeof body.documentText === 'string' ? body.documentText : body.resumeText
  if (!rawText || typeof rawText !== 'string') {
    res.status(400).json({ error: 'Content is required.' })
    return
  }
  const trimmed = rawText.trim()
  if (trimmed.length < 50) {
    res.status(400).json({ error: 'Add more content before adjusting length.' })
    return
  }
  if (trimmed.length > 100_000) {
    res.status(400).json({ error: 'Content is too long.' })
    return
  }
  const direction = body.direction === 'expand' ? 'expand' : 'shorten'
  const docCtx =
    typeof body.documentContext === 'string'
      ? body.documentContext.trim().slice(0, 8000)
      : typeof body.jobDescription === 'string'
        ? body.jobDescription.trim().slice(0, 8000)
        : undefined

  if (!config.deepseek?.apiKey) {
    res.status(503).json({ error: 'AI service is not configured. Please set DEEPSEEK_API_KEY.' })
    return
  }

  try {
    const result = await adjustLengthWithDeepSeek(trimmed, direction, docCtx)
    const tokensUsed = result.usage.prompt_tokens + result.usage.completion_tokens
    await insertUsageLog(user.userId, 'summary', tokensUsed)
    res.json({ summary: result.text, direction })
  } catch (err) {
    console.error('Length adjust error:', err)
    res.status(502).json({ error: 'Something went wrong. Please try again.' })
  }
})

/** POST /api/ai/score — naturalness analysis (deterministic stylometry signals + LLM rubric aligned with AI-text research) */
router.post('/score', checkScoreLimits, checkScoreCooldown, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const body = req.body as {
    resumeText?: string
    documentText?: string
    jobDescription?: string
    documentContext?: string
    targetTone?: string
    tone?: string
  }
  const rawText = typeof body.documentText === 'string' ? body.documentText : body.resumeText
  if (!rawText || typeof rawText !== 'string') {
    res.status(400).json({ error: 'Missing document text' })
    return
  }
  if (rawText.length > 100_000) {
    res.status(400).json({ error: 'Document is too long.' })
    return
  }

  if (!config.deepseek?.apiKey) {
    res.status(503).json({ error: 'AI analysis is not configured. Please set DEEPSEEK_API_KEY.' })
    return
  }

  const docCtx =
    typeof body.documentContext === 'string'
      ? body.documentContext.trim().slice(0, 12_000)
      : typeof body.jobDescription === 'string'
        ? body.jobDescription.trim().slice(0, 12_000)
        : undefined
  const targetTone =
    typeof body.targetTone === 'string'
      ? body.targetTone.slice(0, 80)
      : typeof body.tone === 'string'
        ? body.tone.slice(0, 80)
        : undefined

  const cacheKey = `analyze:${user.userId}:${hashJobDesc(`${rawText}\n${docCtx ?? ''}\n${targetTone ?? ''}`)}`
  const cached = getCachedScore(cacheKey)
  if (cached) {
    await insertUsageLog(user.userId, 'score', null)
    res.json({ score: cached.score, breakdown: cached.breakdown, keywords: cached.keywords, notes: cached.notes })
    return
  }

  try {
    const result = await scoreWithDeepSeek(rawText, { documentContext: docCtx, targetTone })
    const tokensUsed = result.usage.prompt_tokens + result.usage.completion_tokens
    setCachedScore(cacheKey, {
      score: result.score,
      breakdown: { ...result.breakdown },
      keywords: result.keywords,
      notes: result.notes,
    })
    await insertUsageLog(user.userId, 'score', tokensUsed)
    res.json({ score: result.score, breakdown: result.breakdown, keywords: result.keywords, notes: result.notes })
  } catch (err) {
    console.error('Score error:', err)
    res.status(502).json({ error: 'Analysis failed. Please try again.' })
  }
})

export default router
