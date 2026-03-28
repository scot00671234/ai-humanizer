import { useEffect, useState, type ReactNode } from 'react'

/** Stiff “AI humaniser” style line — demonstrates the problem before the rewrite */
const STIFF_HEADLINE =
  'Our AI humaniser leverages robust solutions to optimise your textual outputs.'

const FINAL_PREFIX = 'Writing that sounds '
const FINAL_ACCENT = 'human'
const FINAL_SUFFIX = '.'
const FINAL_FULL = FINAL_PREFIX + FINAL_ACCENT + FINAL_SUFFIX

const TYPE_STIFF_MS = 28
const PAUSE_AFTER_STIFF_MS = 750
const SCRATCH_MS = 720
const DELETE_MS = 16
const PAUSE_BEFORE_FINAL_MS = 280
const TYPE_FINAL_MS = 34
const INITIAL_DELAY_MS = 450

type Phase = 'stiff' | 'scratch' | 'delete' | 'final' | 'done'

function renderFinalProgress(count: number) {
  const p = FINAL_PREFIX.length
  const a = FINAL_ACCENT.length
  if (count <= p) {
    return FINAL_PREFIX.slice(0, count)
  }
  if (count <= p + a) {
    const ac = count - p
    return (
      <>
        {FINAL_PREFIX}
        <span className="heroTitleAccent">{FINAL_ACCENT.slice(0, ac)}</span>
      </>
    )
  }
  return (
    <>
      {FINAL_PREFIX}
      <span className="heroTitleAccent">{FINAL_ACCENT}</span>
      {FINAL_SUFFIX.slice(0, count - p - a)}
    </>
  )
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function HeroAnimatedHeadline() {
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion)
  const [phase, setPhase] = useState<Phase>('stiff')
  const [stiffLen, setStiffLen] = useState(0)
  const [finalLen, setFinalLen] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setPhase('done')
      setStiffLen(0)
      setFinalLen(FINAL_FULL.length)
      return
    }

    let alive = true
    const timeouts: number[] = []
    const later = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          if (alive) resolve()
        }, ms)
        timeouts.push(id)
      })

    ;(async () => {
      await later(INITIAL_DELAY_MS)
      if (!alive) return

      for (let c = 1; c <= STIFF_HEADLINE.length; c++) {
        if (!alive) return
        await later(TYPE_STIFF_MS)
        if (!alive) return
        setStiffLen(c)
      }

      await later(PAUSE_AFTER_STIFF_MS)
      if (!alive) return
      setPhase('scratch')

      await later(SCRATCH_MS)
      if (!alive) return
      setPhase('delete')

      for (let c = STIFF_HEADLINE.length - 1; c >= 0; c--) {
        if (!alive) return
        await later(DELETE_MS)
        if (!alive) return
        setStiffLen(c)
      }

      await later(PAUSE_BEFORE_FINAL_MS)
      if (!alive) return
      setPhase('final')

      for (let c = 1; c <= FINAL_FULL.length; c++) {
        if (!alive) return
        await later(TYPE_FINAL_MS)
        if (!alive) return
        setFinalLen(c)
      }

      if (!alive) return
      setPhase('done')
    })()

    return () => {
      alive = false
      timeouts.forEach((id) => clearTimeout(id))
    }
  }, [reduceMotion])

  if (reduceMotion) {
    return (
      <h1 className="heroTitle" id="hero-main-headline">
        Writing that sounds <span className="heroTitleAccent">human</span>.
      </h1>
    )
  }

  const showCursor = phase !== 'done'

  let inner: ReactNode
  if (phase === 'stiff' || phase === 'delete') {
    inner = STIFF_HEADLINE.slice(0, stiffLen)
  } else if (phase === 'scratch') {
    inner = STIFF_HEADLINE
  } else {
    inner = renderFinalProgress(finalLen)
  }

  return (
    <h1
      className={`heroTitle${phase === 'scratch' ? ' heroTitle--scratch' : ''}`}
      id="hero-main-headline"
      aria-label={FINAL_FULL}
    >
      {inner}
      {showCursor ? (
        <span className="heroTitleCursor" aria-hidden>
          |
        </span>
      ) : null}
    </h1>
  )
}
