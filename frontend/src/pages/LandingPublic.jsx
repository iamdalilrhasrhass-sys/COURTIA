import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Brain, TrendingUp, Clock, Sparkles, Zap, Shield,
  ChevronDown, Check, X, ArrowRight, Star, Users,
  FileText, BarChart3, Bell, Search, RefreshCw, Target,
  Database, Globe, Lock, MessageSquare, Phone, Mail,
  Building, PieChart, Activity, AlertTriangle, Menu, X as XIcon
} from 'lucide-react'
import AuroraBorealisBackground from '../components/AuroraBorealisBackground'
import SuperBubbleScene from '../components/landing/SuperBubbleScene'
import AuroraBadge from '../components/AuroraBadge'
import FloatingProductMockup from '../components/FloatingProductMockup'
import SectionEyebrow from '../components/SectionEyebrow'
import ScrollReveal from '../components/ScrollReveal'
import BeforeAfterPanel from '../components/BeforeAfterPanel'
import FAQPremium from '../components/FAQPremium'
import '../styles/bubble-design.css'

const globalStyles = `
/* ── Section transition halos ── */
#probleme::before {
  content: ""; position: absolute; inset: auto; pointer-events: none;
  left: 50%; top: 50%; width: min(900px, 72vw); height: min(620px, 56vw);
  transform: translate(-50%, -50%); z-index: 0;
  background: radial-gradient(circle at 50% 50%, rgba(83,74,183,0.12), transparent 62%),
              radial-gradient(circle at 70% 38%, rgba(34,211,238,0.07), transparent 58%);
  filter: blur(58px); opacity: 0.45; mix-blend-mode: screen;
  animation: sectionHalo 18s ease-in-out infinite alternate;
}
#solutions::before {
  content: ""; position: absolute; inset: auto; pointer-events: none;
  left: 50%; top: 50%; width: min(800px, 64vw); height: min(540px, 48vw);
  transform: translate(-55%, -48%); z-index: 0;
  background: radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10), transparent 60%);
  filter: blur(64px); opacity: 0.35; mix-blend-mode: screen;
  animation: sectionHalo 21s ease-in-out infinite alternate-reverse;
}
@keyframes sectionHalo {
  0% { transform: translate(-50%, -50%) scale(0.94) rotate(-1deg); opacity: 0.35; }
  100% { transform: translate(-50%, -50%) scale(1.06) rotate(1deg); opacity: 0.55; }
}

/* ── Card hover premium glow ── */
.group:hover {
  box-shadow:
    0 0 40px rgba(175,169,236,0.08),
    0 20px 80px rgba(0,0,0,0.30),
    inset 0 1px 0 rgba(255,255,255,0.12) !important;
}

/* ── Smooth scroll ── */
html { scroll-behavior: smooth; }
`

const plans = [
  {
    name: 'Starter',
    price: '89',
    suffix: '/mois',
    desc: 'Pour le courtier solo qui veut se structurer',
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
  },
  {
    name: 'Pro',
    price: '159',
    suffix: '/mois',
    desc: "L'offre recommandée pour piloter votre cabinet",
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
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    suffix: '',
    desc: 'Pour les cabinets performants et les groupes',
    features: [
      'Tout Pro',
      'Multi-utilisateurs',
      'Accompagnement dédié',
      'Intégrations sur mesure',
      'Volume élevé',
      'Support prioritaire 24/7',
      'Personnalisation',
      'SLA garanti',
    ],
    cta: 'Nous contacter',
    popular: false,
  },
]

const problems = [
  { icon: FileText, title: 'Données dispersées', desc: 'Vos clients, contrats et relances sont éparpillés dans des fichiers Excel, votre téléphone et vos emails.' },
  { icon: Clock, title: 'Relances oubliées', desc: "Des prospects et clients partent chez la concurrence parce que vous n'avez pas anticipé le bon moment." },
  { icon: AlertTriangle, title: 'Portefeuille dormant', desc: 'Vous ne savez pas quels clients sont actifs, dormants ou à risque sans ouvrir chaque dossier un par un.' },
  { icon: Database, title: 'CRM trop généralistes', desc: 'Les outils actuels ne parlent pas assurance. Aucun ne comprend vos contrats, échéances et sinistres.' },
  { icon: Search, title: 'Opportunités invisibles', desc: 'Les prospects multi-équipement, les clients à recontacter, les ventes croisées : tout reste dans votre tête.' },
  { icon: BarChart3, title: 'Suivi commercial manuel', desc: "Impossible d'avoir en un coup d'œil la santé de votre portefeuille et les priorités du jour." },
]

const pillars = [
  { icon: Users, title: 'Centraliser', desc: 'Clients, contrats, tâches, relances et notes au même endroit. Votre cabinet en un tableau de bord.' },
  { icon: Brain, title: 'Prioriser', desc: "ARK détecte ce qui mérite votre attention aujourd'hui : clients dormants, échéances, opportunités." },
  { icon: Zap, title: 'Relancer', desc: 'REACH prépare les messages de relance et prospection. Vous validez avant tout envoi.' },
  { icon: RefreshCw, title: 'Automatiser', desc: 'Le portefeuille génère des actions au lieu de dormir dans un tableau. Alertes, rappels, scoring.' },
]

const arkCapabilities = [
  'Résumé instantané de chaque client',
  'Analyse du portefeuille en temps réel',
  'Suggestions de relance personnalisées',
  "Détection d'opportunités multi-équipement",
  'Alertes clients dormants ou à risque',
  'Aide à la conformité et à la documentation',
  'Morning Brief quotidien avec priorités',
  'Génération de messages commerciaux',
]

const reachCapabilities = [
  'Import et gestion de prospects',
  'Création de campagnes multi-étapes',
  'Génération de messages par IA',
  'Validation humaine obligatoire',
  'Mode dry-run pour tester sans envoyer',
  'Opt-out et contrôle anti-spam',
  'Reporting et statistiques',
  'Tableau de bord sécurisé',
]

export default function LandingPublic() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })

    const onMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="bg-[#0a0510] text-white overflow-x-hidden">
      <style>{globalStyles}</style>
      {/* ─── NAVBAR GLASS DARK ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0510]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
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

      {/* Mobile menu dark */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0a0510]/95 backdrop-blur-xl border-b border-white/5 shadow-lg md:hidden"
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

      {/* ━━━━━━━━━━━ HERO AURORA 3D ━━━━━━━━━━━ */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 lg:pb-24 overflow-hidden">
        <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
        <SuperBubbleScene />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0510]" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 w-full">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AuroraBadge>CRM assurance + IA native</AuroraBadge>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white"
              data-text="Le cockpit IA des courtiers qui veulent piloter leur portefeuille."
            >
              Le cockpit IA des courtiers{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                qui veulent piloter
              </span>{' '}
              leur portefeuille.
            </h1>

            <motion.p
              className="mt-6 text-base lg:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              COURTIA centralise vos clients, contrats, tâches et relances.{' '}
              <strong className="text-purple-300">ARK</strong> analyse votre portefeuille,{' '}
              <strong className="text-blue-300">REACH</strong> prépare vos actions commerciales,{' '}
              vous gardez toujours la main.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                to="/register?plan=pro"
                className="inline-flex items-center gap-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                Démarrer avec l'offre Pro
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => scrollTo('cockpit')}
                className="inline-flex items-center gap-2 font-medium text-gray-300 bg-white/5 backdrop-blur-sm border border-white/10 px-7 py-3.5 rounded-xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 text-sm"
              >
                Voir la démonstration
              </button>
            </motion.div>

            <motion.div
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {['Pensé courtiers', 'ARK intégré', 'REACH sécurisé', 'Validation humaine', 'Portefeuille vivant'].map((badge) => (
                <span key={badge} className="text-xs text-gray-400 bg-white/5 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                  {badge}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Cockpit Mockup 3D avec parallaxe souris */}
          <ScrollReveal delay={0.3}>
            <div id="cockpit" className="mt-12 lg:mt-16 max-w-5xl mx-auto"
              style={{
                transform: `perspective(1200px) rotateY(${mousePos.x * 1.5}deg) rotateX(${-mousePos.y * 1.2}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
            >
              <FloatingProductMockup />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION PROBLÈME (dark) ━━━━━━━━━━━ */}
      <section id="probleme" className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Problème"
            title="Les courtiers perdent trop de temps sur ce qui ne vend pas."
            subtitle="Les outils actuels ne sont pas faits pour vous. Résultat : vous passez plus de temps à gérer l'administratif qu'à développer votre cabinet."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {problems.map((p, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 lg:p-7 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-0.5 hover:border-white/[0.12] transition-all duration-300">
                  <p.icon size={22} className="text-purple-400 group-hover:text-purple-300 mb-3 transition-colors" />
                  <h3 className="font-bold text-white text-sm mb-1.5">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION SOLUTION 4 PILIERS (dark) ━━━━━━━━━━━ */}
      <section id="solutions" className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Solution"
            title="COURTIA remet votre cabinet sous contrôle."
            subtitle="4 piliers complémentaires pour transformer votre quotidien."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {pillars.map((p, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 lg:p-7 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-0.5 hover:border-white/[0.12] transition-all duration-300 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center mx-auto mb-4">
                    <p.icon size={24} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION ARK (dark + aurora) ━━━━━━━━━━━ */}
      <section id="ark" className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="soft" className="absolute inset-0" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="ARK — Intelligence Artificielle"
            title="ARK analyse votre portefeuille comme un copilote métier."
            subtitle="ARK ne remplace pas le courtier. Il lit les signaux, prépare les actions et vous aide à décider plus vite."
          />

          {/* Orb ARK visuel */}
          <ScrollReveal>
            <div className="flex items-center justify-center mb-10">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 via-violet-500 to-blue-500 shadow-2xl shadow-purple-500/30 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 animate-pulse blur-xl" />
                <Brain size={32} className="text-white relative z-10" />
              </div>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {arkCapabilities.map((cap, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 flex items-start gap-3 shadow-md hover:shadow-lg hover:border-white/[0.12] transition-all duration-300">
                  <Check size={16} className="text-purple-400 group-hover:text-purple-300 mt-0.5 shrink-0 transition-colors" />
                  <span className="text-sm text-gray-400">{cap}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION REACH (dark) ━━━━━━━━━━━ */}
      <section className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="REACH — Module commercial"
            title="REACH prépare la prospection, sans jamais perdre le contrôle."
            subtitle="Aucun envoi sauvage. Les messages sont préparés, contrôlés et validés."
          />

          {/* Sécurité badges */}
          <ScrollReveal>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <span className="text-xs font-semibold text-green-300 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Shield size={12} /> Dry-run par défaut
              </span>
              <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Lock size={12} /> Validation humaine obligatoire
              </span>
              <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Brain size={12} /> Messages générés par IA
              </span>
              <span className="text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Check size={12} /> Opt-out respecté
              </span>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reachCapabilities.map((cap, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 flex items-start gap-3 shadow-md hover:shadow-lg hover:border-white/[0.12] transition-all duration-300">
                  <Check size={16} className="text-blue-400 group-hover:text-blue-300 mt-0.5 shrink-0 transition-colors" />
                  <span className="text-sm text-gray-400">{cap}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION PORTEFEUILLE VIVANT (dark) ━━━━━━━━━━━ */}
      <section className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="soft" className="absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Portefeuille vivant"
            title="Votre portefeuille devient vivant."
            subtitle="Les données ne dorment plus. Les clients, contrats et opportunités s'animent pour vous guider."
          />

          <div className="grid md:grid-cols-3 gap-5">
            <ScrollReveal delay={0}>
              <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-white/[0.12] transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center mb-4">
                  <Users size={22} className="text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">Clients actifs</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">128</span>
                  <span className="text-sm text-emerald-400">+6 ce mois</span>
                </div>
                <div className="mt-3 space-y-1">
                  {['12 dormants', '7 à relancer', '3 opportunités'].map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-white/[0.12] transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center mb-4">
                  <FileText size={22} className="text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">Contrats sous gestion</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">342</span>
                  <span className="text-sm text-amber-400">8 échéances</span>
                </div>
                <div className="mt-3 space-y-1">
                  {['2 450€ prime moyenne', 'RC Pro 42%', 'Auto 31%'].map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-white/[0.12] transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center mb-4">
                  <TrendingUp size={22} className="text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">Performance cabinet</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">+18%</span>
                  <span className="text-sm text-emerald-400">vs mois dernier</span>
                </div>
                <div className="mt-3 space-y-1">
                  {['12 relances préparées', '5 devis en cours', 'Taux conversion 68%'].map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-purple-400' : i === 1 ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION AVANT / APRÈS (dark) ━━━━━━━━━━━ */}
      <section className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Comparaison"
            title="Avant COURTIA / Avec COURTIA"
            subtitle="Le changement est radical."
          />
          <ScrollReveal>
            <BeforeAfterPanel dark={true} />
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━ SECTION PRICING PREMIUM (dark) ━━━━━━━━━━━ */}
      <section id="pricing" className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionEyebrow dark={true}
            badge="Tarifs"
            title="Des plans pour chaque cabinet."
            subtitle="Commencez gratuitement 30 jours. Sans carte bancaire. Sans engagement."
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <ScrollReveal key={i} delay={i * 0.12}>
                <div className={`relative rounded-2xl p-7 border shadow-xl flex flex-col h-full transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-purple-400/30 bg-white/[0.06] shadow-purple-500/20 scale-105 md:scale-105'
                    : 'border-white/[0.06] bg-white/[0.03] backdrop-blur-xl shadow-black/20'
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-1 rounded-full shadow-lg">
                        Recommandé
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-black text-lg text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">{plan.desc}</p>

                    <div className="mb-6">
                      {plan.price === 'Sur devis' ? (
                        <span className="text-3xl font-black text-white">Sur devis</span>
                      ) : (
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-black text-white">{plan.price}</span>
                          <span className="text-sm text-gray-400">€{plan.suffix}</span>
                        </div>
                      )}
                      {plan.price !== 'Sur devis' && (
                        <p className="text-xs text-gray-500 mt-1">HT — Soit {(parseInt(plan.price) / 30).toFixed(2)}€ / jour</p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-gray-400">
                          <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={plan.popular ? '/register?plan=pro' : plan.name === 'Premium' ? '/contact' : '/register'}
                    className={`block text-center font-semibold text-sm py-3 rounded-xl transition-all duration-200 ${
                      plan.popular
                        ? 'text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/25'
                        : 'text-gray-300 bg-white/5 hover:bg-white/10'
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

      {/* ━━━━━━━━━━━ SECTION FAQ (dark) ━━━━━━━━━━━ */}
      <section className="relative py-20 lg:py-28 px-5 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <SectionEyebrow dark={true}
            badge="FAQ"
            title="Questions fréquentes"
          />
          <ScrollReveal>
            <FAQPremium dark={true} />
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━ CTA FINAL AURORA (dark) ━━━━━━━━━━━ */}
      <section className="relative py-24 lg:py-32 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0510]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2
              className="text-3xl lg:text-4xl font-black tracking-tight leading-tight"
              style={{
                background: 'linear-gradient(115deg, #ffffff, #c4b5fd, #a78bfa, #c4b5fd, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Passez d'un portefeuille subi à un portefeuille piloté.
            </h2>

            <p className="mt-4 text-base text-gray-400 max-w-xl mx-auto">
              COURTIA vous aide à voir les bonnes priorités, préparer les bonnes actions et garder le contrôle de votre croissance.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register?plan=pro"
                className="inline-flex items-center gap-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Démarrer avec COURTIA
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-medium text-gray-300 bg-white/5 backdrop-blur-sm border border-white/10 px-8 py-4 rounded-xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
              >
                J'ai déjà un compte
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FOOTER DARK ─── */}
      <footer className="border-t border-white/5 bg-[#0a0510]/80 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-black text-[10px]">C</span>
            </div>
            <span className="font-bold text-sm text-white">COURTIA</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="mailto:arkcourtia@gmail.com" className="hover:text-purple-400 transition-colors">arkcourtia@gmail.com</a>
            <span className="hidden sm:inline text-gray-600">|</span>
            <span>CRM assurance + IA native</span>
            <span className="hidden sm:inline text-gray-600">|</span>
            <span>© 2026 COURTIA</span>
            <Link to="/legal" className="hover:text-gray-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
