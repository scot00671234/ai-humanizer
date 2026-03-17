import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setPendingRewrite } from '../utils/landingPendingRewrite'

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
  { icon: '◇', title: 'Sound like a top candidate', description: 'Select any bullet. One click. Your wording gets sharper—strong verbs, real metrics, the kind recruiters actually notice. No fluff, no generic phrases.' },
  { icon: '◆', title: 'Know exactly where you stand', description: 'Paste the job description. Get a 0–100 score and a clear breakdown: keyword match, verb strength, length, ATS safety. Fix the gaps before you hit submit.' },
  { icon: '○', title: 'Submit with confidence', description: 'One-click PDF. Clean, professional layouts that pass every ATS. Three templates—pick the one that fits your industry and your story.' },
] as const

const PLANS = [
  { name: 'Free', price: 0, period: 'month', description: 'Everything you need to land your next role. No credit card required.', features: ['50 AI rewrites per day', 'ATS score & keyword highlights', 'Side-by-side original vs current', 'PDF export', '3 layout templates'], cta: 'Get started free', ctaTo: '/register', featured: false },
  { name: 'Pro', price: 29, period: 'month', description: 'When you\'re applying to dozens of roles, we\'ve got you covered.', features: ['500 AI rewrites per day', 'Everything in Free', 'Priority processing', 'No ads', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: true },
  { name: 'Team', price: 59, period: 'month', description: 'Unlimited ambition. No compromise on rewrites.', features: ['1,500 AI rewrites per day', 'Everything in Pro', 'Highest priority processing', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: false },
] as const

const LANDING_TRY_MAX_LENGTH = 800

export default function Landing() {
  const navigate = useNavigate()
  const [tryText, setTryText] = useState('')
  const [tryError, setTryError] = useState<string | null>(null)

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
      <main className="hero">
        <div className="heroBg" aria-hidden>
          <div className="heroOrb heroOrbTop" />
          <div className="heroOrb heroOrbBottom" />
          <div className="heroOrb heroOrbCenter" />
        </div>
        <div className="blobs">
          <BlobTop />
          <BlobBottom />
        </div>
        <div className="heroContent">
          <span className="heroBadge">Join job seekers who get more callbacks</span>
          <h1 className="heroTitle">Your resume gets one shot. Make it count.</h1>
          <p className="heroSubtitle">
            Most resumes never reach a human—they're filtered out by software. Resume AI helps you speak the right language: sharper bullets, instant ATS scoring, and a PDF that actually gets read.
          </p>
          <Link to="/register" className="heroCta">Make my resume stand out</Link>
        </div>
      </main>

      <section className="section landingTrySection" id="try">
        <div className="sectionHeader">
          <p className="sectionLabel">Try it</p>
          <h2 className="sectionTitle">Paste a bullet. See what AI can do.</h2>
          <p className="landingTrySubtitle">We’ll rewrite it once you’re in—sign up free to get your result.</p>
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
            rows={3}
            aria-describedby={tryError ? 'landing-try-error' : undefined}
          />
          <p className="landingTryHint">{tryText.length} / {LANDING_TRY_MAX_LENGTH} characters</p>
          {tryError && <p id="landing-try-error" className="landingTryError" role="alert">{tryError}</p>}
          <button type="submit" className="landingTryCta">
            Get my AI rewrite — Sign up free
          </button>
          <p className="landingTryLogin">
            Already have an account? <Link to="/login" state={{ fromLandingTry: true }}>Sign in</Link>
          </p>
        </form>
      </section>

      <section className="section" id="about">
        <div className="sectionHeader">
          <p className="sectionLabel">Why Resume AI</p>
          <h2 className="sectionTitle">You're not bad at job hunting. Your resume just isn't speaking the right language.</h2>
        </div>
        <div className="aboutContent">
          <p className="aboutText">
            Paste your resume. Paste the job description. Our AI sharpens your bullets, scores you against the role, and shows you exactly which keywords to hit. You get a side-by-side view so you see the difference, then one click for a clean, ATS-friendly PDF. No design skills. No guesswork.
          </p>
          <p className="aboutText">
            We built fair limits so everyone gets a smooth experience—50 rewrites a day on the house, more when you need them. No lock-in. Cancel anytime.
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

      <section className="section ctaSection">
        <div className="ctaBox">
          <h2>Your next job is out there. Your resume should be ready.</h2>
          <p>Join for free—50 AI rewrites today. No credit card required.</p>
          <Link to="/register" className="heroCta">Get started free</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">Resume AI</Link>
          <div className="footerLinks">
            <a href="/#about">About</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <span className="footerCopy">© {new Date().getFullYear()} Resume AI. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}
