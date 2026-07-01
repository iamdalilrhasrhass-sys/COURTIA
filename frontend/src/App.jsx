import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense, useEffect } from 'react'

// Public pages loaded in the main bundle
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPublic from './pages/LandingPublic'
import Tarifs from './pages/Tarifs'
import DesignSystem from './pages/DesignSystem'
import VibePage from './components/vibe/VibePage'

// Private app is code-split so the public landing does not pull the whole cockpit.
const AppPrivateLayout = lazy(() => import('./AppPrivateLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MorningBrief = lazy(() => import('./pages/MorningBrief'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Contrats = lazy(() => import('./pages/Contrats'))
const ClientNew = lazy(() => import('./pages/ClientNew'))
const ContratNew = lazy(() => import('./pages/ContratNew'))
const Taches = lazy(() => import('./pages/Taches'))
const Rapports = lazy(() => import('./pages/Rapports'))
const ReachDashboard = lazy(() => import('./pages/ReachDashboard'))
const ReachSearch = lazy(() => import('./pages/ReachSearch'))
const ReachProspects = lazy(() => import('./pages/ReachProspects'))
const ReachCampaigns = lazy(() => import('./pages/ReachCampaigns'))
const ReachInbox = lazy(() => import('./pages/ReachInbox'))
const ReachProspectDetail = lazy(() => import('./pages/ReachProspectDetail'))
const ReachMap = lazy(() => import('./pages/ReachMap'))
const ReachSettings = lazy(() => import('./pages/ReachSettings'))
const Parametres = lazy(() => import('./pages/Parametres'))
const Capitia = lazy(() => import('./pages/Capitia'))
const AnalyticsExecutive = lazy(() => import('./pages/AnalyticsExecutive'))
const Abonnement = lazy(() => import('./pages/Abonnement'))
const PaiementSucces = lazy(() => import('./pages/PaiementSucces'))
const PaiementAnnule = lazy(() => import('./pages/PaiementAnnule'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Partenaires = lazy(() => import('./pages/Partenaires'))
const Comparateur = lazy(() => import('./pages/Comparateur'))

function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#02030b', color: '#f8f8ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      Chargement COURTIA...
    </div>
  )
}

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


function PublicNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#02030b', color: '#f8f8ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <main style={{ maxWidth: 620, textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#8fe7ff', letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12, fontWeight: 800 }}>404</p>
        <h1 style={{ margin: '16px 0 12px', fontSize: 'clamp(2.4rem, 8vw, 5rem)', lineHeight: .95, letterSpacing: '-.06em' }}>Page introuvable</h1>
        <p style={{ margin: '0 auto 28px', color: '#c7c9da', lineHeight: 1.65 }}>Cette route n’existe pas. Vous pouvez revenir au cockpit public COURTIA ou consulter les tarifs.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{ minHeight: 46, display: 'inline-flex', alignItems: 'center', padding: '0 22px', borderRadius: 999, background: 'linear-gradient(135deg,#a9f1ff,#ff71bd)', color: '#060717', fontWeight: 800, textDecoration: 'none' }}>Retour accueil</a>
          <a href="/tarifs" style={{ minHeight: 46, display: 'inline-flex', alignItems: 'center', padding: '0 22px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', color: '#f8f8ff', fontWeight: 800, textDecoration: 'none' }}>Voir les tarifs</a>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<RouteFallback />}><Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/landing" element={<Navigate to="/landing/page.html" replace />} />
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/vibe" element={<VibePage />} />
        <Route path="/fonctionnalites" element={<LandingPublic />} />
        <Route path="/demo" element={<LandingPublic />} />
        <Route path="/contact" element={<LandingPublic />} />
        <Route path="/" element={<LandingPublic />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Routes privées — AppLayout monte une seule fois, pages via Outlet */}
        <Route element={<PrivateRoute><AppPrivateLayout /></PrivateRoute>}>
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
          <Route path="/partenaires"   element={<Partenaires />} />
          <Route path="/comparateur"   element={<Comparateur />} />
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
        <Route path="*" element={<PublicNotFound />} />
      </Routes></Suspense>
    </BrowserRouter>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */

