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
import DashboardMockup from '../components/DashboardMockup'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
}

const plans = [
  {
    name: 'Starter',
    price: '89',
    suffix: '/mois',
    desc: 'Pour le courtier solo qui veut se structurer',
    features: [
      'CRM clients complet',
      'Gestion des contrats',
      'Tableau de bord simple',
      'Tâches et rappels',
      'Import CSV',
      'Support email',
    ],
    cta: 'Démarrer l\'essai gratuit',
    popular: false,
  },
  {
    name: 'Pro',
    price: '159',
    suffix: '/mois',
    desc: 'Pour le cabinet qui veut passer en mode pilotage',
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
    cta: 'Démarrer avec l\'offre Pro',
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

const faqItems = [
  { q: 'COURTIA est-il réservé aux courtiers en assurance ?', a: 'Oui, COURTIA est conçu spécifiquement pour les courtiers en assurance. Notre CRM, notre IA ARK et notre module REACH sont pensés pour votre métier et vos besoins.' },
  { q: 'ARK envoie-t-il des messages tout seul ?', a: 'Non. ARK prépare et suggère, mais vous validez toujours avant tout envoi. REACH est en mode dry-run par défaut. Vous gardez le contrôle à chaque étape.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Absolument. COURTIA respecte la réglementation RGPD. Vos données sont hébergées en Europe, chiffrées en transit et au repos. Aucun partage avec des tiers.' },
  { q: 'Puis-je importer mes clients existants ?', a: 'Oui. L\'import CSV vous permet de transférer votre portefeuille en quelques minutes avec preview, mapping des colonnes et détection des doublons.' },
  { q: 'Comment fonctionne REACH ?', a: 'REACH est votre module de prospection commerciale. Vous importez des prospects, créez des campagnes multi-étapes, et REACH prépare les messages. Vous validez, il envoie. En dry-run, rien ne part sans votre accord.' },
  { q: 'Pourquoi l\'offre Pro est-elle recommandée ?', a: 'L\'offre Pro débloque ARK complet, REACH, les automatisations, le scoring portefeuille et les rapports avancés. C\'est le vrai cockpit IA qui transforme votre quotidien.' },
  { q: 'Puis-je commencer seul ou faut-il un accompagnement ?', a: 'COURTIA est conçu pour être opérationnel immédiatement. L\'offre Premium inclut un accompagnement dédié si vous préférez être guidé.' },
  { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Vous pouvez résilier à tout moment. L\'essai gratuit de 30 jours vous permet de tester sans engagement ni carte bancaire.' },
]

const problems = [
  { icon: FileText, title: 'Trop d\'Excel', desc: 'Vos clients, contrats et relances sont dispersés dans des fichiers que vous passez votre temps à mettre à jour.' },
  { icon: Clock, title: 'Relances oubliées', desc: 'Des prospects et clients partent chez la concurrence parce que vous n\'avez pas anticipé le bon moment.' },
  { icon: AlertTriangle, title: 'Portefeuille dormant', desc: 'Vous ne savez pas quels clients sont actifs, dormants ou à risque sans ouvrir chaque dossier un par un.' },
  { icon: Database, title: 'Données dispersées', desc: 'Entre votre téléphone, vos emails, vos post-its et votre logiciel, l\'information client est partout et nulle part.' },
  { icon: Search, title: 'Aucun assistant métier', desc: 'Les CRM généralistes ne parlent pas assurance. Aucun ne comprend vos contrats, vos échéances, vos sinistres.' },
  { icon: BarChart3, title: 'Aucune vision globale', desc: 'Impossible d\'avoir en un coup d\'œil la santé de votre portefeuille, les priorités du jour et les actions à mener.' },
]

const solutions = [
  { icon: Users, title: 'CRM clients', desc: 'Fiches complètes, historique, scoring risque et fidélité, préférences, documents. Tout votre portefeuille au même endroit.' },
  { icon: Brain, title: 'ARK — IA native', desc: 'ARK analyse votre portefeuille, détecte les opportunités, prépare les relances et vous livre chaque matin vos priorités.' },
  { icon: Zap, title: 'REACH — Prospection', desc: 'Créez des campagnes multi-canaux, importez des prospects, laissez ARK générer les messages. Vous validez, rien ne part sans vous.' },
  { icon: RefreshCw, title: 'Automatisations', desc: 'Détection des clients dormants, opportunités multi-équipement, relances automatiques, alertes échéances.' },
  { icon: Target, title: 'Scoring intelligent', desc: 'Chaque client noté sur 3 axes : risque, fidélité, opportunité. Priorisez naturellement vos actions.' },
  { icon: PieChart, title: 'Rapports & pilotage', desc: 'Tableaux de bord, graphiques d\'activité, segmentation portefeuille, reporting REACH. Pilotez votre cabinet en temps réel.' },
]

const arkCapabilities = [
  'Résumé instantané de chaque client',
  'Analyse du portefeuille en temps réel',
  'Suggestions de relance personnalisées',
  'Détection d\'opportunités multi-équipement',
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

function SectionHeader({ title, subtitle, badge }) {
  return (
    <motion.div
      className="text-center max-w-2xl mx-auto mb-12 lg:mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
    >
      {badge && (
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-purple-600 bg-purple-50 px-4 py-1.5 rounded-full mb-4">
          {badge}
        </span>
      )}
      <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base lg:text-lg text-gray-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

function GlassCard({ children, className = '', hover = true }) {
  return (
    <div className={`bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/5 ${hover ? 'hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-0.5 transition-all duration-300' : ''} ${className}`}>
      {children}
    </div>
  )
}

export default function LandingPublic() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="bg-[#f8f9fc] text-gray-900 overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">COURTIA</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo('solutions')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Fonctionnalités</button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Tarifs</button>
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Se connecter</Link>
            <Link to="/register?plan=pro" className="text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200">
              Essai gratuit 30 jours
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-500" onClick={() => setMenuOpen(!menuOpen)}>
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
            className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-lg md:hidden"
          >
            <div className="p-5 space-y-4">
              <button onClick={() => { scrollTo('solutions'); setMenuOpen(false) }} className="block w-full text-left text-gray-600 py-2">Fonctionnalités</button>
              <button onClick={() => { scrollTo('pricing'); setMenuOpen(false) }} className="block w-full text-left text-gray-600 py-2">Tarifs</button>
              <Link to="/login" className="block text-gray-600 py-2" onClick={() => setMenuOpen(false)}>Se connecter</Link>
              <Link to="/register?plan=pro" className="block text-center font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 rounded-xl" onClick={() => setMenuOpen(false)}>
                Essai gratuit 30 jours
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO ─── */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-16 lg:pb-24">
        <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8f9fc]/50 to-[#f8f9fc]" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 w-full">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-block text-xs font-semibold tracking-widest uppercase text-purple-600 bg-purple-50/80 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6 border border-purple-200/50"
            >
              CRM assurance + IA native
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.08]"
            >
              Le cockpit IA des courtiers{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
                qui veulent piloter
              </span>{' '}
              leur portefeuille.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base lg:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed"
            >
              COURTIA centralise vos clients, contrats, tâches et relances. 
              <strong className="text-gray-700"> ARK</strong> analyse votre portefeuille,{' '}
              <strong className="text-gray-700">REACH</strong> prépare vos actions commerciales, 
              vous gardez toujours la main.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register?plan=pro"
                className="inline-flex items-center gap-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                Démarrer avec l'offre Pro
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => scrollTo('mockup')}
                className="inline-flex items-center gap-2 font-medium text-gray-600 bg-white/70 backdrop-blur-sm border border-gray-200 px-7 py-3.5 rounded-xl hover:bg-white hover:border-gray-300 hover:text-gray-900 transition-all duration-200 text-sm"
              >
                Voir la démonstration
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {['Pensé courtiers', 'ARK intégré', 'REACH sécurisé', 'Validation humaine', 'Portefeuille vivant'].map((badge) => (
                <span key={badge} className="text-xs text-gray-400 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-100">
                  {badge}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Mockup */}
          <motion.div
            id="mockup"
            className="mt-12 lg:mt-16 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </section>

      {/* ─── PROBLÈME ─── */}
      <section className="py-20 lg:py-28 px-5">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            badge="Problème"
            title="Pourquoi les courtiers perdent 60% de leur temps"
            subtitle="Les outils actuels ne sont pas faits pour vous. Résultat : vous passez plus de temps à gérer l'administratif qu'à développer votre cabinet."
          />
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {problems.map((p, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="p-6 lg:p-7">
                  <p.icon size={22} className="text-purple-600 mb-3" />
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── SOLUTION ─── */}
      <section id="solutions" className="py-20 lg:py-28 px-5 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            badge="Solution"
            title="COURTIA transforme votre cabinet"
            subtitle="Un CRM complet, une IA qui comprend votre métier, un module commercial sécurisé."
          />
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {solutions.map((s, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="p-6 lg:p-7">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mb-3">
                    <s.icon size={20} className="text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── ARK ─── */}
      <section className="py-20 lg:py-28 px-5 relative overflow-hidden">
        <AuroraBorealisBackground intensity="soft" className="absolute inset-0" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionHeader
            badge="ARK — Intelligence Artificielle"
            title="L'IA qui travaille dans votre CRM"
            subtitle="ARK analyse votre portefeuille en continu et transforme les données en actions concrètes."
          />
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {arkCapabilities.map((cap, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="p-5 flex items-start gap-3">
                  <Check size={16} className="text-purple-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-600">{cap}</span>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── REACH ─── */}
      <section className="py-20 lg:py-28 px-5 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            badge="REACH — Module commercial"
            title="Prospection IA, contrôle humain"
            subtitle="Créez des campagnes, laissez ARK générer les messages, validez avant tout envoi."
          />
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Shield size={12} /> Dry-run par défaut
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Lock size={12} /> Validation humaine obligatoire
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Brain size={12} /> Messages générés par IA
            </span>
          </div>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {reachCapabilities.map((cap, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="p-5 flex items-start gap-3">
                  <Check size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-600">{cap}</span>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── AVANT / APRÈS ─── */}
      <section className="py-20 lg:py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            badge="Comparaison"
            title="Avant COURTIA / Avec COURTIA"
            subtitle="Le changement est radical."
          />
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard className="p-8">
              <h3 className="font-black text-lg text-gray-400 mb-6 flex items-center gap-2">
                <X size={18} className="text-red-400" /> Avant COURTIA
              </h3>
              <ul className="space-y-3">
                {[
                  'Fichiers Excel dispersés',
                  'Relances manuelles oubliées',
                  'Aucune vision du portefeuille',
                  'Perte d\'opportunités',
                  'Pas d\'assistant métier',
                  'Administratif chronophage',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <X size={14} className="mt-0.5 shrink-0 text-red-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
            <GlassCard className="p-8 border-purple-200/50 shadow-purple-500/5">
              <h3 className="font-black text-lg text-gray-900 mb-6 flex items-center gap-2">
                <Check size={18} className="text-green-500" /> Avec COURTIA
              </h3>
              <ul className="space-y-3">
                {[
                  'Cockpit centralisé en temps réel',
                  'Relances automatiques préparées par ARK',
                  'Portefeuille vivant et priorisé',
                  'Opportunités détectées par l\'IA',
                  'Assistant qui travaille avec vous',
                  '60% de temps administratif économisé',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 lg:py-28 px-5 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            badge="Tarifs"
            title="Des plans pour chaque cabinet"
            subtitle="Commencez gratuitement 30 jours. Sans carte bancaire."
          />

          <motion.div
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {plans.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} className="relative">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-1 rounded-full shadow-lg">
                      Recommandé
                    </span>
                  </div>
                )}
                <GlassCard className={`p-7 flex flex-col h-full ${plan.popular ? 'border-purple-300/50 shadow-xl shadow-purple-500/10 scale-105 md:scale-105' : ''}`}>
                  <div className="flex-1">
                    <h3 className="font-black text-lg text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4">{plan.desc}</p>

                    <div className="mb-6">
                      {plan.price === 'Sur devis' ? (
                        <span className="text-3xl font-black text-gray-900">Sur devis</span>
                      ) : (
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                          <span className="text-sm text-gray-400">€{plan.suffix}</span>
                        </div>
                      )}
                      {plan.price !== 'Sur devis' && (
                        <p className="text-xs text-gray-400 mt-1">Soit {(parseInt(plan.price) / 30).toFixed(2)}€ / jour</p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
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
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 lg:py-28 px-5">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            badge="FAQ"
            title="Questions fréquentes"
          />
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <GlassCard key={i} hover={false} className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-sm text-gray-900 pr-4">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="relative py-24 lg:py-32 px-5 overflow-hidden">
        <AuroraBorealisBackground intensity="medium" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8f9fc]/30 to-[#f8f9fc]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight"
            >
              Faites passer votre cabinet d'un portefeuille subi{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
                à un portefeuille piloté.
              </span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-4 text-base text-gray-500 max-w-xl mx-auto"
            >
              30 jours d'essai gratuit. Sans carte bancaire. Sans engagement.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register?plan=pro"
                className="inline-flex items-center gap-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Commencer l'essai gratuit
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-medium text-gray-600 bg-white/70 backdrop-blur-sm border border-gray-200 px-8 py-4 rounded-xl hover:bg-white hover:border-gray-300 transition-all duration-200"
              >
                J'ai déjà un compte
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gray-100 bg-white/50 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-black text-[10px]">C</span>
            </div>
            <span className="font-bold text-sm text-gray-900">COURTIA</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span>CRM assurance + IA native</span>
            <span>© 2026 COURTIA</span>
            <Link to="/legal" className="hover:text-gray-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
