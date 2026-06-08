import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'

// Pages
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Contrats from './pages/Contrats'
import Taches from './pages/Taches'
import Rapports from './pages/Rapports'
import Parametres from './pages/Parametres'
import LandingPublic from './pages/LandingPublic'
import MorningBrief from './pages/MorningBrief'

// Admin pages
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const ClientNew = lazy(() => import('./pages/ClientNew'))
const ContratNew = lazy(() => import('./pages/ContratNew'))
const ReachDashboard = lazy(() => import('./pages/ReachDashboard'))
const ReachSearch = lazy(() => import('./pages/ReachSearch'))
const ReachProspects = lazy(() => import('./pages/ReachProspects'))
const ReachCampaigns = lazy(() => import('./pages/ReachCampaigns'))
const ReachInbox = lazy(() => import('./pages/ReachInbox'))
const ReachProspectDetail = lazy(() => import('./pages/ReachProspectDetail'))
const ReachMap = lazy(() => import('./pages/ReachMap'))
const ReachSettings = lazy(() => import('./pages/ReachSettings'))
const Capitia = lazy(() => import('./pages/Capitia'))
const AnalyticsExecutive = lazy(() => import('./pages/AnalyticsExecutive'))
const Abonnement = lazy(() => import('./pages/Abonnement'))
const Billing = lazy(() => import('./pages/Billing'))
const PaiementSucces = lazy(() => import('./pages/PaiementSucces'))
const PaiementAnnule = lazy(() => import('./pages/PaiementAnnule'))
const Onboarding = lazy(() => import('./pages/BillingOnboarding'))
const DataOnboarding = lazy(() => import('./pages/Onboarding'))
const ImportPortfolio = lazy(() => import('./pages/ImportPortfolio'))
const Academy = lazy(() => import('./pages/Academy'))
const Documents = lazy(() => import('./pages/Documents'))
const BrowserPilot = lazy(() => import('./pages/BrowserPilot'))
const FlywheelPanel = lazy(() => import('./pages/FlywheelPanel'))
const AdviceNotePanel = lazy(() => import('./pages/AdviceNotePanel'))
const ArkAgentsPanel = lazy(() => import('./pages/ArkAgentsPanel'))
const ProspectionPanel = lazy(() => import('./pages/ProspectionPanel'))
const Tarifs = lazy(() => import('./pages/Tarifs'))
const PublicDocumentUpload = lazy(() => import('./pages/PublicDocumentUpload'))
const AdminOverview = lazy(() => import('./pages/AdminOverview'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'))
const AdminSystem = lazy(() => import('./pages/AdminSystem'))
const AdminLogs = lazy(() => import('./pages/AdminLogs'))
const AdminSupport = lazy(() => import('./pages/AdminSupport'))

// Components
import Sidebar from './components/Sidebar'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/AdminLayout'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'
import ProtectedRoute from './components/ProtectedRoute'
import CourtiaBubbleLogo from './components/brand/CourtiaBubbleLogo'
import CourtiaLogoLoader from './components/brand/CourtiaLogoLoader'
import RhasrhassSignature from './components/brand/RhasrhassSignature'

// Stores / API
import { usePlanStore } from './stores/planStore'
import { onPaywallTriggered } from './api'

// ScrollToTop — useLocation est inclus dans l'import react-router-dom du haut
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// PrivateRoute — supporte courtia_token (nouveau) et token (legacy)
function PrivateRoute({ children }) {
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('courtia_token')
      localStorage.removeItem('token')
      return <Navigate to="/login" replace />
    }
  } catch {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }
  return children
}

// Layout avec sidebar — monte UNE SEULE FOIS pour toute la session authentifiée
// Les pages enfants sont injectées via <Outlet /> (React Router nested routes)
function AppLayout() {
  const navigate = useNavigate()
  const fetchPlanInfo = usePlanStore(s => s.fetchPlanInfo)
  const [paywallError, setPaywallError] = useState(null)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => { fetchPlanInfo() }, [fetchPlanInfo])
  useEffect(() => { return onPaywallTriggered(err => setPaywallError(err)) }, [])

  // Global Cmd+K / Ctrl+K listener
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
    <div className="courtia-cockpit-shell" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="courtia-cockpit-aurora" aria-hidden="true" />
      <div className="courtia-cockpit-watermark" aria-hidden="true">
        <CourtiaBubbleLogo size="100%" animated={false} showHalo showFoam showSpecular />
      </div>
      <Sidebar />
      <main className="courtia-cockpit-main flex-1 ml-0 md:ml-[240px] pt-14 md:pt-0" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ImpersonationBanner />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        <footer style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
          <RhasrhassSignature compact />
        </footer>
      </main>
      <PaywallModal
        open={!!paywallError}
        error={paywallError}
        onClose={() => setPaywallError(null)}
        onUpgrade={(plan) => navigate(`/billing?plan=${plan}`)}
      />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Bouton de secours Cmd+K */}
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
          fontSize: 12, fontWeight: 600,          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

function RouteLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <CourtiaLogoLoader fullScreen={false} message="COURTIA charge l’espace..." />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/landing" element={<Navigate to="/landing/page.html" replace />} />
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/upload/:token" element={<PublicDocumentUpload />} />
        <Route path="/" element={<LandingPublic />} />

        {/* Routes privées — ProtectedRoute avec plan gating */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/onboarding"    element={<Onboarding />} />
          <Route path="/onboarding/import" element={<DataOnboarding />} />
          <Route path="/import"        element={<ImportPortfolio />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/clients"       element={<Clients />} />
          <Route path="/clients/new"   element={<ClientNew />} />
          <Route path="/client/:id"     element={<ClientDetail />} />
          <Route path="/clients/:id"   element={<ClientDetail />} />
          <Route path="/clients/:id/flywheel" element={<FlywheelPanel />} />
          <Route path="/ark/dossiers/:id/advice-note" element={<AdviceNotePanel />} />
          <Route path="/clients/:id/edit" element={<ClientNew />} />
          <Route path="/contrats"      element={<Contrats />} />
          <Route path="/contrats/new"  element={<ContratNew />} />
          <Route path="/taches"        element={<Taches />} />
          <Route path="/rapports"      element={<Rapports />} />
          <Route path="/parametres"    element={<Parametres />} />
          <Route path="/academy"       element={<Academy />} />
          <Route path="/academy/*"     element={<Academy />} />
          <Route path="/documents"     element={<Documents />} />
          <Route path="/browser-pilot" element={<BrowserPilot />} />
          <Route path="/morning-brief" element={<MorningBrief />} />
          <Route path="/ark-agents" element={<ArkAgentsPanel />} />
          <Route path="/prospection" element={<ProspectionPanel />} />
          <Route path="/capitia"       element={<Capitia />} />
          <Route path="/analytics"     element={<AnalyticsExecutive />} />
          <Route path="/analyses"     element={<AnalyticsExecutive />} />
          <Route path="/abonnement"    element={<Abonnement />} />
          <Route path="/billing"       element={<Billing />} />
          <Route path="/billing/success" element={<PaiementSucces />} />
          <Route path="/billing/cancel" element={<PaiementAnnule />} />
          <Route path="/paiement-succes" element={<PaiementSucces />} />
          <Route path="/paiement-annule" element={<PaiementAnnule />} />
          <Route path="/reach"             element={<ReachDashboard />} />
          <Route path="/reach/search"      element={<ReachSearch />} />
          <Route path="/reach/prospects/:id" element={<ReachProspectDetail />} />
          <Route path="/reach/prospects"   element={<ReachProspects />} />
          <Route path="/reach/campaigns/:id" element={<ReachCampaigns />} />
          <Route path="/reach/campaigns"   element={<ReachCampaigns />} />
          <Route path="/reach/inbox"       element={<ReachInbox />} />
          <Route path="/reach/map"         element={<ReachMap />} />
          <Route path="/reach/settings"    element={<ReachSettings />} />
        </Route>

        {/* Routes Admin — protégées par AdminRoute (super_admin uniquement) */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/system" element={<AdminSystem />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          <Route path="/admin/support" element={<AdminSupport />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */
