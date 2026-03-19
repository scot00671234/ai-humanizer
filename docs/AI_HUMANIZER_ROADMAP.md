# AI humanizer — implementation roadmap

Living checklist for the pivot from resume builder to humanizer. Update as features ship.

## Done (baseline pivot)

- [x] Docs: [`PRODUCT_AI_HUMANIZER.md`](PRODUCT_AI_HUMANIZER.md), archived resume design, this roadmap, README + LOCAL_SETUP
- [x] DeepSeek: humanize prompts, naturalness score (`rhythm` / `specificity` / `voice` / `toneFit`), tones + intensity, summary → shorten/expand
- [x] API: `/api/ai` bodies support `documentText` + optional `documentContext`; free tier 2 analyses/day; analyze cache by text+context+tone
- [x] Client [`src/api/client.ts`](../src/api/client.ts) + workspace UI ([`DashboardResume`](../src/pages/DashboardResume.tsx)); `/dashboard/workspace` + redirect from `/dashboard/resume`
- [x] Marketing: landing, FAQ, blog (new slugs), contact, guide, settings, privacy/terms meta, sitemap
- [x] PDF/DOCX export default filenames `document.pdf` / `document.docx`
- [x] Analysis UI shows DeepSeek `notes` as coach commentary
- [x] Workspace supports “Humanize full draft” (not only selection)

## Optional next steps

- [ ] Streaming responses for long humanizations
- [ ] Per-phrase highlights from model (spans) in preview
- [ ] Rename DB column `job_description` → `context` (migration + code)
- [ ] Additional languages / locale presets in UI

## Key files

| Area | Path |
|------|------|
| Prompts | `server/services/deepseek.ts` |
| AI routes | `server/routes/ai.ts` |
| Limits | `server/middleware/usage.ts` |
| Analyze cache | `server/services/jobDescCache.ts` |
| Workspace UI | `src/pages/DashboardResume.tsx` (route: workspace) |
| API client | `src/api/client.ts` |
