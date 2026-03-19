import { Request, Response, NextFunction } from 'express'
import { pool } from '../db'
import type { JwtPayload } from './auth'
import {
  isLockedOut,
  setLockout,
  isSuspended,
  setSuspended,
  getLockoutRemaining,
  recordJobDescHash,
  hashJobDesc,
} from '../services/jobDescCache'

const DAILY_CAP_FREE = 2
const DAILY_CAP_PRO = 500
const DAILY_CAP_ELITE = 1500
const REWRITE_BURST_WINDOW_MS = 60 * 1000
const REWRITE_BURST_MAX = 20
const DAILY_REWRITE_SUSPEND = 1000

export type ActionType = 'rewrite' | 'summary' | 'score' | 'export'

const DAILY_SCORE_CAP_FREE = 2
const DAILY_SCORE_CAP_PRO = 50
const DAILY_SCORE_CAP_ELITE = 100

/** Check rewrite limits: daily cap, burst, suspend. Call after requireAuth. */
export async function checkRewriteLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { user } = req as Request & { user: JwtPayload }
  const userId = user.userId

  if (isSuspended(userId)) {
    res.status(403).json({ error: 'Account paused—contact support.' })
    return
  }
  if (isLockedOut(userId)) {
    const sec = getLockoutRemaining(userId)
    res.status(429).set('Retry-After', String(sec)).json({ error: 'Slow down—optimizing for quality.' })
    return
  }

  if (!pool) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }

  try {
    const [userRow, dailyCount, burstCount] = await Promise.all([
      pool.query('SELECT is_pro, COALESCE(is_team, false) AS is_team, suspended_at FROM users WHERE id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM usage_logs WHERE user_id = $1 AND action_type IN ('rewrite', 'summary') AND timestamp > now() - interval '24 hours'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM usage_logs WHERE user_id = $1 AND action_type IN ('rewrite', 'summary') AND timestamp > now() - interval '60 seconds'`,
        [userId]
      ),
    ])

    const isPro = userRow.rows[0]?.is_pro === true
    const isElite = userRow.rows[0]?.is_team === true
    const suspendedAt = userRow.rows[0]?.suspended_at
    if (suspendedAt) {
      res.status(403).json({ error: 'Account paused—contact support.' })
      return
    }

    const daily = dailyCount.rows[0]?.c ?? 0
    const burst = burstCount.rows[0]?.c ?? 0
    const cap = isElite ? DAILY_CAP_ELITE : isPro ? DAILY_CAP_PRO : DAILY_CAP_FREE

    if (daily >= cap) {
      res.status(429).json({ error: 'Daily editing limit reached (humanize, shorten, expand).' })
      return
    }
    if (burst >= REWRITE_BURST_MAX) {
      setLockout(userId)
      res.status(429).set('Retry-After', '300').json({ error: 'Slow down—optimizing for quality.' })
      return
    }
    if (daily >= DAILY_REWRITE_SUSPEND) {
      await pool.query('UPDATE users SET suspended_at = now() WHERE id = $1', [userId])
      setSuspended(userId)
      res.status(403).json({ error: 'Account paused—contact support.' })
      return
    }

    next()
  } catch (err) {
    console.error('checkRewriteLimits:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

/** Check AI score limits: daily cap by plan. Call after requireAuth. */
export async function checkScoreLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { user } = req as Request & { user: JwtPayload }
  const userId = user.userId
  if (!pool) {
    res.status(503).json({ error: 'Service unavailable' })
    return
  }
  try {
    const [userRow, dailyCount] = await Promise.all([
      pool.query('SELECT is_pro, COALESCE(is_team, false) AS is_team, suspended_at FROM users WHERE id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM usage_logs WHERE user_id = $1 AND action_type = 'score' AND timestamp > now() - interval '24 hours'`,
        [userId]
      ),
    ])
    const row = userRow.rows[0]
    if (row?.suspended_at) {
      res.status(403).json({ error: 'Account paused—contact support.' })
      return
    }
    const isElite = row?.is_team === true
    const isPro = row?.is_pro === true
    const cap = isElite ? DAILY_SCORE_CAP_ELITE : isPro ? DAILY_SCORE_CAP_PRO : DAILY_SCORE_CAP_FREE
    const used = dailyCount.rows[0]?.c ?? 0
    if (cap <= 0) {
      res.status(403).json({ error: 'Analysis is not available on your plan.' })
      return
    }
    if (used >= cap) {
      res.status(429).json({ error: 'Daily analysis limit reached. Try again tomorrow or upgrade your plan.' })
      return
    }
    next()
  } catch (err) {
    console.error('checkScoreLimits:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

/** Cooldown when the same document fingerprint is analyzed >10 times in 24h (abuse). */
export function checkScoreCooldown(req: Request, res: Response, next: NextFunction): void {
  const { user } = req as Request & { user: JwtPayload }
  const body = req.body as {
    resumeText?: string
    documentText?: string
    jobDescription?: string
    documentContext?: string
  }
  const rawText = typeof body.documentText === 'string' ? body.documentText : body.resumeText
  if (!rawText || typeof rawText !== 'string') {
    next()
    return
  }
  const ctx =
    typeof body.documentContext === 'string'
      ? body.documentContext
      : typeof body.jobDescription === 'string'
        ? body.jobDescription
        : ''
  const fingerprint = hashJobDesc(`${rawText.slice(0, 12000)}\n${ctx.slice(0, 4000)}`)
  const { cooldown } = recordJobDescHash(user.userId, fingerprint)
  if (cooldown) {
    res.status(429).set('Retry-After', '30').json({ error: 'Too many analyses of the same text. Please wait 30 seconds.' })
    return
  }
  next()
}

/** Insert a usage_log row. Call from route handler after success. */
export async function insertUsageLog(
  userId: string,
  actionType: ActionType,
  tokensUsed: number | null
): Promise<void> {
  if (!pool) return
  try {
    await pool.query(
      'INSERT INTO usage_logs (user_id, action_type, tokens_used) VALUES ($1, $2, $3)',
      [userId, actionType, tokensUsed]
    )
  } catch (err) {
    console.error('insertUsageLog:', err)
  }
}
