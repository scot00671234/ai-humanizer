/**
 * Persist "try it" text from landing so we can run the rewrite after sign up.
 * No AI call until user is in dashboard—saves tokens.
 */

const KEY = 'landing_pending_rewrite'
const MAX_AGE_MS = 30 * 60 * 1000 // 30 min

export type PendingRewrite = { text: string; ts: number }

export function setPendingRewrite(text: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ text, ts: Date.now() }))
  } catch {
    // ignore
  }
}

export function getPendingRewrite(): PendingRewrite | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PendingRewrite
    if (!data?.text || typeof data.text !== 'string') return null
    if (Date.now() - (data.ts || 0) > MAX_AGE_MS) {
      clearPendingRewrite()
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearPendingRewrite(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function hasPendingRewrite(): boolean {
  return getPendingRewrite() !== null
}
