import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBlogArticlesSorted } from '../content/blogArticles'
import { setSeoMeta } from '../utils/seoMeta'

export default function Blog() {
  const articles = getBlogArticlesSorted()

  useEffect(() => {
    setSeoMeta({
      title: 'Blog - Sosiol | Natural Writing & Tone Tips',
      description:
        'AI humanizer tips: humanize AI writing, control tone, improve rhythm and clarity, and rewrite sentences to sound natural, plus export workflows from your Sosiol workspace.',
      path: '/blog',
      keywords:
        'ai humanizer, ai humaniser, humanize ai text, humanize ai writing, ai writing rewrite, rewrite ai text, tone control, natural writing, text rewriter, ai text editing, writing clarity, paraphrase ai',
    })
  }, [])

  return (
    <div className="blogPage">
      <div className="blogHero">
        <h1 className="blogHeroTitle">Blog</h1>
        <p className="blogHeroLead">
          Tips for clearer, more natural writing, aligned with what Sosiol helps you do: analyze drafts, humanize selections,
          adjust length, and export when you are done.
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
