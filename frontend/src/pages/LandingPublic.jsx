import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Brain, TrendingUp, Clock, Sparkles, Zap, Shield,
  ChevronDown, Check, X, ArrowRight, Star, Users,
  FileText, BarChart3, Bell, Search, RefreshCw, Target,
  Database, Globe, Lock, MessageSquare, Phone, Mail,
  Building, PieChart, Activity, AlertTriangle, Menu, X as XIcon,
  Rocket, Gauge, HeartHandshake, Eye, LineChart, Lightbulb,
  Infinity
} from 'lucide-react'
import GlobalAuroraBackground from '../components/GlobalAuroraBackground'
import AuroraBorealisBackground from '../components/AuroraBorealisBackground'
import ArkAuroraOrb from '../components/landing/ArkAuroraOrb'
import AuroraBadge from '../components/AuroraBadge'
import FloatingProductMockup from '../components/FloatingProductMockup'
import SectionEyebrow from '../components/SectionEyebrow'
import ScrollReveal from '../components/ScrollReveal'
import ScrollCamera3D from '../components/ScrollCamera3D'
import BeforeAfterPanel from '../components/BeforeAfterPanel'
import FAQPremium from '../components/FAQPremium'
import ArkOrbSection from '../components/ArkOrbSection'
import SuperBubbleScene from '../components/landing/SuperBubbleScene'
import '../styles/bubble-design.css'

/* ════════════════════════════════════════════════════════════
   COURTIA — Landing V2 FINALE
   Design : Dark Aurora × Bubble × Glass × Cinematic
   ════════════════════════════════════════════════════════════ */

const globalStyles = `
/* ── Section halos (aurore transition entre sections) ── */
#probleme::before, #solutions::before, #ark::before,
#pricing::before, #cta-final::before, #portefeuille::before,
#reach::before, #avant-apres::before, #faq::before {
  content: ""; position: absolute; inset: auto; pointer-events: none;
  left: 50%; top: 50%; width: min(800px, 60vw); height: min(540px, 44vw);
  transform: translate(-50%, -50%); z-index: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(83,74,183,0.08), transparent 60%),
    radial-gradient(circle at 70% 38%, rgba(34,211,238,0.05), transparent 55%);
  filter: blur(64px); opacity: 0.35; mix-blend-mode: screen;
  animation: sectionHalo 20s ease-in-out infinite alternate;
}
#solutions::before {
  background:
    radial-gradient(circle at 50% 50%, rgba(34,211,238,0.07), transparent 58%),
    radial-gradient(circle at 30% 70%, rgba(129,140,248,0.05), transparent 55%);
}
#ark::before {
  background:
    radial-gradient(circle at 30% 40%, rgba(175,169,236,0.10), transparent 55%),
    radial-gradient(circle at 70% 60%, rgba(83,74,183,0.06), transparent 58%);
}
@keyframes sectionHalo {
  0% { transform: translate(-50%, -50%) scale(0.92) rotate(-1deg); opacity: 0.30; }
  100% { transform: translate(-50%, -50%) scale(1.08) rotate(1deg); opacity: 0.50; }
}

/* ── Smooth scroll ── */
html { scroll-behavior: smooth; }

/* ── Card hover premium ── */
.group:hover {
  box-shadow:
    0 0 40px rgba(175,169,236,0.08),
    0 20px 80px rgba(0,0,0,0.30),
    inset 0 1px 0 rgba(255,255,255,0.12) !important;
}

/* ── Hero bubble canvas ── */
.hero-bubble-canvas-wrap {
  position: absolute; inset: 0; z-index: 0; overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

/* ── Section spacing amélioré ── */
.section-v2 {
  position: relative;
  padding: 100px 20px 120px;
  overflow: hidden;
}
@media (max-width: 768px) {
  .section-v2 { padding: 60px 16px 80px; }
}

/* ── Glass card premium ── */
.glass-card-v2 {
  background:
    radial-gradient(circle at 18% 12%, rgba(255,255,255,0.10), transparent 28%),
    radial-gradient(circle at 82% 88%, rgba(34,211,238,0.06), transparent 34%),
    radial-gradient(circle at 10% 92%, rgba(175,169,236,0.05), transparent 30%),
    linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.15),
    inset 12px 0 30px rgba(175,169,236,0.04),
    inset -12px 0 30px rgba(34,211,238,0.03),
    0 24px 80px rgba(0,0,0,0.25);
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
}
.glass-card-v2:hover {
  border-color: rgba(175,169,236,0.18);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.20),
    inset 12px 0 30px rgba(175,169,236,0.07),
    inset -12px 0 30px rgba(34,211,238,0.05),
    0 30px 100px rgba(0,0,0,0.30),
    0 0 50px rgba(175,169,236,0.06);
  transform: translateY(-2px);
}

/* ── Scroll depth CSS variables ── */
.sc-depth-card {
  transform: translate3d(0, var(--sc-y, 0), 0) perspective(1200px) rotateX(var(--sc-rot-x, 0deg)) rotateY(var(--sc-rot-y, 0deg)) scale(var(--sc-scale, 1));
  transition: transform 0.1s ease-out;
}
.sc-depth-badge {
  transform: translate3d(0, var(--sc-y, 0), 0);
  opacity: var(--sc-opacity, 1);
}

/* ── Title shimmer amélioré ── */
.title-glow-v2 {
  background: linear-gradient(115deg,
    rgba(255,255,255,0.98) 0%,
    rgba(235,240,255,0.94) 25%,
    rgba(196,181,253,0.88) 48%,
    rgba(129,140,248,0.88) 52%,
    rgba(235,240,255,0.94) 75%,
    rgba(255,255,255,0.98) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent !important;
  background-size: 250% 100%;
  animation: titleShimmerV2 10s ease-in-out infinite;
  text-shadow:
    0 0 30px rgba(175,169,236,0.10),
    0 0 60px rgba(129,140,248,0.04),
    0 12px 40px rgba(0,0,0,0.40);
}
@keyframes titleShimmerV2 {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── Icon container gradient ── */
.icon-glow-v2 {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(196,181,253,0.12), rgba(129,140,248,0.06));
  border: 0.5px solid rgba(196,181,253,0.10);
}

/* ── CTA button premium ── */
.cta-primary-v2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6);
  background-size: 200% 100%;
  padding: 14px 30px;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(124,58,237,0.25), 0 0 40px rgba(124,58,237,0.10);
  transition: all 0.3s ease;
  animation: ctaShimmer 4s ease-in-out infinite;
}
.cta-primary-v2:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(124,58,237,0.35), 0 0 60px rgba(124,58,237,0.15);
}
@keyframes ctaShimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.cta-secondary-v2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.10);
  padding: 14px 30px;
  border-radius: 14px;
  transition: all 0.3s ease;
}
.cta-secondary-v2:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.18);
  color: white;
}

/* ── Hero subtitle ── */
.hero-sub-v2 {
  font-size: 17px;
  line-height: 1.7;
  color: rgba(255,255,255,0.50);
  max-width: 600px;
  margin: 24px auto 0;
}

/* ── Trust badges hero ── */
.hero-badge-v2 {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.06);
  padding: 5px 14px;
  border-radius: 999px;
  transition: all 0.3s ease;
}
.hero-badge-v2:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(175,169,236,0.20);
  color: rgba(255,255,255,0.7);
}

/* ── Counter number style ── */
.stat-number-v2 {
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(135deg, #ffffff, #c4b5fd, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}

/* ── Footer premium ── */
.footer-v2 {
  border-top: 0.5px solid rgba(255,255,255,0.04);
  background: rgba(5,3,10,0.6);
  backdrop-filter: blur(20px);
  padding: 30px 20px;
}
.footer-v2 a:hover { color: #c4b5fd; }

/* ── Mobile refinements ── */
@media (max-width: 640px) {
  .section-v2 { padding: 50px 14px 70px; }
  .stat-number-v2 { font-size: 28px; }
  .hero-sub-v2 { font-size: 15px; }
  .cta-primary-v2, .cta-secondary-v2 { padding: 12px 24px; font-size: 14px; }
}
`

const plans = [
  {
    name: 'Starter',
    price: '89',
    suffix: '/mois',
    desc: 'Pour le courtier solo qui veut se structurer',
    icon: Rocket,
    color: 'from-purple-400/20 to-blue-400/10',
    features: [
      'CRM clients complet',
      'Gestion des contrats',
      'Tableau de bord essentiel',
      'Tâches et rappels',
      'Import CSV',
      'Support email',
    ],
    cta: "Démarrer l'essai gratuit",
    popular: false,
    link: '/register',
  },
  {
    name: 'Pro',
    price: '159',
    suffix: '/mois',
    desc: "L'offre recommandée pour piloter votre cabinet",
    icon: Gauge,
    color: 'from-purple-500/30 to-blue-500/20',
    features: [
      'Tout Starter',
      'ARK — Assistant IA complet',
      'REACH — Module prospection',
      'Automatisations intelligentes',
      'Rapports avancés',
      'Scoring portefeuille',
      'Messages IA personnalisés',
      'Morning Brief quotidien',
      'Support prioritaire',
    ],
    cta: "Démarrer avec l'offre Pro",
    popular: true,
    link: '/register?plan=pro',
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    suffix: '',
    desc: 'Pour les cabinets performants et les groupes',
    icon: Infinity,
    color: 'from-amber-400/20 to-purple-400/15',
    features: [
      'Tout Pro',
      'Multi-utilisateurs',
      'Accompagnement dédié',
      'Intégrations sur mesure',
      'Volume élevé',
      'Support prioritaire 24/7',
      'Personnalisation complète',
      'SLA garanti',
    ],
    cta: 'Nous contacter',
    popular: false,
    link: '/contact',
  },
]

const problems = [
  { icon: FileText, title: 'Données dispersées', desc: 'Excel, emails, téléphone — vos infos sont partout, sauf au même endroit.' },
  { icon: Clock, title: 'Relances oubliées', desc: 'Des prospects partent chez la concurrence parce que vous avez manqué le bon moment.' },
  { icon: AlertTriangle, title: 'Portefeuille dormant', desc: 'Vous ne savez pas qui est actif, dormant ou à risque sans ouvrir 50 dossiers.' },
  { icon: Database, title: 'CRM trop générique', desc: 'Aucun outil ne comprend vos contrats, échéances et spécificités assurance.' },
  { icon: Search, title: 'Opportunités invisibles', desc: 'Multi-équipement, ventes croisées, clients à recontacter — tout reste dans votre tête.' },
  { icon: BarChart3, title: 'Aucune vision temps réel', desc: 'Impossible davoir en un coup dœil la santé de votre portefeuille.' },
]

const pillars = [
  { icon: Users, title: 'Centraliser', desc: 'Clients, contrats, tâches, relances au même endroit. Votre cabinet dans un cockpit unique.', gradient: 'from-purple-400/20 to-blue-400/10' },
  { icon: Brain, title: 'Prioriser', desc: 'ARK détecte ce qui mérite votre attention : clients dormants, échéances, opportunités.', gradient: 'from-violet-400/20 to-purple-400/10' },
  { icon: Zap, title: 'Relancer', desc: 'REACH prépare les messages. Vous validez avant tout envoi. Zéro envoi sauvage.', gradient: 'from-cyan-400/20 to-blue-400/10' },
  { icon: RefreshCw, title: 'Automatiser', desc: 'Le portefeuille génère des actions au lieu de dormir. Alertes, rappels, scoring en continu.', gradient: 'from-emerald-400/20 to-cyan-400/10' },
]

const reachCapabilities = [
  { icon: Shield, text: 'Dry-run par défaut', color: 'text-green-300 bg-green-500/10 border-green-500/20' },
  { icon: Lock, text: 'Validation humaine obligatoire', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  { icon: Brain, text: 'Messages générés par IA', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
  { icon: Check, text: 'Opt-out respecté', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
]

const statsData = [
  { value: '128', label: 'Clients actifs', trend: '+6 ce mois', color: 'emerald' },
  { value: '342', label: 'Contrats sous gestion', trend: '8 échéances', color: 'blue' },
  { value: '+18%', label: 'Performance cabinet', trend: 'vs mois dernier', color: 'purple' },
]

const avantApresData = {
  avant: [
    'Fichiers Excel dispersés',
    'Relances manuelles oubliées',
    'Aucune vision du portefeuille',
    'Perte d\'opportunités',
    'Pas d\'assistant métier',
    'Administratif chronophage',
  ],
  apres: [
    'Cockpit centralisé temps réel',
    'Relances automatiques préparées par ARK',
    'Portefeuille vivant et priorisé',
    'Opportunités détectées par l\'IA',
    'Assistant qui travaille avec vous',
    '60% de temps administratif économisé',
  ],
}

export default function LandingPublic() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <GlobalAuroraBackground>
      <style>{globalStyles}</style>

      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#05030a]/85 backdrop-blur-xl border-b border-white/[0.04] shadow-lg shadow-black/30'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">COURTIA</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo('probleme')} className="text-sm text-gray-400 hover:text-white transition-colors">Problème</button>
            <button onClick={() => scrollTo('solutions')} className="text-sm text-gray-400 hover:text-white transition-colors">Solution</button>
            <button onClick={() => scrollTo('ark')} className="text-sm text-gray-400 hover:text-white transition-colors">ARK</button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-gray-400 hover:text-white transition-colors">Tarifs</button>
            <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Se connecter</Link>
            <Link to="/register?plan=pro" className="text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200">
              Essai gratuit 30 jours
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <XIcon size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#05030a]/95 backdrop-blur-xl border-b border-white/[0.04] shadow-lg md:hidden"
          >
            <div className="p-5 space-y-4">
              <button onClick={() => { scrollTo('probleme'); setMenuOpen(false) }} className="block w-full text-left text-gray-400 hover:text-white py-2">Problème</button>
              <button onClick={() => { scrollTo('solutions'); setMenuOpen(false) }} className="block w-full text-left text-gray-400 hover:text-white py-2">Solution</button>
              <button onClick={() => { scrollTo('ark'); setMenuOpen(false) }} className="block w-full text-left text-gray-400 hover:text-white py-2">ARK</button>
              <button onClick={() => { scrollTo('pricing'); setMenuOpen(false) }} className="block w-full text-left text-gray-400 hover:text-white py-2">Tarifs</button>
              <Link to="/login" className="block text-gray-400 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Se connecter</Link>
              <Link to="/register?plan=pro" className="block text-center font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 rounded-xl" onClick={() => setMenuOpen(false)}>
                Essai gratuit 30 jours
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollCamera3D>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
        {/* SuperBubble 3D WebGL en fond */}
        <div className="hero-bubble-canvas-wrap">
          <SuperBubbleScene />
        </div>

        {/* Gradient de fondu vers contenu */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05030a] z-[1]" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 w-full">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <AuroraBadge>CRM assurance + IA native</AuroraBadge>

            <h1
              className="text-4xl sm:text-[52px] lg:text-[64px] font-black tracking-tight leading-[1.05] mt-6"
              data-text="Le cockpit IA des courtiers qui veulent piloter leur portefeuille."
            >
              <span className="title-glow-v2">
                Le cockpit IA des courtiers{' '}
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  qui veulent piloter
                </span>{' '}
                leur portefeuille.
              </span>
            </h1>

            <motion.p
              className="hero-sub-v2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              COURTIA centralise vos clients, contrats et relances.{' '}
              <strong className="text-purple-300">ARK</strong> analyse,{' '}
              <strong className="text-blue-300">REACH</strong> prépare,{' '}
              <strong className="text-violet-300">vous</strong> décidez.
              <br />Jamais un outil na été aussi pensé pour le courtier dassurance.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link to="/register?plan=pro" className="cta-primary-v2">
                Démarrer avec l'offre Pro
                <ArrowRight size={16} />
              </Link>
              <button onClick={() => scrollTo('cockpit')} className="cta-secondary-v2">
                Voir la démonstration
              </button>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {['Pensé courtiers', 'ARK intégré', 'REACH sécurisé', 'Validation humaine', 'Portefeuille vivant'].map((badge) => (
                <span key={badge} className="hero-badge-v2">{badge}</span>
              ))}
            </motion.div>
          </motion.div>

          {/* Cockpit 3D mockup */}
          <ScrollReveal delay={0.4}>
            <div
              id="cockpit"
              className="mt-14 max-w-5xl mx-auto sc-depth-card"
              data-depth="0.3"
            >
              <FloatingProductMockup />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ PROBLÈME ═══════════════ */}
      <section id="probleme" className="section-v2" data-depth="0.15">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Problème"
            title="Les courtiers perdent trop de temps sur ce qui ne vend pas."
            subtitle="Les outils actuels ne sont pas faits pour vous. Résultat : 60% de votre temps part en administratif."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {problems.map((p, i) => (
              <ScrollReveal key={i} delay={i * 0.07}>
                <div
                  className="glass-card-v2 p-6 lg:p-7 sc-depth-card"
                  data-depth={0.2 + i * 0.04}
                >
                  <div className="icon-glow-v2 mb-3">
                    <p.icon size={18} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1.5">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SOLUTION 4 PILIERS ═══════════════ */}
      <section id="solutions" className="section-v2">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Solution"
            title="COURTIA remet votre cabinet sous contrôle."
            subtitle="4 piliers complémentaires pour transformer votre quotidien de courtier."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {pillars.map((p, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div
                  className="glass-card-v2 p-6 lg:p-7 text-center sc-depth-card"
                  data-depth={0.25 + i * 0.04}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <p.icon size={26} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ ARK PREMIUM ═══════════════ */}
      <section id="ark" className="section-v2">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="ARK — Intelligence Artificielle"
            title="ARK analyse votre portefeuille comme un copilote métier."
            subtitle="ARK ne remplace pas le courtier. Il lit les signaux, prépare les actions et vous aide à décider plus vite."
          />
          <ArkOrbSection />
        </div>
      </section>

      {/* ═══════════════ REACH ═══════════════ */}
      <section id="reach" className="section-v2">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="REACH — Module commercial"
            title="REACH prépare la prospection, sans jamais perdre le contrôle."
            subtitle="Aucun envoi sauvage. Les messages sont préparés par lIA, contrôlés et validés par vous."
          />

          <ScrollReveal>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              {reachCapabilities.map((item, i) => (
                <span
                  key={i}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${item.color} sc-depth-badge`}
                  data-depth="0.1"
                >
                  <item.icon size={12} />
                  {item.text}
                </span>
              ))}
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Import de prospects', 'Campagnes multi-étapes', 'Messages IA personnalisés', 'Validation humaine requise', 'Mode dry-run', 'Opt-out anti-spam', 'Reporting complet', 'Tableau de bord sécurisé'].map((cap, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div
                  className="glass-card-v2 p-4 flex items-start gap-3 sc-depth-card"
                  data-depth={0.15 + i * 0.03}
                >
                  <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-400">{cap}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PORTEFEUILLE VIVANT ═══════════════ */}
      <section id="portefeuille" className="section-v2">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Portefeuille vivant"
            title="Votre portefeuille devient vivant."
            subtitle="Les données ne dorment plus. Les clients, contrats et opportunités saniment pour vous guider au quotidien."
          />

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: 'Clients actifs', value: '128', trend: '+6 ce mois', color: 'emerald', details: ['12 dormants', '7 à relancer', '3 opportunités'] },
              { icon: FileText, title: 'Contrats sous gestion', value: '342', trend: '8 échéances', color: 'blue', details: ['2 450€ prime moyenne', 'RC Pro 42%', 'Auto 31%'] },
              { icon: TrendingUp, title: 'Performance cabinet', value: '+18%', trend: 'vs mois dernier', color: 'purple', details: ['12 relances préparées', '5 devis en cours', 'Taux conversion 68%'] },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div
                  className="glass-card-v2 p-6 sc-depth-card"
                  data-depth={0.2 + i * 0.05}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center mb-4">
                    <stat.icon size={20} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{stat.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="stat-number-v2">{stat.value}</span>
                    <span className={`text-sm text-${stat.color}-400`}>{stat.trend}</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {stat.details.map((tag, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className={`w-1.5 h-1.5 rounded-full bg-${['emerald','violet','blue','amber','red','purple','cyan'][j + i * 2]}-400`} />
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ AVANT / APRÈS ═══════════════ */}
      <section id="avant-apres" className="section-v2">
        <div className="relative z-10 max-w-5xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Comparaison"
            title="Avant COURTIA / Avec COURTIA"
            subtitle="Le changement est radical. 60% de temps administratif récupéré."
          />
          <ScrollReveal>
            <div
              className="grid md:grid-cols-2 gap-6 md:gap-8 sc-depth-card"
              data-depth="0.25"
            >
              {/* Avant */}
              <div className="glass-card-v2 p-6 lg:p-8">
                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-5">
                  <X size={18} />
                  Avant COURTIA
                </h3>
                <ul className="space-y-3">
                  {avantApresData.avant.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                      <X size={14} className="mt-0.5 shrink-0 text-red-400/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Après */}
              <div className="glass-card-v2 p-6 lg:p-8 border-emerald-500/10">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-5">
                  <Check size={18} />
                  Avec COURTIA
                </h3>
                <ul className="space-y-3">
                  {avantApresData.apres.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="section-v2">
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Tarifs"
            title="Des plans pour chaque cabinet."
            subtitle="Commencez gratuitement 30 jours. Sans carte bancaire. Sans engagement."
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <ScrollReveal key={i} delay={i * 0.12}>
                <div
                  className={`relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300 sc-depth-card ${
                    plan.popular
                      ? 'glass-card-v2 border-purple-400/20 scale-105 md:scale-105'
                      : 'glass-card-v2'
                  }`}
                  data-depth={0.2 + i * 0.05}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-1 rounded-full shadow-lg shadow-purple-500/20">
                        Recommandé
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                        <plan.icon size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-white">{plan.name}</h3>
                        <p className="text-xs text-gray-400">{plan.desc}</p>
                      </div>
                    </div>

                    {plan.price === 'Sur devis' ? (
                      <span className="block text-3xl font-black text-white mt-4 mb-6">Sur devis</span>
                    ) : (
                      <div className="mt-4 mb-6">
                        <div className="flex items-baseline gap-0.5">
                          <span className="stat-number-v2">{plan.price}</span>
                          <span className="text-sm text-gray-400">€{plan.suffix}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">HT — Soit {(parseInt(plan.price) / 30).toFixed(2)}€ / jour</p>
                      </div>
                    )}

                    <ul className="space-y-2.5 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-gray-400">
                          <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={plan.link}
                    className={`block text-center font-semibold text-sm py-3 rounded-xl transition-all duration-200 ${
                      plan.popular
                        ? 'cta-primary-v2 justify-center'
                        : 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section id="faq" className="section-v2">
        <div className="relative z-10 max-w-3xl mx-auto">
          <SectionEyebrow dark={true}
            badge="FAQ"
            title="Questions fréquentes"
            subtitle="Tout ce que vous devez savoir avant de commencer."
          />
          <ScrollReveal>
            <FAQPremium dark={true} />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <section id="cta-final" className="relative py-28 lg:py-36 px-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05030a]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2
              className="text-4xl lg:text-5xl font-black tracking-tight leading-tight title-glow-v2"
            >
              Passez d'un portefeuille subi<br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                à un portefeuille piloté.
              </span>
            </h2>

            <p className="mt-5 text-base lg:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              COURTIA vous aide à voir les bonnes priorités, préparer les bonnes actions
              et garder le contrôle de votre croissance. 30 jours dessai gratuit.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/register?plan=pro" className="cta-primary-v2 text-base py-4 px-10">
                Démarrer avec COURTIA
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="cta-secondary-v2 text-base py-4 px-10">
                J'ai déjà un compte
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
      </ScrollCamera3D>

      {/* ─── FOOTER ─── */}
      <footer className="footer-v2">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-black text-[10px]">C</span>
            </div>
            <span className="font-bold text-sm text-white">COURTIA</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <a href="mailto:arkcourtia@gmail.com" className="hover:text-purple-400 transition-colors">arkcourtia@gmail.com</a>
            <span className="hidden sm:inline text-gray-600">|</span>
            <span>CRM assurance + IA native</span>
            <span className="hidden sm:inline text-gray-600">|</span>
            <span>© 2026 COURTIA</span>
            <Link to="/legal" className="hover:text-gray-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </GlobalAuroraBackground>
  )
}
