import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, useCallback } from 'react'

// Pages
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import MorningBrief from './pages/MorningBrief'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Contrats from './pages/Contrats'
import ClientNew from './pages/ClientNew'
import ContratNew from './pages/ContratNew'
import Taches from './pages/Taches'
import Rapports from './pages/Rapports'
import ReachDashboard from './pages/ReachDashboard'
import ReachSearch from './pages/ReachSearch'
import ReachProspects from './pages/ReachProspects'
import ReachCampaigns from './pages/ReachCampaigns'
import ReachInbox from './pages/ReachInbox'
import ReachProspectDetail from './pages/ReachProspectDetail'
import ReachMap from './pages/ReachMap'
import ReachSettings from './pages/ReachSettings'
import Parametres from './pages/Parametres'
import Capitia from './pages/Capitia'
import AnalyticsExecutive from './pages/AnalyticsExecutive'
import Abonnement from './pages/Abonnement'
import PaiementSucces from './pages/PaiementSucces'
import PaiementAnnule from './pages/PaiementAnnule'
import Onboarding from './pages/Onboarding'
import LandingPublic from './pages/LandingPublic'
import Tarifs from './pages/Tarifs'

// Components
import Sidebar from './components/Sidebar'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/landing" element={<Navigate to="/landing/page.html" replace />} />
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/" element={<LandingPublic />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Routes privées — AppLayout monte une seule fois, pages via Outlet */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/clients"       element={<Clients />} />
          <Route path="/clients/new"   element={<ClientNew />} />
          <Route path="/client/:id"     element={<ClientDetail />} />
          <Route path="/clients/:id"   element={<ClientDetail />} />
          <Route path="/clients/:id/edit" element={<ClientNew />} />
          <Route path="/contrats"      element={<Contrats />} />
          <Route path="/contrats/new"  element={<ContratNew />} />
          <Route path="/taches"        element={<Taches />} />
          <Route path="/rapports"      element={<Rapports />} />
          <Route path="/parametres"    element={<Parametres />} />
          <Route path="/morning-brief" element={<MorningBrief />} />
          <Route path="/capitia"       element={<Capitia />} />
          <Route path="/analytics"     element={<AnalyticsExecutive />} />
          <Route path="/analyses"     element={<AnalyticsExecutive />} />
          <Route path="/abonnement"    element={<Abonnement />} />
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

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */


