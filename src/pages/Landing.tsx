import { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_SEO_FAQ, HOME_SEO_KEYWORDS } from '../content/homeSeoFaq'
import { setPendingRewrite } from '../utils/landingPendingRewrite'
import { getSiteUrl } from '../utils/siteUrl'
import { setSeoMeta } from '../utils/seoMeta'

const PATH_STEPS = [
  { id: 1, title: 'One document opens the door', body: 'Recruiters decide in or out from one thing: your resume. Not luck, not timing. The words on the page.' },
  { id: 2, title: 'Get past the gate', body: 'Most applications never reach a human. The right wording gets you past the screeners and into the room.' },
  { id: 3, title: 'Speak their language', body: 'Sharp bullets and strong verbs. The language hiring managers notice. Sound like the candidate they want to hire.' },
  { id: 4, title: 'The job. The life.', body: 'A strong resume changes your trajectory. The job you want starts here.' },
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
  { icon: '◇', title: 'Sound like a top candidate', description: 'Select any bullet. One click. Your wording gets sharper: strong verbs, real metrics, the kind recruiters actually notice. No fluff, no generic phrases.' },
  { icon: '◆', title: 'Know exactly where you stand', description: 'Paste the job description. Get a 0 to 100 score and a clear breakdown: keyword match, verb strength, length, ATS safety. Fix the gaps before you hit submit.' },
  { icon: '○', title: 'Submit with confidence', description: 'One-click PDF. Clean, professional layouts that pass every ATS. Three templates. Pick the one that fits your industry and your story.' },
] as const

const PLANS = [
  { name: 'Free', price: 0, period: 'month', description: 'Everything you need to land your next role. No credit card required.', features: ['2 AI rewrites per day', 'ATS score & keyword highlights', 'Side-by-side original vs current', 'PDF export', '3 layout templates'], cta: 'Get started free', ctaTo: '/register', featured: false },
  { name: 'Pro', price: 29, period: 'month', description: 'When you are applying to dozens of roles, we have you covered.', features: ['500 AI rewrites per day', 'Everything in Free', 'Priority processing', 'No ads', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: true },
  { name: 'Elite', price: 59, period: 'month', description: 'Unlimited ambition. No compromise on rewrites.', features: ['1,500 AI rewrites per day', 'Everything in Pro', 'Highest priority processing', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: false },
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
  'bioqz: AI resume builder & AI resume writer. Paste any job description—get AI bullet rewrites, a 0–100 job fit score, and ATS-friendly PDF export. Free AI resume maker tier; upgrade anytime.'

export default function Landing() {
  const navigate = useNavigate()
  const { refs, visible } = usePathStepVisible()
  const [tryText, setTryText] = useState('')
  const [tryError, setTryError] = useState<string | null>(null)

  useEffect(() => {
    setSeoMeta({
      title: 'bioqz — AI Resume Builder & Writer | Free Job Fit Score & ATS PDF',
      description: HOME_META_DESC,
      path: '/',
      keywords: HOME_SEO_KEYWORDS,
    })
  }, [])

  const homeJsonLd = useMemo(() => {
    const base = getSiteUrl().replace(/\/$/, '')
    const orgId = `${base}/#organization`
    const org = { '@id': orgId, '@type': 'Organization', name: 'bioqz', url: base }
    return {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          name: 'bioqz',
          url: `${base}/`,
          description: HOME_META_DESC,
          publisher: { '@id': orgId },
          inLanguage: 'en-US',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'bioqz',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web browser',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          description:
            'AI resume software: builder, maker, and writer in one. Job-specific AI rewrites, resume fit scoring vs. job descriptions, and ATS-friendly PDF templates.',
          featureList: [
            'AI resume bullet rewrites',
            'Job description fit score',
            'ATS-friendly PDF export',
            'Side-by-side resume compare',
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
      setTryError('Paste a resume bullet or sentence to continue.')
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
      <main className="hero" data-hero-bg="false">
        <div className="heroBackdrop" aria-hidden />
        <div className="heroBg" aria-hidden>
          <div className="heroOrb heroOrbTop" />
          <div className="heroOrb heroOrbBottom" />
          <div className="heroOrb heroOrbCenter" />
        </div>
        <div className="blobs">
          <BlobTop />
          <BlobBottom />
        </div>
        <div className="heroInner">
          <div className="heroContent heroContentSplit">
            <span className="heroBadge">Free to start · No credit card</span>
            <h1 className="heroTitle">
              Your resume, <span className="heroTitleAccent">matched to every job</span> you apply for.
            </h1>
            <p className="heroSubtitle">
              Paste a job posting. bioqz rewrites your bullets with AI, scores how well you fit the role, and exports a clean PDF hiring systems can read.
            </p>
            <ul className="heroValueChips" aria-label="What bioqz does">
              <li>AI bullet rewrites</li>
              <li>Job fit score</li>
              <li>ATS-friendly PDF</li>
            </ul>
            <div className="heroCtaRow">
              <Link to="/register" className="heroCta heroCtaPrimary">Get started free</Link>
              <a href="#try" className="heroCtaGhost">Try one bullet first</a>
            </div>
          </div>

          <aside className="heroPreview" aria-label="Product preview">
            <div className="heroMediaCard" aria-hidden>
              <img
                src="/hero-desk.png"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="heroPreviewCard">
              <div className="heroPreviewTop">
                <div className="heroPreviewTitle">Example: Job fit score</div>
                <div className="heroPreviewScore" aria-label="Score 82 out of 100">
                  <span>82</span>
                  <small>/100</small>
                </div>
              </div>
              <div className="heroPreviewBar" aria-hidden>
                <span style={{ width: '82%' }} />
              </div>

              <div className="heroPreviewGrid" aria-label="Before and after rewrite">
                <div className="heroPreviewCol">
                  <div className="heroPreviewLabel">Before</div>
                  <p className="heroPreviewText">
                    Worked with the team to improve the checkout experience and fix bugs.
                  </p>
                </div>
                <div className="heroPreviewCol heroPreviewColAfter">
                  <div className="heroPreviewLabel">After</div>
                  <p className="heroPreviewText">
                    Improved checkout conversion by 12% by shipping UX fixes and resolving 30+ payment bugs.
                  </p>
                </div>
              </div>

              <div className="heroPreviewTags" aria-label="What improved">
                <span>Stronger verbs</span>
                <span>Metrics</span>
                <span>ATS keywords</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <section className="section pathSection" id="path" aria-label="Why your resume matters">
        <h2 className="pathSectionTitle">The right resume changes everything</h2>
        <div className="pathImagesRow" aria-label="Professional workspace">
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/desk.png"
              alt="A clean desk with laptop and notebook"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/conversation.png"
              alt="Two people collaborating over a laptop"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="pathSectionInner">
          <div className="pathSteps">
            <div className="pathLine" aria-hidden />
            {PATH_STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`pathStep pathStep${i % 2 === 0 ? 'Left' : 'Right'} ${visible.has(i) ? 'pathStepVisible' : ''}`}
                ref={(el) => { refs.current[i] = el }}
              >
                <div className="pathNode" aria-hidden />
                <div className="pathCard">
                  <h3 className="pathCardTitle">{step.title}</h3>
                  <p className="pathCardBody">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section landingTrySection" id="try">
        <div className="landingTryHeader">
          <h2 className="landingTryTitle">Paste a bullet. See what we can do.</h2>
          <p className="landingTrySubtitle">We’ll rewrite it once you’re in. Sign up free and get your result in seconds.</p>
        </div>
        <form onSubmit={handleTrySubmit} className="landingTryCard">
          <label className="landingTryLabel" htmlFor="landing-try-text">
            Resume bullet or sentence
          </label>
          <textarea
            id="landing-try-text"
            className="landingTryInput"
            placeholder="e.g. Worked with the engineering team to ship new features."
            value={tryText}
            onChange={(e) => setTryText(e.target.value)}
            maxLength={LANDING_TRY_MAX_LENGTH + 100}
            rows={6}
            aria-describedby={tryError ? 'landing-try-error' : 'landing-try-hint'}
          />
          <p id="landing-try-hint" className="landingTryHint">{tryText.length} / {LANDING_TRY_MAX_LENGTH} characters</p>
          {tryError && <p id="landing-try-error" className="landingTryError" role="alert">{tryError}</p>}
          <button type="submit" className="landingTryCta">
            Get my AI rewrite sign up free
          </button>
          <p className="landingTryLogin">
            Already have an account? <Link to="/login" state={{ fromLandingTry: true }} className="landingTryLoginLink">Sign in</Link>
          </p>
        </form>
      </section>

      <section className="section aboutSection" id="about">
        <div className="sectionHeader aboutSectionHeader">
          <p className="sectionLabel">Why bioqz</p>
          <h2 className="sectionTitle">Make every application stronger—in a few simple steps.</h2>
          <p className="aboutLead">
            You bring the experience. We help you show it in a way recruiters and hiring systems understand.
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
          <ul className="aboutPoints" aria-label="What bioqz does for you">
            <li><strong>Add your resume</strong> and paste the job you want. That’s all you need to start.</li>
            <li><strong>Improve your wording</strong> with AI suggestions. See old vs new side by side.</li>
            <li><strong>Check your fit</strong> with a score against the job description so you know what to fix.</li>
            <li><strong>Download a clean PDF</strong> that works with applicant systems—no design skills required.</li>
          </ul>
          <p className="aboutFootnote">
            <strong>Free:</strong> 2 AI rewrites per day. Upgrade when you want more. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="section" id="features">
        <div className="sectionHeader">
          <p className="sectionLabel">How it works</p>
          <h2 className="sectionTitle">Built to get you past the screeners</h2>
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
            AI resume builder &amp; writer — common questions
          </h2>
          <p className="landingFaqIntro">
            Quick answers for people searching for AI resume software, an AI resume maker, or ATS-friendly tools.
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
          <h2>Your next job is out there. Your resume should be ready.</h2>
          <p>Join free. 2 AI rewrites today. No credit card.</p>
          <Link to="/register" className="heroCta">Get started free</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">bioqz</Link>
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
          <span className="footerCopy">© {new Date().getFullYear()} bioqz. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}
