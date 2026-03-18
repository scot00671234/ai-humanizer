import { Link } from 'react-router-dom'

export default function DashboardGuide() {
  return (
    <div className="dashboardPage dashboardGuidePage">
      <h1 className="dashboardPageTitle">How to use bioqz</h1>
      <p className="dashboardPageSubtitle dashboardGuideLead">
        A short guide to the Editor: tailor your resume or job application to any role, improve wording with AI,
        see how well you match the posting, and export a clean file when you are ready.
      </p>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">What you can do here</h2>
        <ul className="dashboardGuideList">
          <li>
            <strong>Resume mode</strong> — Work on your CV: format it, score it against a job ad, rewrite bullets with AI,
            add a professional summary, export to PDF or Word.
          </li>
          <li>
            <strong>Job application mode</strong> — Same tools for cover letters and application answers: tone fits a letter,
            and AI uses the job description when you rewrite or generate an opening paragraph.
          </li>
          <li>
            <strong>Projects</strong> — Save your document and the job description together. Open a project from the
            Dashboard anytime to continue where you left off.
          </li>
        </ul>
      </div>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">Recommended workflow</h2>
        <ol className="dashboardGuideSteps">
          <li>
            <span className="dashboardGuideStepNum">1</span>
            <div>
              <strong>Paste the job description</strong> in the box at the top. It powers the fit score, keyword-style
              feedback, and gives AI the right context for rewrites and generated text.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">2</span>
            <div>
              <strong>Add your content</strong> — upload a resume file, paste text, or type in the editor. Use{' '}
              <strong>Resume</strong> or <strong>Job application</strong> at the top to match what you are writing.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">3</span>
            <div>
              <strong>See how you match</strong> — click <strong>Analyze resume</strong> (or analyze application) after
              both the job description and your text are filled in. You get a score and suggestions to tighten alignment.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">4</span>
            <div>
              <strong>Improve with AI</strong> — select a sentence or paragraph, set tone and language under{' '}
              <em>Rewrite options</em>, add optional instructions (e.g. “shorter”, “more leadership”), then{' '}
              <strong>Rewrite selection</strong>. If you click into the instructions field first, your selection is still
              kept until you click back in the document.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">5</span>
            <div>
              <strong>Optional opening</strong> — <strong>Generate summary</strong> (resume) or{' '}
              <strong>Generate opening</strong> (application) adds a strong opening at the top, tuned to your content
              and the job description when you have one pasted.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">6</span>
            <div>
              <strong>Save and export</strong> — name your project and click <strong>Save</strong>. Use{' '}
              <strong>Export</strong> for PDF, Word, or plain text when you are happy with the result.
            </div>
          </li>
        </ol>
      </div>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">Quick tips</h2>
        <ul className="dashboardGuideList dashboardGuideListCompact">
          <li>Free plans include a daily limit on AI rewrites; paid plans offer much higher limits (see Settings).</li>
          <li>The editor toolbar supports headings, bold, italics, and lists — useful for ATS-friendly structure.</li>
          <li>Starting from the landing page with sample text? Sign in and your first rewrite can run automatically in the Editor.</li>
        </ul>
      </div>

      <div className="dashboardGuideCta">
        <Link to="/dashboard/resume" className="dashboardBtn dashboardBtnPrimary">
          Open Editor
        </Link>
        <Link to="/dashboard" className="dashboardBtn dashboardBtnSecondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
