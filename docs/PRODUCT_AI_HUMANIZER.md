# bioqz — AI humanizer (current product)

## Purpose

Help users make writing sound more natural and clear: analyze how “AI-like” or generic text reads, then humanize selected passages with DeepSeek while preserving meaning. Optional **context** (audience, assignment, channel) steers tone.

## Stack (unchanged)

Vite + React + React Router · Express + PostgreSQL (`pg`) · JWT + optional Google OAuth · Stripe · DeepSeek (`deepseek-chat`) · Tiptap editor · pdfmake (document PDF export).

## Core flows

1. **Workspace** (`/dashboard/workspace`) — Rich text; paste or upload `.txt` to seed content; optional context field (stored on project as `job_description` in DB).
2. **Humanize** — User selects text → `POST /api/ai/rewrite` with tone, optional intensity, optional context.
3. **Analyze** — `POST /api/ai/score` — AI-likeness / naturalness score (0–100) + breakdown + keywords/phrases to watch; optional context for tone alignment.
4. **Adjust length** — `POST /api/ai/summary` repurposed as shorten/expand style operations (see API).
5. **Projects** — Saved documents with limits by tier.
6. **Export** — `POST /api/resume/export-pdf` — export current document as PDF.

## API (summary)

| Endpoint | Role |
|----------|------|
| `POST /api/ai/rewrite` | Humanize selection |
| `POST /api/ai/score` | Analyze naturalness / AI-like patterns |
| `POST /api/ai/summary` | Shorten or expand full document |
| `POST /api/projects/*` | CRUD projects |
| `POST /api/resume/export-pdf` | PDF export |

## Principles

- Positioning: **clarity and natural voice**, not evading academic or platform policies.
- Abuse: `usage_logs`, daily caps, burst lockout, rate limits (see `server/middleware/usage.ts`).

## Legacy design doc

Resume MVP detail: [archive/PRODUCT_DESIGN_resume_mvp.md](archive/PRODUCT_DESIGN_resume_mvp.md).
