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
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import AuroraButton from '../components/brand/AuroraButton'

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
  { icon: Building2, label: 'CRM métier courtage' },
  { icon: Brain, label: 'ARK IA native' },
  { icon: Bell, label: 'Relances centralisées' },
  { icon: CalendarClock, label: 'Échéances surveillées' },
  { icon: Radar, label: 'Portefeuille vivant' },
]

const problems = [
  ['Relances oubliées', 'Un prospect chaud sort du radar parce que la relance dépend encore de la mémoire.', Bell],
  ['Échéances non anticipées', 'Les renouvellements importants sont vus trop tard, souvent dans l’urgence.', CalendarClock],
  ['Dossiers incomplets', 'Une pièce manque, le dossier traîne, le contexte se disperse.', FileCheck2],
  ['Contrats dispersés', 'Les données vivent entre emails, tableurs, fichiers et notes isolées.', Database],
  ['Rebonds perdus', 'La famille ou l’entreprise reste mono-équipée faute de signal commercial clair.', Target],
  ['Pilotage fragile', 'Le dirigeant ne voit pas assez vite ce qui mérite l’attention du cabinet.', Gauge],
]

const arkSignals = [
  'Ce client arrive à échéance dans 18 jours.',
  'Ce prospect chaud n’a pas été relancé.',
  'Ce dossier manque une pièce.',
  'Cette famille peut être multi-équipée.',
  'Ce client silencieux mérite une relance.',
  'Ce contrat peut générer une opportunité de rebond.',
]

const workflow = [
  ['08h30', 'Brief ARK', 'Les priorités remontent avant l’ouverture de la journée.'],
  ['09h00', 'Relances', 'Les prospects chauds et clients silencieux sont traités en premier.'],
  ['11h00', 'Dossiers', 'Les pièces manquantes et tâches administratives sont regroupées.'],
  ['14h00', 'Rebonds', 'ARK signale les opportunités multi-équipement.'],
  ['17h00', 'Suivi', 'Le portefeuille garde une vision claire des actions restantes.'],
]

const features = [
  ['CRM clients', 'Fiches clients, historique, notes, statut et prochaines actions.', Users],
  ['Contrats', 'Type, compagnie, prime, échéance, statut et alerte de renouvellement.', FileText],
  ['Tâches', 'Retard, aujourd’hui, à venir, terminées, priorité et client lié.', Check],
  ['Brief du matin', 'ARK synthétise les signaux métiers avant le début de journée.', Brain],
  ['Scoring portefeuille', 'Lecture rapide de la santé commerciale et des zones à risque.', Gauge],
  ['ARK Reach', 'Relances et prospection préparées, avec validation humaine.', MessageSquare],
  ['Documents clients', 'Suivi des pièces attendues et dossiers incomplets.', FileCheck2],
  ['Rapports', 'Portefeuille, activité, opportunités, échéances et rétention.', BarChart3],
  ['Admin Center', 'Pilotage SaaS propriétaire pour utilisateurs, support et système.', ShieldCheck],
  ['Relances intelligentes', 'Les actions sont visibles, priorisées et reliées au contexte.', Bell],
]

const pricing = [
  {
    name: 'Starter',
    price: '89 €',
    period: '/ mois',
    label: 'Entrée structurée',
    headline: 'Pour arrêter le bricolage sans lancer un gros chantier.',
    note: '0 € aujourd’hui, puis 89 € / mois après le 7e jour.',
    href: '/register?plan=starter',
    cta: 'Activer mon essai Starter',
    featured: false,
    items: ['CRM clients et contrats', 'Tâches et relances manuelles', 'Tableau de bord essentiel', 'Essai gratuit 7 jours', 'Support email'],
  },
  {
    name: 'Pro',
    price: '159 €',
    period: '/ mois',
    label: 'Recommandé',
    headline: 'L’offre logique pour piloter un portefeuille sérieusement.',
    note: '0 € aujourd’hui, puis 159 € / mois après le 7e jour. Annulation possible en ligne avant la fin de l’essai.',
    href: '/register?plan=pro',
    cta: 'Activer mon essai Pro',
    featured: true,
    items: ['Cockpit portefeuille complet', 'Brief du matin ARK', 'Relances et priorités intelligentes', 'Scoring portefeuille', 'ARK Reach et opportunités', 'Rapports avancés'],
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    period: '',
    label: 'Cabinets équipes',
    headline: 'Pour structurer une équipe, un cabinet ou un déploiement avancé.',
    note: 'Accompagnement, besoins avancés et organisation multi-utilisateurs étudiés avec le cabinet.',
    externalHref: 'mailto:contact@courtia.fr?subject=COURTIA%20Premium',
    cta: 'Parler à COURTIA',
    featured: false,
    items: ['Tout Pro', 'Multi-utilisateurs', 'Accompagnement de déploiement', 'Besoins avancés', 'Support prioritaire'],
  },
]

const reassurance = [
  ['Courtier français', 'Le vocabulaire, les écrans et les signaux parlent courtage.', Building2],
  ['Données centralisées', 'Clients, contrats, tâches et documents dans un même cockpit.', Database],
  ['Approche RGPD', 'Accès protégés, transparence et logique de contrôle.', Lock],
  ['Essai clair', '7 jours, 0 € aujourd’hui, annulation en ligne.', Check],
  ['Pas CRM générique', 'COURTIA est vertical : portefeuille, échéances, relances, rebonds.', Radar],
  ['Support', 'Un SaaS métier doit rester compréhensible et accompagné.', Mail],
]

const faq = [
  ['COURTIA remplace-t-il mon logiciel actuel ?', 'COURTIA est un cockpit de pilotage et de suivi commercial. Il peut compléter votre outil métier ou devenir votre centre de suivi portefeuille.'],
  ['ARK agit-il automatiquement à ma place ?', 'Non. ARK signale, synthétise et prépare. Le courtier garde la décision et la relation client.'],
  ['Pourquoi choisir Pro plutôt que Starter ?', 'Pro concentre la valeur : brief ARK, scoring, relances intelligentes, opportunités et rapports avancés.'],
  ['Mes données sont-elles protégées ?', 'COURTIA privilégie les accès protégés, la centralisation maîtrisée et une approche RGPD.'],
  ['Puis-je commencer seul ?', 'Oui. Starter structure un usage solo. Pro est recommandé pour exploiter ARK et piloter plus finement.'],
  ['COURTIA convient-il à une équipe ?', 'Oui. Premium est prévu pour les cabinets structurés et les besoins avancés.'],
  ['Puis-je importer mes clients ?', 'L’import fait partie du périmètre produit. Les modalités dépendent du format et de l’organisation actuelle.'],
  ['La carte bancaire est-elle débitée au départ ?', 'La stratégie cible est claire : 0 € aujourd’hui, essai 7 jours, puis facturation si l’essai n’est pas annulé. Stripe reste une phase dédiée.'],
]

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

function HeroLogoSystem() {
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
      {[
        ['3 relances', 'top-[18%] right-[2%]', Bell],
        ['2 échéances', 'left-[-2%] top-[52%]', CalendarClock],
        ['1 rebond', 'right-[8%] bottom-[13%]', Sparkles],
      ].map(([label, position, Icon], index) => (
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

function CockpitMockup() {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <CourtiaBubbleLogo size={34} animated={false} showHalo={false} showFoam={false} />
          <div>
            <p className="text-xs font-black text-white">COURTIA Cockpit</p>
            <p className="text-[11px] text-white/42">Aperçu marketing, données illustratives</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
          ARK actif
        </span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.045] p-4">
          <div className="flex items-center gap-2">
            <Brain size={17} className="text-violet-200" />
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/70">Brief ARK</p>
          </div>
          <p className="mt-4 text-4xl font-black text-white">4</p>
          <p className="mt-1 text-sm text-white/54">priorités à traiter ce matin</p>
          <div className="mt-5 space-y-2">
            {['Client échéance J-18', 'Prospect chaud silencieux', 'Dossier pièce manquante'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/18 px-3 py-2">
                <span className="text-sm text-white/68">{item}</span>
                <ArrowRight size={14} className="text-white/34" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ['87/100', 'Score portefeuille', TrendingUp],
            ['2', 'Échéances à surveiller', CalendarClock],
            ['1', 'Opportunité détectée', Sparkles],
          ].map(([value, label, Icon]) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs text-white/48">{label}</p>
                </div>
                <Icon size={20} className="text-cyan-100/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function PricingCard({ plan }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${plan.featured ? 'text-cyan-100' : 'text-white/38'}`}>{plan.label}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-1 text-xs font-black text-white shadow-lg shadow-cyan-500/20">
            Le choix sérieux
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
  const { scrollYProgress } = useScroll()
  const railY = useTransform(scrollYProgress, [0, 1], ['-6%', '18%'])
  const heroLift = useTransform(scrollYProgress, [0, 0.35], [0, -36])
  const heroTiltX = useTransform(scrollYProgress, [0, 0.35], [0, -4])
  const heroTiltY = useTransform(scrollYProgress, [0, 0.35], [0, 3])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
            {navItems.map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="text-sm font-medium text-white/54 transition hover:text-white">
                {label}
              </button>
            ))}
            <Link to="/login" className="text-sm font-bold text-white/60 transition hover:text-white">Se connecter</Link>
            <AuroraButton href="/register?plan=pro" size="sm">Essai Pro 7 jours</AuroraButton>
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
              {navItems.map(([id, label]) => (
                <button key={id} type="button" onClick={() => scrollTo(id)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/[0.06]">
                  {label}
                </button>
              ))}
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.06]">
                Se connecter
              </Link>
              <AuroraButton href="/register?plan=pro" className="mt-3 w-full">Essai Pro 7 jours</AuroraButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="stream-shell">
        <motion.div className="soft-rail pointer-events-none absolute left-[67%] top-[98vh] z-0 hidden h-[165vh] w-[2px] -translate-x-1/2 xl:block" style={{ y: railY }} />

        <section id="story" className="landing-section landing-act pt-24 lg:pt-28">
          <div className="aurora-mesh absolute inset-0 opacity-95" />
          <div className="aurora-noise absolute inset-0 opacity-55" />
          <div className="act-shell grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="min-w-0">
              <p className="scene-kicker">COURTIA · cockpit métier assurance</p>
              <h1 className="cinema-title mt-6 max-w-5xl break-words text-white">
                Le cockpit IA des courtiers qui veulent reprendre le contrôle de leur portefeuille.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/68">
                COURTIA centralise vos clients, contrats, relances et priorités. ARK détecte ce qui mérite votre attention avant que l’opportunité ne vous échappe.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <AuroraButton href="/register?plan=pro" size="lg" icon={<ArrowRight size={17} />} className="w-full sm:w-auto">
                  Activer mon essai Pro
                </AuroraButton>
                <AuroraButton onClick={() => scrollTo('cockpit')} variant="secondary" size="lg" className="w-full sm:w-auto">
                  Voir le cockpit
                </AuroraButton>
              </div>
              <div className="conversion-strip mt-5 grid max-w-2xl grid-cols-1 gap-2 rounded-2xl border border-white/[0.08] p-2 backdrop-blur-2xl sm:grid-cols-3">
                {['0 € aujourd’hui', '7 jours d’essai', 'Annulation en ligne'].map((item) => (
                  <div key={item} className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3 text-center text-xs font-black text-white/76">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid max-w-2xl gap-2 sm:grid-cols-4">
                {['Pensé courtiers', 'Relances intelligentes', 'Portefeuille vivant', 'ARK intégré'].map((item) => (
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
                <HeroLogoSystem />
                <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                  {[
                    ['3', 'relances prioritaires'],
                    ['2', 'échéances surveillées'],
                    ['1', 'rebond détecté'],
                  ].map(([value, label]) => (
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
            {credibility.map(({ icon: Icon, label }) => (
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
                <p className="scene-kicker">Acte 2 · portefeuille vivant</p>
                <h2 className="scene-title mt-5 text-white">Le courtier ne manque pas d’activité. Il manque d’un système qui fait remonter les bons signaux.</h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
                  Les pertes invisibles viennent d’un prospect chaud oublié, d’une échéance non exploitée, d’un dossier incomplet qui traîne, d’une famille mono-équipée jamais travaillée.
                </p>
                <div className="mt-7 space-y-3">
                  {problems.map(([title, desc, Icon]) => (
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
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100/70">ARK, IA métier</p>
                        <h3 className="mt-1 text-2xl font-black text-white">Il n’agit pas à votre place. Il vous évite d’oublier.</h3>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {arkSignals.map((signal) => (
                        <div key={signal} className="rounded-2xl border border-white/[0.07] bg-black/22 p-4">
                          <Brain size={18} className="mb-3 text-violet-100/72" />
                          <p className="text-sm font-semibold leading-relaxed text-white/72">“{signal}”</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {['4 priorités', '2 échéances', '1 opportunité', '1 dossier incomplet'].map((item) => (
                        <div key={item} className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.055] px-4 py-4 text-center text-sm font-black text-cyan-50/78">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-5">
                  {workflow.map(([time, title, desc]) => (
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
                <p className="scene-kicker">Cockpit produit</p>
                <h2 className="scene-title mt-5 text-white">Un vrai cockpit d’actions, pas un CRM généraliste maquillé.</h2>
                <p className="mt-5 text-base leading-relaxed text-white/60">
                  Clients, contrats, tâches, échéances, relances, documents et rapports restent dans le même univers. Les chiffres ci-contre sont une preview marketing, pas des données client réelles.
                </p>
              </div>
              <CockpitMockup />
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section landing-act">
          <div className="act-shell">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
              <div>
                <p className="scene-kicker">Acte 3 · décision</p>
                <h2 className="scene-title mt-5 text-white">Le prix devient logique quand le courtier voit ce qu’il arrête de perdre.</h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
                  Starter structure. Pro pilote. Premium accompagne les cabinets. La carte bancaire sera gérée uniquement via Stripe Checkout dans la phase Billing dédiée.
                </p>
                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/42">
                  Affichage fiscal selon votre configuration de facturation (micro-entreprise, TVA, mentions légales).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Avant COURTIA', 'Informations dispersées, relances dans la tête, échéances suivies à la main, opportunités perdues.'],
                  ['Après COURTIA', 'Cockpit centralisé, priorités claires, signaux ARK, relances organisées, portefeuille vivant.'],
                ].map(([title, desc]) => (
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
              {pricing.map((plan) => <PricingCard key={plan.name} plan={plan} />)}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {features.map(([title, desc, Icon]) => (
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
                  <h2 className="aurora-text text-3xl font-black leading-tight sm:text-5xl">Un courtier n’a pas besoin d’un CRM généraliste. Il a besoin d’un cockpit métier.</h2>
                  <p className="mt-5 text-sm leading-relaxed text-white/58">
                    COURTIA parle clients, contrats, échéances, multi-équipement, relances et portefeuille. ARK remonte les signaux qui aident le cabinet à agir.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {reassurance.slice(0, 4).map(([title, desc, Icon]) => (
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
                {faq.map(([question, answer]) => (
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
            <h2 className="aurora-text mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">Reprenez le contrôle de votre portefeuille avec COURTIA.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/62">
              Commencez avec un cockpit clair, des priorités visibles et un assistant métier pensé pour les courtiers.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <AuroraButton href="/register?plan=pro" size="lg" icon={<ArrowRight size={17} />} className="w-full sm:w-auto">
                Activer mon essai Pro
              </AuroraButton>
              <AuroraButton href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                Se connecter
              </AuroraButton>
            </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#02040c] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <CourtiaMiniLogo size={34} />
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => scrollTo('pricing')} className="hover:text-white">Tarifs</button>
            <Link to="/login" className="hover:text-white">Connexion</Link>
            <a href="mailto:contact@courtia.fr" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
