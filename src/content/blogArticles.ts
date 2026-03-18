/**
 * Blog content for SEO + AEO (answer-focused sections for AI overview tools).
 * Aligned with bioqz: resume/application editor, JD paste + score, AI rewrites, PDF export.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'blockquote'; text: string }

export interface BlogArticle {
  slug: string
  title: string
  metaDescription: string
  date: string
  readTime: string
  keywords: string[]
  blocks: BlogBlock[]
}

export const blogArticles: BlogArticle[] = [
  {
    slug: 'tailor-resume-to-job-description-ats',
    title: 'How to Tailor Your Resume to a Job Description (and Still Pass ATS)',
    metaDescription:
      'Step-by-step guide to matching your resume to a job posting: keywords, structure, and ATS-safe edits—plus how tools like bioqz help you score and refine before you apply.',
    date: '2025-03-15',
    readTime: '8 min',
    keywords: [
      'tailor resume to job description',
      'resume keywords job posting',
      'ATS friendly resume',
      'match resume to job',
    ],
    blocks: [
      {
        type: 'p',
        text: 'Recruiters and applicant tracking systems (ATS) both ask the same question in different ways: does this resume clearly show you can do this role? Tailoring your resume to the job description is one of the highest-leverage changes you can make—without rewriting your whole career story.',
      },
      {
        type: 'h2',
        text: 'Why tailoring matters for ATS and humans',
      },
      {
        type: 'p',
        text: 'ATS software parses your resume into fields and scores overlap between your document and the job posting. Humans then skim for proof: skills, impact, and relevance. A tailored resume improves keyword overlap for machines and signal density for people.',
      },
      {
        type: 'h2',
        text: 'A practical tailoring workflow',
      },
      {
        type: 'ul',
        items: [
          'Paste or read the job description and highlight must-have skills, tools, and responsibilities (often repeated or in the first bullets).',
          'Mirror exact phrases where honest (e.g. “stakeholder management” vs “working with stakeholders”)—without stuffing keywords unnaturally.',
          'Reorder bullets on your resume so the most relevant wins appear first under each role.',
          'Add one line per role that ties your outcome to their stated need (e.g. “Reduced onboarding time 30%—aligned with JD focus on operational efficiency”).',
        ],
      },
      {
        type: 'h2',
        text: 'How bioqz fits this workflow',
      },
      {
        type: 'p',
        text: 'bioqz is built around the job description: you paste the role, paste or upload your resume, and get an ATS-oriented score and keyword-style feedback so you see gaps before you submit. You can then rewrite selected bullets with AI in your own voice and export a clean PDF that stays readable for both ATS and hiring managers.',
      },
      {
        type: 'blockquote',
        text: 'Tailoring is not lying—it is emphasizing the true parts of your experience that best match the role.',
      },
      {
        type: 'h2',
        text: 'Quick checklist before you hit apply',
      },
      {
        type: 'ul',
        items: [
          'Job title and level in your headline or summary reflect the role you want, not only the title you had.',
          'Core tools from the JD appear in skills or experience where you actually used them.',
          'File is PDF or DOCX as requested; headings are simple (avoid complex tables for critical text).',
        ],
      },
    ],
  },
  {
    slug: 'ats-resume-score-improve',
    title: 'What Is an ATS Resume Score—and How Can You Improve Yours?',
    metaDescription:
      'Learn what ATS and keyword-style resume scoring measures, common myths, and concrete steps to raise your match score—including using a JD-based score in bioqz.',
    date: '2025-03-12',
    readTime: '7 min',
    keywords: ['ATS resume score', 'resume keyword match', 'applicant tracking system resume', 'resume optimization'],
    blocks: [
      {
        type: 'p',
        text: 'People search for “ATS resume score” because they want a number that tells them if their application will survive the first filter. In reality, each employer may use different parsers and rules—but the idea is consistent: how well your resume aligns with the job posting on skills, terms, and structure.',
      },
      {
        type: 'h2',
        text: 'What a score usually reflects',
      },
      {
        type: 'ul',
        items: [
          'Keyword overlap: terms from the job description that appear in your resume.',
          'Section structure: clear experience, education, skills so parsers can map content.',
          'Readability: dense blocks or unusual layouts can hurt extraction quality.',
        ],
      },
      {
        type: 'h2',
        text: 'Myths to ignore',
      },
      {
        type: 'p',
        text: 'No public score guarantees a human will read your resume. Treat scores as feedback, not a game to max out with hidden white text or irrelevant keywords—both can backfire.',
      },
      {
        type: 'h2',
        text: 'How to improve your match (ethically)',
      },
      {
        type: 'ul',
        items: [
          'Work from one real job description at a time.',
          'Add missing skills you truly have; rephrase bullets to include natural language from the posting.',
          'Shorten long walls of text; lead each bullet with impact, then method.',
        ],
      },
      {
        type: 'h2',
        text: 'Using bioqz for JD-based scoring',
      },
      {
        type: 'p',
        text: 'bioqz lets you paste the job description alongside your resume and see a score plus breakdown-style feedback (e.g. keyword and structure-oriented signals). That turns vague anxiety into a short edit list—then you can rewrite specific lines with AI and re-check until you are happy with the tradeoff between authenticity and fit.',
      },
    ],
  },
  {
    slug: 'ai-rewrite-resume-bullets-guide',
    title: 'Using AI to Rewrite Resume Bullets: What Works (and What to Avoid)',
    metaDescription:
      'A practical guide to AI resume bullet rewrites: strong verbs, metrics, tone—how bioqz rewrites selection-by-selection so you stay in control.',
    date: '2025-03-10',
    readTime: '6 min',
    keywords: ['AI resume rewrite', 'resume bullet points AI', 'improve resume wording', 'ChatGPT resume bullets'],
    blocks: [
      {
        type: 'p',
        text: 'Searches like “AI resume rewrite” and “ChatGPT resume bullets” are exploding. Used well, AI can sharpen weak bullets; used poorly, it produces generic filler that sounds like everyone else. The difference is control: rewrite one bullet at a time with clear instructions.',
      },
      {
        type: 'h2',
        text: 'What good AI-assisted bullets share',
      },
      {
        type: 'ul',
        items: [
          'A strong verb (owned, led, shipped, cut, scaled).',
          'A measurable or specific outcome where possible (%, $, time, volume).',
          'Scope (team size, region, product) when it adds credibility.',
        ],
      },
      {
        type: 'h2',
        text: 'What to avoid',
      },
      {
        type: 'ul',
        items: [
          'Vague claims: “passionate,” “synergy,” “go-getter” without proof.',
          'Invented metrics or responsibilities—always fact-check every line.',
          'One-click “rewrite whole resume” without reading every sentence.',
        ],
      },
      {
        type: 'h2',
        text: 'How bioqz approaches rewrites',
      },
      {
        type: 'p',
        text: 'In bioqz you select text in the editor and rewrite with AI—optionally adding a short instruction (e.g. “more concise,” “more leadership focus”). That mirrors how strong editors work: iterative, localized, verifiable. You stay the author; AI is the wording partner.',
      },
      {
        type: 'blockquote',
        text: 'The best resume is still true. AI should make truth clearer, not louder.',
      },
    ],
  },
  {
    slug: 'resume-optimization-ai-search-ats-2025',
    title: 'Resume Optimization for AI Search and ATS in 2025',
    metaDescription:
      'AEO and SEO for job seekers: how answer engines and traditional ATS both reward clear, structured resumes—and how to optimize for both with bioqz.',
    date: '2025-03-08',
    readTime: '9 min',
    keywords: [
      'AI search optimization resume',
      'AEO job search',
      'optimize resume for AI',
      'ATS and AI recruiting',
    ],
    blocks: [
      {
        type: 'p',
        text: 'AEO (AI search optimization) is the idea that people—and increasingly AI assistants—find answers in clear, well-structured content. For job seekers, that overlaps with ATS best practices: explicit skills, plain language, and scannable sections. Optimizing for both means your resume is easy to parse by software and easy to summarize by models.',
      },
      {
        type: 'h2',
        text: 'What “AI search” changes for resumes',
      },
      {
        type: 'p',
        text: 'Some candidates now ask ChatGPT or other tools “Is this candidate a fit for X role?” using pasted resumes. Models favor clear headings, bullet lists, and concrete nouns (tools, methodologies, domains). Fluff and buzzwords compress poorly into useful answers.',
      },
      {
        type: 'h2',
        text: 'Overlap with ATS',
      },
      {
        type: 'ul',
        items: [
          'Use standard section names: Experience, Education, Skills.',
          'Put the most important terms in normal body text, not only in graphics.',
          'One main idea per bullet—easier for parsers and for AI summaries.',
        ],
      },
      {
        type: 'h2',
        text: 'Where bioqz helps',
      },
      {
        type: 'p',
        text: 'bioqz combines job-description-aware scoring, selective AI rewrites, and PDF export so you iterate toward a resume that is both keyword-aligned and cleanly structured—exactly the kind of document that performs better in traditional ATS and in AI-assisted review scenarios.',
      },
    ],
  },
  {
    slug: 'ats-friendly-pdf-resume-formatting',
    title: 'ATS-Friendly PDF Resumes: Formatting That Still Looks Professional',
    metaDescription:
      'Tips for PDF resumes that parse well in ATS: fonts, headings, columns, and tables—plus exporting from an editor like bioqz.',
    date: '2025-03-05',
    readTime: '5 min',
    keywords: ['ATS friendly PDF', 'resume PDF ATS', 'resume formatting ATS', 'PDF resume tips'],
    blocks: [
      {
        type: 'p',
        text: 'Many job forms ask for PDF. Done right, PDF is fine for most ATS. The risk is layout: multi-column designs, text in images, or critical keywords only in headers/footers can drop out of parsed text.',
      },
      {
        type: 'h2',
        text: 'Safer formatting choices',
      },
      {
        type: 'ul',
        items: [
          'Single-column body text for core experience and skills.',
          'Common fonts; avoid putting key skills only inside text boxes or graphics.',
          'If you use tables, keep one role per row and test by copying resume text into Notepad—does it read in order?',
        ],
      },
      {
        type: 'h2',
        text: 'Exporting from bioqz',
      },
      {
        type: 'p',
        text: 'bioqz includes PDF export from your edited resume so you can go from tailored content to a file you can upload—after you have already aligned wording with the job description and scores in the app.',
      },
    ],
  },
  {
    slug: 'cover-letter-application-answers-job-description',
    title: 'Cover Letters and Application Answers: Align With the Job Description',
    metaDescription:
      'Use the same job description to sharpen cover letters and long-form application answers—how bioqz job-application mode and scoring support that.',
    date: '2025-03-03',
    readTime: '6 min',
    keywords: [
      'cover letter job description',
      'application answers tips',
      'tailor cover letter to job',
      'job application AI assist',
    ],
    blocks: [
      {
        type: 'p',
        text: 'Beyond the resume, many roles ask for cover letters or free-text “Why this role?” answers. The same job description should drive those pieces: same vocabulary, same pain points, same proof from your experience.',
      },
      {
        type: 'h2',
        text: 'A simple structure for application text',
      },
      {
        type: 'ul',
        items: [
          'Open with role + company and one sentence on why you fit.',
          'Middle: 2–3 bullets mapping their needs to your outcomes.',
          'Close with enthusiasm and a clear next step.',
        ],
      },
      {
        type: 'h2',
        text: 'bioqz for applications, not only resumes',
      },
      {
        type: 'p',
        text: 'bioqz supports a job application mode: you can work on cover-letter-style content, use AI rewrites on selected paragraphs, and still paste the job description for scoring-style feedback. Same workflow as resume editing—consistent with how people actually apply today.',
      },
    ],
  },
]

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug)
}

export function getBlogArticlesSorted(): BlogArticle[] {
  return [...blogArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
}
