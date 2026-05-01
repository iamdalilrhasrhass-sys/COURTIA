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
  transform: translateY(-5px);
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
  background: linear-gradient(180deg, transparent, rgba(167,139,250,0.45), rgba(34,211,238,0.30), rgba(16,185,129,0.22), transparent);
  filter: drop-shadow(0 0 22px rgba(34,211,238,0.30));
}
@media (max-width: 640px) {
  .hero-logo-orbit { transform: scale(0.72); transform-origin: top center; }
  .canonical-watermark { width: 520px; height: 520px; right: -260px; top: 12vh; opacity: 0.11; }
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
    period: 'HT / mois',
    label: 'Entrée structurée',
    headline: 'Pour arrêter le bricolage sans lancer un gros chantier.',
    note: '0 € aujourd’hui, puis 89 € HT/mois après le 7e jour.',
    href: '/register?plan=starter',
    cta: 'Activer mon essai Starter',
    featured: false,
    items: ['CRM clients et contrats', 'Tâches et relances manuelles', 'Tableau de bord essentiel', 'Essai gratuit 7 jours', 'Support email'],
  },
  {
    name: 'Pro',
    price: '159 €',
    period: 'HT / mois',
    label: 'Recommandé',
    headline: 'L’offre logique pour piloter un portefeuille sérieusement.',
    note: '0 € aujourd’hui, puis 159 € HT/mois après le 7e jour. Annulation possible en ligne avant la fin de l’essai.',
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
      <div className="canonical-watermark" aria-hidden="true">
        <CourtiaBubbleLogo size="100%" animated={false} showHalo showFoam showSpecular />
      </div>
      <motion.div className="fixed left-0 top-0 z-[80] h-[2px] w-full origin-left bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-emerald-200 shadow-[0_0_26px_rgba(34,211,238,0.5)]" style={{ scaleX: scrollYProgress }} />

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
        <motion.div className="soft-rail pointer-events-none absolute left-1/2 top-[620px] z-0 hidden h-[calc(100%-900px)] w-px -translate-x-1/2 lg:block" style={{ y: railY }} />

        <section className="landing-section relative overflow-hidden px-5 pb-10 pt-20 sm:pb-16 lg:min-h-[860px] lg:pt-24">
          <div className="aurora-mesh absolute inset-0 opacity-95" />
          <div className="aurora-noise absolute inset-0 opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02040c]/72 to-[#02040c]" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.055] px-3 py-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <CourtiaBubbleLogo size={32} animated={false} showHalo={false} showFoam={false} />
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100/78">CRM assurance connecté à ARK</span>
              </div>
              <h1 className="max-w-4xl text-[2.28rem] font-black leading-[1.01] tracking-tight text-white sm:text-6xl lg:text-[4.75rem]">
                Le cockpit IA des courtiers qui veulent reprendre le contrôle de leur portefeuille.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/66 sm:text-lg">
                COURTIA centralise vos clients, contrats, relances et priorités. ARK détecte ce qui mérite votre attention avant que l’opportunité ne vous échappe.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <AuroraButton href="/register?plan=pro" size="lg" icon={<ArrowRight size={17} />} className="w-full sm:w-auto">
                  Activer mon essai Pro
                </AuroraButton>
                <AuroraButton onClick={() => scrollTo('cockpit')} variant="secondary" size="lg" className="w-full sm:w-auto">
                  Voir le cockpit
                </AuroraButton>
              </div>
              <div className="mt-4 grid max-w-xl grid-cols-3 gap-2">
                {['0 € aujourd’hui', '7 jours d’essai', 'Annulation en ligne'].map((item) => (
                  <div key={item} className="rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-3 text-center text-xs font-bold text-white/70 backdrop-blur-xl">
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/44">
                Pensé pour les courtiers français qui veulent suivre relances, échéances et rebonds avec un outil métier, pas un CRM généraliste.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.12 }}>
              <HeroLogoSystem />
            </motion.div>
          </div>
        </section>

        <section className="flow-band relative px-5 py-8">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {credibility.map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-4 backdrop-blur-xl">
                <Icon size={18} className="mb-3 text-cyan-100/74" />
                <p className="text-sm font-bold text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="story" className="landing-section flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="Le vrai problème" title="Le courtier ne perd pas par manque de clients. Il perd par manque de signaux visibles.">
              COURTIA transforme le portefeuille en système d’attention : ce qui compte remonte, ce qui traîne devient visible, ce qui peut générer du rebond ne reste plus caché.
            </SectionIntro>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {problems.map(([title, desc, Icon]) => (
                <Card key={title} className="p-5">
                  <Icon size={22} className="mb-5 text-cyan-100/70" />
                  <h3 className="text-base font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(244,114,182,0.10),transparent_30rem)]" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <SectionIntro label="Coût invisible" title="Les pertes invisibles coûtent plus cher qu’un outil bien piloté." align="left">
              Un prospect chaud oublié, une échéance non exploitée, une famille mono-équipée jamais retravaillée : c’est rarement spectaculaire, mais c’est là que la valeur fuit.
            </SectionIntro>
            <Card className="p-5">
              <div className="space-y-3">
                {['Prospect chaud oublié', 'Client silencieux jamais relancé', 'Échéance non exploitée', 'Dossier incomplet qui traîne', 'Opportunité commerciale invisible'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/18 px-4 py-3">
                    <span className="flex items-center gap-3 text-sm font-bold text-white/72">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/18 bg-rose-400/10 text-rose-100">{index + 1}</span>
                      {item}
                    </span>
                    <AlertTriangle size={16} className="text-amber-100/50" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="ark" className="landing-section flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(34,211,238,0.12),transparent_30rem)]" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="ARK, IA métier" title="ARK ne remplace pas le courtier. Il lui évite d’oublier ce qui compte.">
              Une IA utile ne fait pas de magie. Elle transforme un portefeuille dispersé en priorités concrètes que le courtier peut décider et traiter.
            </SectionIntro>
            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
              <div className="grid gap-3 sm:grid-cols-2">
                {arkSignals.map((signal) => (
                  <Card key={signal} className="min-h-[104px] p-4">
                    <Brain size={18} className="mb-4 text-violet-100/72" />
                    <p className="text-sm font-semibold leading-relaxed text-white/72">“{signal}”</p>
                  </Card>
                ))}
              </div>
              <Card className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CourtiaBubbleLogo size={42} animated={false} showHalo={false} showFoam={false} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100/70">Brief du matin ARK</p>
                      <p className="mt-1 text-lg font-black text-white">Ce que le cabinet doit voir maintenant</p>
                    </div>
                  </div>
                  <ChevronDown size={18} className="text-white/35" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {['4 priorités', '2 échéances', '1 opportunité', '1 dossier incomplet'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-4 text-center text-sm font-black text-white/72">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="Journée courtier" title="Une journée plus claire, dès l’ouverture du cockpit.">
              COURTIA n’ajoute pas une couche de bruit. Il ordonne la journée autour des actions qui protègent la valeur du portefeuille.
            </SectionIntro>
            <div className="grid gap-4 lg:grid-cols-5">
              {workflow.map(([time, title, desc]) => (
                <Card key={time} className="p-5">
                  <p className="text-sm font-black text-cyan-100">{time}</p>
                  <h3 className="mt-5 text-base font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/52">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="cockpit" className="landing-section flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_26%,rgba(16,185,129,0.10),transparent_34rem)]" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
            <SectionIntro label="Cockpit produit" title="Un aperçu produit qui ressemble à un outil que l’on utilise vraiment." align="left">
              KPIs, Morning Brief, échéances, relances et opportunités sont présentés comme une preview marketing avec données illustratives, pas comme de fausses données client.
            </SectionIntro>
            <CockpitMockup />
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="Plateforme" title="Tout ce qu’un courtier attend d’un cockpit métier.">
              COURTIA rassemble les surfaces quotidiennes : clients, contrats, tâches, documents, ARK, rapports et pilotage.
            </SectionIntro>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {features.map(([title, desc, Icon]) => (
                <Card key={title} className="p-5">
                  <Icon size={19} className="mb-4 text-cyan-100/70" />
                  <h3 className="text-sm font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/52">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
            <Card className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/60">Avant COURTIA</p>
              <h2 className="mt-4 text-3xl font-black text-white">Le portefeuille dépend de la mémoire.</h2>
              <div className="mt-6 space-y-3">
                {['Informations dispersées', 'Relances dans la tête', 'Échéances suivies à la main', 'Opportunités perdues', 'Peu de visibilité dirigeant'].map((item) => (
                  <p key={item} className="rounded-xl border border-white/[0.06] bg-black/18 px-4 py-3 text-sm font-semibold text-white/58">{item}</p>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Après COURTIA</p>
              <h2 className="mt-4 text-3xl font-black text-white">Le portefeuille devient un cockpit vivant.</h2>
              <div className="mt-6 space-y-3">
                {['Cockpit centralisé', 'Priorités claires', 'ARK remonte les signaux', 'Relances organisées', 'Portefeuille plus vivant'].map((item) => (
                  <p key={item} className="rounded-xl border border-emerald-200/[0.10] bg-emerald-400/[0.055] px-4 py-3 text-sm font-semibold text-emerald-50/72">{item}</p>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <CourtiaBubbleLogo size={112} animated showHalo showFoam={false} className="mx-auto mb-2" />
            <h2 className="aurora-text text-3xl font-black leading-tight sm:text-5xl">Un courtier n’a pas besoin d’un CRM généraliste. Il a besoin d’un cockpit métier.</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/60">
              COURTIA parle clients, contrats, échéances, multi-équipement, relances et portefeuille. ARK ne vend pas une promesse floue : il remonte les signaux qui aident un cabinet à agir.
            </p>
          </div>
        </section>

        <section id="pricing" className="landing-section flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(168,85,247,0.16),transparent_34rem)]" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="Tarifs" title="Un prix qui se comprend quand le courtier voit ce qu’il récupère.">
              Starter démarre proprement. Pro est l’offre évidente pour un cabinet qui veut vraiment piloter relances, échéances et opportunités avec ARK.
            </SectionIntro>
            <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {pricing.map((plan) => <PricingCard key={plan.name} plan={plan} />)}
            </div>
            <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-white/44">
              Carte bancaire demandée dans la phase Billing/Stripe dédiée, via un parcours sécurisé. COURTIA ne collecte pas directement les coordonnées bancaires.
            </p>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionIntro label="Réassurance" title="Un SaaS sérieux se vend par la confiance, pas par le piège.">
              L’essai doit être clair, l’annulation en ligne, les données protégées et la promesse centrée sur le métier du courtier.
            </SectionIntro>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reassurance.map(([title, desc, Icon]) => (
                <Card key={title} className="p-5">
                  <Icon size={20} className="mb-4 text-cyan-100/70" />
                  <h3 className="text-sm font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/54">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="flow-band relative overflow-hidden px-5 py-16 lg:py-24">
          <div className="relative z-10 mx-auto max-w-5xl">
            <SectionIntro label="FAQ" title="Les réponses claires avant de créer un espace courtier." />
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
        </section>

        <section className="relative overflow-hidden px-5 pb-12 pt-12 lg:pb-16">
          <div className="aurora-mesh absolute inset-0 opacity-80" />
          <div className="relative z-10 mx-auto max-w-6xl rounded-[2rem] border border-white/[0.10] bg-white/[0.05] px-6 py-10 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-10 lg:py-14">
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
