import { Link } from 'react-router-dom'

export default function DashboardGuide() {
  return (
    <div className="dashboardPage dashboardGuidePage">
      <h1 className="dashboardPageTitle">How to use Sosiol</h1>
      <p className="dashboardPageSubtitle dashboardGuideLead">
        A short guide to the Workspace: optional context for your audience, naturalness analysis, humanizing selections with tone and intensity,
        and exporting when you are ready.
      </p>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">What you can do here</h2>
        <ul className="dashboardGuideList">
          <li>
            <strong>Analyze</strong>: Run a naturalness check on your full draft: rhythm, specificity, voice, and tone fit
            (when context is set). Use suggestions and “phrases to refine” as an edit list.
          </li>
          <li>
            <strong>Humanize</strong>: Select text, choose tone, intensity, and language, add optional instructions, then
            replace the selection with clearer, more human wording. Facts stay yours; we do not invent experience.
          </li>
          <li>
            <strong>Projects</strong>: Save your document and optional context together. Open a project from the Dashboard anytime.
          </li>
        </ul>
      </div>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">Recommended workflow</h2>
        <ol className="dashboardGuideSteps">
          <li>
            <span className="dashboardGuideStepNum">1</span>
            <div>
              <strong>Add optional context</strong> at the top (audience, channel, assignment). It steers humanize and analysis;
              you can leave it blank for a general pass.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">2</span>
            <div>
              <strong>Add your content</strong>: upload a supported file, paste, or type in the editor. Use headings and lists
              if they help structure.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">3</span>
            <div>
              <strong>Run analysis</strong>: click <strong>Analyze writing</strong> with text in the editor. Review the score,
              breakdown, and phrases to refine.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">4</span>
            <div>
              <strong>Humanize in passes</strong>: select a sentence or paragraph, set options under <em>Humanize options</em>, then{' '}
              <strong>Humanize selection</strong>. If you click into the instructions field first, your selection is kept until you
              click back in the document.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">5</span>
            <div>
              <strong>Save and export</strong>: name your project and click <strong>Save</strong>. Use <strong>Export</strong> for
              PDF, Word, or plain text.
            </div>
          </li>
        </ol>
      </div>

      <div className="dashboardGuideCta">
        <Link to="/dashboard/workspace" className="dashboardBtn dashboardBtnPrimary">
          Open Workspace
        </Link>
        <Link to="/dashboard" className="dashboardBtn dashboardBtnSecondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
