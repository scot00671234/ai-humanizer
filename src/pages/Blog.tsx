import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBlogArticlesSorted } from '../content/blogArticles'

export default function Blog() {
  const articles = getBlogArticlesSorted()

  useEffect(() => {
    document.title = 'Blog — bioqz | Resume, ATS & job search tips'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Practical guides on tailoring your resume to job descriptions, ATS scores, AI resume rewrites, PDF formatting, and application answers—built around how bioqz works.'
      )
    }
  }, [])

  return (
    <div className="blogPage">
      <div className="blogHero">
        <h1 className="blogHeroTitle">Blog</h1>
        <p className="blogHeroLead">
          Tips for stronger resumes, ATS alignment, and applying with confidence—aligned with what bioqz helps you do:
          paste a job description, score and refine your resume, rewrite with AI, and export.
        </p>
      </div>
      <ul className="blogGrid">
        {articles.map((a) => (
          <li key={a.slug}>
            <article className="blogCard">
              <time className="blogCardDate" dateTime={a.date}>
                {new Date(a.date + 'T12:00:00').toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
              <h2 className="blogCardTitle">
                <Link to={`/blog/${a.slug}`}>{a.title}</Link>
              </h2>
              <p className="blogCardExcerpt">{a.metaDescription}</p>
              <div className="blogCardFooter">
                <span className="blogCardRead">{a.readTime} read</span>
                <Link to={`/blog/${a.slug}`} className="blogCardReadMore">
                  Read article →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="blogBackWrap">
        <Link to="/" className="contentBack">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
