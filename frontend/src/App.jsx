import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense, useEffect } from 'react'

// Public pages loaded in the main bundle
import LoginPage from './pages/LoginPage'
// Inscription reelle : cette page existait mais n'etait montee par aucune route.
const AuthInscription = lazy(() => import('./components/AuthPremium'))
const BillingOnboarding = lazy(() => import('./pages/BillingOnboarding'))
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPublic from './pages/LandingPublic'
import ContactPublic from './pages/ContactPublic'
import DemoPublic from './pages/DemoPublic'
import Tarifs from './pages/Tarifs'
import DesignSystem from './pages/DesignSystem'
import VibePage from './components/vibe/VibePage'
// Pages publiques présentes dans le dépôt mais NON routées : orphelines, donc
// inatteignables et non indexables, alors que sitemap.xml en déclarait une partie.
import FonctionnalitesPublic from './pages/FonctionnalitesPublic'
import LegalMentionsLegales from './pages/LegalMentionsLegales'
import LegalConfidentialite from './pages/LegalConfidentialite'
import LegalCookies from './pages/LegalCookies'
import LegalConditionsUtilisation from './pages/LegalConditionsUtilisation'
import LegalCgv from './pages/LegalCgv'
import LegalDpa from './pages/LegalDpa'
import LegalSubprocessors from './pages/LegalSubprocessors'
import { SecurityPublic, RgpdPublic, ChangelogPublic, RoadmapPublic, StatusPublic } from './pages/TrustPages'
import { applySeo, absoluteUrl } from './lib/seo'
import AdminRoute from './components/AdminRoute'
// Noms d'écrans : source unique partagée avec la barre latérale et la palette.
import { LIBELLES } from './lib/libelles'

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
// Écran « Rendez-vous » : le menu Rendez-vous ouvrait l'écran « Tâches »
// (le courtier cliquait Rendez-vous et lisait Tâches). Vue dédiée, adossée à
// l'agenda réel du cabinet.
const RendezVous = lazy(() => import('./pages/RendezVous'))
const Rapports = lazy(() => import('./pages/Rapports'))
const Objectifs = lazy(() => import('./pages/Objectifs'))
const Devis = lazy(() => import('./pages/Devis'))
const DevisWizard = lazy(() => import('./pages/DevisWizard'))
const DevisDetail = lazy(() => import('./pages/DevisDetail'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
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
// Page PUBLIQUE de depot de pieces : le client du courtier recoit un lien
// /upload/<token> (genere par backend/src/services/documentInboxService.js).
// Sans cette route, ce lien tombait sur le 404 du SPA : le client ne pouvait
// pas transmettre ses documents.
const PublicDocumentUpload = lazy(() => import('./pages/PublicDocumentUpload'))
// Prise en main guidee : progression persistee par cabinet (voir /prise-en-main).
const OnboardingGamified = lazy(() => import('./pages/OnboardingGamified'))
const Partenaires = lazy(() => import('./pages/Partenaires'))
const Comparateur = lazy(() => import('./pages/Comparateur'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Conformite = lazy(() => import('./pages/Conformite'))
const ImportPortfolio = lazy(() => import('./pages/ImportPortfolio'))
const Academy = lazy(() => import('./pages/Academy'))
const BrowserPilot = lazy(() => import('./pages/BrowserPilot'))
// Écran interne de pilotage commercial (réservé aux administrateurs).
const AcquisitionCourtia = lazy(() => import('./pages/AcquisitionCourtia'))
const AdminEssais = lazy(() => import('./pages/AdminEssais'))
// Écrans d'administration existants mais montés par AUCUNE route : le lien
// « Admin » de la barre latérale menait au 404 du SPA. Ils sont désormais
// servis derrière la garde administrateur (AdminRoute), hors démonstration.
const AdminOverview = lazy(() => import('./pages/AdminOverview'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))

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


// Enveloppe des routes purement applicatives (connexion, onboarding, design system…) :
// elles ne doivent jamais être indexées. Sans cette consigne, elles héritaient du
// `index, follow` du shell HTML et pouvaient apparaître dans les SERP.
function NoIndex({ children, title = 'COURTIA' }) {
  useEffect(() => {
    applySeo({
      title,
      description: 'Espace applicatif COURTIA — accès réservé.',
      canonicalUrl: absoluteUrl(window.location.pathname),
      robots: 'noindex, follow',
    })
  }, [title])
  return children
}

function PublicNotFound() {
  useEffect(() => {
    applySeo({
      title: 'Page introuvable (404) — COURTIA',
      description: 'Cette page n’existe pas ou n’existe plus.',
      canonicalUrl: absoluteUrl(window.location.pathname),
      robots: 'noindex, follow',
    })
  }, [])
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
  <Route key="rendez-vous" path="/rendez-vous"   element={<RendezVous />} />,
  <Route key="rapports" path="/rapports"      element={<Rapports />} />,
  <Route key="objectifs" path="/objectifs"     element={<Objectifs />} />,
  <Route key="devis" path="/devis"         element={<Devis />} />,
  <Route key="devis-new" path="/devis/new"     element={<DevisWizard />} />,
  // Après l'envoi, l'assistant renvoie vers `/devis/<id>` : sans cette route le
  // courtier terminait sur une page « introuvable » juste après avoir envoyé sa
  // proposition (flux cœur : créer → envoyer → suivre).
  <Route key="devis-id" path="/devis/:id"      element={<DevisDetail />} />,
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

// ── Titre d'onglet de l'espace privé (§33) ───────────────────────────────────
// Chaque route du cockpit annonce son propre titre (« Tableau de bord — COURTIA »,
// « Clients — COURTIA »…), sans emoji. Les noms d'écrans de la barre latérale,
// de la palette (Cmd+K), de l'onglet et du titre de l'écran viennent de la MÊME
// source (lib/libelles.js) : une notion = un seul mot (UX-024/UX-025/UX-037).
// Sans cela, l'onglet conservait le dernier titre public — « Connexion —
// COURTIA » — après la connexion : le courtier lisait le nom d'une page qu'il
// avait déjà quittée. Ces routes ne sont jamais indexables (noindex).
const TITRES_PRIVES = [
  ['/admin/users', 'Courtiers'],
  ['/admin/essais', 'Suivi des essais'],
  ['/admin', 'Administration'],
  ['/acquisition', 'Acquisition'],
  ['/prise-en-main', 'Prise en main'],
  ['/rendez-vous', 'Rendez-vous'],
  ['/commissions/calculator', 'Calculateur de commissions'],
  ['/commissions', 'Commissions'],
  ['/parametres/integrations', 'Intégrations'],
  ['/parametres', 'Paramètres'],
  ['/clients/new', 'Nouveau client'],
  ['/clients', 'Clients'],
  ['/client', 'Fiche client'],
  ['/contrats/new', 'Nouveau contrat'],
  ['/contrats', 'Contrats'],
  ['/devis/new', 'Nouveau devis'],
  ['/devis', 'Devis'],
  ['/dashboard', LIBELLES.tableauDeBord],
  ['/morning-brief', LIBELLES.briefDuMatin],
  ['/sante-portefeuille', 'Santé du portefeuille'],
  ['/ark-intelligence', 'Intelligence prédictive'],
  ['/assistant-ark', 'Assistant ARK'],
  ['/taches', LIBELLES.taches],
  ['/rapports', 'Rapports'],
  ['/objectifs', 'Objectifs'],
  ['/documents', 'Documents'],
  ['/relances', 'Relances'],
  ['/opportunites', 'Opportunités'],
  ['/prospection', 'Prospection'],
  ['/analyses', 'Analyses'],
  ['/analytics', LIBELLES.analyses],
  ['/abonnement', 'Abonnement'],
  ['/billing', 'Facturation'],
  ['/partenaires', 'Partenaires'],
  ['/comparateur', 'Comparateur'],
  ['/equipe', 'Équipe'],
  ['/conformite', 'Conformité'],
  ['/import', 'Import de portefeuille'],
  ['/academy', 'Academy'],
  ['/aide', 'Aide'],
  ['/browser-pilot', 'Browser Pilot'],
  ['/capitia', 'Capitia'],
  ['/paiement-succes', 'Paiement confirmé'],
  ['/paiement-annule', 'Paiement annulé'],
  ['/reach/prospects', 'REACH — prospects'],
  ['/reach/campaigns', 'REACH — campagnes'],
  ['/reach/inbox', 'REACH — messages'],
  ['/reach/map', 'REACH — carte'],
  ['/reach/settings', 'REACH — réglages'],
  ['/reach/search', 'REACH — recherche'],
  ['/reach', 'REACH'],
]

function titreEspacePrive(pathname = '/') {
  const trouve = TITRES_PRIVES.find(([prefixe]) => (
    pathname === prefixe || pathname.startsWith(`${prefixe}/`)
  ))
  return trouve ? trouve[1] : LIBELLES.tableauDeBord
}

function TitreEspacePrive({ children }) {
  const { pathname } = useLocation()
  useEffect(() => {
    applySeo({
      title: `${titreEspacePrive(pathname)} — COURTIA`,
      description: 'Espace applicatif COURTIA — accès réservé.',
      canonicalUrl: absoluteUrl(pathname),
      robots: 'noindex, follow',
    })
  }, [pathname])
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<RouteFallback />}><Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<NoIndex title="Connexion — COURTIA"><LoginPage /></NoIndex>} />
        {/* CORRECTION 2026-09-19 : /register affichait la page de CONNEXION
            (LoginPage ne poste que /api/auth/login). Tous les CTA « essai » de la
            landing aboutissaient donc sur une page ou le visiteur ne pouvait pas
            creer de compte. On monte AuthPremium, qui appelle deja
            authStore.register -> POST /api/auth/register. */}
        <Route path="/register" element={
          <NoIndex title="Créer un compte — COURTIA">
            <Suspense fallback={null}>
              <AuthInscription mode="register" onAuthSuccess={() => { window.location.href = '/prise-en-main' }} />
            </Suspense>
          </NoIndex>
        } />
        {/* CORRECTION 2026-09-19 : Billing.jsx redirigeait vers /onboarding/billing
            quand l'acceptation des CGV/DPA manquait, mais cette route n'existait
            pas (boucle 400 : impossible d'accepter les conditions, donc impossible
            de payer). La page existe deja et poste /billing/legal-acceptance. */}
        <Route path="/onboarding/billing" element={
          <NoIndex title="Mise en place de l'abonnement — COURTIA">
            <Suspense fallback={null}><BillingOnboarding /></Suspense>
          </NoIndex>
        } />
        {/* Retours de paiement Stripe : le backend redirige vers /billing/success et
            /billing/cancel ; ces URL n'existaient pas dans le SPA (404 apres paiement). */}
        <Route path="/billing/success" element={<PaiementSucces />} />
        <Route path="/billing/cancel" element={<PaiementAnnule />} />
        <Route path="/forgot-password" element={<NoIndex title="Mot de passe oublié — COURTIA"><ForgotPasswordPage /></NoIndex>} />
        <Route path="/reset-password" element={<NoIndex title="Réinitialiser le mot de passe — COURTIA"><ResetPasswordPage /></NoIndex>} />
        {/* /connexion : l'URL française de la page de connexion répondait le 404
            du SPA. Elle mène désormais à /login — l'écran unique de connexion,
            dont les libellés suivent le marché du visiteur (lib/marche.js). */}
        <Route path="/connexion" element={<Navigate to="/login" replace />} />
        {/* Le lien d'invitation d'un collaborateur (page Équipe) pointait vers
            /invite/<jeton> alors qu'aucune route n'existait : la première
            personne invitée tombait sur un 404. */}
        <Route path="/invite/:token" element={<NoIndex title="Invitation — COURTIA"><InviteAccept /></NoIndex>} />
        <Route path="/landing" element={<Navigate to="/landing/page.html" replace />} />
        <Route path="/tarifs" element={<Tarifs />} />
        {/* POURQUOI ces deux routes ne sont plus publiques : /design-system
            servait à quiconque la galerie de composants interne (et des chiffres
            d'exemple : 247 clients, 1 842 contrats), /vibe un écran d'ambiance
            d'atelier. Aucun visiteur n'a à voir l'outillage interne : elles sont
            désormais montées dans le cockpit privé, derrière la garde
            administrateur (voir plus bas). */}
        <Route path="/fonctionnalites" element={<FonctionnalitesPublic />} />
        {/* Pages marketing publiques qui portent le formulaire de demande de démo.
            /demo-public est le pendant marketing de /demo (cockpit de démonstration,
            routes /demo/* ci-dessous, inchangées). */}
        <Route path="/demo-public" element={<DemoPublic />} />
        {/* Dépôt de pièces par le CLIENT, via lien tokenisé — aucune authentification
            utilisateur : c'est le token (32 octets aléatoires, valable 72 h) qui fait foi. */}
        <Route path="/upload/:token" element={<NoIndex title="Dépôt de documents — COURTIA"><PublicDocumentUpload /></NoIndex>} />
        <Route path="/contact" element={<ContactPublic />} />
        <Route path="/" element={<LandingPublic />} />
        <Route path="/onboarding" element={<NoIndex title="Onboarding — COURTIA"><Onboarding /></NoIndex>} />

        {/* Pages légales et de confiance : présentes dans le dépôt mais jusqu'ici
            non routées, alors que sitemap.xml et les liens de pied de page les
            déclaraient. Elles répondent maintenant en 200 avec leur propre
            title/description/canonical au lieu de tomber sur le 404 du SPA. */}
        <Route path="/legal/mentions-legales" element={<LegalMentionsLegales />} />
        <Route path="/legal/confidentialite" element={<LegalConfidentialite />} />
        <Route path="/legal/cookies" element={<LegalCookies />} />
        <Route path="/legal/conditions-utilisation" element={<LegalConditionsUtilisation />} />
        <Route path="/legal/cgv" element={<LegalCgv />} />
        <Route path="/legal/dpa" element={<LegalDpa />} />
        <Route path="/legal/sous-traitants" element={<LegalSubprocessors />} />
        <Route path="/securite" element={<SecurityPublic />} />
        <Route path="/rgpd" element={<RgpdPublic />} />
        <Route path="/changelog" element={<ChangelogPublic />} />
        <Route path="/roadmap" element={<RoadmapPublic />} />
        <Route path="/status" element={<StatusPublic />} />


        {/* ── Cockpit privé RÉEL ──────────────────────────────────────────────
            Ces routes étaient ABSENTES du routeur : /dashboard, /prospection,
            /relances… répondaient la page 404 sur courtiark.fr comme en local.
            Le cockpit n'était donc atteignable par personne, alors que ses pages
            et ses modules existent. Restaurées ici, protégées par PrivateRoute,
            avec EXACTEMENT les mêmes composants que la démonstration. */}
        <Route element={<TitreEspacePrive><PrivateRoute><AppPrivateLayout /></PrivateRoute></TitreEspacePrive>}>
          {ROUTES_PRIVEES}
          {/* Prise en main — parcours de démarrage guidé.
              L'écran existait (pages/OnboardingGamified.jsx) et son API est
              persistée par cabinet (/api/onboarding/gamified/*, vérifiée :
              progression écrite en base, reprise après reconnexion, étanchéité
              entre cabinets). Il n'était monté par AUCUNE route : il est
              désormais accessible dans le cockpit, hors démo — la progression
              affichée est celle du cabinet connecté, pas un exemple. */}
          <Route path="/prise-en-main" element={<OnboardingGamified />} />
          {/* ACQUISITION COURTIA — écran interne, administrateurs uniquement.
              Monté à la racine SEULEMENT (jamais sous /demo) : il lit le
              service de capture réel, jamais des données synthétiques. */}
          <Route path="/acquisition" element={<AdminRoute><AcquisitionCourtia /></AdminRoute>} />
          {/* SUIVI DES ESSAIS — écran interne (super administrateur) : statut,
              dates réelles, jours restants et usage mesurés en base. */}
          <Route path="/admin/essais" element={<AdminRoute><AdminEssais /></AdminRoute>} />
          {/* ADMINISTRATION — les liens « Admin » et « Courtiers » de la barre
              latérale pointaient vers /admin sans qu'aucune route n'existe :
              l'administrateur tombait sur le 404. Les pages existaient déjà ;
              seules les routes manquaient. Même garde que /acquisition et
              /admin/essais, et jamais montées sous /demo (données réelles). */}
          <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/users/:id" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
          {/* OUTILLAGE INTERNE — galerie de composants et écran d'ambiance.
              Ils étaient servis publiquement (sans authentification) et
              affichaient des chiffres d'exemple. Gardés ici : accessibles
              seulement à une session administrateur. */}
          <Route path="/design-system" element={<AdminRoute><DesignSystem /></AdminRoute>} />
          <Route path="/vibe" element={<AdminRoute><VibePage /></AdminRoute>} />
        </Route>

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
