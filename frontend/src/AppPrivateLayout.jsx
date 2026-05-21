import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'
import { usePlanStore } from './stores/planStore'
import { onPaywallTriggered } from './api'

export default function AppPrivateLayout() {
  const navigate = useNavigate()
  const fetchPlanInfo = usePlanStore(s => s.fetchPlanInfo)
  const [paywallError, setPaywallError] = useState(null)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => { fetchPlanInfo() }, [fetchPlanInfo])
  useEffect(() => { return onPaywallTriggered(err => setPaywallError(err)) }, [])

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
      e.preventDefault()
      setCmdOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f6f2', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[240px] pt-14 md:pt-0" style={{ background: '#f7f6f2', minHeight: '100vh' }}>
        <ImpersonationBanner />
        <Outlet />
      </main>
      <PaywallModal
        open={!!paywallError}
        error={paywallError}
        onClose={() => setPaywallError(null)}
        onUpgrade={(plan) => navigate(`/billing?plan=${plan}`)}
      />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <button
        onClick={() => setCmdOpen(true)}
        title="Ouvrir la palette (⌘K)"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: '#080808', color: 'white',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, cursor: 'pointer',
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.background = '#080808'}
      >
        <span style={{ fontSize: 13 }}>⌘K</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Recherche</span>
      </button>
    </div>
  )
}
