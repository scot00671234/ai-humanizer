import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ResumeEditor, { type ResumeEditorHandle } from '../components/ResumeEditor'
import ResumeAnalysisFeedback from '../components/ResumeAnalysisFeedback'
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

const UPGRADE_LIMITS = {
  pro: { humanizePerDay: 500, analysesPerDay: 50, projectLimit: 10 },
  elite: { humanizePerDay: 1500, analysesPerDay: 100, projectLimit: 100 },
} as const

export default function DashboardResume() {
  const { user, refreshUser } = useAuth()
  const [humanizeIntensity, setHumanizeIntensity] = useState<'light' | 'medium' | 'strong'>('medium')
  const [editorContent, setEditorContent] = useState<Content>('')
  const [editorText, setEditorText] = useState('')
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [billingLoading, setBillingLoading] = useState<'pro' | 'elite' | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** Shown only when an existing project is open (not during initial load). */
  const [autosaveIndicator, setAutosaveIndicator] = useState<'auto' | 'saving' | 'saved'>('auto')
  const [rewriteBookmarkHint, setRewriteBookmarkHint] = useState(false)
  const editorRef = useRef<ResumeEditorHandle>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const atsPanelRef = useRef<HTMLDivElement>(null)
  const wasScoreLoading = useRef(false)
  const lastPersistedRef = useRef<{
    content: string
    documentContext: string
    title: string
  } | null>(null)
  const persistSeqRef = useRef(0)
  const appliedPersistSeqRef = useRef(0)
  const draftRef = useRef({
    content: '',
    context: '',
    title: '',
    projectId: null as string | null,
  })
  /** Browser timer id (avoids Node `Timeout` vs DOM `number` mismatch in typings). */
  const autosaveSavedTimerRef = useRef<number | null>(null)

  draftRef.current = {
    content: typeof editorContent === 'string' ? editorContent : '',
    context: documentContext,
    title: currentProjectTitle.trim() || 'Untitled',
    projectId: currentProjectId,
  }
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
      setSaveError(null)
      lastPersistedRef.current = null
      setAutosaveIndicator('auto')
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
        setDocumentContext(typeof proj.job_description === 'string' ? proj.job_description : '')
        setProjects((prev) => prev.some((p) => p.id === proj.id) ? prev : [...prev, { id: proj.id, title: proj.title || 'Untitled' }])
        const loadedTitle = (proj.title || 'Untitled').trim() || 'Untitled'
        lastPersistedRef.current = {
          content: proj.content || '',
          documentContext: typeof proj.job_description === 'string' ? proj.job_description : '',
          title: loadedTitle,
        }
        persistSeqRef.current = 0
        appliedPersistSeqRef.current = 0
        setAutosaveIndicator('auto')
      })
      .catch(() => { if (!cancelled) setSaveError('Failed to load project') })
      .finally(() => { if (!cancelled) setProjectLoading(false) })
    return () => { cancelled = true }
  }, [projectIdFromUrl])

  const AUTOSAVE_DEBOUNCE_MS = 2000

  useEffect(() => {
    return () => {
      if (autosaveSavedTimerRef.current) clearTimeout(autosaveSavedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!currentProjectId || projectLoading || saveLoading) return
    if (projectIdFromUrl && currentProjectId !== projectIdFromUrl) return

    const content = typeof editorContent === 'string' ? editorContent : ''
    const title = currentProjectTitle.trim() || 'Untitled'
    const ctx = documentContext
    const last = lastPersistedRef.current
    if (!last) return
    if (content === last.content && ctx === last.documentContext && title === last.title) return

    const debounceTimer = window.setTimeout(() => {
      const d = draftRef.current
      if (!d.projectId) return
      if (projectIdFromUrl && d.projectId !== projectIdFromUrl) return

      const l = lastPersistedRef.current
      if (l && d.content === l.content && d.context === l.documentContext && d.title === l.title) return

      const mySeq = ++persistSeqRef.current
      setAutosaveIndicator('saving')

      api.projects
        .update(d.projectId, {
          content: d.content,
          title: d.title,
          jobDescription: d.context,
        })
        .then(() => {
          if (mySeq <= appliedPersistSeqRef.current) return
          appliedPersistSeqRef.current = mySeq
          lastPersistedRef.current = {
            content: d.content,
            documentContext: d.context,
            title: d.title,
          }
          setProjects((prev) => prev.map((p) => (p.id === d.projectId ? { ...p, title: d.title } : p)))
          setAutosaveIndicator('saved')
          if (autosaveSavedTimerRef.current) clearTimeout(autosaveSavedTimerRef.current)
          autosaveSavedTimerRef.current = window.setTimeout(() => {
            setAutosaveIndicator('auto')
            autosaveSavedTimerRef.current = null
          }, 2200)
        })
        .catch((err) => {
          console.warn('Autosave failed:', err)
          setAutosaveIndicator('auto')
        })
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      clearTimeout(debounceTimer)
    }
  }, [
    editorContent,
    documentContext,
    currentProjectTitle,
    currentProjectId,
    projectIdFromUrl,
    projectLoading,
    saveLoading,
  ])

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
        persistSeqRef.current += 1
        appliedPersistSeqRef.current = persistSeqRef.current
        lastPersistedRef.current = { content, documentContext: documentContext, title: name }
      } else {
        const created = await api.projects.create(name)
        setCurrentProjectId(created.id)
        setCurrentProjectTitle(created.title || name)
        setProjects((prev) => [...prev, { id: created.id, title: created.title || name }])
        navigate(`/dashboard/workspace?projectId=${created.id}`, { replace: true })
        await api.projects.update(created.id, { content, jobDescription: documentContext })
        persistSeqRef.current += 1
        appliedPersistSeqRef.current = persistSeqRef.current
        lastPersistedRef.current = { content, documentContext: documentContext, title: created.title || name }
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
      const finalTitle = created.title || 'Untitled'
      persistSeqRef.current += 1
      appliedPersistSeqRef.current = persistSeqRef.current
      lastPersistedRef.current = { content, documentContext: documentContext, title: finalTitle }
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
  const isElite = user?.isTeam === true
  const isPro = user?.isPro === true && !isElite
  const isFree = !!user && !isElite && !isPro

  async function handleUpgrade(plan: 'pro' | 'elite') {
    setBillingError(null)
    setBillingLoading(plan)
    try {
      const { url } = await api.auth.createCheckoutSession(plan)
      if (url) window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setBillingLoading(null)
    }
  }

  return (
    <div className="dashboardPage dashboardResume">
      <header className="resumePageHeader">
        <div className="resumePageHeaderTop">
          <h1 className="dashboardPageTitle">Workspace</h1>
        </div>
        <p className="dashboardPageSubtitle">
          Analyze how natural your writing sounds, humanize selections with AI, then export.
        </p>
        <div className="resumeUsage">
          Editing (humanize) today: {used} / {limit}
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
        {currentProjectId && !projectLoading && (
          <p className="resumeAutosaveStatus" aria-live="polite">
            {autosaveIndicator === 'saving' && 'Saving…'}
            {autosaveIndicator === 'saved' && 'All changes saved'}
            {autosaveIndicator === 'auto' && 'Edits save automatically while you work.'}
          </p>
        )}
        {landingRewriteLoading && (
          <p className="resumeLandingBanner" role="status">
            Humanizing your sample from the landing page…
          </p>
        )}
      </header>

      <div className="resumeFlow">
        {isFree && (
          <section className="resumeUpgradeCallout" aria-label="Upgrade to Pro or Elite">
            <div className="resumeUpgradeCalloutHeader">
              <p className="resumeUpgradeCalloutKicker">Free plan</p>
              <h2 className="resumeUpgradeCalloutTitle">Unlock higher limits with Pro or Elite</h2>
              <p className="resumeUpgradeCalloutCopy">
                You currently get {limit} humanize edits per day and {scoreLimit} naturalness analyses per day.
                Upgrade to Pro or Elite for faster iteration.
              </p>
            </div>

            <div className="resumeUpgradeCalloutPlans">
              <div className="resumeUpgradeCalloutPlan">
                <p className="resumeUpgradeCalloutPlanName">Pro</p>
                <ul className="resumeUpgradeCalloutList">
                  <li>{UPGRADE_LIMITS.pro.humanizePerDay} humanize/day</li>
                  <li>{UPGRADE_LIMITS.pro.analysesPerDay} analyses/day</li>
                  <li>Up to {UPGRADE_LIMITS.pro.projectLimit} projects</li>
                </ul>
              </div>
              <div className="resumeUpgradeCalloutPlan">
                <p className="resumeUpgradeCalloutPlanName">Elite</p>
                <ul className="resumeUpgradeCalloutList">
                  <li>{UPGRADE_LIMITS.elite.humanizePerDay} humanize/day</li>
                  <li>{UPGRADE_LIMITS.elite.analysesPerDay} analyses/day</li>
                  <li>Up to {UPGRADE_LIMITS.elite.projectLimit} projects</li>
                </ul>
              </div>
            </div>

            {billingError && <p className="dashboardSettingsError">{billingError}</p>}

            <div className="resumeUpgradeCalloutActions">
              <button
                type="button"
                className="dashboardBtn dashboardBtnPrimary"
                onClick={() => handleUpgrade('pro')}
                disabled={billingLoading !== null}
              >
                {billingLoading === 'pro' ? 'Opening…' : 'Upgrade to Pro'}
              </button>
              <button
                type="button"
                className="dashboardBtn dashboardBtnSecondary"
                onClick={() => handleUpgrade('elite')}
                disabled={billingLoading !== null}
              >
                {billingLoading === 'elite' ? 'Opening…' : 'Upgrade to Elite'}
              </button>
            </div>
            <p className="resumeUpgradeCalloutFootnote">
              Click an upgrade button to go to Stripe checkout and complete payment.
            </p>
          </section>
        )}

        <section className="resumeSection resumeCard resumeWorkspace">
          <div className="resumeWorkspaceGrid">
            <div className="resumeDocPane">
              <div className="resumeDocHeader">
                <h2 className="resumeStepTitle">Document</h2>
                <p className="resumeStepHint">
                  Write in the editor, then use the assistant panel to analyze, humanize, and export.
                </p>
              </div>

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
                  Word, Google Docs (.docx), Open Office (.odt), PDF (up to 20 pages), or Text.
                </p>
              </div>

              {(rewriteError || scoreError || exportError || editorError) && (
                <div className="resumeErrors">
                  {rewriteError && <p className="dashboardSettingsError">{rewriteError}</p>}
                  {scoreError && <p className="dashboardSettingsError">{scoreError}</p>}
                  {exportError && <p className="dashboardSettingsError">{exportError}</p>}
                  {editorError && <p className="dashboardSettingsError">{editorError}</p>}
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
              </div>
            </div>

            <aside className="resumeAssistPane">
              <div className="resumeAssistCard">
                <h3 className="resumeAssistTitle">AI assistant</h3>
                <p className="resumeAssistHint">Select text in your document, then run an action.</p>
                <div className="resumeAssistActions">
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
                </div>
                <p className="resumeExportHint">PDF, Word, or Text export.</p>
              </div>

              <div className="resumeRewriteOptionsPanel">
                <p className="resumeRewriteOptionsHeading">Humanize options</p>
                <p className="resumeRewriteOptionsHint">
                  Tone, intensity, language, and instructions apply to both rewrite actions.
                </p>
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

              <div className="resumeAtsPanel" ref={atsPanelRef}>
                <h3 className="resumeAtsPanelTitle">Naturalness check</h3>
                <p className="resumeAtsPanelExplainer">
                  Score guidance based on rhythm, vocabulary diversity, repetition, and model judgment.
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
            </aside>
          </div>
        </section>

      </div>
    </div>
  )
}
