import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const SIDEBAR_STORAGE_KEY = 'humanizer-ai-dashboard-sidebar-open'

const SEARCH_ITEMS = [
  { label: 'Dashboard', path: '' },
  { label: 'Workspace', path: '/workspace' },
  { label: 'Guide', path: '/guide' },
  { label: 'Settings', path: '/settings' },
]

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function WorkspaceIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16v14H4z" />
      <path d="M9 5v14" />
    </svg>
  )
}

function GuideIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6.5a2.5 2.5 0 0 1 2.5-2.5H20v15H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M6.5 4v15" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-.2.2a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a1.2 1.2 0 0 1-1.2 1.2h-.3A1.2 1.2 0 0 1 13.3 19v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-.2-.2a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H8.9A1.2 1.2 0 0 1 7.7 13v-.3a1.2 1.2 0 0 1 1.2-1.2H9a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l.2-.2a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5a1.2 1.2 0 0 1 1.2-1.2h.3A1.2 1.2 0 0 1 16 5v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l.2.2a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.1a1.2 1.2 0 0 1 1.2 1.2v.3a1.2 1.2 0 0 1-1.2 1.2h-.1a1 1 0 0 0-.9.6z" />
    </svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  // Chevron points toward the sidebar edge that will move.
  return collapsed ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const basePath = '/dashboard'

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (raw === 'true') return true
      if (raw === 'false') return false
    } catch {
      // ignore
    }
    return true
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const matches = searchQuery.trim()
    ? SEARCH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : []

  useEffect(() => {
    document.body.dataset.page = 'dashboard'
    return () => {
      if (document.body.dataset.page === 'dashboard') delete document.body.dataset.page
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen))
    } catch {
      // ignore
    }
  }, [sidebarOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearchSelect(path: string) {
    navigate(path ? `${basePath}${path}` : basePath)
    setSearchQuery('')
    setSearchOpen(false)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    const first = matches[0]
    if (e.key === 'Enter' && first) {
      e.preventDefault()
      handleSearchSelect(first.path)
    }
  }

  return (
    <div className={`dashboard ${sidebarOpen ? '' : 'dashboard--sidebarCollapsed'}`}>
      <aside className={`dashboardSidebar ${sidebarOpen ? '' : 'dashboardSidebar--collapsed'}`}>
        <button
          type="button"
          className="dashboardSidebarToggle"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <CollapseIcon collapsed={!sidebarOpen} />
        </button>
        <Link to={basePath} className="dashboardBrand">
          <img src="/logo.svg" alt="" className="dashboardLogo" width="24" height="24" />
          <span className="dashboardBrandText">Humanizer AI</span>
        </Link>
        <div className="dashboardSidebarContent">
        <div className="dashboardSearchWrap" ref={searchRef}>
          <input
            type="search"
            className="dashboardSearch"
            placeholder="Jump to..."
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && (
            <div className="dashboardSearchDropdown">
              {matches.length > 0 ? (
                matches.map((item) => (
                  <button
                    key={item.path || 'dashboard'}
                    type="button"
                    className="dashboardSearchItem"
                    onClick={() => handleSearchSelect(item.path)}
                  >
                    {item.label}
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <p className="dashboardSearchEmpty">No results</p>
              ) : (
                SEARCH_ITEMS.map((item) => (
                  <button
                    key={item.path || 'dashboard'}
                    type="button"
                    className="dashboardSearchItem"
                    onClick={() => handleSearchSelect(item.path)}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="dashboardSidebarSections">
          <section className="dashboardNavGroup" aria-label="Workspace">
            <p className="dashboardNavGroupLabel">Workspace</p>
            <nav className="dashboardNav">
              <Link
                to={basePath}
                className={`dashboardNavLink ${location.pathname === basePath ? 'dashboardNavLinkActive' : ''}`}
              >
                <span className="dashboardNavIcon"><HomeIcon /></span>
                <span className="dashboardNavText">Dashboard</span>
              </Link>
              <Link
                to={`${basePath}/workspace`}
                className={`dashboardNavLink ${location.pathname === `${basePath}/workspace` || location.pathname === `${basePath}/resume` ? 'dashboardNavLinkActive' : ''}`}
              >
                <span className="dashboardNavIcon"><WorkspaceIcon /></span>
                <span className="dashboardNavText">Workspace</span>
              </Link>
            </nav>
          </section>

          <section className="dashboardNavGroup" aria-label="Resources">
            <p className="dashboardNavGroupLabel">Resources</p>
            <nav className="dashboardNav">
              <Link
                to={`${basePath}/guide`}
                className={`dashboardNavLink ${location.pathname === `${basePath}/guide` ? 'dashboardNavLinkActive' : ''}`}
              >
                <span className="dashboardNavIcon"><GuideIcon /></span>
                <span className="dashboardNavText">Guide</span>
              </Link>
            </nav>
          </section>

          <section className="dashboardNavGroup" aria-label="Settings">
            <p className="dashboardNavGroupLabel">Settings</p>
            <nav className="dashboardNav">
              <Link
                to={`${basePath}/settings`}
                className={`dashboardNavLink ${location.pathname === `${basePath}/settings` ? 'dashboardNavLinkActive' : ''}`}
              >
                <span className="dashboardNavIcon"><SettingsIcon /></span>
                <span className="dashboardNavText">Settings</span>
              </Link>
            </nav>
          </section>

          <div className="dashboardSidebarTheme">
            <ThemeToggle />
          </div>
        </div>

        <div className="dashboardSidebarFooter">
          <p className="dashboardUserEmail">{user?.email}</p>
          <button type="button" className="dashboardLogout" onClick={() => { logout(); navigate('/') }}>
            Log out
          </button>
        </div>
        </div>
      </aside>

      <main className="dashboardMain">
        <Outlet />
      </main>
    </div>
  )
}
