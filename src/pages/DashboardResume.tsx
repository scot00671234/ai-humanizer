import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ResumeEditor, { type ResumeEditorHandle } from '../components/ResumeEditor'
import ResumeAnalysisFeedback from '../components/ResumeAnalysisFeedback'
import ResumePreview from '../components/ResumePreview'
import { api } from '../api/client'
import { extractResumeText, RESUME_UPLOAD_ACCEPT } from '../utils/extractResumeText'
import { getPendingRewrite, clearPendingRewrite } from '../utils/landingPendingRewrite'
import type { Content } from '@tiptap/react'

const UPLOAD_PASTE_HINT = ' Can\'t upload? Copy and paste your text into the editor below.'

const REWRITE_LANGUAGES = [
  { value: 'same', label: 'Same as input' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
] as const

const REWRITE_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'business-casual', label: 'Business casual' },
  { value: 'academic', label: 'Academic' },
  { value: 'technical', label: 'Technical' },
  { value: 'concise', label: 'Concise' },
  { value: 'achievement-focused', label: 'Achievement-focused' },
  { value: 'casual', label: 'Casual' },
  { value: 'creative', label: 'Creative' },
  { value: 'simple', label: 'Simple / plain' },
] as const

export default function DashboardResume() {
  const { user, refreshUser } = useAuth()
  const [humanizeIntensity, setHumanizeIntensity] = useState<'light' | 'medium' | 'strong'>('medium')
  const [editorContent, setEditorContent] = useState<Content>('')
  const [editorText, setEditorText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [documentContext, setDocumentContext] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number> | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [analysisNotes, setAnalysisNotes] = useState<string | undefined>(undefined)
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteError, setRewriteError] = useState<string | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [rewriteLanguage, setRewriteLanguage] = useState('same')
  const [rewriteTone, setRewriteTone] = useState('professional')
  const [rewriteContext, setRewriteContext] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [landingRewriteLoading, setLandingRewriteLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [lengthAdjustKind, setLengthAdjustKind] = useState<'shorten' | 'expand' | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [rewriteBookmarkHint, setRewriteBookmarkHint] = useState(false)
  const editorRef = useRef<ResumeEditorHandle>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const atsPanelRef = useRef<HTMLDivElement>(null)
  const wasScoreLoading = useRef(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectIdFromUrl = searchParams.get('projectId')

  const handleEditorChange = useCallback((html: string, text: string) => {
    setEditorContent(html)
    setEditorText(text)
  }, [])

  // Load projects list (dropdown); failure leaves list empty
  useEffect(() => {
    api.projects.list()
      .then((res) => setProjects(res.projects.map((p) => ({ id: p.id, title: p.title || 'Untitled' }))))
      .catch((err) => console.warn('Projects list failed:', err))
  }, [])

  // Load project when URL has projectId (ignore response if id changed before it resolved)
  useEffect(() => {
    if (!projectIdFromUrl) {
      setCurrentProjectId(null)
      setCurrentProjectTitle('')
      setDocumentContext('')
      setOriginalText('')
      setSaveError(null)
      return
    }
    setProjectLoading(true)
    setSaveError(null)
    let cancelled = false
    api.projects.get(projectIdFromUrl)
      .then((proj) => {
        if (cancelled || projectIdFromUrl !== proj.id) return
        setCurrentProjectId(proj.id)
        setCurrentProjectTitle(proj.title || 'Untitled')
        setEditorContent(proj.content || '')
        const computedText = proj.content
          ? (() => {
              const div = document.createElement('div')
              div.innerHTML = proj.content
              return div.textContent || ''
            })()
          : ''
        setEditorText(computedText)
        setOriginalText(computedText)
        setDocumentContext(typeof proj.job_description === 'string' ? proj.job_description : '')
        setProjects((prev) => prev.some((p) => p.id === proj.id) ? prev : [...prev, { id: proj.id, title: proj.title || 'Untitled' }])
      })
      .catch(() => { if (!cancelled) setSaveError('Failed to load project') })
      .finally(() => { if (!cancelled) setProjectLoading(false) })
    return () => { cancelled = true }
  }, [projectIdFromUrl])

  const handleSave = useCallback(async () => {
    setSaveError(null)
    setSaveLoading(true)
    const content = typeof editorContent === 'string' ? editorContent : ''
    try {
      const name = currentProjectTitle.trim() || 'Untitled'
      if (currentProjectId) {
        await api.projects.update(currentProjectId, {
          content,
          title: name,
          jobDescription: documentContext,
        })
        setCurrentProjectTitle(name)
        setProjects((prev) => prev.map((p) => (p.id === currentProjectId ? { ...p, title: name } : p)))
        setOriginalText(editorText)
      } else {
        const created = await api.projects.create(name)
        setCurrentProjectId(created.id)
        setCurrentProjectTitle(created.title || name)
        setProjects((prev) => [...prev, { id: created.id, title: created.title || name }])
        navigate(`/dashboard/workspace?projectId=${created.id}`, { replace: true })
        await api.projects.update(created.id, { content, jobDescription: documentContext })
        setOriginalText(editorText)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaveLoading(false)
    }
  }, [currentProjectId, currentProjectTitle, editorContent, documentContext, navigate, editorText])

  const handleSaveAs = useCallback(async () => {
    const title = currentProjectTitle.trim() || 'Untitled'
    setSaveError(null)
    setSaveLoading(true)
    const content = typeof editorContent === 'string' ? editorContent : ''
    try {
      const created = await api.projects.create(title)
      await api.projects.update(created.id, { content, jobDescription: documentContext })
      setCurrentProjectId(created.id)
      setCurrentProjectTitle(created.title || 'Untitled')
      setProjects((prev) => [...prev, { id: created.id, title: created.title || 'Untitled' }])
      navigate(`/dashboard/workspace?projectId=${created.id}`, { replace: true })
      setOriginalText(editorText)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save as new project')
    } finally {
      setSaveLoading(false)
    }
  }, [currentProjectTitle, editorContent, documentContext, navigate, editorText])

  const handleRewrite = useCallback(async () => {
    const text = editorRef.current?.getSelectedText()?.trim()
    if (!text) {
      setRewriteError('Select some text in the editor first.')
      return
    }
    setRewriteError(null)
    setRewriteLoading(true)
    try {
      const res = await api.ai.rewrite(text, {
        language: rewriteLanguage,
        tone: rewriteTone,
        context: rewriteContext.trim() || undefined,
        documentContext: documentContext.trim() || undefined,
        intensity: humanizeIntensity,
      })
      if (res.rewritten) {
        editorRef.current?.replaceSelection(res.rewritten)
      }
      await refreshUser()
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setRewriteLoading(false)
    }
  }, [refreshUser, rewriteLanguage, rewriteTone, rewriteContext, documentContext, humanizeIntensity])

  const handleHumanizeFullDocument = useCallback(async () => {
    const text = editorText.trim()
    if (!text) {
      setRewriteError('Add some text in the editor first.')
      return
    }
    setRewriteError(null)
    setRewriteLoading(true)
    try {
      const res = await api.ai.rewrite(text, {
        language: rewriteLanguage,
        tone: rewriteTone,
        context: rewriteContext.trim() || undefined,
        documentContext: documentContext.trim() || undefined,
        intensity: humanizeIntensity,
      })
      if (res.rewritten) {
        editorRef.current?.replaceFullDocumentFromPlain(res.rewritten)
      }
      await refreshUser()
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setRewriteLoading(false)
    }
  }, [editorText, refreshUser, rewriteLanguage, rewriteTone, rewriteContext, documentContext, humanizeIntensity])

  const handleScore = useCallback(async () => {
    if (!editorText.trim()) {
      setScoreError('Add some text in the editor first.')
      return
    }
    setScoreError(null)
    setScoreLoading(true)
    try {
      const res = await api.ai.score(editorText, {
        documentContext: documentContext.trim() || undefined,
        targetTone: rewriteTone,
      })
      setScore(res.score)
      setScoreBreakdown(res.breakdown ?? null)
      setKeywords(res.keywords ?? [])
      setAnalysisNotes(res.notes ?? undefined)
      await refreshUser()
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setScoreLoading(false)
    }
  }, [editorText, documentContext, rewriteTone, refreshUser])

  useEffect(() => {
    if (wasScoreLoading.current && !scoreLoading && score !== null) {
      atsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    wasScoreLoading.current = scoreLoading
  }, [scoreLoading, score])

  const getContentToExport = useCallback(() => editorRef.current?.getExportText?.() ?? editorText, [editorText])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPdf = useCallback(async () => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    setExportLoading(true)
    try {
      const blob = await api.resume.exportPdf(contentToExport)
      downloadBlob(blob, 'document.pdf')
      await refreshUser()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }, [getContentToExport, downloadBlob, refreshUser])

  const handleExportDocx = useCallback(async () => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    setExportLoading(true)
    try {
      const blob = await api.resume.exportDocx(contentToExport)
      downloadBlob(blob, 'document.docx')
      await refreshUser()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }, [getContentToExport, downloadBlob, refreshUser])

  const handleExportText = useCallback(() => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, 'document.txt')
  }, [getContentToExport, downloadBlob])

  const handleLengthAdjust = useCallback(
    async (direction: 'shorten' | 'expand') => {
      if (!editorText?.trim() || editorText.trim().length < 50) {
        setSummaryError('Add more text (at least a few lines) before shortening or expanding.')
        return
      }
      setSummaryError(null)
      setLengthAdjustKind(direction)
      setSummaryLoading(true)
      try {
        const { summary } = await api.ai.summary(editorText, {
          documentContext: documentContext.trim() || undefined,
          direction,
        })
        if (summary?.trim()) {
          editorRef.current?.replaceFullDocumentFromPlain(summary.trim())
        }
        await refreshUser()
      } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'Could not adjust length. Please try again.')
      } finally {
        setSummaryLoading(false)
        setLengthAdjustKind(null)
      }
    },
    [editorText, documentContext, refreshUser]
  )

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text?.trim()) return
    setEditorContent((prev) => {
      if (typeof prev === 'string' && prev.trim().length > 0) return prev
      return text
    })
    setEditorText((prev) => {
      if (prev.trim().length > 0) return prev
      return text
    })
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setEditorError(null)
    setUploadLoading(true)
    try {
      const text = await extractResumeText(file)
      if (!text.trim()) {
        setEditorError('No text could be extracted from this file (it may be a scanned image).' + UPLOAD_PASTE_HINT)
        return
      }
      setEditorContent((prev) => {
        if (typeof prev === 'string' && prev.trim().length > 0) return prev
        return text
      })
      setEditorText((prev) => {
        if (prev.trim().length > 0) return prev
        return text
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read file.'
      setEditorError(message.includes('paste') ? message : message + UPLOAD_PASTE_HINT)
    } finally {
      setUploadLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!exportMenuOpen) return
    const onOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [exportMenuOpen])

  useEffect(() => {
    const pending = getPendingRewrite()
    if (!pending?.text?.trim()) return
    clearPendingRewrite()
    const text = pending.text.trim()
    setOriginalText(text)
    setLandingRewriteLoading(true)
    setRewriteError(null)
    api.ai
      .rewrite(text)
      .then((res) => {
        if (res.rewritten) {
          setEditorContent(res.rewritten)
          setEditorText(res.rewritten)
        }
      })
      .catch((err) => {
        setRewriteError(err instanceof Error ? err.message : 'Could not run your rewrite.')
        setEditorContent(text)
        setEditorText(text)
      })
      .finally(() => {
        setLandingRewriteLoading(false)
        refreshUser()
      })
  }, [refreshUser])

  const used = user?.rewriteCountToday ?? 0
  const limit = user?.rewriteLimit ?? 2
  const scoreUsed = user?.scoreCountToday ?? 0
  const scoreLimit = user?.scoreLimit ?? 2

  return (
    <div className="dashboardPage dashboardResume">
      <header className="resumePageHeader">
        <div className="resumePageHeaderTop">
          <h1 className="dashboardPageTitle">Workspace</h1>
        </div>
        <p className="dashboardPageSubtitle">
          Analyze how natural your writing sounds, humanize selections with AI, optionally shorten or expand the whole draft, then export.
        </p>
        <div className="resumeUsage">
          Editing (humanize / shorten / expand) today: {used} / {limit}
          {' · '}
          Analysis today: {scoreUsed} / {scoreLimit}
          {(user?.isPro || user?.isTeam) && ' (paid plan)'}
        </div>
        <div className="resumeProjectBar">
          <div className="resumeProjectNameWrap">
            <label htmlFor="resume-project-name" className="resumeProjectNameLabel">
              Project name
            </label>
            <input
              id="resume-project-name"
              type="text"
              className="resumeProjectTitleInput"
              value={projectLoading ? '' : currentProjectTitle}
              onChange={(e) => setCurrentProjectTitle(e.target.value)}
              placeholder={projectLoading ? 'Loading…' : 'e.g. Blog post — draft 2'}
              disabled={projectLoading}
              maxLength={255}
              autoComplete="off"
              aria-label="Project name"
            />
          </div>
          <div className="resumeProjectActions">
            <select
              className="resumeProjectSelect"
              value={currentProjectId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                if (id) navigate(`/dashboard/workspace?projectId=${id}`)
                else navigate('/dashboard/workspace')
              }}
              aria-label="Switch project"
            >
              <option value="">New (no project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button type="button" className="dashboardBtn dashboardBtnSecondary" onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? 'Saving…' : currentProjectId ? 'Save' : 'Save project'}
            </button>
            <button type="button" className="dashboardBtn dashboardBtnSecondary" onClick={handleSaveAs} disabled={saveLoading || (user?.projectLimit != null && projects.length >= user.projectLimit)}>
              Save as new
            </button>
          </div>
        </div>
        {saveError && <p className="dashboardSettingsError">{saveError}</p>}
        {landingRewriteLoading && (
          <p className="resumeLandingBanner" role="status">
            Humanizing your sample from the landing page…
          </p>
        )}
      </header>

      <div className="resumeFlow">
        <section className="resumeSection resumeCard" id="resume-job-description">
          <h2 className="resumeStepTitle">Context (optional)</h2>
          <p className="resumeStepHint">
            Audience, channel, assignment, or goal — helps humanize and analyze tone. Leave blank for a general pass.
          </p>
          <textarea
            className="resumeJobDesc"
            placeholder="e.g. LinkedIn post for engineers; first-year essay; client email…"
            value={documentContext}
            onChange={(e) => setDocumentContext(e.target.value)}
            rows={4}
            aria-label="Optional context for AI"
          />
        </section>

        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">Your text</h2>
          <p className="resumeStepHint">
            Upload a file or paste below. Format with the toolbar (headings, bold, bullets). Select text and click Humanize, or run Analyze on the full draft. Shorten / expand replaces the whole document.
          </p>
          <div className="resumeToolbar">
            <input
              type="file"
              accept={RESUME_UPLOAD_ACCEPT}
              onChange={handleFileUpload}
              className="resumeFileInput"
              id="resume-upload"
              disabled={uploadLoading}
              aria-describedby="resume-upload-hint"
            />
            <label htmlFor="resume-upload" className="dashboardBtn dashboardBtnSecondary">
              {uploadLoading ? 'Reading…' : 'Upload file'}
            </label>
            <p id="resume-upload-hint" className="resumeUploadHint">
              Word, Google Docs (.docx), Open Office (.odt), PDF (up to 20 pages), or Text. Can&apos;t upload? Paste your text into the editor below.
            </p>
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleScore}
              disabled={scoreLoading || !editorText.trim()}
            >
              {scoreLoading ? 'Analyzing…' : 'Analyze writing'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={() => handleLengthAdjust('shorten')}
              disabled={summaryLoading || !editorText.trim() || editorText.trim().length < 50}
              title="Make the full document shorter while keeping meaning"
            >
              {summaryLoading && lengthAdjustKind === 'shorten' ? 'Shortening…' : 'Shorten all'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={() => handleLengthAdjust('expand')}
              disabled={summaryLoading || !editorText.trim() || editorText.trim().length < 50}
              title="Expand the full document with smoother flow — no new facts"
            >
              {summaryLoading && lengthAdjustKind === 'expand' ? 'Expanding…' : 'Expand all'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleRewrite}
              disabled={rewriteLoading}
              title={editorRef.current?.getSelectedText()?.trim() ? 'Replace selection with humanized text' : 'Select text in the editor first'}
            >
              {rewriteLoading ? 'Humanizing…' : 'Humanize selection'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleHumanizeFullDocument}
              disabled={rewriteLoading || !editorText.trim()}
              title="Humanize the full draft while preserving meaning"
            >
              {rewriteLoading ? 'Humanizing…' : 'Humanize full draft'}
            </button>
            <div className="resumeExportWrap" ref={exportMenuRef}>
              <button
                type="button"
                className="dashboardBtn dashboardBtnSecondary"
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={exportLoading || !editorText.trim()}
                aria-expanded={exportMenuOpen}
                aria-haspopup="true"
                aria-label="Export document"
              >
                {exportLoading ? 'Exporting…' : 'Export'}
              </button>
              {exportMenuOpen && (
                <div className="resumeExportDropdown" role="menu">
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportPdf} disabled={exportLoading}>
                    PDF
                  </button>
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportDocx} disabled={exportLoading}>
                    Word (.docx)
                  </button>
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportText}>
                    Text (.txt)
                  </button>
                </div>
              )}
            </div>
            <p className="resumeExportHint">PDF, Word, or Text. Upload the Word file to Google Docs if you use it.</p>
          </div>
          <div className="resumeRewriteOptionsPanel">
            <p className="resumeRewriteOptionsHeading">Humanize options</p>
            <p className="resumeRewriteOptionsHint">Tone, intensity, language, and extra instructions apply to Humanize selection. Tone also guides Analyze.</p>
            {rewriteBookmarkHint && (
              <p className="resumeRewriteBookmarkHint" role="status">
                Selection saved for humanize — click in the document when you want to clear it.
              </p>
            )}
            <div className="resumeRewriteOptions">
              <label className="resumeRewriteOption">
                <span className="resumeRewriteOptionLabel">Style / tone</span>
                <select
                  className="resumeRewriteSelect"
                  value={rewriteTone}
                  onChange={(e) => setRewriteTone(e.target.value)}
                  aria-label="Tone or style for AI"
                >
                  {REWRITE_TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="resumeRewriteOption">
                <span className="resumeRewriteOptionLabel">Intensity</span>
                <select
                  className="resumeRewriteSelect"
                  value={humanizeIntensity}
                  onChange={(e) => setHumanizeIntensity(e.target.value as 'light' | 'medium' | 'strong')}
                  aria-label="How strongly to humanize the selection"
                >
                  <option value="light">Light touch</option>
                  <option value="medium">Balanced</option>
                  <option value="strong">Strong rewrite</option>
                </select>
              </label>
              <label className="resumeRewriteOption">
                <span className="resumeRewriteOptionLabel">Language</span>
                <select
                  className="resumeRewriteSelect"
                  value={rewriteLanguage}
                  onChange={(e) => setRewriteLanguage(e.target.value)}
                  aria-label="Output language for humanize"
                >
                  {REWRITE_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label className="resumeRewriteOption resumeRewriteContextWrap">
                <span className="resumeRewriteOptionLabel">Instructions (optional)</span>
                <input
                  type="text"
                  className="resumeRewriteContext"
                  placeholder="e.g. warmer opening, fewer adverbs"
                  value={rewriteContext}
                  onChange={(e) => setRewriteContext(e.target.value)}
                  aria-label="Additional instructions for humanize"
                />
              </label>
            </div>
          </div>
          {(rewriteError || scoreError || exportError || editorError || summaryError) && (
            <div className="resumeErrors">
              {rewriteError && <p className="dashboardSettingsError">{rewriteError}</p>}
              {scoreError && <p className="dashboardSettingsError">{scoreError}</p>}
              {exportError && <p className="dashboardSettingsError">{exportError}</p>}
              {editorError && <p className="dashboardSettingsError">{editorError}</p>}
              {summaryError && <p className="dashboardSettingsError">{summaryError}</p>}
            </div>
          )}
          <div onPaste={handlePaste} className="resumeEditorWrap">
            <div className="resumeEditorColumn">
              <ResumeEditor
                ref={editorRef}
                content={editorContent}
                onChange={handleEditorChange}
                onRewriteBookmarkHint={setRewriteBookmarkHint}
              />
            </div>
            <p className="resumeEditorWordCount" aria-live="polite">
              {editorText.trim() ? `${editorText.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
            </p>

            <div className="resumeSection">
              <ResumePreview
                originalContent={originalText}
                currentContent={editorText}
                keywords={keywords}
              />
            </div>

            <div className="resumeAtsPanel" ref={atsPanelRef}>
              <h3 className="resumeAtsPanelTitle">Naturalness check</h3>
              <p className="resumeAtsPanelExplainer">
                We estimate how human-like your draft reads: rhythm, specificity, voice, and (if you added context) tone fit.
                It’s guidance for editing — not a claim about AI detection tools.
              </p>
              <div className="resumeAtsPanelActions">
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnPrimary"
                  onClick={handleScore}
                  disabled={scoreLoading || !editorText.trim()}
                >
                  {scoreLoading ? 'Analyzing…' : score !== null ? 'Refresh analysis' : 'Run analysis'}
                </button>
                {!editorText.trim() && (
                  <p className="resumeAtsPanelNeed">Add text in the editor, then run analysis.</p>
                )}
              </div>
              {score !== null && (
                <div className="resumeAtsPanelResults">
                  <p className="resumeAtsPanelRefreshHint">
                    Edited something? Tap <strong>Refresh analysis</strong>.
                  </p>
                  <ResumeAnalysisFeedback
                    score={score}
                    breakdown={scoreBreakdown}
                    keywords={keywords}
                    resumeText={editorText}
                    notes={analysisNotes}
                    className="resumeAtsPanelFeedback"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
