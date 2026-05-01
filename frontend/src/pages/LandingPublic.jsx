import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Building,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Globe,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  PieChart,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X as CloseIcon,
  Zap,
} from 'lucide-react'
import AuroraBorealisBackground from '../components/AuroraBorealisBackground'
import AuroraBadge from '../components/AuroraBadge'
import FloatingProductMockup from '../components/FloatingProductMockup'
import SectionEyebrow from '../components/SectionEyebrow'
import ScrollReveal from '../components/ScrollReveal'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import AuroraHalo from '../components/brand/AuroraHalo'
import AuroraButton from '../components/brand/AuroraButton'

const globalStyles = `
html { scroll-behavior: smooth; }
html, body, #root { background: #02040c; }
body { overscroll-behavior-y: none; }
.landing-section { scroll-margin-top: 88px; }
.courtia-flow {
  background:
    radial-gradient(circle at 16% 4%, rgba(124, 58, 237, 0.20), transparent 26rem),
    radial-gradient(circle at 88% 18%, rgba(34, 211, 238, 0.14), transparent 28rem),
    radial-gradient(circle at 42% 48%, rgba(16, 185, 129, 0.08), transparent 36rem),
    linear-gradient(180deg, #02040c 0%, #050713 30%, #02040c 62%, #060712 100%);
}
.cinematic-section::before {
  content: "";
  position: absolute;
  inset: -1px 0 auto 0;
  height: 160px;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.055), transparent 64%),
    linear-gradient(180deg, rgba(2,4,12,0.72), transparent);
  opacity: 0.68;
}
.aurora-thread {
  background:
    linear-gradient(180deg, transparent, rgba(167,139,250,0.42), rgba(34,211,238,0.34), rgba(16,185,129,0.20), transparent);
  filter: drop-shadow(0 0 18px rgba(34,211,238,0.36));
}
.premium-tilt {
  transform-style: preserve-3d;
  transition: transform 320ms ease, border-color 320ms ease, background 320ms ease, box-shadow 320ms ease;
}
.premium-tilt:hover {
  transform: translateY(-4px) rotateX(1deg) rotateY(-1deg);
  box-shadow: 0 24px 70px rgba(0,0,0,0.34), 0 0 42px rgba(34,211,238,0.08);
}
.liquid-border {
  position: relative;
}
.liquid-border::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.24), rgba(167,139,250,0.20), rgba(34,211,238,0.18), rgba(255,255,255,0.05));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.aurora-price {
  text-shadow: 0 0 34px rgba(34,211,238,0.18);
}
.aurora-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, transparent, black 14%, black 78%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`

const toneClasses = {
  violet: {
    wrap: 'bg-violet-500/10 border-violet-400/20',
    icon: 'text-violet-200',
    text: 'text-violet-200',
    line: 'bg-violet-400',
  },
  cyan: {
    wrap: 'bg-cyan-500/10 border-cyan-400/20',
    icon: 'text-cyan-200',
    text: 'text-cyan-200',
    line: 'bg-cyan-400',
  },
  emerald: {
    wrap: 'bg-emerald-500/10 border-emerald-400/20',
    icon: 'text-emerald-200',
    text: 'text-emerald-200',
    line: 'bg-emerald-400',
  },
  amber: {
    wrap: 'bg-amber-500/10 border-amber-400/20',
    icon: 'text-amber-200',
    text: 'text-amber-200',
    line: 'bg-amber-400',
  },
  rose: {
    wrap: 'bg-rose-500/10 border-rose-400/20',
    icon: 'text-rose-200',
    text: 'text-rose-200',
    line: 'bg-rose-400',
  },
  blue: {
    wrap: 'bg-blue-500/10 border-blue-400/20',
    icon: 'text-blue-200',
    text: 'text-blue-200',
    line: 'bg-blue-400',
  },
}

const credibilityItems = [
  { icon: Building, label: 'CRM métier courtage' },
  { icon: Brain, label: 'IA native ARK' },
  { icon: Bell, label: 'Relances centralisées' },
  { icon: Calendar, label: 'Échéances surveillées' },
  { icon: PieChart, label: 'Cockpit portefeuille' },
]

const proofPills = [
  'Pensé pour courtiers',
  'Relances intelligentes',
  'Portefeuille vivant',
  'ARK intégré',
]

const problemCards = [
  {
    icon: Bell,
    title: 'Relances oubliées',
    desc: 'Un prospect chaud disparaît parce que personne ne l’a repris au bon moment.',
    tone: 'rose',
  },
  {
    icon: Calendar,
    title: 'Échéances non anticipées',
    desc: 'Les renouvellements importants se découvrent trop tard, souvent dans l’urgence.',
    tone: 'amber',
  },
  {
    icon: AlertTriangle,
    title: 'Dossiers incomplets',
    desc: 'Une pièce manque, le dossier traîne, le courtier perd du temps à reconstituer le contexte.',
    tone: 'cyan',
  },
  {
    icon: Database,
    title: 'Contrats dispersés',
    desc: 'Les informations vivent entre emails, tableurs, fichiers et mémoire individuelle.',
    tone: 'violet',
  },
  {
    icon: Target,
    title: 'Multi-équipement perdu',
    desc: 'Une famille ou une entreprise reste mono-équipée faute de signal clair au bon moment.',
    tone: 'emerald',
  },
  {
    icon: Clock,
    title: 'Suivi manuel trop lourd',
    desc: 'Chaque matin commence par retrouver ce qu’il fallait déjà faire hier.',
    tone: 'blue',
  },
]

const invisibleCosts = [
  'Un prospect chaud oublié',
  'Un client silencieux jamais relancé',
  'Une échéance non exploitée',
  'Une famille mono-équipée jamais travaillée',
  'Un dossier incomplet qui traîne',
  'Une opportunité commerciale invisible',
]

const solutionPillars = [
  {
    icon: Database,
    title: 'Centraliser',
    desc: 'Clients, contrats, tâches et notes vivent dans un seul cockpit métier.',
    tone: 'violet',
  },
  {
    icon: Target,
    title: 'Prioriser',
    desc: 'Échéances, relances et opportunités remontent avant de devenir des urgences.',
    tone: 'cyan',
  },
  {
    icon: Zap,
    title: 'Agir',
    desc: 'Actions rapides, ARK et suivi commercial donnent une prochaine étape claire.',
    tone: 'emerald',
  },
]

const arkSignals = [
  'Ce client arrive à échéance dans 18 jours.',
  'Ce prospect chaud n’a pas été relancé.',
  'Ce dossier manque une pièce.',
  'Cette famille peut être multi-équipée.',
  'Ce contrat peut générer une opportunité de rebond.',
  'Ce client silencieux mérite une relance.',
]

const dailyWorkflow = [
  {
    time: '08h30',
    title: 'ARK prépare le brief du matin',
    desc: 'Le cockpit met en haut les priorités, échéances et dossiers à risque.',
  },
  {
    time: '09h00',
    title: 'Relances prioritaires',
    desc: 'Le courtier traite les prospects chauds et clients silencieux sans refaire sa liste.',
  },
  {
    time: '11h00',
    title: 'Dossiers incomplets',
    desc: 'Les pièces manquantes et tâches administratives sont regroupées par urgence.',
  },
  {
    time: '14h00',
    title: 'Opportunités multi-équipement',
    desc: 'ARK signale les familles et entreprises qui peuvent être mieux couvertes.',
  },
  {
    time: '17h00',
    title: 'Suivi du portefeuille',
    desc: 'Le cabinet termine avec une vision claire des actions réalisées et restantes.',
  },
]

const cockpitKpis = [
  { label: 'Priorités ARK', value: '4', detail: 'à traiter ce matin', tone: 'violet' },
  { label: 'Échéances', value: '2', detail: 'à anticiper', tone: 'amber' },
  { label: 'Opportunités', value: '1', detail: 'rebond détecté', tone: 'emerald' },
]

const featureCards = [
  { icon: Users, title: 'CRM clients', desc: 'Une fiche claire par client, avec historique, statut et prochaines actions.', tone: 'violet' },
  { icon: FileText, title: 'Contrats', desc: 'Type, compagnie, prime, date d’effet, échéance et statut accessibles rapidement.', tone: 'cyan' },
  { icon: Check, title: 'Tâches', desc: 'Retards, priorités, échéances du jour et actions liées aux clients.', tone: 'emerald' },
  { icon: Brain, title: 'Brief du matin', desc: 'ARK synthétise les signaux importants pour commencer la journée avec clarté.', tone: 'violet' },
  { icon: Activity, title: 'Scoring portefeuille', desc: 'Une lecture simple de la santé commerciale et du niveau d’attention requis.', tone: 'blue' },
  { icon: MessageSquare, title: 'ARK Reach', desc: 'Prospection et relances préparées, avec validation humaine avant action.', tone: 'cyan' },
  { icon: FileText, title: 'Documents clients', desc: 'Centralisation des pièces et suivi des documents attendus par dossier.', tone: 'amber' },
  { icon: Shield, title: 'Admin Center', desc: 'Console propriétaire pour utilisateurs, abonnement et support quand l’accès admin est activé.', tone: 'emerald' },
  { icon: BarChart3, title: 'Rapports', desc: 'Vue portefeuille, activité, opportunités, échéances et rétention.', tone: 'blue' },
  { icon: RefreshCw, title: 'Relances intelligentes', desc: 'Les relances sont visibles, priorisées et rattachées au contexte client.', tone: 'rose' },
]

const beforeItems = [
  'Informations dispersées',
  'Relances dans la tête',
  'Échéances suivies à la main',
  'Peu de visibilité',
  'Opportunités perdues',
]

const afterItems = [
  'Cockpit centralisé',
  'Priorités claires',
  'ARK remonte les signaux',
  'Relances organisées',
  'Portefeuille plus vivant',
]

const genericCrmReasons = [
  'COURTIA parle clients, contrats, échéances et portefeuille.',
  'ARK raisonne en relance, rebond, dossier incomplet et multi-équipement.',
  'Les écrans sont pensés pour décider vite, pas pour remplir un CRM générique.',
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '89 € HT/mois',
    desc: 'Essayez Starter pendant 7 jours. 0 € aujourd’hui, puis 89 € HT/mois après le 7e jour si vous continuez.',
    priceStory: 'L’entrée premium pour structurer clients, contrats et relances sans démarrer trop large.',
    position: 'Entrée structurante',
    cta: 'Activer mon essai Starter',
    href: '/register',
    featured: false,
    trialNote: '0 € aujourd’hui, puis 89 € HT/mois après le 7e jour. Annulation possible en ligne avant la fin de l’essai.',
    features: [
      'CRM clients et contrats',
      'Tâches et relances manuelles',
      'Tableau de bord essentiel',
      'Essai gratuit 7 jours',
      'Support email',
    ],
  },
  {
    name: 'Pro',
    price: '159 € HT/mois',
    desc: 'Essayez COURTIA Pro pendant 7 jours. 0 € aujourd’hui, puis 159 € HT/mois après le 7e jour si vous continuez.',
    priceStory: 'Moins de 6 € HT par jour pour garder relances, échéances et opportunités sous contrôle.',
    position: 'Recommandé',
    cta: 'Essai gratuit 7 jours',
    href: '/register?plan=pro',
    featured: true,
    trialNote: '0 € aujourd’hui, puis 159 € HT/mois après le 7e jour. Carte demandée pour activer l’essai et sécuriser l’accès. Annulation possible en ligne avant la fin de l’essai.',
    features: [
      'Cockpit portefeuille complet',
      'Brief du matin ARK',
      'Relances et priorités intelligentes',
      'Scoring portefeuille',
      'ARK Reach et opportunités',
      'Rapports avancés',
    ],
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    desc: 'Pour cabinets structurés, équipes et besoins d’accompagnement avancés.',
    position: 'Cabinets équipes',
    cta: 'Parler à COURTIA',
    externalHref: 'mailto:contact@courtia.fr?subject=COURTIA%20Premium',
    featured: false,
    features: [
      'Tout Pro',
      'Multi-utilisateurs',
      'Accompagnement de déploiement',
      'Besoins avancés étudiés avec le cabinet',
    ],
  },
]

const reassuranceCards = [
  { icon: Building, title: 'Conçu pour courtiers français', desc: 'Le vocabulaire, les priorités et les écrans parlent courtage.', tone: 'violet' },
  { icon: Database, title: 'Données centralisées', desc: 'Clients, contrats, tâches et documents ne vivent plus dans des silos.', tone: 'cyan' },
  { icon: Lock, title: 'Approche RGPD', desc: 'Le produit privilégie contrôle, accès protégés et transparence des traitements.', tone: 'emerald' },
  { icon: MessageSquare, title: 'Support', desc: 'Un outil métier doit rester compréhensible et accompagné.', tone: 'blue' },
  { icon: Sparkles, title: 'Amélioration continue', desc: 'COURTIA évolue autour des usages réels des cabinets.', tone: 'amber' },
  { icon: Check, title: 'Essai gratuit 7 jours', desc: 'Tester le cockpit avant de s’engager dans une offre.', tone: 'emerald' },
  { icon: Globe, title: 'Pas un CRM générique', desc: 'Le produit est vertical, orienté portefeuille assurance.', tone: 'violet' },
]

const faqItems = [
  {
    question: 'COURTIA remplace-t-il mon logiciel actuel ?',
    answer: 'COURTIA est pensé comme cockpit de pilotage et de suivi commercial. Selon votre organisation, il peut compléter votre logiciel métier ou devenir le centre de suivi de portefeuille.',
  },
  {
    question: 'ARK agit-il automatiquement à ma place ?',
    answer: 'Non. ARK fait remonter les signaux, prépare des pistes d’action et aide à prioriser. Le courtier garde la décision.',
  },
  {
    question: 'Mes données sont-elles protégées ?',
    answer: 'COURTIA privilégie des accès protégés, une centralisation maîtrisée et une approche RGPD. Les secrets et accès sensibles ne sont jamais exposés dans l’interface publique.',
  },
  {
    question: 'Puis-je commencer seul ?',
    answer: 'Oui. Starter permet de structurer un usage solo. Pro est recommandé si vous voulez exploiter ARK et piloter votre portefeuille avec plus de profondeur.',
  },
  {
    question: 'Pourquoi choisir l’offre Pro ?',
    answer: 'Pro concentre la valeur métier : brief ARK, scoring, relances intelligentes, opportunités et cockpit complet. C’est l’offre conçue pour un courtier sérieux.',
  },
  {
    question: 'COURTIA convient-il à une équipe ?',
    answer: 'Oui, l’offre Premium est prévue pour les cabinets structurés et les équipes avec besoins d’accompagnement ou d’organisation avancée.',
  },
  {
    question: 'Puis-je importer mes clients ?',
    answer: 'L’import de données fait partie du périmètre produit. Les modalités dépendent de votre fichier et de votre organisation actuelle.',
  },
  {
    question: 'Les documents clients seront-ils traités par ARK ?',
    answer: 'La centralisation et le suivi des documents sont au cœur du produit. Le traitement avancé par ARK doit rester encadré et est présenté comme une évolution progressive.',
  },
]

function getTone(tone = 'violet') {
  return toneClasses[tone] || toneClasses.violet
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`liquid-border premium-tilt rounded-lg border border-white/[0.08] bg-white/[0.045] shadow-xl shadow-black/20 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}

function IconTile({ icon: Icon, title, desc, tone = 'violet' }) {
  const colors = getTone(tone)

  return (
    <GlassCard className="h-full p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.065]">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg border ${colors.wrap}`}>
        <Icon size={19} className={colors.icon} />
      </div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{desc}</p>
    </GlassCard>
  )
}

function ArkBriefMockup() {
  const rows = [
    { label: '4 priorités', color: 'bg-violet-400' },
    { label: '2 échéances', color: 'bg-amber-400' },
    { label: '1 opportunité', color: 'bg-emerald-400' },
    { label: '1 dossier incomplet', color: 'bg-cyan-400' },
  ]

  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-500/10">
            <Brain size={20} className="text-violet-200" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/45">Brief du matin ARK</p>
            <p className="text-sm font-bold text-white">Aperçu de vos priorités</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Portefeuille sous contrôle
        </span>
      </div>
      <div className="relative mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-white/70">
              <span className={`h-2 w-2 rounded-full ${row.color}`} />
              {row.label}
            </span>
            <ChevronDown size={14} className="text-white/35" />
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function HeroCockpitPanel() {
  const priorities = [
    { label: 'Client à échéance dans 18 jours', tone: 'amber' },
    { label: 'Prospect chaud non relancé', tone: 'rose' },
    { label: 'Opportunité multi-équipement', tone: 'emerald' },
  ]
  const floatingSignals = [
    { label: '3 relances prioritaires', className: '-right-4 top-12', tone: 'rose' },
    { label: '2 échéances à surveiller', className: '-left-5 bottom-16', tone: 'amber' },
    { label: '1 opportunité détectée', className: 'right-6 -bottom-5', tone: 'emerald' },
  ]

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-500/18 via-cyan-400/10 to-emerald-400/10 blur-2xl" />
      <div className="liquid-border relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#070b18]/86 shadow-2xl shadow-black/45 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_84%_20%,rgba(34,211,238,0.13),transparent_28%)]" />
        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-3">
            <CourtiaBubbleLogo size={34} animated={false} showHalo={false} showFoam={false} />
            <div>
              <p className="text-xs font-black tracking-wide text-white">COURTIA</p>
              <p className="text-[11px] text-white/42">Cockpit portefeuille</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200">
            ARK actif
          </span>
        </div>

        <div className="relative grid gap-3 p-4 sm:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.045] p-4">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-violet-200" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-100/75">Brief ARK</p>
            </div>
            <p className="mt-3 text-2xl font-black text-white">4 priorités</p>
            <p className="mt-1 text-sm leading-relaxed text-white/52">
              À traiter avant que le portefeuille ne perde de la valeur.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['2', 'échéances'],
                ['1', 'rebond'],
                ['1', 'dossier'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/[0.07] bg-black/20 px-2 py-2 text-center">
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="text-[10px] text-white/38">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {priorities.map((priority) => {
              const colors = getTone(priority.tone)
              return (
                <div key={priority.label} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.045] p-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${colors.line} shadow-[0_0_18px_currentColor]`} />
                  <p className="min-w-0 flex-1 text-sm font-medium text-white/70">{priority.label}</p>
                  <ArrowRight size={14} className="text-white/34" />
                </div>
              )
            })}
            <div className="rounded-xl border border-cyan-300/[0.16] bg-cyan-400/[0.08] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-100/75">Score portefeuille</span>
                <span className="text-xs font-black text-cyan-100">87/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {floatingSignals.map((signal, index) => {
        const colors = getTone(signal.tone)
        return (
          <motion.div
            key={signal.label}
            className={`absolute hidden rounded-xl border px-3 py-2 text-xs font-bold shadow-2xl backdrop-blur-xl sm:flex ${signal.className} ${colors.wrap} ${colors.text}`}
            animate={{ y: [0, index % 2 === 0 ? -8 : 8, 0], rotate: [0, index % 2 === 0 ? 1.2 : -1.2, 0] }}
            transition={{ duration: 4.8 + index * 0.7, repeat: Infinity, ease: 'easeInOut' }}
          >
            {signal.label}
          </motion.div>
        )
      })}
    </div>
  )
}

function CockpitPreview() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <ScrollReveal>
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 blur-2xl" />
          <FloatingProductMockup className="relative" />
          <p className="mt-4 text-center text-xs text-white/35">
            Aperçu marketing du cockpit, avec données de démonstration.
          </p>
        </div>
      </ScrollReveal>

      <div className="space-y-4">
        {cockpitKpis.map((kpi, index) => {
          const colors = getTone(kpi.tone)
          return (
            <ScrollReveal key={kpi.label} delay={index * 0.08}>
              <GlassCard className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white/40">{kpi.label}</p>
                    <p className="mt-1 text-sm text-white/60">{kpi.detail}</p>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-lg border text-2xl font-black ${colors.wrap} ${colors.text}`}>
                    {kpi.value}
                  </div>
                </div>
              </GlassCard>
            </ScrollReveal>
          )
        })}
        <ScrollReveal delay={0.24}>
          <GlassCard className="p-5">
            <p className="text-sm font-bold text-white">Actions rapides</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {['Ajouter client', 'Créer tâche', 'Voir contrats', 'Ouvrir ARK'].map((action) => (
                <span key={action} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60">
                  {action}
                </span>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>
    </div>
  )
}

function PricingCard({ plan }) {
  const [amount, ...suffixParts] = plan.price.split(' ')
  const suffix = suffixParts.join(' ')
  const hasRecurringPrice = plan.price.includes('€')

  return (
    <GlassCard className={`relative flex h-full flex-col overflow-hidden p-6 ${plan.featured ? 'scale-[1.015] border-violet-300/35 bg-[linear-gradient(145deg,rgba(124,58,237,0.20),rgba(7,11,24,0.94)_38%,rgba(34,211,238,0.10))] shadow-2xl shadow-violet-500/20' : 'bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(7,11,24,0.78))]'}`}>
      <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${plan.featured ? 'via-cyan-200/60' : 'via-white/18'} to-transparent`} />
      <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl ${plan.featured ? 'bg-violet-400/20' : 'bg-cyan-400/10'}`} />
      {plan.featured && (
        <div className="absolute -top-3 left-6 flex items-center gap-1 rounded-full border border-violet-300/30 bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-violet-500/25">
          <Star size={12} />
          Offre la plus logique
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/40">{plan.position}</p>
            <h3 className="mt-1 text-xl font-black text-white">{plan.name}</h3>
          </div>
          {plan.featured && <CourtiaMiniLogo size={28} />}
        </div>
        {hasRecurringPrice ? (
          <div className={`mt-5 rounded-xl border p-4 ${plan.featured ? 'border-white/[0.10] bg-black/20' : 'border-cyan-200/[0.10] bg-cyan-400/[0.045]'}`}>
            <div className="flex items-end gap-2">
              <span className={`aurora-price bg-gradient-to-r ${plan.featured ? 'from-white via-violet-100 to-cyan-100 text-5xl' : 'from-white via-cyan-100 to-violet-100 text-4xl'} bg-clip-text font-black tracking-tight text-transparent`}>
                {amount}
              </span>
              <span className="pb-1 text-sm font-bold text-white/58">{suffix}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-cyan-100/72">{plan.priceStory}</p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-white/[0.10] bg-white/[0.04] p-4">
            <p className="bg-gradient-to-r from-white via-violet-100 to-cyan-100 bg-clip-text text-3xl font-black text-transparent">{plan.price}</p>
          </div>
        )}
        <p className="mt-3 text-sm leading-relaxed text-white/55">{plan.desc}</p>
        {plan.trialNote && (
          <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/[0.08] p-3">
            <p className="text-xs font-semibold leading-relaxed text-emerald-100/78">
              {plan.trialNote}
            </p>
          </div>
        )}
        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-white/62">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      {plan.externalHref ? (
        <a
          href={plan.externalHref}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:border-white/[0.16] hover:bg-white/[0.08]"
        >
          {plan.cta}
        </a>
      ) : (
        <AuroraButton href={plan.href} variant={plan.featured ? 'primary' : 'secondary'} size="md" className="mt-7 w-full">
          {plan.cta}
        </AuroraButton>
      )}
    </GlassCard>
  )
}

export default function LandingPublic() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const threadY = useTransform(scrollYProgress, [0, 1], ['-8%', '18%'])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  const navItems = [
    ['probleme', 'Problème'],
    ['ark', 'ARK'],
    ['cockpit', 'Cockpit'],
    ['pricing', 'Tarifs'],
  ]

  return (
    <div className="courtia-flow min-h-screen overflow-x-hidden bg-[#02040c] text-white">
      <style>{globalStyles}</style>
      <motion.div
        className="fixed left-0 top-0 z-[70] h-[2px] w-full origin-left bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
        style={{ scaleX: scrollYProgress }}
      />

      <nav className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${scrolled ? 'border-b border-white/[0.06] bg-[#02040c]/88 shadow-lg shadow-black/20 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="COURTIA">
            <CourtiaMiniLogo size={30} />
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="text-sm text-white/55 transition hover:text-white">
                {label}
              </button>
            ))}
            <Link to="/login" className="text-sm font-medium text-white/58 transition hover:text-white">
              Se connecter
            </Link>
            <AuroraButton href="/register?plan=pro" variant="primary" size="sm">
              Essai gratuit 7 jours
            </AuroraButton>
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Ouvrir le menu"
          >
            {menuOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-white/[0.06] bg-[#02040c]/96 p-5 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-2">
              {navItems.map(([id, label]) => (
                <button key={id} type="button" onClick={() => scrollTo(id)} className="block w-full rounded-lg px-3 py-3 text-left text-sm text-white/70 hover:bg-white/[0.05] hover:text-white">
                  {label}
                </button>
              ))}
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white">
                Se connecter
              </Link>
              <AuroraButton href="/register?plan=pro" variant="primary" size="sm" className="mt-3 w-full">
                Essai gratuit 7 jours
              </AuroraButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative">
        <motion.div
          className="aurora-thread pointer-events-none absolute left-1/2 top-[520px] z-0 hidden h-[calc(100%-760px)] w-px -translate-x-1/2 lg:block"
          style={{ y: threadY }}
        />
        <section id="hero" className="landing-section cinematic-section relative overflow-hidden px-4 pb-10 pt-20 sm:px-5 lg:pb-16 lg:pt-24">
          <div className="absolute inset-0 bg-[#02040c]" />
          <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-25" />
          <div className="aurora-grid absolute inset-0 opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(124,58,237,0.24),transparent_24%),radial-gradient(circle_at_86%_20%,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_60%_90%,rgba(16,185,129,0.10),transparent_26%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#02040c]/22 via-[#02040c]/74 to-[#02040c]" />

          <div className="relative z-10 mx-auto grid max-w-7xl gap-7 lg:min-h-[760px] lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <motion.div className="min-w-0" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/[0.10] bg-white/[0.045] px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-xl">
                <CourtiaBubbleLogo size={32} animated={false} showHalo={false} showFoam={false} />
                <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-100/78 sm:text-[11px] sm:tracking-[0.16em]">
                  CRM assurance connecté à ARK
                </span>
              </div>

              <h1 className="max-w-3xl text-[1.95rem] font-black leading-[1.06] text-white sm:text-5xl lg:text-6xl">
                Le cockpit IA des courtiers qui veulent reprendre le contrôle de leur portefeuille.
              </h1>

              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/66 lg:text-lg">
                COURTIA centralise vos clients, contrats, relances et priorités. ARK détecte ce qui mérite votre attention avant que l’opportunité ne vous échappe.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
                {[
                  ['4', 'priorités'],
                  ['2', 'échéances'],
                  ['1', 'rebond'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.045] px-2 py-2 text-center backdrop-blur-xl">
                    <p className="text-lg font-black text-white">{value}</p>
                    <p className="text-[10px] text-white/48">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <AuroraButton href="/register?plan=pro" variant="primary" size="lg" icon={<ArrowRight size={16} />} className="w-full px-5 sm:w-auto">
                  Essai gratuit 7 jours
                </AuroraButton>
                <AuroraButton onClick={() => scrollTo('cockpit')} variant="secondary" size="lg" className="w-full px-5 sm:w-auto">
                  Voir le cockpit
                </AuroraButton>
              </div>
              <p className="mt-3 text-center text-xs font-medium text-white/46 sm:text-left">
                Essai gratuit 7 jours — 0 € aujourd’hui — annulation en ligne.
              </p>

              <div className="mt-5 hidden max-w-md grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {proofPills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/[0.08] bg-white/[0.045] px-2.5 py-1.5 text-center text-[11px] font-semibold text-white/62 backdrop-blur-xl">
                    {pill}
                  </span>
                ))}
              </div>

              <p className="mt-4 hidden max-w-xl text-sm leading-relaxed text-white/42 sm:block">
                Pensé pour les courtiers français qui veulent structurer leurs relances, leurs échéances et leur développement commercial sans adopter un CRM généraliste.
              </p>
            </motion.div>

            <ScrollReveal delay={0.12}>
              <div className="relative mt-1 lg:mt-0">
                <HeroCockpitPanel />
                <p className="mt-3 text-center text-xs text-white/36">
                  Aperçu produit, données illustratives.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section id="credibilite" className="landing-section cinematic-section relative px-5 py-7">
          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {credibilityItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/18 px-4 py-3 backdrop-blur-xl">
                  <Icon size={17} className="text-cyan-200" />
                  <span className="text-sm font-semibold text-white/68">{item.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section id="probleme" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraHalo size={520} color="rgba(244,63,94,0.08)" position="top-left" blur={100} />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Problème courtier"
              title="Les courtiers ne manquent pas de clients. Ils manquent de temps, de visibilité et de suivi."
              subtitle="La valeur est souvent déjà dans le portefeuille. Le risque, c’est de ne pas voir le bon signal assez tôt."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {problemCards.map((problem, index) => (
                <ScrollReveal key={problem.title} delay={index * 0.05}>
                  <IconTile {...problem} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="cout-invisible" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-35" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal>
              <div>
                <AuroraBadge>Coût invisible</AuroraBadge>
                <h2 className="text-3xl font-black leading-tight text-white lg:text-5xl">
                  Les pertes invisibles ne viennent pas d’un manque d’effort.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-white/60">
                  Elles viennent d’un suivi trop dispersé. COURTIA ne se positionne pas comme une dépense de plus, mais comme un cockpit pour récupérer les opportunités qui sortent du radar.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {invisibleCosts.map((cost, index) => (
                <ScrollReveal key={cost} delay={index * 0.04}>
                  <GlassCard className="flex items-center gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-sm font-black text-amber-200">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-white/72">{cost}</span>
                  </GlassCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraHalo size={640} color="rgba(34,211,238,0.08)" position="top-right" blur={110} />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Solution COURTIA"
              title="COURTIA transforme votre portefeuille en cockpit d'actions."
              subtitle="Vos clients sont centralisés, vos contrats sont suivis, vos tâches sont priorisées et ARK fait remonter ce qui mérite votre attention."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {solutionPillars.map((pillar, index) => (
                <ScrollReveal key={pillar.title} delay={index * 0.08}>
                  <IconTile {...pillar} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="ark" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-40" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="ARK, l’IA métier"
              title="ARK ne remplace pas le courtier. Il lui évite d’oublier ce qui compte."
              subtitle="ARK n’est pas vendu comme une IA magique. Il agit comme un assistant métier concret : il signale, synthétise et prépare les prochaines actions."
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-start">
              <div className="grid gap-3 sm:grid-cols-2">
                {arkSignals.map((signal, index) => (
                  <ScrollReveal key={signal} delay={index * 0.04}>
                    <GlassCard className="flex min-h-[92px] items-start gap-3 p-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-500/10">
                        <Brain size={15} className="text-violet-200" />
                      </div>
                      <p className="text-sm leading-relaxed text-white/72">“{signal}”</p>
                    </GlassCard>
                  </ScrollReveal>
                ))}
              </div>
              <ScrollReveal delay={0.16}>
                <ArkBriefMockup />
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section id="workflow" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Workflow quotidien"
              title="Une journée plus claire, dès l’ouverture du cockpit."
              subtitle="COURTIA rend visible le rythme naturel du cabinet : prioriser, relancer, compléter, développer, suivre."
            />
            <div className="grid gap-4 lg:grid-cols-5">
              {dailyWorkflow.map((step, index) => (
                <ScrollReveal key={step.time} delay={index * 0.06}>
                  <GlassCard className="h-full p-5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">{step.time}</span>
                      <span className="h-px flex-1 bg-white/[0.08]" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{step.desc}</p>
                  </GlassCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="cockpit" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraHalo size={720} color="rgba(16,185,129,0.07)" position="bottom-left" blur={120} />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Cockpit produit"
              title="Aperçu produit : un cockpit qui aide à décider."
              subtitle="La preview ci-dessous utilise des données de démonstration. Elle illustre la logique produit : KPIs, Morning Brief, échéances, clients à relancer et opportunités."
            />
            <CockpitPreview />
          </div>
        </section>

        <section id="fonctionnalites" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Fonctionnalités"
              title="Tout ce qu’un courtier attend d’un cockpit métier."
              subtitle="COURTIA rassemble les surfaces de travail quotidiennes au lieu de les éparpiller entre plusieurs outils."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {featureCards.map((feature, index) => (
                <ScrollReveal key={feature.title} delay={index * 0.035}>
                  <IconTile {...feature} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="avant-apres" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-30" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <SectionEyebrow
              dark
              badge="Avant / Après"
              title="Avant COURTIA, le suivi dépend de la mémoire. Après COURTIA, il dépend d’un cockpit."
              subtitle="L’objectif n’est pas de travailler plus, mais de faire remonter les bonnes actions au bon moment."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <ScrollReveal>
                <GlassCard className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/10">
                      <CloseIcon size={18} className="text-rose-200" />
                    </span>
                    <h3 className="text-lg font-black text-white">Avant COURTIA</h3>
                  </div>
                  <ul className="space-y-3">
                    {beforeItems.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-white/58">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </ScrollReveal>
              <ScrollReveal delay={0.08}>
                <GlassCard className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10">
                      <Check size={18} className="text-emerald-200" />
                    </span>
                    <h3 className="text-lg font-black text-white">Après COURTIA</h3>
                  </div>
                  <ul className="space-y-3">
                    {afterItems.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-white/72">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section id="crm-metier" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraHalo size={520} color="rgba(59,130,246,0.08)" position="top-left" blur={100} />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <ScrollReveal>
              <div>
                <AuroraBadge>Pas un CRM généraliste</AuroraBadge>
                <h2 className="text-3xl font-black leading-tight text-white lg:text-5xl">
                  Un courtier n’a pas besoin d’un CRM généraliste. Il a besoin d’un cockpit métier.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-white/60">
                  COURTIA est orienté portefeuille assurance : contrats, échéances, relances, multi-équipement, dossiers incomplets et recommandations ARK.
                </p>
              </div>
            </ScrollReveal>
            <div className="space-y-3">
              {genericCrmReasons.map((reason, index) => (
                <ScrollReveal key={reason} delay={index * 0.06}>
                  <GlassCard className="flex items-start gap-3 p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-500/10 text-sm font-black text-cyan-200">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-white/68">{reason}</p>
                  </GlassCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.16),transparent_30%),linear-gradient(to_bottom,#02040c_0%,rgba(2,4,12,0.82)_45%,#02040c_100%)]" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Tarifs"
              title="Une offre Pro à 159 € HT/mois qui porte la vraie valeur."
              subtitle="Starter structure le démarrage. Pro concentre le cockpit, ARK, les relances intelligentes et le pilotage quotidien. L’essai Pro est clair : 0 € aujourd’hui, carte pour activer l’accès, annulation en ligne avant la fin des 7 jours."
            />
            <div className="grid gap-5 lg:grid-cols-3">
              {pricingPlans.map((plan, index) => (
                <ScrollReveal key={plan.name} delay={index * 0.08}>
                  <PricingCard plan={plan} />
                </ScrollReveal>
              ))}
            </div>
            <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-center backdrop-blur-xl sm:flex-row sm:text-left">
              <Shield size={17} className="shrink-0 text-emerald-200" />
              <p className="text-sm font-medium text-white/62">
                Essai gratuit 7 jours — 0 € aujourd’hui — annulation en ligne avant la fin de l’essai.
              </p>
            </div>
          </div>
        </section>

        <section id="reassurance" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow
              dark
              badge="Réassurance"
              title="Une base SaaS sérieuse, verticale et démontrable."
              subtitle="La promesse reste concrète : mieux suivre le portefeuille, mieux prioriser, mieux agir."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reassuranceCards.map((card, index) => (
                <ScrollReveal key={card.title} delay={index * 0.035}>
                  <IconTile {...card} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraHalo size={480} color="rgba(124,58,237,0.08)" position="bottom-right" blur={100} />
          <div className="relative z-10 mx-auto max-w-4xl">
            <SectionEyebrow dark badge="FAQ" title="Questions fréquentes" />
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.question} className="group rounded-lg border border-white/[0.08] bg-white/[0.045] p-5 backdrop-blur-xl">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-white">
                    {item.question}
                    <ChevronDown size={18} className="shrink-0 text-white/40 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/58">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="cta-final" className="landing-section cinematic-section relative overflow-hidden px-5 py-16 lg:py-20">
          <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060712]/70 to-[#060712]" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <ScrollReveal>
              <CourtiaBubbleLogo size={96} animated showHalo showFoam={false} className="mx-auto mb-6" />
              <h2 className="text-3xl font-black leading-tight text-white lg:text-5xl">
                Reprenez le contrôle de votre portefeuille avec COURTIA.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/62">
                Commencez avec un cockpit clair, des priorités visibles et un assistant métier pensé pour les courtiers.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <AuroraButton href="/register?plan=pro" variant="primary" size="lg" icon={<ArrowRight size={16} />}>
                  Essai gratuit 7 jours
                </AuroraButton>
                <AuroraButton href="/login" variant="secondary" size="lg">
                  Se connecter
                </AuroraButton>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#060712] px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CourtiaMiniLogo size={28} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/45">
            <button type="button" onClick={() => scrollTo('pricing')} className="transition hover:text-white">Tarifs</button>
            <Link to="/register?plan=pro" className="transition hover:text-white">Essai gratuit</Link>
            <Link to="/login" className="transition hover:text-white">Connexion</Link>
            <a href="mailto:contact@courtia.fr" className="inline-flex items-center gap-1 transition hover:text-white">
              <Mail size={13} />
              contact@courtia.fr
            </a>
            <span>© 2026 COURTIA</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
