import { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_SEO_FAQ, HOME_SEO_KEYWORDS } from '../content/homeSeoFaq'
import { setPendingRewrite } from '../utils/landingPendingRewrite'
import { getSiteUrl } from '../utils/siteUrl'
import { setSeoMeta } from '../utils/seoMeta'
import HeroAnimatedHeadline from '../components/HeroAnimatedHeadline'

const PATH_STEPS = [
  { id: 1, title: 'Readers feel tone before facts', body: 'Flat, uniform sentences read like a template, whether the draft came from you or a model. Natural rhythm keeps people reading.' },
  { id: 2, title: 'Clarity beats clever', body: 'Specific verbs and concrete nouns do more than buzzwords. Say what happened in words a tired reader can scan.' },
  { id: 3, title: 'Match the room', body: 'Academic, professional, casual, each audience expects a different register. The right tone builds trust.' },
  { id: 4, title: 'Edit with intent', body: 'Analyze, humanize selection by selection, then export. You stay in control of what ships.' },
] as const

function BlobTop() {
  return (
    <svg
      className="blob blobTop"
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="blobTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8c4d0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6b8f9e" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d="M30 60c0-22 18-45 45-45s55 20 70 35c12 12 25 30 25 50s-15 35-40 35c-22 0-45-15-65-25-18-9-35-20-35-50z"
        fill="url(#blobTopGrad)"
      />
    </svg>
  )
}

function BlobBottom() {
  return (
    <svg
      className="blob blobBottom"
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="blobBottomGrad" x1="20%" y1="80%" x2="80%" y2="20%">
          <stop offset="0%" stopColor="#9ab8c8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5a7a8a" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M90 20c35 0 70 25 70 60s-25 70-60 70c-30 0-55-20-70-45-12-20-20-45-20-65s15-50 80-50z"
        fill="url(#blobBottomGrad)"
      />
    </svg>
  )
}

const FEATURES = [
  { icon: '◇', title: 'Humanize any selection', description: 'Pick tone and intensity. We rewrite in place, with varied rhythm, fewer clichés, and the same facts you started with.' },
  { icon: '◆', title: 'See how natural it reads', description: 'A naturalness-style score with rhythm, specificity, voice, and tone fit, plus phrases worth tightening.' },
  { icon: '○', title: 'Shorten, expand, export', description: 'Adjust length for the whole draft when you need it, then grab PDF, Word, or plain text from your workspace.' },
] as const

const PLANS = [
  { name: 'Free', price: 0, period: 'month', description: 'Try the full workflow on real drafts. No credit card required.', features: ['2 humanize / shorten / expand per day', '2 naturalness analyses per day', 'Optional context for audience', 'PDF & Word export'], cta: 'Get started free', ctaTo: '/register', featured: false },
  { name: 'Pro', price: 29, period: 'month', description: 'For people who iterate on copy every day.', features: ['500 humanize / shorten / expand per day', '50 analyses per day', 'Everything in Free', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: true },
  { name: 'Elite', price: 59, period: 'month', description: 'Maximum headroom for power users.', features: ['1,500 humanize / shorten / expand per day', '100 analyses per day', 'Everything in Pro', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: false },
] as const

const LANDING_TRY_MAX_LENGTH = 800

function usePathStepVisible() {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [visible, setVisible] = useState<Set<number>>(new Set())

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const ob = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setVisible((v) => new Set([...v, i]))
          })
        },
        { rootMargin: '-10% 0px -10% 0px', threshold: 0.1 }
      )
      ob.observe(el)
      return ob
    })
    return () => observers.forEach((ob) => ob?.disconnect())
  }, [])

  return { refs, visible }
}

const HOME_META_DESC =
  'Humanizer AI: turn stiff or AI-heavy writing into natural copy—resumes, emails, essays. Highlight text, set tone, check how it reads, export PDF or Word. Free tier to start.'

export default function Landing() {
  const navigate = useNavigate()
  const { refs, visible } = usePathStepVisible()
  const [tryText, setTryText] = useState('')
  const [tryError, setTryError] = useState<string | null>(null)

  useEffect(() => {
    setSeoMeta({
      title: 'Humanizer AI - AI Humanizer (AI Humaniser) | Natural Writing, Tone Control & PDF Export',
      description: HOME_META_DESC,
      path: '/',
      keywords: HOME_SEO_KEYWORDS,
    })
  }, [])

  useEffect(() => {
    document.body.dataset.page = 'landing'
    return () => {
      if (document.body.dataset.page === 'landing') delete document.body.dataset.page
    }
  }, [])

  const homeJsonLd = useMemo(() => {
    const base = getSiteUrl().replace(/\/$/, '')
    const orgId = `${base}/#organization`
    const org = { '@id': orgId, '@type': 'Organization', name: 'Humanizer AI', url: base }
    return {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          name: 'Humanizer AI',
          url: `${base}/`,
          description: HOME_META_DESC,
          publisher: { '@id': orgId },
          inLanguage: 'en-US',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'Humanizer AI',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web browser',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          description:
            'Make stiff or AI-sounding lines read naturally: highlight to rewrite with tone control, optional naturalness check, shorten or expand, then export.',
          featureList: [
            'Humanize selected text',
            'Naturalness analysis',
            'Shorten and expand document',
            'PDF and Word export',
          ],
          provider: { '@id': orgId },
          url: `${base}/`,
        },
        {
          '@type': 'FAQPage',
          mainEntity: HOME_SEO_FAQ.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        },
      ],
    }
  }, [])

  function handleTrySubmit(e: FormEvent) {
    e.preventDefault()
    setTryError(null)
    const trimmed = tryText.trim()
    if (!trimmed) {
      setTryError('Paste a sentence or short paragraph to continue.')
      return
    }
    if (trimmed.length > LANDING_TRY_MAX_LENGTH) {
      setTryError(`Keep it under ${LANDING_TRY_MAX_LENGTH} characters for this preview.`)
      return
    }
    setPendingRewrite(trimmed.slice(0, LANDING_TRY_MAX_LENGTH))
    navigate('/register', { state: { fromLandingTry: true }, replace: false })
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <div className="landingPage landingPage--inspired">
        <main className="hero hero--photo" data-hero-bg="true">
          <div className="heroBackdrop" aria-hidden />
          <div className="heroBg heroBg--muted" aria-hidden>
            <div className="heroOrb heroOrbTop" />
            <div className="heroOrb heroOrbBottom" />
            <div className="heroOrb heroOrbCenter" />
          </div>
          <div className="blobs blobs--muted" aria-hidden>
            <BlobTop />
            <BlobBottom />
          </div>
          <div className="heroInner">
            <div className="heroContent heroContentSplit">
              <span className="heroBadge">Free to start · No credit card</span>
              <HeroAnimatedHeadline />
              <p className="heroSubtitle">
                Stiff or AI-heavy lines in resumes, emails, or essays? Highlight them, match your tone, export when ready.
              </p>
              <ul className="heroValueChips" aria-label="What Humanizer AI does">
                <li>How natural it reads</li>
                <li>Humanize by selection</li>
                <li>PDF &amp; Word export</li>
              </ul>
              <div className="heroCtaRow">
                <Link to="/register" className="heroCta heroCtaPrimary">Get started free</Link>
                <a href="#try" className="heroCta heroCtaOutline">Try one paragraph first</a>
              </div>
            </div>

            <aside className="heroPreview heroPreview--bare heroPreview--glass" aria-label="Product preview">
              <div className="heroPreviewCard">
                <div className="heroPreviewStack">
                  <header className="heroPreviewTop">
                    <div className="heroPreviewTitle">Example: Naturalness</div>
                    <div className="heroPreviewScore" aria-label="Score 78 out of 100">
                      <span>78</span>
                      <small>/100</small>
                    </div>
                  </header>
                  <div className="heroPreviewBar" aria-hidden>
                    <span style={{ width: '78%' }} />
                  </div>
                  <div className="heroPreviewGrid" aria-label="Before and after humanize">
                    <div className="heroPreviewCol">
                      <div className="heroPreviewLabel">Before</div>
                      <p className="heroPreviewText">
                        It is important to note that we leveraged robust solutions to drive impactful outcomes across the stakeholder landscape.
                      </p>
                    </div>
                    <div className="heroPreviewCol heroPreviewColAfter">
                      <div className="heroPreviewLabel">After</div>
                      <p className="heroPreviewText">
                        We shipped simpler tools, cut handoffs, and got clearer results. Our stakeholders finally saw progress they could measure.
                      </p>
                    </div>
                  </div>
                  <div className="heroPreviewTags" aria-label="What improved">
                    <span>Clearer rhythm</span>
                    <span>Concrete wording</span>
                    <span>Less filler</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <section className="section pathSection pathSection--timeline" id="path" aria-label="Why natural writing matters">
        <h2 className="pathSectionTitle">The right voice changes everything</h2>
        <div className="pathSectionInner pathSectionInner--timeline">
          <div className="pathTimeline" role="list">
            <div className="pathTimelineLine" aria-hidden />
            {PATH_STEPS.map((step, i) => (
              <div
                key={step.id}
                role="listitem"
                className={`pathTimelineItem ${visible.has(i) ? 'pathTimelineItem--visible' : ''}`}
                ref={(el) => { refs.current[i] = el }}
              >
                <div className="pathTimelineDot" aria-hidden />
                <div className="pathTimelineBody">
                  <h3 className="pathTimelineTitle">{step.title}</h3>
                  <p className="pathTimelineText">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        <section className="section landingTrySection" id="try">
        <div className="landingTryHeader">
          <h2 className="landingTryTitle">Paste a stiff sentence. See it open up.</h2>
          <p className="landingTrySubtitle">We’ll humanize it after you sign up, free in seconds.</p>
        </div>
        <form onSubmit={handleTrySubmit} className="landingTryCard">
          <label className="landingTryLabel" htmlFor="landing-try-text">
            Sentence or short paragraph
          </label>
          <textarea
            id="landing-try-text"
            className="landingTryInput"
                      placeholder="e.g. It is worth noting that our initiative delivered measurable results across departments."
            value={tryText}
            onChange={(e) => setTryText(e.target.value)}
            maxLength={LANDING_TRY_MAX_LENGTH + 100}
            rows={6}
            aria-describedby={tryError ? 'landing-try-error' : 'landing-try-hint'}
          />
          <p id="landing-try-hint" className="landingTryHint">{tryText.length} / {LANDING_TRY_MAX_LENGTH} characters</p>
          {tryError && <p id="landing-try-error" className="landingTryError" role="alert">{tryError}</p>}
          <button type="submit" className="landingTryCta">
            Humanize this, sign up free
          </button>
          <p className="landingTryLogin">
            Already have an account? <Link to="/login" state={{ fromLandingTry: true }} className="landingTryLoginLink">Sign in</Link>
          </p>
        </form>
      </section>

        <section className="section aboutSection" id="about">
        <div className="sectionHeader aboutSectionHeader">
          <p className="sectionLabel">Why Humanizer AI</p>
          <h2 className="sectionTitle">Make every draft clearer, in a few simple steps.</h2>
          <p className="aboutLead">
            You bring the ideas. We help them land in language readers trust.
          </p>
        </div>
        <div className="aboutImageCenter">
          <div className="landingPhotoCard aboutImageCard">
            <img
              src="/landing/typing.png"
              alt="Working at a desk with keyboard and computer"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="aboutContent aboutContentSimple">
          <ul className="aboutPoints" aria-label="What Humanizer AI does for you">
            <li><strong>Paste or upload</strong> your draft and optional context (audience, channel, assignment).</li>
            <li><strong>Analyze</strong> for rhythm, specificity, and voice, then humanize line by line.</li>
            <li><strong>Shorten or expand</strong> the whole piece when length needs to change.</li>
            <li><strong>Export PDF or Word</strong> from the same formatted workspace.</li>
          </ul>
          <p className="aboutFootnote">
            <strong>Free:</strong> daily humanize/shorten/expand and analysis credits. Upgrade when you want more. Cancel anytime.
          </p>
        </div>
      </section>

        <section className="section" id="features">
        <div className="sectionHeader">
          <p className="sectionLabel">How it works</p>
          <h2 className="sectionTitle">Built for drafts you actually ship</h2>
        </div>
        <div className="featureGrid">
          {FEATURES.map((f) => (
            <article key={f.title} className="featureCard">
              <div className="featureIcon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>

        <section className="section" id="pricing">
        <div className="sectionHeader">
          <p className="sectionLabel">Pricing</p>
          <h2 className="sectionTitle">Start free. Upgrade when you're ready.</h2>
        </div>
        <div className="pricingGrid">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`pricingCard ${plan.featured ? 'pricingCardFeatured' : ''}`}>
              <p className="pricingName">{plan.name}</p>
              <p className="pricingPrice">
                {plan.price !== null ? <>${plan.price}<span>/{plan.period}</span></> : <span>Custom</span>}
              </p>
              <p className="pricingDesc">{plan.description}</p>
              <ul className="pricingList">
                {plan.features.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link to={plan.ctaTo} className="pricingCta">{plan.cta}</Link>
            </article>
          ))}
        </div>
      </section>

        <section className="section landingFaqSection" id="faq" aria-labelledby="landing-faq-heading">
        <div className="sectionHeader">
          <p className="sectionLabel">FAQ</p>
          <h2 id="landing-faq-heading" className="sectionTitle">
            Common questions about humanizing
          </h2>
          <p className="landingFaqIntro">
            Quick answers for people who want clearer, more natural writing, not louder buzzwords.
          </p>
        </div>
        <dl className="landingFaqList">
          {HOME_SEO_FAQ.map((item) => (
            <div key={item.q} className="landingFaqItem">
              <dt className="landingFaqQ">{item.q}</dt>
              <dd className="landingFaqA">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

        <section className="section ctaSection">
        <div className="ctaBox">
          <h2>Your draft deserves a human voice.</h2>
          <p>Join free. Daily humanize and analysis credits on us. No credit card.</p>
          <Link to="/register" className="heroCta">Get started free</Link>
        </div>
      </section>

        <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">Humanizer AI</Link>
          <div className="footerLinks">
            <a href="/#about">About</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <Link to="/contact">Contact</Link>
            <Link to="/blog">Blog</Link>
            <a href="/#faq">FAQ</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <span className="footerCopy">© {new Date().getFullYear()} Humanizer AI. All rights reserved.</span>
        </div>
        </footer>
      </div>
    </>
  )
}
