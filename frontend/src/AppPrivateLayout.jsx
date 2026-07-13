import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'
import { AuroraBackground } from './components/aurora/Aurora3D'
import AuroraMobileTopbar from './components/aurora/AuroraMobileTopbar'
import AuroraBottomNav from './components/aurora/AuroraBottomNav'
import { Particles, ScrollGlow } from './components/vibe/VibePage'
import ArkNeuralPulse from './components/widgets/ArkNeuralPulse'
import { usePlanStore } from './stores/planStore'
import { onPaywallTriggered } from './api'
import { CheckSquare, LayoutDashboard, MoreHorizontal, PhoneCall, Users } from 'lucide-react'
import { isAdminRole, isProspectorRole } from './lib/roles'

const BOSS_MOBILE_NAV = [
  { id: 'cockpit', path: '/dashboard', icon: LayoutDashboard, label: 'Cockpit' },
  { id: 'clients', path: '/clients', icon: Users, label: 'Clients' },
  { id: 'sales', path: '/prospection', icon: PhoneCall, label: 'Ventes' },
  { id: 'actions', path: '/taches', icon: CheckSquare, label: 'Actions', badge: true },
  { id: 'more', path: null, icon: MoreHorizontal, label: 'Plus' },
]

const MOBILE_PAGE_TITLES = [
  ['/commissions/calculator', 'Calculateur'], ['/sante-portefeuille', 'Santé portefeuille'],
  ['/ark-intelligence', 'Intelligence ARK'], ['/assistant-ark', 'Assistant ARK'],
  ['/morning-brief', 'Morning Brief'], ['/rendez-vous', 'Rendez-vous'],
  ['/opportunites', 'Opportunités'], ['/prospection', 'Prospection'],
  ['/commissions', 'Commissions'], ['/parametres', 'Paramètres'],
  ['/comparateur', 'Comparateur'], ['/conformite', 'Conformité'],
  ['/partenaires', 'Partenaires'], ['/documents', 'Documents'],
  ['/contrats', 'Contrats'], ['/clients', 'Clients'], ['/taches', 'Actions'],
  ['/relances', 'Relances'], ['/objectifs', 'Objectifs'], ['/rapports', 'Rapports'],
  ['/analytics', 'Analytics'], ['/devis', 'Devis'], ['/equipe', 'Équipe'],
  ['/abonnement', 'Abonnement'], ['/billing', 'Facturation'], ['/academy', 'Academy'],
  ['/reach', 'REACH'], ['/import', 'Import'], ['/dashboard', 'Cockpit'],
]

function getMobilePageTitle(pathname) {
  return MOBILE_PAGE_TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || 'Courtiark'
}

export default function AppPrivateLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const fetchPlanInfo = usePlanStore(s => s.fetchPlanInfo)
  const [paywallError, setPaywallError] = useState(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('courtia_user') || 'null') } catch { return null }
  })()
  const isProspector = isProspectorRole(storedUser?.role)
  const isBoss = isAdminRole(storedUser?.role)
  const hasProspectionMobileNav = location.pathname.startsWith('/prospection')
  const mobilePageTitle = getMobilePageTitle(location.pathname)

  useEffect(() => { if (!isProspector) fetchPlanInfo() }, [fetchPlanInfo, isProspector])
  useEffect(() => { if (!isProspector) return onPaywallTriggered(err => setPaywallError(err)); return undefined }, [isProspector])

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
    <AuroraBackground>
      <Particles count={50} />
      <ScrollGlow />
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Aurora Mobile Components */}
      <AuroraMobileTopbar title={mobilePageTitle} logoTo={isProspector ? '/prospection' : '/dashboard'} onMenuClick={() => setMobileMenuOpen(true)} onBellClick={() => navigate(isProspector ? '/prospection' : '/taches')} />
      {!isProspector && !hasProspectionMobileNav && <AuroraBottomNav items={isBoss ? BOSS_MOBILE_NAV : undefined} onMoreClick={() => setMobileMenuOpen(true)} />}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      
      <main className={`courtia-private-mobile-root flex-1 ml-0 md:ml-[240px] pt-[60px] md:pt-0 ${hasProspectionMobileNav ? 'pb-0' : 'pb-[80px]'} md:pb-0 aurora-mobile-content-wrapper`} style={{ background: '#050510', minHeight: '100vh' }}>
        <ImpersonationBanner />
        <div className="courtia-route-viewport"><Outlet /></div>
      </main>
      {!isProspector && <PaywallModal
        open={!!paywallError}
        error={paywallError}
        onClose={() => setPaywallError(null)}
        onUpgrade={(plan) => navigate(`/billing?plan=${plan}`)}
      />}
      {!isProspector && <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />}

      {/* ARK Neural Pulse — indicateur signature */}
      {!isProspector && <div className="courtia-ark-pulse-fab" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 200, opacity: 0.55, pointerEvents: 'none' }}>
        <ArkNeuralPulse isThinking={false} confidence={78} label="ARK actif" width={200} height={80} />
      </div>}

      {!isProspector && <button
        className="courtia-command-palette-fab"
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
      </button>}
    </div>
    </AuroraBackground>
  )
}
