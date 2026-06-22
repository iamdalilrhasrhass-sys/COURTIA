import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Gauge,
  Globe,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import AuroraButton from '../components/brand/AuroraButton'
import RhasrhassSignature from '../components/brand/RhasrhassSignature'
import {
  MARKET_OPTIONS,
  getDetectedGeoCountry,
  parseMarketFromSearch,
  persistMarketOverride,
  readStoredMarketOverride,
  resolveMarketContext,
} from '../market/marketContext'

const styles = `
html { scroll-behavior: smooth; }
html, body, #root { background: #02040c; }
body { overscroll-behavior-y: none; }
.landing-section { scroll-margin-top: 88px; }
.courtia-landing {
  background:
    radial-gradient(circle at 50% -10%, rgba(255,255,255,0.13), transparent 18rem),
    radial-gradient(circle at 14% 8%, rgba(255,128,224,0.18), transparent 34rem),
    radial-gradient(circle at 86% 16%, rgba(34,211,238,0.16), transparent 32rem),
    radial-gradient(circle at 50% 62%, rgba(128,240,216,0.08), transparent 40rem),
    linear-gradient(180deg, #02040c 0%, #050716 42%, #03050d 100%);
}
.aurora-sky {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.aurora-sky::before {
  content: "";
  position: absolute;
  left: -12%;
  right: -12%;
  top: -8%;
  height: 58vh;
  background:
    linear-gradient(105deg, transparent 4%, rgba(255,128,224,0.22) 18%, rgba(160,128,255,0.16) 32%, rgba(128,240,216,0.18) 48%, rgba(34,211,238,0.15) 66%, transparent 88%),
    linear-gradient(82deg, transparent 18%, rgba(255,255,255,0.11) 42%, transparent 70%);
  filter: blur(34px);
  transform: skewY(-7deg);
  opacity: 0.9;
  animation: auroraDrift 20s ease-in-out infinite;
}
.aurora-sky::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 18%, rgba(255,255,255,0.06), transparent 1.5px),
    radial-gradient(circle at 76% 12%, rgba(255,255,255,0.05), transparent 1.5px),
    radial-gradient(circle at 58% 38%, rgba(255,255,255,0.035), transparent 1.5px);
  background-size: 180px 180px, 240px 240px, 210px 210px;
  opacity: 0.6;
}
.aurora-floor {
  position: fixed;
  left: 50%;
  bottom: -8vh;
  width: 150vw;
  height: 58vh;
  pointer-events: none;
  transform: translateX(-50%) perspective(900px) rotateX(68deg);
  background-image:
    linear-gradient(rgba(180,100,255,0.065) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34,211,238,0.052) 1px, transparent 1px);
  background-size: 74px 74px;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 78%);
  opacity: 0.72;
  z-index: 0;
}
.aurora-curtain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(2,4,12,0.88), transparent 24%, transparent 76%, rgba(2,4,12,0.88)),
    linear-gradient(180deg, rgba(2,4,12,0.20), transparent 18%, rgba(2,4,12,0.72));
  z-index: 1;
}
@keyframes auroraDrift {
  0%, 100% { transform: translate3d(0,0,0) skewY(-7deg) scale(1); opacity: 0.72; }
  50% { transform: translate3d(4%,8%,0) skewY(-5deg) scale(1.08); opacity: 1; }
}
.canonical-watermark {
  position: fixed;
  right: max(-120px, -8vw);
  top: 18vh;
  width: min(58vw, 780px);
  height: min(58vw, 780px);
  pointer-events: none;
  opacity: 0.16;
  filter: saturate(1.22);
  z-index: 0;
}
.stream-shell {
  position: relative;
  z-index: 10;
}
.landing-act {
  position: relative;
  min-height: 100vh;
  padding: 7.5rem 1.25rem;
  overflow: hidden;
}
.landing-act::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 18%, rgba(255,128,224,0.10), transparent 28rem),
    radial-gradient(circle at 82% 20%, rgba(34,211,238,0.09), transparent 30rem),
    radial-gradient(circle at 50% 82%, rgba(128,240,216,0.055), transparent 34rem);
}
.act-shell {
  position: relative;
  z-index: 10;
  width: min(100%, 1240px);
  max-width: 1240px;
  margin: 0 auto;
  min-width: 0;
}
.cinema-title {
  font-size: clamp(2.55rem, 7vw, 6.8rem);
  line-height: 0.94;
  font-weight: 950;
  letter-spacing: -0.045em;
  max-width: 100%;
  overflow-wrap: break-word;
  text-wrap: balance;
}
.scene-title {
  font-size: clamp(2rem, 4.5vw, 4.7rem);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: -0.035em;
}
.scene-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: rgba(207,250,254,0.68);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.scene-kicker::before {
  content: "";
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff80e0, #80f0d8);
  box-shadow: 0 0 24px rgba(34,211,238,0.68);
}
.liquid-stage {
  position: relative;
  border: 1px solid rgba(255,255,255,0.095);
  background:
    radial-gradient(circle at 30% 12%, rgba(255,255,255,0.11), transparent 16rem),
    linear-gradient(135deg, rgba(255,255,255,0.078), rgba(255,255,255,0.026));
  box-shadow: 0 44px 120px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10);
  backdrop-filter: blur(28px);
}
.liquid-stage::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(115deg, rgba(255,255,255,0.20), transparent 18%, transparent 72%, rgba(128,240,216,0.12)),
    radial-gradient(circle at 78% 78%, rgba(160,128,255,0.15), transparent 18rem);
  opacity: 0.76;
}
.signal-lane {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.075);
  background: rgba(255,255,255,0.036);
  backdrop-filter: blur(18px);
}
.signal-lane::before {
  content: "";
  position: absolute;
  inset: -1px;
  background: linear-gradient(90deg, transparent, rgba(34,211,238,0.14), transparent);
  opacity: 0;
  transition: opacity 220ms ease;
}
.signal-lane:hover::before { opacity: 1; }
.conversion-strip {
  background:
    linear-gradient(90deg, rgba(255,128,224,0.10), rgba(34,211,238,0.10), rgba(128,240,216,0.08)),
    rgba(255,255,255,0.035);
}
.aurora-mesh {
  background:
    radial-gradient(circle at 18% 18%, rgba(255,128,224,0.16), transparent 18rem),
    radial-gradient(circle at 64% 14%, rgba(128,240,216,0.12), transparent 20rem),
    radial-gradient(circle at 88% 64%, rgba(160,128,255,0.12), transparent 26rem),
    linear-gradient(115deg, rgba(255,255,255,0.05), transparent 24%, rgba(34,211,238,0.055) 44%, transparent 70%);
}
.aurora-noise {
  background-image:
    linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(circle at 50% 15%, black, transparent 72%);
}
.glass-panel {
  position: relative;
  border: 1px solid rgba(255,255,255,0.09);
  background: linear-gradient(145deg, rgba(255,255,255,0.072), rgba(255,255,255,0.026));
  box-shadow: 0 30px 90px rgba(0,0,0,0.30);
  backdrop-filter: blur(22px);
}
.glass-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.16), transparent 28%),
    radial-gradient(circle at 18% 12%, rgba(255,255,255,0.12), transparent 18rem);
  opacity: 0.75;
}
.premium-card {
  transition: transform 260ms ease, border-color 260ms ease, background 260ms ease, box-shadow 260ms ease;
}
.premium-card:hover {
  transform: translateY(-8px) perspective(920px) rotateX(4deg) rotateY(-3deg);
  border-color: rgba(255,255,255,0.18);
  background: linear-gradient(145deg, rgba(255,255,255,0.092), rgba(255,255,255,0.034));
  box-shadow: 0 28px 80px rgba(0,0,0,0.34), 0 0 44px rgba(34,211,238,0.08);
}
.aurora-text {
  background: linear-gradient(115deg, #ffffff 0%, #eef4ff 24%, #c8b7ff 46%, #a5f3fc 70%, #ffffff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.flow-band {
  position: relative;
}
.flow-band::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 0%, rgba(255,255,255,0.035), transparent 18rem),
    radial-gradient(circle at 86% 28%, rgba(34,211,238,0.045), transparent 24rem);
  opacity: 1;
}
.soft-rail {
  background: linear-gradient(180deg, transparent, rgba(168,85,247,0.16), rgba(34,211,238,0.13), rgba(16,185,129,0.09), transparent);
  opacity: 0.28;
  filter: blur(0.4px) drop-shadow(0 0 12px rgba(34,211,238,0.16));
}
.parallax-stage {
  transform-style: preserve-3d;
}
.depth-panel {
  transform: perspective(1100px) rotateX(3deg) rotateY(-2deg);
  transition: transform 280ms ease, box-shadow 280ms ease;
}
.depth-panel:hover {
  transform: perspective(1100px) rotateX(6deg) rotateY(-4deg) translateY(-4px);
  box-shadow: 0 34px 96px rgba(0,0,0,0.38), 0 0 48px rgba(34,211,238,0.09);
}
@media (max-width: 640px) {
  .landing-act { min-height: auto; padding: 5.6rem 1rem; }
  .cinema-title { width: min(100%, calc(100vw - 2rem)); max-width: calc(100vw - 2rem); font-size: clamp(1.95rem, 9.6vw, 2.75rem); line-height: 1.02; letter-spacing: -0.025em; text-wrap: wrap; }
  .scene-title { font-size: clamp(2rem, 10vw, 3.1rem); }
  .conversion-strip { grid-template-columns: 1fr !important; }
  .hero-logo-orbit { transform: scale(0.72); transform-origin: top center; }
  .canonical-watermark { width: 520px; height: 520px; right: -260px; top: 12vh; opacity: 0.11; }
  .aurora-floor { opacity: 0.42; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`

const navItems = [
  ['story', 'Vision'],
  ['ark', 'ARK'],
  ['cockpit', 'Cockpit'],
  ['pricing', 'Tarifs'],
]

const credibility = [
  { icon: Brain, label: 'COURTIA s’occupe de tout' },
  { icon: Bell, label: 'Plus de relances à gérer' },
  { icon: CalendarClock, label: 'Plus d’échéances oubliées' },
  { icon: FileCheck2, label: 'Plus de dossiers à courir' },
  { icon: Radar, label: 'Le courtier développe' },
]

const problems = [
  ['Administration qui mange la journée', 'Saisies, vérifications, pièces à réclamer, rappels: le courtier finit par gérer du suivi au lieu de vendre.', Clock3],
  ['Contrats suivis trop tard', 'Renouvellements, avenants, échéances et risques de départ ressortent quand il faut déjà courir après le client.', CalendarClock],
  ['Dossiers éclatés partout', 'Une info dans un email, une pièce dans un dossier, une note dans un tableur: chaque action devient une chasse au contexte.', Database],
  ['Relances qui passent à la trappe', 'Le prospect chaud, le client silencieux ou l’opportunité multi-équipement sort du radar au mauvais moment.', Bell],
  ['Portefeuille sans priorité claire', 'Le cabinet sait qu’il y a du potentiel, mais pas toujours qui appeler maintenant pour créer du chiffre.', Gauge],
]

const arkSignals = [
  'Appel prioritaire: client à risque, argumentaire prêt.',
  'Relance J-18 préparée: message, contexte et prochaine étape.',
  'Dossier incomplet: pièce manquante identifiée et suivi programmé.',
  'Multi-équipement détecté: proposition commerciale prête.',
  'Client silencieux: relance à traiter aujourd’hui.',
  'Contrat sensible: action recommandée avant perte de revenu.',
]

const workflow = [
  ['08h30', 'Plan d’attaque', 'ARK classe les actions qui protègent ou développent le chiffre.'],
  ['09h00', 'Appels du jour', 'Vous savez qui appeler, pourquoi, et avec quel angle commercial.'],
  ['11h00', 'Relances gérées', 'Les messages, rappels et prochaines étapes sont cadrés.'],
  ['14h00', 'Dossiers traités', 'Pièces, statuts et rappels ne dorment plus dans les emails.'],
  ['17h00', 'Portefeuille', 'COURTIA gère le suivi, le courtier revient sur la croissance.'],
]

const features = [
  ['CRM clients', 'Chaque client garde son historique, ses contrats, ses notes et sa prochaine action.', Users],
  ['Contrats', 'Échéances, primes, statuts et risques de départ remontent avant qu’il soit trop tard.', FileText],
  ['Tâches', 'Le cabinet voit ce qui doit être traité maintenant, pas dans trois semaines.', Check],
  ['Brief du matin', 'ARK livre le plan de journée: appels, relances, dossiers et opportunités.', Brain],
  ['Scoring portefeuille', 'Une lecture immédiate des clients à protéger et des comptes à développer.', Gauge],
  ['ARK Reach', 'Relances et prospection préparées pour transformer le suivi en chiffre.', MessageSquare],
  ['Documents clients', 'Les pièces attendues et dossiers incomplets restent suivis jusqu’au traitement.', FileCheck2],
  ['Rapports', 'Activité, opportunités, échéances et rétention visibles sans retraiter un tableur.', BarChart3],
  ['Admin Center', 'Pilotage SaaS propriétaire pour utilisateurs, support et système.', ShieldCheck],
  ['Relances intelligentes', 'Chaque relance garde son contexte, son timing et son objectif commercial.', Bell],
]

const solutionTakeover = [
  ['Gestion', 'clients, contrats, tâches et priorités'],
  ['Relances', 'messages, rappels et prochaines étapes'],
  ['Appels', 'qui appeler, pourquoi, avec quel angle'],
  ['Dossiers', 'pièces manquantes, statuts et suivi'],
  ['Échéances', 'contrats à surveiller avant qu’il soit trop tard'],
]

const pricing = [
  {
    name: 'Starter',
    price: '89 € HT',
    period: '/ mois',
    label: 'Pour reprendre la main',
    headline: 'Pour sortir des tableurs, des post-it et des relances dans la tête.',
    note: '0 € aujourd’hui, puis 89 € HT / mois après le 7e jour. Soit 106,80 € TTC / mois avec TVA 20 %.',
    href: '/register?plan=starter',
    cta: 'Structurer mon cabinet',
    featured: false,
    items: ['Clients et contrats centralisés', 'Relances et tâches visibles', 'Échéances sous contrôle', 'Tableau de bord essentiel', 'Essai gratuit 7 jours'],
  },
  {
    name: 'Pro',
    price: '159 € HT',
    period: '/ mois',
    label: 'Le vrai levier commercial',
    headline: 'Pour ne plus porter la gestion, les relances et les dossiers à bout de bras.',
    note: '0 € aujourd’hui, puis 159 € HT / mois après le 7e jour. Soit 190,80 € TTC / mois avec TVA 20 %. Un seul renouvellement sauvé peut déjà justifier le mois.',
    href: '/register?plan=pro',
    cta: 'Gagner du temps maintenant',
    featured: true,
    items: ['Gestion quotidienne prise en charge', 'Brief ARK chaque matin', 'Appels et relances priorisés', 'Dossiers incomplets suivis', 'Opportunités multi-équipement', 'Rapports commerciaux avancés'],
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    period: '',
    label: 'Cabinets qui veulent scaler',
    headline: 'Pour industrialiser le suivi commercial sur toute l’équipe.',
    note: 'Accompagnement, déploiement, organisation multi-utilisateurs et workflows avancés étudiés avec le cabinet.',
    externalHref: 'mailto:contact@courtia.fr?subject=COURTIA%20Premium',
    cta: 'Construire mon déploiement',
    featured: false,
    items: ['Tout Pro', 'Multi-utilisateurs', 'Méthode de déploiement', 'Suivi équipe', 'Support prioritaire'],
  },
]

const reassurance = [
  ['Pensé courtage', 'Clients, contrats, échéances, relances, rebonds: le langage est celui du cabinet.', Building2],
  ['Suivi centralisé', 'Appels, dossiers, tâches et documents restent dans le même cockpit.', Database],
  ['Contrôle du courtier', 'ARK prépare et priorise. Le cabinet garde la main sur la relation.', Lock],
  ['Essai clair', '7 jours, 0 € aujourd’hui, annulation en ligne.', Check],
  ['Pas un CRM générique', 'COURTIA vend du temps, du suivi et du potentiel commercial récupéré.', Radar],
  ['Accompagnement', 'Un outil métier doit être simple à comprendre, simple à adopter.', Mail],
]

const faq = [
  ['COURTIA remplace-t-il mon logiciel actuel ?', 'COURTIA devient le cockpit de suivi commercial du cabinet. Il peut compléter votre outil métier ou devenir le centre de pilotage clients, contrats, relances et portefeuille.'],
  ['ARK agit-il automatiquement à ma place ?', 'ARK prépare, priorise et suit. Le courtier garde la décision, la validation et la relation client.'],
  ['Pourquoi choisir Pro plutôt que Starter ?', 'Pro est l’offre qui prend en charge le quotidien du cabinet: gestion, appels, relances, dossiers, échéances, scoring, opportunités et rapports avancés.'],
  ['Mes données sont-elles protégées ?', 'COURTIA privilégie les accès protégés, la centralisation maîtrisée et une approche RGPD.'],
  ['Puis-je commencer seul ?', 'Oui. Starter structure un usage solo. Pro est recommandé dès que vous voulez récupérer du temps et piloter le portefeuille plus offensivement.'],
  ['COURTIA convient-il à une équipe ?', 'Oui. Premium est prévu pour les cabinets structurés et les besoins avancés.'],
  ['Puis-je importer mes clients ?', 'Oui, l’import fait partie du périmètre produit. Les modalités dépendent du format et de l’organisation actuelle.'],
  ['La carte bancaire est-elle débitée au départ ?', '0 € est facturé aujourd’hui. Sans annulation avant la fin de l’essai de 7 jours, l’abonnement démarre automatiquement. Annulation en ligne via le portail sécurisé.'],
]

const languageOptions = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'it', label: 'IT', name: 'Italiano' },
]

const landingCopy = {
  fr: {
    navItems,
    credibility,
    problems,
    arkSignals,
    workflow,
    features,
    solutionTakeover,
    pricing,
    reassurance,
    faq,
    login: 'Se connecter',
    trial: 'Essai Pro 7 jours',
    languageLabel: 'Langue',
    heroKicker: 'COURTIA · gestion courtier pilotée par IA',
    heroTitle: 'COURTIA s’occupe de tout. Le courtier développe son portefeuille.',
    heroBody: 'Plus besoin de porter la gestion, les relances, les appels, les dossiers et les échéances à la main. COURTIA et ARK prennent en charge le quotidien opérationnel du cabinet. Vous gardez uniquement ce qui crée de la valeur: la relation client, le closing et le développement du portefeuille.',
    heroPrimary: 'Laisser COURTIA gérer',
    heroSecondary: 'Voir comment ARK travaille',
    conversion: ['0 € aujourd’hui', '7 jours d’essai', 'COURTIA s’occupe de tout'],
    chips: ['Plus de gestion manuelle', 'Plus de relances à suivre', 'Plus de dossiers à courir', 'Appels préparés'],
    heroStats: [['Tout', 'est géré'], ['3', 'appels préparés'], ['2', 'relances gérées']],
    problemKicker: 'Acte 2 · réalité du cabinet',
    problemTitle: 'Le problème n’est pas le manque d’activité. C’est tout le suivi qui empêche de vendre.',
    problemBody: 'Chaque appel reporté, chaque relance oubliée, chaque dossier incomplet et chaque contrat mal suivi attaque directement le chiffre. COURTIA transforme ce bruit quotidien en actions commerciales prêtes à traiter.',
    arkKicker: 'ARK, assistant métier',
    arkTitle: 'COURTIA s’occupe de tout: gestion, relances, appels, dossiers et échéances.',
    arkTiles: ['Tout est géré', 'Appels préparés', 'Relances gérées', 'Dossiers traités'],
    solutionKicker: 'Solution COURTIA',
    solutionTitle: 'COURTIA s’occupe de tout: gestion, relances, appels, dossiers et échéances.',
    solutionBody: 'Le courtier n’a plus à courir derrière les emails, les rappels, les pièces manquantes, les relances et les contrats à surveiller. COURTIA organise, priorise et suit le quotidien du cabinet. Le courtier se concentre sur les rendez-vous, les clients et le développement du portefeuille.',
    promiseKicker: 'La promesse simple',
    promiseTitle: 'TOUT EST GÉRÉ.',
    promiseBody: 'Vous ne pilotez plus l’administratif. Vous pilotez le chiffre.',
    pricingKicker: 'Acte 3 · décision',
    pricingTitle: 'Le prix devient évident quand le cabinet récupère ses heures commerciales.',
    pricingBody: 'Starter remet de l’ordre. Pro fait gagner du temps. Premium déploie la méthode sur l’équipe. La carte bancaire est gérée uniquement via Stripe Checkout sécurisé.',
    taxNote: 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.',
    beforeAfter: [
      ['Avant COURTIA', 'Le courtier subit: emails, relances à la main, dossiers qui traînent, échéances vues trop tard.'],
      ['Après COURTIA', 'COURTIA s’occupe de tout: gestion, relances, appels, dossiers, échéances. Le courtier vend et fidélise.'],
    ],
    finalTitle: 'Plus de gestion à subir. Plus de relances à porter. Plus de dossiers à courir.',
    finalBody: 'COURTIA et ARK gèrent le quotidien opérationnel: suivi client, relances, appels, échéances, pièces manquantes et traitement des dossiers. Résultat: le cabinet tourne, les opportunités remontent, et le courtier peut enfin se concentrer sur le développement de son portefeuille.',
    closingTitle: 'COURTIA gère le quotidien. Vous reprenez le commercial.',
    closingBody: 'Gestion, relances, appels, dossiers, échéances: COURTIA s’occupe de tout ce qui ralentit le cabinet. Vous gardez la relation client, la décision et le développement du portefeuille.',
    closingPrimary: 'Lancer mon essai Pro',
    closingSecondary: 'Se connecter',
    footerPricing: 'Tarifs',
    footerLogin: 'Connexion',
    footerContact: 'Contact',
    featuredBadge: 'Le choix sérieux',
    orbitLabels: ['Appels prêts', 'Échéances suivies', 'Rebond détecté'],
    cockpit: {
      title: 'Cockpit de suivi COURTIA',
      subtitle: 'Priorités commerciales du jour',
      status: 'ARK au travail',
      plan: 'Plan d’attaque ARK',
      prepared: 'du suivi quotidien préparé',
      actions: ['Appel renouvellement prioritaire', 'Relance prospect chaud prête', 'Dossier incomplet suivi'],
      stats: [['3', 'Appels à forte valeur'], ['2', 'Relances prêtes'], ['1', 'Rebond détecté']],
    },
  },
  en: {
    navItems: [['story', 'Vision'], ['ark', 'ARK'], ['cockpit', 'Cockpit'], ['pricing', 'Pricing']],
    credibility: [
      { icon: Brain, label: 'COURTIA handles the daily work' },
      { icon: Bell, label: 'No more follow-ups to chase' },
      { icon: CalendarClock, label: 'No missed renewals' },
      { icon: FileCheck2, label: 'No more scattered files' },
      { icon: Radar, label: 'Brokers grow the book' },
    ],
    problems: [
      ['Administration eats the day', 'Data entry, checks, missing documents and reminders pull brokers away from selling.', Clock3],
      ['Contracts are reviewed too late', 'Renewals, endorsements, deadlines and churn risks surface when the client is already hard to recover.', CalendarClock],
      ['Files are scattered everywhere', 'One detail in an email, one document in a folder, one note in a spreadsheet: every action becomes context hunting.', Database],
      ['Follow-ups fall through', 'A warm prospect, a quiet client or a cross-sell opportunity disappears at exactly the wrong moment.', Bell],
      ['No clear portfolio priority', 'The agency knows there is potential, but not always who to call now to create revenue.', Gauge],
    ],
    arkSignals: [
      'Priority call: at-risk client, talking points ready.',
      'D-18 follow-up prepared: message, context and next step.',
      'Incomplete file: missing document identified and tracked.',
      'Cross-sell opportunity detected: proposal angle ready.',
      'Silent client: follow-up to handle today.',
      'Sensitive contract: recommended action before revenue loss.',
    ],
    workflow: [
      ['08:30', 'Attack plan', 'ARK ranks the actions that protect or grow revenue.'],
      ['09:00', 'Calls of the day', 'You know who to call, why, and with which commercial angle.'],
      ['11:00', 'Follow-ups managed', 'Messages, reminders and next steps are framed.'],
      ['14:00', 'Files processed', 'Documents, statuses and reminders no longer sleep in inboxes.'],
      ['17:00', 'Portfolio', 'COURTIA manages follow-up, the broker returns to growth.'],
    ],
    features: [
      ['Client CRM', 'Every client keeps history, contracts, notes and the next action.', Users],
      ['Contracts', 'Deadlines, premiums, statuses and churn risks surface before it is too late.', FileText],
      ['Tasks', 'The agency sees what must be handled now, not in three weeks.', Check],
      ['Morning brief', 'ARK delivers the day plan: calls, follow-ups, files and opportunities.', Brain],
      ['Portfolio scoring', 'An immediate view of clients to protect and accounts to grow.', Gauge],
      ['ARK Reach', 'Follow-ups and prospecting prepared to turn operations into revenue.', MessageSquare],
      ['Client documents', 'Expected documents and incomplete files stay tracked until resolved.', FileCheck2],
      ['Reports', 'Activity, opportunities, deadlines and retention visible without rebuilding spreadsheets.', BarChart3],
      ['Admin Center', 'Owner-grade SaaS control for users, support and system settings.', ShieldCheck],
      ['Smart follow-ups', 'Every follow-up keeps context, timing and commercial intent.', Bell],
    ],
    solutionTakeover: [
      ['Management', 'clients, contracts, tasks and priorities'],
      ['Follow-ups', 'messages, reminders and next steps'],
      ['Calls', 'who to call, why, and with what angle'],
      ['Files', 'missing documents, statuses and tracking'],
      ['Renewals', 'contracts to watch before it is too late'],
    ],
    pricing: [
      { ...pricing[0], label: 'To regain control', headline: 'Move away from spreadsheets, sticky notes and follow-ups kept in your head.', note: '0 today, then EUR 89 excl. tax / month after day 7.', cta: 'Structure my agency', items: ['Clients and contracts centralized', 'Follow-ups and tasks visible', 'Renewals under control', 'Essential dashboard', '7-day free trial'] },
      { ...pricing[1], label: 'The real commercial lever', headline: 'Stop carrying management, follow-ups and files manually.', note: '0 today, then EUR 159 excl. tax / month after day 7. One saved renewal can already pay for the month.', cta: 'Win time now', items: ['Daily management handled', 'ARK brief every morning', 'Calls and follow-ups prioritized', 'Incomplete files tracked', 'Cross-sell opportunities', 'Advanced commercial reports'] },
      { ...pricing[2], label: 'Agencies ready to scale', headline: 'Industrialize commercial follow-up across the team.', note: 'Onboarding, deployment, multi-user organization and advanced workflows are scoped with the agency.', cta: 'Build my rollout', items: ['Everything in Pro', 'Multi-user setup', 'Deployment method', 'Team follow-up', 'Priority support'] },
    ],
    reassurance: [
      ['Built for brokers', 'Clients, contracts, renewals, follow-ups and opportunities speak the language of the agency.', Building2],
      ['Centralized follow-up', 'Calls, files, tasks and documents stay in the same cockpit.', Database],
      ['Broker stays in control', 'ARK prepares and prioritizes. The agency owns the client relationship.', Lock],
      ['Clear trial', '7 days, 0 today, online cancellation.', Check],
      ['Not a generic CRM', 'COURTIA sells recovered time, follow-up discipline and commercial potential.', Radar],
      ['Guided adoption', 'A business tool must be simple to understand and simple to adopt.', Mail],
    ],
    faq: [
      ['Does COURTIA replace my current software?', 'COURTIA becomes the commercial follow-up cockpit. It can complement your business system or become the control center for clients, contracts, follow-ups and portfolio work.'],
      ['Does ARK act automatically for me?', 'ARK prepares, prioritizes and tracks. The broker keeps the decision, validation and client relationship.'],
      ['Why choose Pro rather than Starter?', 'Pro handles the daily rhythm: management, calls, follow-ups, files, renewals, scoring, opportunities and advanced reports.'],
      ['Is my data protected?', 'COURTIA favors protected access, controlled centralization and a privacy-first approach.'],
      ['Can I start alone?', 'Yes. Starter structures solo usage. Pro is recommended when you want to recover time and manage the portfolio more aggressively.'],
      ['Does COURTIA work for a team?', 'Yes. Premium is designed for structured agencies and advanced needs.'],
      ['Can I import my clients?', 'Yes, import is part of the product scope. Details depend on your current format and organization.'],
      ['Is my card charged at the start?', '0 is charged today. If you do not cancel before the 7-day trial ends, the subscription starts automatically. Cancellation is handled online through the secure portal.'],
    ],
    login: 'Log in',
    trial: '7-day Pro trial',
    languageLabel: 'Language',
    heroKicker: 'COURTIA · AI-powered broker operations',
    heroTitle: 'COURTIA handles the work. Brokers grow the portfolio.',
    heroBody: 'No more carrying management, follow-ups, calls, files and deadlines by hand. COURTIA and ARK run the agency’s daily operations. You keep only what creates value: client relationships, closing and portfolio growth.',
    heroPrimary: 'Let COURTIA manage it',
    heroSecondary: 'See how ARK works',
    conversion: ['0 today', '7-day trial', 'COURTIA handles the work'],
    chips: ['No manual management', 'No follow-ups to chase', 'No files to run after', 'Calls prepared'],
    heroStats: [['All', 'handled'], ['3', 'calls prepared'], ['2', 'follow-ups managed']],
    problemKicker: 'Act 2 · agency reality',
    problemTitle: 'The problem is not lack of activity. It is the follow-up that prevents selling.',
    problemBody: 'Every postponed call, forgotten follow-up, incomplete file and badly tracked contract directly attacks revenue. COURTIA turns that daily noise into ready-to-handle commercial actions.',
    arkKicker: 'ARK, business assistant',
    arkTitle: 'COURTIA handles management, follow-ups, calls, files and renewals.',
    arkTiles: ['Everything handled', 'Calls prepared', 'Follow-ups managed', 'Files processed'],
    solutionKicker: 'COURTIA solution',
    solutionTitle: 'COURTIA handles management, follow-ups, calls, files and renewals.',
    solutionBody: 'Brokers no longer run behind emails, reminders, missing documents, follow-ups and contracts to watch. COURTIA organizes, prioritizes and tracks the agency’s daily work. The broker focuses on meetings, clients and portfolio growth.',
    promiseKicker: 'The simple promise',
    promiseTitle: 'EVERYTHING IS HANDLED.',
    promiseBody: 'You stop managing administration. You manage revenue.',
    pricingKicker: 'Act 3 · decision',
    pricingTitle: 'Pricing becomes obvious when the agency recovers commercial hours.',
    pricingBody: 'Starter brings order. Pro saves time. Premium rolls the method out to the team. Cards are handled only through secure Stripe Checkout.',
    taxNote: 'Prices shown excluding tax. Local tax may apply.',
    beforeAfter: [
      ['Before COURTIA', 'The broker suffers: emails, manual follow-ups, files dragging, deadlines seen too late.'],
      ['After COURTIA', 'COURTIA handles management, follow-ups, calls, files and renewals. The broker sells and retains.'],
    ],
    finalTitle: 'No more management to endure. No more follow-ups to carry. No more files to chase.',
    finalBody: 'COURTIA and ARK manage daily operations: client tracking, follow-ups, calls, renewals, missing documents and file processing. The agency runs, opportunities surface, and the broker can finally focus on growing the portfolio.',
    closingTitle: 'COURTIA runs the daily work. You take back the commercial work.',
    closingBody: 'Management, follow-ups, calls, files, renewals: COURTIA handles everything that slows the agency down. You keep client relationships, decisions and portfolio growth.',
    closingPrimary: 'Start my Pro trial',
    closingSecondary: 'Log in',
    footerPricing: 'Pricing',
    footerLogin: 'Login',
    footerContact: 'Contact',
    featuredBadge: 'Serious choice',
    orbitLabels: ['Calls ready', 'Renewals tracked', 'Opportunity detected'],
    cockpit: {
      title: 'COURTIA follow-up cockpit',
      subtitle: 'Commercial priorities of the day',
      status: 'ARK at work',
      plan: 'ARK attack plan',
      prepared: 'of daily follow-up prepared',
      actions: ['Priority renewal call', 'Warm prospect follow-up ready', 'Incomplete file tracked'],
      stats: [['3', 'High-value calls'], ['2', 'Follow-ups ready'], ['1', 'Opportunity detected']],
    },
  },
}

landingCopy.de = {
  ...landingCopy.en,
  login: 'Einloggen',
  trial: '7 Tage Pro testen',
  languageLabel: 'Sprache',
  heroKicker: 'COURTIA · KI-gestützte Maklerorganisation',
  heroTitle: 'COURTIA übernimmt den Alltag. Makler bauen ihr Portfolio aus.',
  heroBody: 'Verwaltung, Nachfassaktionen, Anrufe, Dossiers und Fristen müssen nicht mehr manuell getragen werden. COURTIA und ARK übernehmen den operativen Alltag der Agentur. Sie behalten das, was Wert schafft: Kundenbeziehung, Abschluss und Wachstum.',
  heroPrimary: 'COURTIA übernehmen lassen',
  heroSecondary: 'Sehen, wie ARK arbeitet',
  conversion: ['0 heute', '7 Tage Test', 'COURTIA übernimmt den Alltag'],
  chips: ['Keine manuelle Verwaltung', 'Keine Nachfassaktionen verlieren', 'Keine Dossiers jagen', 'Anrufe vorbereitet'],
  heroStats: [['Alles', 'verwaltet'], ['3', 'Anrufe vorbereitet'], ['2', 'Nachfassaktionen erledigt']],
  pricingTitle: 'Der Preis wird klar, wenn die Agentur Verkaufszeit zurückgewinnt.',
  taxNote: 'Preise ohne Steuern. Lokale Steuer kann gelten.',
  closingTitle: 'COURTIA führt den Alltag. Sie übernehmen wieder den Vertrieb.',
  closingPrimary: 'Pro-Test starten',
  closingSecondary: 'Einloggen',
  footerPricing: 'Preise',
  footerLogin: 'Login',
  featuredBadge: 'Seriöse Wahl',
  orbitLabels: ['Anrufe bereit', 'Fristen verfolgt', 'Chance erkannt'],
  cockpit: {
    title: 'COURTIA Follow-up Cockpit',
    subtitle: 'Kommerzielle Prioritäten des Tages',
    status: 'ARK arbeitet',
    plan: 'ARK Angriffsplan',
    prepared: 'des täglichen Follow-ups vorbereitet',
    actions: ['Prioritärer Verlängerungsanruf', 'Warmer Prospect-Follow-up bereit', 'Unvollständiges Dossier verfolgt'],
    stats: [['3', 'Wertvolle Anrufe'], ['2', 'Follow-ups bereit'], ['1', 'Chance erkannt']],
  },
}

landingCopy.it = {
  ...landingCopy.en,
  login: 'Accedi',
  trial: 'Prova Pro 7 giorni',
  languageLabel: 'Lingua',
  heroKicker: 'COURTIA · operazioni broker con IA',
  heroTitle: 'COURTIA gestisce il quotidiano. Il broker sviluppa il portafoglio.',
  heroBody: 'Gestione, follow-up, chiamate, pratiche e scadenze non devono più essere portati a mano. COURTIA e ARK prendono in carico l’operatività quotidiana dello studio. A voi resta ciò che crea valore: relazione cliente, closing e crescita del portafoglio.',
  heroPrimary: 'Lasciare gestire a COURTIA',
  heroSecondary: 'Vedere come lavora ARK',
  conversion: ['0 oggi', '7 giorni di prova', 'COURTIA gestisce il quotidiano'],
  chips: ['Niente gestione manuale', 'Niente follow-up dispersi', 'Niente pratiche da rincorrere', 'Chiamate preparate'],
  heroStats: [['Tutto', 'gestito'], ['3', 'chiamate preparate'], ['2', 'follow-up gestiti']],
  pricingTitle: 'Il prezzo diventa evidente quando lo studio recupera ore commerciali.',
  taxNote: 'Prezzi al netto delle imposte. Possono applicarsi imposte locali.',
  closingTitle: 'COURTIA gestisce il quotidiano. Voi riprendete il commerciale.',
  closingPrimary: 'Avviare la prova Pro',
  closingSecondary: 'Accedi',
  footerPricing: 'Prezzi',
  footerLogin: 'Login',
  featuredBadge: 'Scelta solida',
  orbitLabels: ['Chiamate pronte', 'Scadenze seguite', 'Opportunità rilevata'],
  cockpit: {
    title: 'Cockpit follow-up COURTIA',
    subtitle: 'Priorità commerciali del giorno',
    status: 'ARK al lavoro',
    plan: 'Piano d’attacco ARK',
    prepared: 'del follow-up quotidiano preparato',
    actions: ['Chiamata rinnovo prioritaria', 'Follow-up prospect caldo pronto', 'Pratica incompleta seguita'],
    stats: [['3', 'Chiamate ad alto valore'], ['2', 'Follow-up pronti'], ['1', 'Opportunità rilevata']],
  },
}

function detectLandingLocale() {
  if (typeof window === 'undefined') return 'fr'
  const stored = window.localStorage.getItem('courtia_locale')
  if (stored && landingCopy[stored]) return stored

  const language = (navigator.languages?.[0] || navigator.language || '').toLowerCase()
  if (language.startsWith('fr')) return 'fr'
  if (language.startsWith('de')) return 'de'
  if (language.startsWith('it')) return 'it'
  if (language.startsWith('en')) return 'en'

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  if (timeZone.includes('Zurich')) return 'de'
  if (timeZone.includes('Paris')) return 'fr'
  if (timeZone.includes('London') || timeZone.startsWith('America/')) return 'en'
  return 'fr'
}

function detectLandingMarket() {
  if (typeof window === 'undefined') return resolveMarketContext()
  return resolveMarketContext({
    geoCountry: getDetectedGeoCountry(),
    storedOverride: readStoredMarketOverride(),
    queryMarket: parseMarketFromSearch(window.location.search),
  })
}

function LanguageSwitcher({ locale, onChange, label, mobile = false }) {
  return (
    <div className={mobile ? 'grid grid-cols-4 gap-2 px-3 py-2' : 'flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.045] p-1'}>
      <span className={mobile ? 'col-span-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/40' : 'sr-only'}>
        <Globe size={14} />
        {label}
      </span>
      {languageOptions.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => onChange(option.code)}
          className={`${mobile ? 'h-10 rounded-xl border text-sm' : 'h-8 rounded-lg px-2.5 text-xs'} font-black transition ${
            locale === option.code
              ? 'border-cyan-200/40 bg-cyan-200/15 text-cyan-50'
              : 'border-white/[0.08] text-white/52 hover:bg-white/[0.06] hover:text-white'
          }`}
          aria-label={`${label}: ${option.name}`}
          aria-pressed={locale === option.code}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function MarketSwitcher({ market, onChange, mobile = false }) {
  return (
    <div className={mobile ? 'grid grid-cols-2 gap-2 px-3 py-2' : 'flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.045] p-1'}>
      {MARKET_OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => onChange(option.code)}
          className={`${mobile ? 'h-10 rounded-xl border text-sm' : 'h-8 rounded-lg px-2.5 text-xs'} font-black transition ${
            market === option.code
              ? 'border-fuchsia-200/40 bg-fuchsia-200/15 text-fuchsia-50'
              : 'border-white/[0.08] text-white/52 hover:bg-white/[0.06] hover:text-white'
          }`}
          aria-label={`Marché: ${option.label}`}
          aria-pressed={market === option.code}
        >
          {option.flag} {mobile ? option.label : option.shortLabel}
        </button>
      ))}
    </div>
  )
}

const swissPricing = [
  {
    name: 'Indépendant',
    price: '199 CHF',
    period: '/ mois',
    label: 'Courtier suisse solo',
    headline: 'CHF, LSA, nLPD et vocabulaire suisse romand dès le premier écran.',
    note: '490 CHF de frais d’inscription one-shot : onboarding, migration, paramétrage LSA et formation. TVA 8,1 % en sus.',
    href: '/onboarding?plan=starter&market=CH',
    cta: 'Réserver une démo',
    featured: false,
    items: ['Conformité LSA de base', 'Langues FR-CH / DE-CH / IT-CH', 'Caisse-maladie, LAA, LCA/LAMal', 'Document précontractuel préparé', 'Setup 490 CHF'],
  },
  {
    name: 'Cabinet',
    price: '349 CHF',
    period: '/ mois',
    label: '3 accès inclus',
    headline: 'Le cockpit complet pour cabinet suisse avec traçabilité du conseil.',
    note: '990 CHF de setup one-shot. Utilisateur supplémentaire : +49 CHF / mois. TVA 8,1 % en sus.',
    href: '/onboarding?plan=pro&market=CH',
    cta: 'Réserver une démo',
    featured: true,
    items: ['3 accès inclus', 'Journal de conseil LSA', 'Informations rémunération et données', 'Export preuve de conseil', 'ARK portefeuille CH'],
  },
  {
    name: 'Sur-Mesure / Fiduciaire',
    price: 'Sur devis',
    period: '',
    label: 'Verticale suisse',
    headline: 'Assurance, fiduciaire, TVA suisse, échéances cantonales et GED hashée.',
    note: "Dès 1'500 CHF de setup. Déploiement, flux de données et sécurité nLPD cadrés au cas par cas.",
    externalHref: 'mailto:contact@courtia.fr?subject=Courtiark%20Suisse%20Fiduciaire',
    cta: 'Parler du déploiement',
    featured: false,
    items: ['Module Fiduciaire', 'Mandats et échéanciers cantonaux', 'TVA suisse 8,1 / 2,6 / 3,8 %', 'GED versionnée + hash', 'Plan hébergement CH'],
  },
]

function applyMarketCopy(baseCopy, market, locale) {
  if (market !== 'CH') return baseCopy
  const languageLabel = locale === 'de' ? 'Sprache' : locale === 'it' ? 'Lingua' : 'Langue'
  return {
    ...baseCopy,
    navItems: [['story', 'Suisse'], ['ark', 'ARK'], ['cockpit', 'Cockpit'], ['pricing', 'Tarifs CHF']],
    heroKicker: 'Courtiark Suisse · CHF · LSA · nLPD',
    heroTitle: 'Le cockpit Aurora pour courtiers et fiduciaires suisses.',
    heroBody: 'Courtiark bascule en produit suisse complet : tarifs CHF, devoir d’information LSA, vocabulaire suisse romand, langues FR-CH/DE-CH/IT-CH, frais d’inscription et trajectoire Fiduciaire.',
    heroPrimary: 'Réserver une démo Suisse',
    heroPrimaryHref: '/demo?market=CH',
    heroSecondary: 'Voir les tarifs CHF',
    trial: 'Démo Suisse',
    trialHref: '/demo?market=CH',
    languageLabel,
    conversion: ['CHF dès l’arrivée', 'LSA / FINMA cadré', 'nLPD traitée honnêtement'],
    chips: ['Caisse-maladie', 'Prévoyance / 2e pilier', 'LAA / LCA / LAMal', 'Fiduciaire'],
    pricing: swissPricing,
    pricingKicker: 'Marché Suisse · activation',
    pricingTitle: 'Tarifs CHF avec frais d’inscription assumés.',
    pricingBody: 'Le setup finance l’onboarding, la migration des données, le paramétrage conformité LSA et la formation. Le produit France reste disponible en EUR via le sélecteur de marché.',
    taxNote: 'Prix HT. TVA suisse 8,1 % en sus. Données en Suisse et flux LLM : à promettre uniquement selon l’architecture réellement déployée.',
    features: [
      ['LSA', 'Devoir d’information et documentation du conseil, pas de faux “formulaire d’État”.', ShieldCheck],
      ['FINMA', 'N° registre pour intermédiaires non liés, statut lié/non lié et traçabilité.', FileCheck2],
      ['nLPD', 'Registre de traitement, conservation, droits d’accès et flux sous-traitants documentés.', Lock],
      ['Fiduciaire', 'Mandats, TVA, salaires/AVS, fiscalité cantonale et GED hashée.', Building2],
      ['Langues CH', 'FR-CH, DE-CH et IT-CH prêts pour l’expérience suisse.', Globe],
    ],
    footerPricing: 'Tarifs CHF',
    footerContact: 'Contact Suisse',
  }
}

function GeoMarketBanner({ context, onSwitch }) {
  if (context.geoCountry !== 'CH' || context.market === 'CH') return null
  return (
    <div className="fixed inset-x-0 top-16 z-40 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-b-2xl border-x border-b border-cyan-200/16 bg-[#02040c]/92 px-4 py-3 text-xs font-bold text-cyan-50/78 shadow-xl shadow-black/20 backdrop-blur-2xl">
      <span>Vous semblez être en Suisse — voir le produit suisse en CHF.</span>
      <button type="button" onClick={() => onSwitch('CH')} className="rounded-xl bg-white px-3 py-2 text-slate-950">
        Passer CH
      </button>
    </div>
  )
}

function SectionIntro({ label, title, children, align = 'center' }) {
  return (
    <div className={`mx-auto mb-10 max-w-3xl ${align === 'left' ? 'text-left' : 'text-center'}`}>
      <p className="mb-4 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/72 backdrop-blur-xl">
        {label}
      </p>
      <h2 className="aurora-text text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-white/58">{children}</p>}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`glass-panel premium-card overflow-hidden rounded-2xl ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function HeroLogoSystem({ labels = landingCopy.fr.orbitLabels }) {
  const orbitItems = [
    [labels[0], 'top-[18%] right-[2%]', Bell],
    [labels[1], 'left-[-2%] top-[52%]', CalendarClock],
    [labels[2], 'right-[8%] bottom-[13%]', Sparkles],
  ]

  return (
    <div className="hero-logo-orbit pointer-events-none relative mx-auto h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] lg:h-[520px] lg:w-[520px]">
      <motion.div
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),transparent_64%)] blur-2xl"
        animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.55, 0.88, 0.55] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-[12%] rounded-full border border-white/[0.08]"
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-[22%] rounded-full border border-cyan-200/[0.10]"
        animate={{ rotate: -360 }}
        transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[16%] flex items-center justify-center">
        <CourtiaBubbleLogo size={310} animated showHalo showFoam />
      </div>
      {orbitItems.map(([label, position, Icon], index) => (
        <motion.div
          key={label}
          className={`absolute ${position} hidden items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.075] px-3 py-2 text-xs font-bold text-white/76 shadow-2xl backdrop-blur-xl sm:flex`}
          animate={{ y: [0, index % 2 ? 9 : -9, 0], rotate: [0, index % 2 ? -1 : 1, 0] }}
          transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={14} className="text-cyan-100" />
          {label}
        </motion.div>
      ))}
    </div>
  )
}

function CockpitMockup({ copy = landingCopy.fr.cockpit }) {
  const statIcons = [TrendingUp, CalendarClock, Sparkles]

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <CourtiaBubbleLogo size={34} animated={false} showHalo={false} showFoam={false} />
          <div>
            <p className="text-xs font-black text-white">{copy.title}</p>
            <p className="text-[11px] text-white/42">{copy.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
          {copy.status}
        </span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.045] p-4">
          <div className="flex items-center gap-2">
            <Brain size={17} className="text-violet-200" />
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/70">{copy.plan}</p>
          </div>
          <p className="mt-4 text-4xl font-black text-white">95%</p>
          <p className="mt-1 text-sm text-white/54">{copy.prepared}</p>
          <div className="mt-5 space-y-2">
            {copy.actions.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/18 px-3 py-2">
                <span className="text-sm text-white/68">{item}</span>
                <ArrowRight size={14} className="text-white/34" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {copy.stats.map(([value, label], index) => {
            const Icon = statIcons[index]
            return (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs text-white/48">{label}</p>
                </div>
                <Icon size={20} className="text-cyan-100/70" />
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function PricingCard({ plan, featuredBadge }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${plan.featured ? 'text-cyan-100' : 'text-white/38'}`}>{plan.label}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-1 text-xs font-black text-white shadow-lg shadow-cyan-500/20">
            {featuredBadge}
          </span>
        ) : (
          <CourtiaMiniLogo size={28} />
        )}
      </div>
      <div className={`mt-6 rounded-2xl border p-4 ${plan.featured ? 'border-cyan-200/20 bg-cyan-300/[0.075]' : 'border-white/[0.07] bg-black/18'}`}>
        <div className="flex items-end gap-2">
          <p className={`font-black tracking-tight ${plan.featured ? 'text-6xl' : 'text-5xl'} ${plan.price === 'Sur devis' ? 'text-3xl' : 'aurora-text'}`}>{plan.price}</p>
          {plan.period && <p className="pb-2 text-sm font-bold text-white/54">{plan.period}</p>}
        </div>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-white/66">{plan.headline}</p>
      </div>
      <p className="mt-4 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.07] p-3 text-xs font-semibold leading-relaxed text-emerald-50/74">
        {plan.note}
      </p>
      <ul className="mt-6 space-y-3">
        {plan.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-white/64">
            <Check size={15} className="mt-0.5 shrink-0 text-emerald-200" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <Card className={`flex h-full flex-col p-6 ${plan.featured ? 'border-cyan-200/24 bg-[linear-gradient(145deg,rgba(124,58,237,0.18),rgba(34,211,238,0.09),rgba(255,255,255,0.035))] shadow-cyan-500/10 lg:-translate-y-4' : ''}`}>
      <div className="flex flex-1 flex-col">
        {content}
        {plan.externalHref ? (
          <a href={plan.externalHref} className="mt-7 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.09]">
            {plan.cta}
          </a>
        ) : (
          <AuroraButton href={plan.href} variant={plan.featured ? 'primary' : 'secondary'} size="lg" className="mt-7 w-full">
            {plan.cta}
          </AuroraButton>
        )}
      </div>
    </Card>
  )
}

export default function LandingPublic() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [locale, setLocale] = useState(detectLandingLocale)
  const [marketContext, setMarketContext] = useState(detectLandingMarket)
  const { scrollYProgress } = useScroll()
  const railY = useTransform(scrollYProgress, [0, 1], ['-6%', '18%'])
  const heroLift = useTransform(scrollYProgress, [0, 0.35], [0, -36])
  const heroTiltX = useTransform(scrollYProgress, [0, 0.35], [0, -4])
  const heroTiltY = useTransform(scrollYProgress, [0, 0.35], [0, 3])
  const copy = applyMarketCopy(landingCopy[locale] || landingCopy.fr, marketContext.market, locale)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem('courtia_locale', locale)
    document.cookie = `courtia_locale=${locale};max-age=${365 * 24 * 3600};path=/;samesite=lax`
    document.cookie = `cta_locale=${locale};max-age=${365 * 24 * 3600};path=/;samesite=lax`
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.market = marketContext.market
  }, [marketContext.market])

  const changeLocale = (nextLocale) => {
    if (!landingCopy[nextLocale]) return
    setLocale(nextLocale)
  }

  const changeMarket = (nextMarket) => {
    const stored = persistMarketOverride(nextMarket)
    setMarketContext(resolveMarketContext({
      geoCountry: getDetectedGeoCountry(),
      storedOverride: stored,
    }))
    setMenuOpen(false)
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div className="courtia-landing min-h-screen overflow-x-hidden text-white">
      <style>{styles}</style>
      <div className="aurora-sky" aria-hidden="true" />
      <div className="aurora-floor" aria-hidden="true" />
      <div className="aurora-curtain" aria-hidden="true" />
      <div className="canonical-watermark" aria-hidden="true">
        <CourtiaBubbleLogo size="100%" animated={false} showHalo showFoam showSpecular />
      </div>
      <motion.div className="fixed left-0 top-0 z-[80] h-px w-full origin-left bg-gradient-to-r from-fuchsia-300/55 via-cyan-200/50 to-emerald-200/45 shadow-[0_0_12px_rgba(34,211,238,0.24)]" style={{ scaleX: scrollYProgress }} />

      <nav className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${scrolled ? 'border-b border-white/[0.06] bg-[#02040c]/86 shadow-xl shadow-black/20 backdrop-blur-2xl' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" aria-label="COURTIA" className="flex items-center gap-3">
            <CourtiaMiniLogo size={31} />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {copy.navItems.map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="text-sm font-medium text-white/54 transition hover:text-white">
                {label}
              </button>
            ))}
            <MarketSwitcher market={marketContext.market} onChange={changeMarket} />
            <LanguageSwitcher locale={locale} onChange={changeLocale} label={copy.languageLabel} />
            <Link to="/login" className="text-sm font-bold text-white/60 transition hover:text-white">{copy.login}</Link>
            <AuroraButton href={copy.trialHref || '/register?plan=pro'} size="sm">{copy.trial}</AuroraButton>
          </div>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-2 text-white/74 backdrop-blur-xl md:hidden" aria-label="Ouvrir le menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed inset-x-0 top-16 z-40 border-b border-white/[0.06] bg-[#02040c]/96 p-5 backdrop-blur-2xl md:hidden">
            <div className="space-y-2">
              {copy.navItems.map(([id, label]) => (
                <button key={id} type="button" onClick={() => scrollTo(id)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/[0.06]">
                  {label}
                </button>
              ))}
              <MarketSwitcher market={marketContext.market} onChange={changeMarket} mobile />
              <LanguageSwitcher locale={locale} onChange={changeLocale} label={copy.languageLabel} mobile />
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.06]">
                {copy.login}
              </Link>
              <AuroraButton href={copy.trialHref || '/register?plan=pro'} className="mt-3 w-full">{copy.trial}</AuroraButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GeoMarketBanner context={marketContext} onSwitch={changeMarket} />

      <main className="stream-shell">
        <motion.div className="soft-rail pointer-events-none absolute left-[67%] top-[98vh] z-0 hidden h-[165vh] w-[2px] -translate-x-1/2 xl:block" style={{ y: railY }} />

        <section id="story" className="landing-section landing-act pt-24 lg:pt-28">
          <div className="aurora-mesh absolute inset-0 opacity-95" />
          <div className="aurora-noise absolute inset-0 opacity-55" />
          <div className="act-shell grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="min-w-0">
              <p className="scene-kicker">{copy.heroKicker}</p>
              <h1 className="cinema-title mt-6 max-w-5xl break-words text-white">
                {copy.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/68">
                {copy.heroBody}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <AuroraButton href={copy.heroPrimaryHref || '/register?plan=pro'} size="lg" icon={<ArrowRight size={17} />} className="w-full sm:w-auto">
                  {copy.heroPrimary}
                </AuroraButton>
                <AuroraButton onClick={() => scrollTo('cockpit')} variant="secondary" size="lg" className="w-full sm:w-auto">
                  {copy.heroSecondary}
                </AuroraButton>
              </div>
              <div className="conversion-strip mt-5 grid max-w-2xl grid-cols-1 gap-2 rounded-2xl border border-white/[0.08] p-2 backdrop-blur-2xl sm:grid-cols-3">
                {copy.conversion.map((item) => (
                  <div key={item} className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3 text-center text-xs font-black text-white/76">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid max-w-2xl gap-2 sm:grid-cols-4">
                {copy.chips.map((item) => (
                  <span key={item} className="rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-center text-[11px] font-bold text-white/52 backdrop-blur-xl">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.12 }}
              style={{ y: heroLift, rotateX: heroTiltX, rotateY: heroTiltY }}
              className="liquid-stage parallax-stage depth-panel min-w-0 rounded-[2rem] p-4 sm:p-6"
            >
              <div className="relative z-10 min-h-[470px] overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-black/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.20),transparent_24rem)]" />
                <HeroLogoSystem labels={copy.orbitLabels} />
                <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                  {copy.heroStats.map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#030712]/70 p-3 text-center backdrop-blur-xl">
                      <p className="aurora-text text-2xl font-black">{value}</p>
                      <p className="mt-1 text-[11px] font-bold text-white/50">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative px-5 py-4">
          <div className="act-shell grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {copy.credibility.map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/[0.055] bg-white/[0.028] px-4 py-4 backdrop-blur-xl">
                <Icon size={18} className="mb-3 text-cyan-100/74" />
                <p className="text-sm font-bold text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="ark" className="landing-section landing-act">
          <div className="act-shell">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div>
                <p className="scene-kicker">{copy.problemKicker}</p>
                <h2 className="scene-title mt-5 text-white">{copy.problemTitle}</h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
                  {copy.problemBody}
                </p>
                <div className="mt-7 space-y-3">
                  {copy.problems.map(([title, desc, Icon]) => (
                    <div key={title} className="signal-lane rounded-2xl p-4">
                      <div className="relative z-10 flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100">
                          <Icon size={19} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">{title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-white/52">{desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                <div className="liquid-stage depth-panel rounded-[2rem] p-5">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3">
                      <CourtiaBubbleLogo size={56} animated={false} showHalo={false} showFoam={false} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100/70">{copy.arkKicker}</p>
                        <h3 className="mt-1 text-2xl font-black text-white">{copy.arkTitle}</h3>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {copy.arkSignals.map((signal) => (
                        <div key={signal} className="rounded-2xl border border-white/[0.07] bg-black/22 p-4">
                          <Brain size={18} className="mb-3 text-violet-100/72" />
                          <p className="text-sm font-semibold leading-relaxed text-white/72">“{signal}”</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {copy.arkTiles.map((item) => (
                        <div key={item} className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.055] px-4 py-4 text-center text-sm font-black text-cyan-50/78">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-5">
                  {copy.workflow.map(([time, title, desc]) => (
                    <div key={time} className="rounded-2xl border border-white/[0.06] bg-white/[0.032] p-4 backdrop-blur-xl">
                      <p className="text-sm font-black text-cyan-100">{time}</p>
                      <h3 className="mt-3 text-sm font-black text-white">{title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/46">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="cockpit" className="mt-12 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <p className="scene-kicker">{copy.solutionKicker}</p>
                <h2 className="scene-title mt-5 text-white">{copy.solutionTitle}</h2>
                <p className="mt-5 text-base leading-relaxed text-white/60">
                  {copy.solutionBody}
                </p>
                <div className="mt-7 overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,211,238,0.10),rgba(255,255,255,0.035))] p-5 shadow-2xl shadow-emerald-500/10">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/78">{copy.promiseKicker}</p>
                  <p className="mt-3 text-4xl font-black leading-none text-white sm:text-5xl">{copy.promiseTitle}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-white/68">
                    {copy.promiseBody}
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {copy.solutionTakeover.map(([title, desc]) => (
                      <div key={title} className="rounded-xl border border-white/[0.08] bg-black/22 p-3">
                        <div className="flex items-start gap-2">
                          <Check size={15} className="mt-0.5 shrink-0 text-emerald-200" />
                          <div>
                            <p className="text-sm font-black text-white">{title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/50">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <CockpitMockup copy={copy.cockpit} />
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section landing-act">
          <div className="act-shell">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
              <div>
                <p className="scene-kicker">{copy.pricingKicker}</p>
                <h2 className="scene-title mt-5 text-white">{copy.pricingTitle}</h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
                  {copy.pricingBody}
                </p>
                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/42">
                  {copy.taxNote}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {copy.beforeAfter.map(([title, desc]) => (
                  <div key={title} className="liquid-stage depth-panel rounded-3xl p-5">
                    <div className="relative z-10">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/44">{title}</p>
                      <p className="mt-4 text-sm font-semibold leading-relaxed text-white/66">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {copy.pricing.map((plan) => <PricingCard key={plan.name} plan={plan} featuredBadge={copy.featuredBadge} />)}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {copy.features.map(([title, desc, Icon]) => (
                <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.032] p-4 backdrop-blur-xl">
                  <Icon size={18} className="mb-4 text-cyan-100/70" />
                  <h3 className="text-sm font-black text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/48">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="liquid-stage depth-panel rounded-[2rem] p-6">
                <div className="relative z-10">
                  <CourtiaBubbleLogo size={96} animated showHalo showFoam={false} className="mb-2" />
                  <h2 className="aurora-text text-3xl font-black leading-tight sm:text-5xl">{copy.finalTitle}</h2>
                  <p className="mt-5 text-sm leading-relaxed text-white/58">
                    {copy.finalBody}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {copy.reassurance.slice(0, 4).map(([title, desc, Icon]) => (
                      <div key={title} className="rounded-2xl border border-white/[0.06] bg-black/18 p-4">
                        <Icon size={18} className="mb-3 text-cyan-100/70" />
                        <h3 className="text-sm font-black text-white">{title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-white/48">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {copy.faq.map(([question, answer]) => (
                  <details key={question} className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-white">
                      {question}
                      <ChevronDown size={18} className="shrink-0 text-white/40 transition group-open:rotate-180" />
                    </summary>
                    <p className="mt-4 text-sm leading-relaxed text-white/56">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-5 pb-12 pt-4 lg:pb-16">
          <div className="aurora-mesh absolute inset-0 opacity-80" />
          <div className="liquid-stage relative z-10 mx-auto max-w-6xl rounded-[2rem] px-6 py-10 text-center sm:px-10 lg:py-14">
            <div className="relative z-10">
            <CourtiaBubbleLogo size={130} animated showHalo showFoam={false} className="mx-auto mb-1" />
            <h2 className="aurora-text mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">{copy.closingTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/62">
              {copy.closingBody}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <AuroraButton href="/register?plan=pro" size="lg" icon={<ArrowRight size={17} />} className="w-full sm:w-auto">
                {copy.closingPrimary}
              </AuroraButton>
              <AuroraButton href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                {copy.closingSecondary}
              </AuroraButton>
            </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#02040c] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <CourtiaMiniLogo size={34} />
            <p className="text-xs text-white/45">
              {copy.taxNote}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => scrollTo('pricing')} className="hover:text-white">{copy.footerPricing}</button>
            <Link to="/login" className="hover:text-white">{copy.footerLogin}</Link>
            <a href="mailto:contact@courtia.fr" className="hover:text-white">{copy.footerContact}</a>
          </div>
          <MarketSwitcher market={marketContext.market} onChange={changeMarket} />
          <RhasrhassSignature compact />
        </div>
      </footer>
    </div>
  )
}
