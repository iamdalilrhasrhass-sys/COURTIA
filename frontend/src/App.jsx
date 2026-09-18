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
// Démonstration : MÊMES pages, MÊMES composants, données synthétiques.
const DemoLayout = lazy(() => import('./demo/DemoLayout'))
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
  // En démonstration, la route privée est autorisée : la couche de données
  // synthétiques remplace l'API. Aucun jeton n'est fabriqué, et hors /demo le
  // comportement reste strictement inchangé.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
    return children
  }
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

// Routes du cockpit privé, déclarées UNE fois et montées deux fois :
//   — à la racine, protégées par PrivateRoute (production) ;
//   — sous /demo, avec LES MÊMES composants et des données synthétiques.
// Toute évolution du produit se répercute donc automatiquement sur la démo.
const ROUTES_PRIVEES = [
  <Route key="dashboard" path="/dashboard"     element={<Dashboard />} />,
  <Route key="clients" path="/clients"       element={<Clients />} />,
  <Route key="clients-new" path="/clients/new"   element={<ClientNew />} />,
  <Route key="client-id" path="/client/:id"     element={<ClientDetail />} />,
  <Route key="clients-id" path="/clients/:id"   element={<ClientDetail />} />,
  <Route key="clients-id-edit" path="/clients/:id/edit" element={<ClientNew />} />,
  <Route key="contrats" path="/contrats"      element={<Contrats />} />,
  <Route key="contrats-new" path="/contrats/new"  element={<ContratNew />} />,
  <Route key="taches" path="/taches"        element={<Taches />} />,
  <Route key="rendez-vous" path="/rendez-vous"   element={<Taches />} />,
  <Route key="rapports" path="/rapports"      element={<Rapports />} />,
  <Route key="objectifs" path="/objectifs"     element={<Objectifs />} />,
  <Route key="devis" path="/devis"         element={<Devis />} />,
  <Route key="devis-new" path="/devis/new"     element={<DevisWizard />} />,
  <Route key="documents" path="/documents"     element={<Documents />} />,
  <Route key="relances" path="/relances"      element={<Relances />} />,
  <Route key="opportunites" path="/opportunites"  element={<Opportunites />} />,
  <Route key="prospection" path="/prospection"   element={<Prospection />} />,
  <Route key="commissions" path="/commissions"   element={<Commissions />} />,
  <Route key="commissions-calculator" path="/commissions/calculator" element={<CommissionsCalculator />} />,
  <Route key="parametres" path="/parametres"    element={<Parametres />} />,
  <Route key="parametres-integrations" path="/parametres/integrations" element={<Parametres />} />,
  <Route key="morning-brief" path="/morning-brief" element={<MorningBrief />} />,
  <Route key="capitia" path="/capitia"       element={<Capitia />} />,
  <Route key="assistant-ark" path="/assistant-ark" element={<ArkIntelligence />} />,
  <Route key="ark-intelligence" path="/ark-intelligence" element={<ArkIntelligence />} />,
  <Route key="sante-portefeuille" path="/sante-portefeuille" element={<SantePortefeuille />} />,
  <Route key="analytics" path="/analytics"     element={<AnalyticsExecutive />} />,
  <Route key="analyses" path="/analyses"     element={<AnalyticsExecutive />} />,
  <Route key="abonnement" path="/abonnement"    element={<Abonnement />} />,
  <Route key="billing" path="/billing"       element={<Billing />} />,
  <Route key="partenaires" path="/partenaires"   element={<Partenaires />} />,
  <Route key="comparateur" path="/comparateur"   element={<Comparateur />} />,
  <Route key="equipe" path="/equipe"        element={<Equipe />} />,
  <Route key="conformite" path="/conformite"    element={<Conformite />} />,
  <Route key="import" path="/import"        element={<ImportPortfolio />} />,
  <Route key="academy" path="/academy"       element={<Academy />} />,
  <Route key="aide" path="/aide"          element={<Academy />} />,
  <Route key="browser-pilot" path="/browser-pilot" element={<BrowserPilot />} />,
  <Route key="paiement-succes" path="/paiement-succes" element={<PaiementSucces />} />,
  <Route key="paiement-annule" path="/paiement-annule" element={<PaiementAnnule />} />,
  <Route key="reach" path="/reach"             element={<ReachDashboard />} />,
  <Route key="reach-search" path="/reach/search"      element={<ReachSearch />} />,
  <Route key="reach-prospects-id" path="/reach/prospects/:id" element={<ReachProspectDetail />} />,
  <Route key="reach-prospects" path="/reach/prospects"   element={<ReachProspects />} />,
  <Route key="reach-campaigns-id" path="/reach/campaigns/:id" element={<ReachCampaigns />} />,
  <Route key="reach-campaigns" path="/reach/campaigns"   element={<ReachCampaigns />} />,
  <Route key="reach-inbox" path="/reach/inbox"       element={<ReachInbox />} />,
  <Route key="reach-map" path="/reach/map"         element={<ReachMap />} />,
  <Route key="reach-settings" path="/reach/settings"    element={<ReachSettings />} />,
]

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
        <Route path="/contact" element={<LandingPublic />} />
        <Route path="/" element={<LandingPublic />} />
        <Route path="/onboarding" element={<Onboarding />} />


        {/* Démonstration — mêmes pages, mêmes composants que le cockpit réel */}
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<Navigate to="/demo/dashboard" replace />} />
          {ROUTES_PRIVEES.map((r) => (
            <Route key={`demo-${r.key}`} path={r.props.path.replace(/^\//, '')} element={r.props.element} />
          ))}
          <Route path="*" element={<Navigate to="/demo/dashboard" replace />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<PublicNotFound />} />
      </Routes></Suspense>
    </BrowserRouter>
  )
}
// Trigger Vercel rebuild
/* Build trigger 2 */
