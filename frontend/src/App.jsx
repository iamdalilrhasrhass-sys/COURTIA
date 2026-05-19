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
import Devis from './pages/Devis'
import Relances from './pages/Relances'
import Opportunites from './pages/Opportunites'
import Partenaires from './pages/Partenaires'
import Prospection from './pages/Prospection'

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
const BillingOnboarding = lazy(() => import('./pages/BillingOnboarding'))
const CabinetOnboarding = lazy(() => import('./pages/CabinetOnboarding'))
const DataOnboarding = lazy(() => import('./pages/Onboarding'))
// LOT 13-15 — Pages V2 Premium Aurora
const DashboardV2 = lazy(() => import('./pages/v2/DashboardV2'))
const ClientsV2 = lazy(() => import('./pages/v2/ClientsV2'))
const ArkWatchV2 = lazy(() => import('./pages/v2/ArkWatchV2'))
const ComposeV2 = lazy(() => import('./pages/v2/ComposeV2'))
const VoiceV2 = lazy(() => import('./pages/v2/VoiceV2'))
const DocVisionV2 = lazy(() => import('./pages/v2/DocVisionV2'))
const SinistresV2 = lazy(() => import('./pages/v2/SinistresV2'))
const SignaturesV2 = lazy(() => import('./pages/v2/SignaturesV2'))
const ReportingV2 = lazy(() => import('./pages/v2/ReportingV2'))
// LOT 21-22 — WhatsApp + ARK Chat + Commissions + Comptabilité
const WhatsAppV2 = lazy(() => import('./pages/v2/WhatsAppV2'))
const ArkChatV2 = lazy(() => import('./pages/v2/ArkChatV2'))
const CommissionsV2 = lazy(() => import('./pages/v2/CommissionsV2'))
const ComptabiliteV2 = lazy(() => import('./pages/v2/ComptabiliteV2'))
// LOT 23 — API Publique + Marketplace + Multi-langue + Enterprise
const DeveloperV2 = lazy(() => import('./pages/v2/DeveloperV2'))
const MarketplaceV2 = lazy(() => import('./pages/v2/MarketplaceV2'))
const EnterpriseV2 = lazy(() => import('./pages/v2/EnterpriseV2'))
const OnboardingGamified = lazy(() => import('./pages/OnboardingGamified'))
const DesignSystem = lazy(() => import('./pages/DesignSystem'))
const ImportPortfolio = lazy(() => import('./pages/ImportPortfolio'))
const Equipe = lazy(() => import('./pages/Equipe'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
const Academy = lazy(() => import('./pages/Academy'))
const Documents = lazy(() => import('./pages/Documents'))
const Commissions = lazy(() => import('./pages/Commissions'))
const BrowserPilot = lazy(() => import('./pages/BrowserPilot'))
const ShowcaseVideo = lazy(() => import('./pages/ShowcaseVideo'))
const TarifsPublic = lazy(() => import('./pages/TarifsPublic'))
const DemoPublic = lazy(() => import('./pages/DemoPublic'))
const ContactPublic = lazy(() => import('./pages/ContactPublic'))
const SecurityPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.SecurityPublic })))
const RgpdPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.RgpdPublic })))
const ChangelogPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.ChangelogPublic })))
const RoadmapPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.RoadmapPublic })))
const HelpPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.HelpPublic })))
const StatusPublic = lazy(() => import('./pages/TrustPages').then((mod) => ({ default: mod.StatusPublic })))
const LegalMentionsLegales = lazy(() => import('./pages/LegalMentionsLegales'))
const LegalConfidentialite = lazy(() => import('./pages/LegalConfidentialite'))
const LegalCookies = lazy(() => import('./pages/LegalCookies'))
const LegalConditionsUtilisation = lazy(() => import('./pages/LegalConditionsUtilisation'))
const LegalCgv = lazy(() => import('./pages/LegalCgv'))
const LegalDpa = lazy(() => import('./pages/LegalDpa'))
const LegalSubprocessors = lazy(() => import('./pages/LegalSubprocessors'))
const PublicDocumentUpload = lazy(() => import('./pages/PublicDocumentUpload'))
const DevUi = lazy(() => import('./pages/DevUi'))
const AdminOverview = lazy(() => import('./pages/AdminOverview'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'))
const AdminSystem = lazy(() => import('./pages/AdminSystem'))
const AdminLogs = lazy(() => import('./pages/AdminLogs'))
const AdminSupport = lazy(() => import('./pages/AdminSupport'))
const AdminCostsDashboard = lazy(() => import('./pages/AdminCostsDashboard'))
const AdminGrowthLeads = lazy(() => import('./pages/AdminGrowthLeads'))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Beta = lazy(() => import('./pages/Beta'))
// LOT VIBE — Features concurrentielles courtiers
const CommissionsCalculator = lazy(() => import('./pages/CommissionsCalculator'))
const Comparateur = lazy(() => import('./pages/Comparateur'))
const IAQuotidien = lazy(() => import("./pages/IAQuotidien"))
const SantePortefeuille = lazy(() => import('./pages/SantePortefeuille'))
// LOT FEATURES KILLERS — F1 ARK Predictive Intelligence + F5 Objectifs + F6 Conformité
const ArkIntelligence = lazy(() => import('./pages/ArkIntelligence'))
const Objectifs = lazy(() => import('./pages/Objectifs'))
const Conformite = lazy(() => import('./pages/Conformite'))
const growthLeadsEnabled = String(import.meta.env.VITE_ENABLE_GROWTH_LEADS || '').toLowerCase() === 'true'

// Session 0 — Aurora OS layouts
import AppShell from './layouts/AppShell'
import DashboardLegacy from './pages/DashboardLegacy'
import LegacyFeaturePage from './pages/LegacyFeaturePage'

// Components
import Sidebar from './components/Sidebar'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/AdminLayout'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'
import NotificationBell from './components/NotificationBell'
import FeedbackButton from './components/FeedbackButton'
import ArkBubble from './components/ark/ArkBubble'
import ProtectedRoute from './components/ProtectedRoute'
import CourtiaBubbleLogo from './components/brand/CourtiaBubbleLogo'
import CourtiaLogoLoader from './components/brand/CourtiaLogoLoader'
import RhasrhassSignature from './components/brand/RhasrhassSignature'
import ErrorBoundary from './components/ErrorBoundary'

// Mobile PWA — Aurora Bubble C
import { AuroraMobileTopbar } from './components/aurora/AuroraMobileTopbar'
import { AuroraBottomNav } from './components/aurora/AuroraBottomNav'
import { AuroraMobileSheet } from './components/aurora/AuroraMobileSheet'
import { AuroraMobileMore } from './components/aurora/AuroraMobileMore'

// Stores / API
import { usePlanStore } from './stores/planStore'
import { onPaywallTriggered } from './api'

// ScrollToTop — useLocation est inclus dans l'import react-router-dom du haut
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// Layout avec sidebar — monte UNE SEULE FOIS pour toute la session authentifiée
// Les pages enfants sont injectées via <Outlet /> (React Router nested routes)
function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const fetchPlanInfo = usePlanStore(s => s.fetchPlanInfo)
  const [paywallError, setPaywallError] = useState(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => { fetchPlanInfo() }, [fetchPlanInfo])
  useEffect(() => { return onPaywallTriggered(err => setPaywallError(err)) }, [])

  // Track mobile breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => setIsMobile(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [])

  // Fetch notif count (light, cached, fails silently)
  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
    if (!token) return
    fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !cancelled && typeof d.count === 'number') setNotifCount(d.count) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])

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

  const handleLogout = useCallback(() => {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('token')
    sessionStorage.removeItem('courtia_token')
    sessionStorage.removeItem('token')
    navigate('/login')
  }, [navigate])

  return (
    <div className="courtia-cockpit-shell" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="courtia-cockpit-aurora" aria-hidden="true" />
      <div className="courtia-cockpit-watermark" aria-hidden="true">
        <CourtiaBubbleLogo size="100%" animated={false} showHalo showFoam showSpecular />
      </div>
      <div className="courtia-bubble-orb courtia-bubble-orb--violet courtia-bubble-orb--app-left" aria-hidden="true" />
      <div className="courtia-bubble-orb courtia-bubble-orb--cyan courtia-bubble-orb--app-right" aria-hidden="true" />
      <Sidebar />

      {/* Mobile Topbar — burger / logo / bell */}
      {isMobile && (
        <AuroraMobileTopbar
          onMenuClick={() => window.dispatchEvent(new Event('courtia:open-sidebar'))}
          onBellClick={() => navigate('/taches')}
          notificationsCount={notifCount}
        />
      )}

      <main
        className="courtia-cockpit-main courtia-depth-stage flex-1 ml-0 md:ml-[240px] pt-14 md:pt-0"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 0,
        }}
      >
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

      {/* NotificationBell — caché en mobile, présent dans la topbar */}
      {!isMobile && (
        <div style={{ position: 'fixed', right: 20, bottom: 68, zIndex: 200 }}>
          <NotificationBell />
        </div>
      )}
      <FeedbackButton />
      <ArkBubble />

      {/* Bottom Nav mobile : Cockpit / Clients / ARK / Actions / Plus */}
      {isMobile && (
        <AuroraBottomNav
          notificationsCount={notifCount}
          onMoreClick={() => setMoreSheetOpen(true)}
        />
      )}

      {/* More Sheet (drawer bottom) — features secondaires */}
      <AuroraMobileSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Plus"
        snapPoints={['65%', '92%']}
      >
        <AuroraMobileMore
          onClose={() => setMoreSheetOpen(false)}
          onLogout={handleLogout}
        />
      </AuroraMobileSheet>

      {/* Bouton de secours Cmd+K — desktop only */}
      {!isMobile && (
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
            fontSize: 12, fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#080808'}
        >
          <span style={{ fontSize: 13 }}>⌘K</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Recherche</span>
        </button>
      )}
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
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        <Suspense fallback={<RouteLoader />}>
        <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/landing" element={<Navigate to="/landing/page.html" replace />} />
        <Route path="/fonctionnalites" element={<Navigate to="/#cockpit" replace />} />
        <Route path="/tarifs" element={<TarifsPublic />} />
        <Route path="/demo" element={<DemoPublic />} />
        <Route path="/contact" element={<ContactPublic />} />
        <Route path="/securite" element={<SecurityPublic />} />
        <Route path="/rgpd" element={<RgpdPublic />} />
        <Route path="/changelog" element={<ChangelogPublic />} />
        <Route path="/roadmap" element={<RoadmapPublic />} />
        <Route path="/aide" element={<HelpPublic />} />
        <Route path="/status" element={<StatusPublic />} />
        <Route path="/legal/mentions-legales" element={<LegalMentionsLegales />} />
        <Route path="/legal/confidentialite" element={<LegalConfidentialite />} />
        <Route path="/legal/cookies" element={<LegalCookies />} />
        <Route path="/legal/conditions-utilisation" element={<LegalConditionsUtilisation />} />
        <Route path="/legal/cgv" element={<LegalCgv />} />
        <Route path="/legal/dpa" element={<LegalDpa />} />
        <Route path="/legal/sous-traitants" element={<LegalSubprocessors />} />
        <Route path="/upload/:token" element={<PublicDocumentUpload />} />
        <Route path="/beta" element={<Beta />} />
            <Route path="/ia-quotidien" element={<IAQuotidien />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/dev/ui" element={<DevUi />} />
        <Route path="/video-showcase" element={import.meta.env.DEV ? <ShowcaseVideo /> : <Navigate to="/" replace />} />
        <Route path="/" element={<LandingPublic />} />

        {/* SESSION 0 — Aurora OS 5-section shell (/dashboard) */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Routes privées — AppLayout legacy (conservé intégralement) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard-legacy" element={<DashboardLegacy />} />
          <Route path="/onboarding"    element={<CabinetOnboarding />} />
          <Route path="/onboarding/cabinet" element={<CabinetOnboarding />} />
          <Route path="/onboarding/billing" element={<BillingOnboarding />} />
          <Route path="/onboarding/import" element={<DataOnboarding />} />
          <Route path="/onboarding/integrations" element={<Parametres />} />
          <Route path="/onboarding/ark" element={<MorningBrief />} />
          <Route path="/import"        element={<ImportPortfolio />} />
          <Route path="/equipe"        element={<Equipe />} />
          <Route path="/clients"       element={<Clients />} />
          <Route path="/clients/new"   element={<ClientNew />} />
          <Route path="/client/:id"     element={<ClientDetail />} />
          <Route path="/clients/:id"   element={<ClientDetail />} />
          <Route path="/clients/:id/edit" element={<ClientNew />} />
          <Route path="/contrats"      element={<Contrats />} />
          <Route path="/contrats/new"  element={<ContratNew />} />
          <Route path="/taches"        element={<Taches />} />
          <Route path="/devis"        element={<Devis />} />
          <Route path="/relances"     element={<Relances />} />
          <Route path="/opportunites" element={<Opportunites />} />
          <Route path="/rendez-vous"  element={<Taches />} />
          <Route path="/partenaires"  element={<Partenaires />} />
          <Route path="/prospection"  element={<Prospection />} />
          <Route path="/assistant-ark" element={<Capitia />} />
          <Route path="/rapports"      element={<Rapports />} />
          <Route path="/parametres"    element={<Parametres />} />
          <Route path="/parametres/integrations" element={<Parametres />} />
          <Route path="/academy"       element={<Academy />} />
          {/* LOT 13-15 — Routes V2 Premium Aurora */}
          <Route path="/v2"            element={<DashboardV2 />} />
          <Route path="/v2/clients"    element={<ClientsV2 />} />
          <Route path="/v2/ark-watch"  element={<ArkWatchV2 />} />
          <Route path="/v2/compose"    element={<ComposeV2 />} />
          <Route path="/v2/voice"      element={<VoiceV2 />} />
          <Route path="/v2/docvision"  element={<DocVisionV2 />} />
          <Route path="/v2/sinistres" element={<SinistresV2 />} />
          <Route path="/v2/signatures" element={<SignaturesV2 />} />
          <Route path="/v2/reporting" element={<ReportingV2 />} />
          {/* LOT 21-22 — WhatsApp + ARK Chat + Commissions + Comptabilité */}
          <Route path="/v2/whatsapp" element={<WhatsAppV2 />} />
          <Route path="/v2/ark-chat" element={<ArkChatV2 />} />
          <Route path="/v2/commissions" element={<CommissionsV2 />} />
          <Route path="/v2/comptabilite" element={<ComptabiliteV2 />} />
          {/* LOT 23 — API Publique + Marketplace + Enterprise */}
          <Route path="/v2/developer" element={<DeveloperV2 />} />
          <Route path="/v2/marketplace" element={<MarketplaceV2 />} />
          <Route path="/v2/enterprise" element={<EnterpriseV2 />} />
          <Route path="/onboarding/gamified" element={<OnboardingGamified />} />
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="/academy/*"     element={<Academy />} />
          <Route path="/documents"     element={<Documents />} />
          <Route path="/commissions"   element={<Commissions />} />
          <Route path="/commissions/calculator" element={<CommissionsCalculator />} />
          <Route path="/comparateur" element={<Comparateur />} />
          <Route path="/sante-portefeuille" element={<SantePortefeuille />} />
          <Route path="/ark-intelligence" element={<ArkIntelligence />} />
          <Route path="/objectifs" element={<Objectifs />} />
          <Route path="/conformite" element={<Conformite />} />
          <Route path="/browser-pilot" element={<BrowserPilot />} />
          <Route path="/morning-brief" element={<MorningBrief />} />
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
          {growthLeadsEnabled && <Route path="/admin/growth-leads" element={<AdminGrowthLeads />} />}
          <Route path="/admin/costs" element={<AdminCostsDashboard />} />
          <Route path="/admin/system" element={<AdminSystem />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/support" element={<AdminSupport />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */
