/**
 * Blog content for SEO + AEO. Aligned with bioqz: humanizer workspace, naturalness analysis, PDF export.
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
    slug: 'make-ai-writing-sound-human',
    title: 'How to Make AI-Generated Writing Sound More Human',
    metaDescription:
      'Practical edits for rhythm, specificity, and voice—plus how bioqz helps you analyze drafts and humanize selections with tone controls.',
    date: '2025-03-18',
    readTime: '6 min',
    keywords: ['ai humanizer', 'natural writing', 'ai text editing', 'writing rhythm'],
    blocks: [
      {
        type: 'p',
        text: 'AI drafts often share the same tells: even sentence length, vague abstractions (“leverage”, “robust”, “landscape”), and transitions that feel stamped from a template. Readers notice before they can name it. The fix is not louder adjectives—it is variety, specificity, and a voice that matches your audience.',
      },
      {
        type: 'h2',
        text: 'Three levers that matter',
      },
      {
        type: 'ul',
        items: [
          'Rhythm: mix short sentences with longer ones; break up paragraphs that all look the same.',
          'Specificity: swap general nouns for concrete ones; tie claims to real examples you can defend.',
          'Voice: read a paragraph aloud; if you would not say it, rewrite it closer to speech—still professional if the context demands it.',
        ],
      },
      {
        type: 'h2',
        text: 'Where bioqz fits',
      },
      {
        type: 'p',
        text: 'bioqz gives you a workspace to paste or upload text, optional context (audience, channel, assignment), and a naturalness-style analysis with dimensions like rhythm and specificity. You then humanize selected passages with tone and intensity—or shorten or expand the whole document—while keeping your facts intact.',
      },
      {
        type: 'blockquote',
        text: 'Good editing preserves truth; it only changes how clearly and credibly that truth lands.',
      },
    ],
  },
  {
    slug: 'tone-academic-professional-casual',
    title: 'Choosing Tone: Academic, Professional, and Casual (Without Sounding Robotic)',
    metaDescription:
      'Match register to audience—formal paper vs. client email vs. social post—and use tools like bioqz to steer rewrites consistently.',
    date: '2025-03-10',
    readTime: '5 min',
    keywords: ['writing tone', 'academic tone', 'professional writing', 'casual writing'],
    blocks: [
      {
        type: 'p',
        text: 'Tone is not “fancy words.” It is the contract you make with the reader: how close you stand, how much you assume, and how much formality signals respect vs. distance.',
      },
      {
        type: 'h2',
        text: 'Quick reference',
      },
      {
        type: 'ul',
        items: [
          'Academic: precise terms, explicit reasoning, minimal hype; citations and discipline norms rule.',
          'Professional: clear, direct, polite; jargon only when the audience shares it.',
          'Casual: shorter sentences, plain words, more personality—still appropriate to the platform.',
        ],
      },
      {
        type: 'h2',
        text: 'Using bioqz for tone',
      },
      {
        type: 'p',
        text: 'Set optional context (“memo for legal team”, “LinkedIn post for designers”) and pick a style preset before you humanize a selection. Analysis can factor in tone fit when context is present—so you get feedback aligned with intent, not a single generic ideal.',
      },
    ],
  },
  {
    slug: 'export-clean-pdf-from-editor',
    title: 'Exporting a Clean PDF From Your Humanizer Workspace',
    metaDescription:
      'Why a simple PDF still matters for submissions and archives—and how bioqz exports from your formatted document.',
    date: '2025-03-05',
    readTime: '4 min',
    keywords: ['export pdf text', 'document pdf', 'writing workflow'],
    blocks: [
      {
        type: 'p',
        text: 'After you humanize and refine, you often need a file you can attach or archive. bioqz includes PDF (and Word) export from the same rich-text workspace you edited in—headings, lists, and paragraphs preserved for a readable layout.',
      },
      {
        type: 'h2',
        text: 'Workflow tip',
      },
      {
        type: 'p',
        text: 'Run analysis, humanize the phrases that still feel flat, then export. If a platform requires plain text, use the .txt export and paste where needed.',
      },
    ],
  },
]

export function getBlogArticlesSorted(): BlogArticle[] {
  return [...blogArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug)
}
