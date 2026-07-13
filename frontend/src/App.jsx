import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense, useEffect } from 'react'

// Public pages loaded in the main bundle
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPublic from './pages/LandingPublic'
import DesignSystem from './pages/DesignSystem'
import VibePage from './components/vibe/VibePage'

// Public marketing and trust pages are code-split to keep the landing bundle lean.
const FonctionnalitesPublic = lazy(() => import('./pages/FonctionnalitesPublic'))
const DemoPublic = lazy(() => import('./pages/DemoPublic'))
const ContactPublic = lazy(() => import('./pages/ContactPublic'))
const TarifsPublic = lazy(() => import('./pages/TarifsPublic'))
const LegalMentionsLegales = lazy(() => import('./pages/LegalMentionsLegales'))
const LegalConfidentialite = lazy(() => import('./pages/LegalConfidentialite'))
const LegalCookies = lazy(() => import('./pages/LegalCookies'))
const LegalConditionsUtilisation = lazy(() => import('./pages/LegalConditionsUtilisation'))
const LegalCgv = lazy(() => import('./pages/LegalCgv'))
const LegalDpa = lazy(() => import('./pages/LegalDpa'))
const LegalSubprocessors = lazy(() => import('./pages/LegalSubprocessors'))
const SecurityPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.SecurityPublic })))
const RgpdPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.RgpdPublic })))
const ChangelogPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.ChangelogPublic })))
const RoadmapPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.RoadmapPublic })))
const HelpPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.HelpPublic })))
const StatusPublic = lazy(() => import('./pages/TrustPages').then((module) => ({ default: module.StatusPublic })))

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
const Objectifs = lazy(() => import('./pages/Objectifs'))
const Devis = lazy(() => import('./pages/Devis'))
const DevisWizard = lazy(() => import('./pages/DevisWizard'))
const Documents = lazy(() => import('./pages/Documents'))
const Relances = lazy(() => import('./pages/Relances'))
const Opportunites = lazy(() => import('./pages/Opportunites'))
const Prospection = lazy(() => import('./pages/Prospection'))
const Commissions = lazy(() => import('./pages/Commissions'))
const CommissionsCalculator = lazy(() => import('./pages/CommissionsCalculator'))
const ArkIntelligence = lazy(() => import('./pages/ArkIntelligence'))
const SantePortefeuille = lazy(() => import('./pages/SantePortefeuille'))
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
const Billing = lazy(() => import('./pages/Billing'))
const PaiementSucces = lazy(() => import('./pages/PaiementSucces'))
const PaiementAnnule = lazy(() => import('./pages/PaiementAnnule'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Partenaires = lazy(() => import('./pages/Partenaires'))
const Comparateur = lazy(() => import('./pages/Comparateur'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Conformite = lazy(() => import('./pages/Conformite'))
const ImportPortfolio = lazy(() => import('./pages/ImportPortfolio'))
const Academy = lazy(() => import('./pages/Academy'))
const BrowserPilot = lazy(() => import('./pages/BrowserPilot'))

// Owner back-office. AdminRoute validates the role before rendering the layout.
const AdminRoute = lazy(() => import('./components/AdminRoute'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/AdminOverview'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'))
const AdminGrowthLeads = lazy(() => import('./pages/AdminGrowthLeads'))
const AdminCostsDashboard = lazy(() => import('./pages/AdminCostsDashboard'))
const AdminSystem = lazy(() => import('./pages/AdminSystem'))
const AdminLogs = lazy(() => import('./pages/AdminLogs'))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'))
const AdminSupport = lazy(() => import('./pages/AdminSupport'))

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

function getTokenState(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { valid: true, expired: payload.exp * 1000 < Date.now(), role: String(payload.role || '').toLowerCase() }
  } catch {
    return { valid: false, expired: true, role: '' }
  }
}

// PrivateRoute — supporte courtia_token (nouveau) et token (legacy)
function PrivateRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />
  const tokenState = getTokenState(token)
  if (!tokenState.valid || tokenState.expired) {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('token')
    return <Navigate to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />
  }
  if (tokenState.role === 'prospecteur' && location.pathname !== '/prospection') {
    return <Navigate to="/prospection" replace />
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
        <Route path="/tarifs" element={<TarifsPublic />} />
        <Route path="/pricing" element={<TarifsPublic />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/vibe" element={<VibePage />} />
        <Route path="/fonctionnalites" element={<FonctionnalitesPublic />} />
        <Route path="/demo" element={<DemoPublic />} />
        <Route path="/contact" element={<ContactPublic />} />
        <Route path="/legal/mentions-legales" element={<LegalMentionsLegales />} />
        <Route path="/legal/confidentialite" element={<LegalConfidentialite />} />
        <Route path="/legal/cookies" element={<LegalCookies />} />
        <Route path="/legal/conditions-utilisation" element={<LegalConditionsUtilisation />} />
        <Route path="/legal/cgv" element={<LegalCgv />} />
        <Route path="/legal/dpa" element={<LegalDpa />} />
        <Route path="/legal/sous-traitants" element={<LegalSubprocessors />} />
        <Route path="/mentions-legales" element={<Navigate to="/legal/mentions-legales" replace />} />
        <Route path="/confidentialite" element={<Navigate to="/legal/confidentialite" replace />} />
        <Route path="/cgu" element={<Navigate to="/legal/conditions-utilisation" replace />} />
        <Route path="/conditions" element={<Navigate to="/legal/conditions-utilisation" replace />} />
        <Route path="/cookies" element={<Navigate to="/legal/cookies" replace />} />
        <Route path="/securite" element={<SecurityPublic />} />
        <Route path="/rgpd" element={<RgpdPublic />} />
        <Route path="/changelog" element={<ChangelogPublic />} />
        <Route path="/roadmap" element={<RoadmapPublic />} />
        <Route path="/aide" element={<HelpPublic />} />
        <Route path="/status" element={<StatusPublic />} />
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
          <Route path="/rendez-vous"   element={<Taches />} />
          <Route path="/rapports"      element={<Rapports />} />
          <Route path="/objectifs"     element={<Objectifs />} />
          <Route path="/devis"         element={<Devis />} />
          <Route path="/devis/new"     element={<DevisWizard />} />
          <Route path="/documents"     element={<Documents />} />
          <Route path="/relances"      element={<Relances />} />
          <Route path="/opportunites"  element={<Opportunites />} />
          <Route path="/prospection"   element={<Prospection />} />
          <Route path="/commissions"   element={<Commissions />} />
          <Route path="/commissions/calculator" element={<CommissionsCalculator />} />
          <Route path="/parametres"    element={<Parametres />} />
          <Route path="/parametres/integrations" element={<Parametres />} />
          <Route path="/morning-brief" element={<MorningBrief />} />
          <Route path="/capitia"       element={<Capitia />} />
          <Route path="/assistant-ark" element={<ArkIntelligence />} />
          <Route path="/ark-intelligence" element={<ArkIntelligence />} />
          <Route path="/sante-portefeuille" element={<SantePortefeuille />} />
          <Route path="/analytics"     element={<AnalyticsExecutive />} />
          <Route path="/analyses"     element={<AnalyticsExecutive />} />
          <Route path="/abonnement"    element={<Abonnement />} />
          <Route path="/billing"       element={<Billing />} />
          <Route path="/partenaires"   element={<Partenaires />} />
          <Route path="/comparateur"   element={<Comparateur />} />
          <Route path="/equipe"        element={<Equipe />} />
          <Route path="/conformite"    element={<Conformite />} />
          <Route path="/import"        element={<ImportPortfolio />} />
          <Route path="/academy"       element={<Academy />} />
          <Route path="/browser-pilot" element={<BrowserPilot />} />
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

        {/* Owner back-office — every route is role-gated by AdminRoute. */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/growth-leads" element={<AdminGrowthLeads />} />
          <Route path="/admin/costs" element={<AdminCostsDashboard />} />
          <Route path="/admin/system" element={<AdminSystem />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/support" element={<AdminSupport />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<PublicNotFound />} />
      </Routes></Suspense>
    </BrowserRouter>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */
