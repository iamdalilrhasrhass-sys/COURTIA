import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
  ArrowRight, Check, Star, Play, ChevronDown, Shield, Zap, Clock, 
  Smartphone, Mail, Send, CheckCircle, AlertCircle, TrendingUp, 
  Users, FileText, BarChart3, Brain, Sparkles, RefreshCw, Target,
  MessageSquare, Bell, PieChart, Activity, Layers, Download,
  ChevronRight, X, Menu
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const plans = [
  { 
    name: "Starter", price: '89', description: 'Pour le courtier solo',
    features: [
      'Gestion clients & contrats',
      'Tableau de bord portefeuille',
      'Tâches et échéances',
      'Scoring client',
      'ARK assistant (10 sessions/mois)',
      'Support email'
    ], 
    cta: 'Démarrer gratuit 30 jours' 
  },
  { 
    name: 'Pro', price: '159', description: 'Pour le cabinet en croissance', 
    popular: true, 
    features: [
      'Tout Starter +',
      'ARK illimité',
      'Morning Brief quotidien',
      'Relances automatiques',
      'Détection opportunités',
      'Analytiques avancées',
      'Import portefeuille complet',
      'Support prioritaire'
    ], 
    cta: 'Démarrer gratuit 30 jours' 
  },
  { 
    name: 'Premium', price: '—', description: 'Pour cabinets performants', 
    features: [
      'Tout Pro +',
      'Automatisations sur mesure',
      'Marque blanche possible',
      'Multi-agences',
      'API dédiée',
      'Manager compte dédié',
      'Formation équipe',
      'Accompagnement transformation'
    ], 
    cta: 'Nous contacter' 
  }
]

const problems = [
  { icon: Users, title: 'Clients non relancés', desc: 'Des prospects oubliés qui partent chez la concurrence.' },
  { icon: Clock, title: 'Contrats proche échéance', desc: 'Vous perdez des clients faute d\'avoir anticipé le renouvellement.' },
  { icon: TrendingUp, title: 'Opportunités oubliées', desc: 'Le multi-équipement reste votre plus gros levier inexploité.' },
  { icon: Layers, title: 'Tâches dispersées', desc: 'Post-its, Excel, emails : vos actions sont éparpillées.' },
  { icon: BarChart3, title: 'Données mal exploitées', desc: 'Vous avez un portefeuille, pas un tableau de bord.' },
  { icon: FileText, title: 'Administratif trop lourd', desc: 'La paperasse mange 60% de votre temps commercial.' }
]

const solutions = [
  { icon: Bell, title: 'Clients à rappeler', desc: 'Votre quotidien listé, priorisé, prêt à traiter dès l\'ouverture.' },
  { icon: AlertCircle, title: 'Contrats à surveiller', desc: 'Échéances visibles à J+30, J+60, J+90. Fin des mauvaises surprises.' },
  { icon: Send, title: 'Relances prêtes', desc: 'ARK prépare vos messages. Vous validez, il envoie.' },
  { icon: Sparkles, title: 'Opportunités détectées', desc: 'Multi-équipement, surchage, avenants : repérez ce qui rapporte.' },
  { icon: CheckCircle, title: 'Tâches priorisées', desc: 'Ce qui est important aujourd\'hui. Pas de dispersion.' },
  { icon: Brain, title: 'Résumés ARK', desc: 'Un clic = l\'essentiel du client : contrats, risques, prochaine action.' }
]

const arkFeatures = [
  { icon: FileText, title: 'Résumé client', desc: 'ARK lit le dossier complet et vous donne l\'essentiel en une phrase.' },
  { icon: MessageSquare, title: 'Relance prête à envoyer', desc: 'Un message personnalisé préparé selon le contexte client.' },
  { icon: Shield, title: 'Détection risque', desc: 'ARK signale les clients vulnérables : impayés, résiliation, sinistre.' },
  { icon: Zap, title: 'Opportunité multi-équipement', desc: 'Il repère les besoins non couverts de votre portefeuille.' },
  { icon: Bell, title: 'Morning Brief', desc: 'Chaque matin, votre briefing : urgences, relances, priorités.' },
  { icon: Target, title: 'Priorisation quotidienne', desc: 'Les 5 actions qui comptent vraiment aujourd\'hui.' }
]

const faqs = [
  { q: 'COURTIA remplace-t-il mon CRM actuel ?', r: 'Oui. COURTIA importe votre portefeuille et centralise clients, contrats, tâches et relances. Vous n\'avez plus besoin d\'Excel, d\'un CRM générique ou d\'un outil de relance séparé.' },
  { q: 'ARK envoie-t-il des messages automatiquement ?', r: 'Non. ARK prépare les messages, les priorités et les résumés. Vous restez maître de l\'envoi. Pas de risque d\'automatisation incontrôlée.' },
  { q: 'Est-ce adapté aux petits cabinets ?', r: 'COURTIA a été pensé pour le courtier indépendant comme pour le cabinet de 10 personnes. Le plan Starter est fait pour solo, le plan Pro pour les équipes.' },
  { q: 'Mes données sont-elles sécurisées ?', r: 'Oui. Serveurs français, chiffrement TLS, authentification JWT, isolation multi-tenant. Conforme RGPD. Vos données restent vos données.' },
  { q: 'Puis-je commencer sans importer tout mon portefeuille ?', r: 'Oui. Créez vos premiers clients en 30 secondes et importez le reste plus tard. Rien ne bloque votre démarrage.' },
  { q: 'Est-ce fait pour les courtiers français ?', r: 'Oui. COURTIA est conçu spécifiquement pour le marché français de l\'assurance : ORIAS, conventions, produits, usages. Pas un CRM américain adapté.' }
]

const features = [
  { icon: Users, title: 'CRM clients', desc: 'Fiches clients complètes, historique, documents, scoring, préférences.' },
  { icon: FileText, title: 'Contrats', desc: 'Gestion des polices, échéances, avenants, résiliations automatiques.' },
  { icon: CheckCircle, title: 'Tâches', desc: 'Suivi des actions, rappels, priorisation quotidienne par ARK.' },
  { icon: Send, title: 'Relances', desc: 'Email, SMS, WhatsApp préparés par ARK. Vous validez, ça part.' },
  { icon: TrendingUp, title: 'Scoring', desc: 'Score fidélité, risque, opportunité. Chaque client noté et priorisé.' },
  { icon: Clock, title: 'Historique', desc: 'Tout l\'historiel client : appels, messages, rendez-vous, notes.' },
  { icon: Download, title: 'Import portefeuille', desc: 'Import CSV, mise en correspondance automatique, nettoyage.' },
  { icon: BarChart3, title: 'Pilotage', desc: 'Tableaux de bord, objectifs, commissions, performances équipe.' }
]

// Mock dashboard data
function MockDashboard() {
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50">
      {/* Top bar */}
      <div className="bg-[#1a1a2e] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="text-white font-semibold text-sm">COURTIA</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-[#1a1a2e]" />
            ))}
          </div>
          <div className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg">Bonjour, David</div>
        </div>
      </div>
      {/* Dashboard grid */}
      <div className="bg-[#f8f7f4] p-4 grid grid-cols-3 gap-3 text-[10px]">
        {/* Score card */}
        <div className="col-span-1 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 font-medium mb-1">Score Portefeuille</p>
          <p className="text-2xl font-black text-gray-900">87<span className="text-sm font-medium text-green-500">/100</span></p>
          <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full w-[87%] bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
          </div>
          <p className="text-[9px] text-green-600 mt-1">+5 pts ce mois</p>
        </div>
        {/* Morning Brief */}
        <div className="col-span-2 bg-gradient-to-br from-[#1a1a2e] to-[#2d1b69] rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={12} className="text-purple-300" />
            <p className="font-semibold text-[11px] text-purple-200">Morning Brief ARK</p>
          </div>
          <p className="text-[10px] opacity-80 leading-relaxed">3 clients à relancer aujourd'hui — 2 contrats expirent dans 30 jours — 1 opportunité multi-équipement détectée</p>
        </div>
        {/* Action cards */}
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-l-red-400">
          <p className="text-gray-400 font-medium mb-0.5">À relancer</p>
          <p className="text-lg font-bold text-gray-900">4</p>
          <p className="text-[9px] text-gray-400">urgent</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-l-amber-400">
          <p className="text-gray-400 font-medium mb-0.5">Échéances J+30</p>
          <p className="text-lg font-bold text-gray-900">7</p>
          <p className="text-[9px] text-gray-400">3 450 € en jeu</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-l-emerald-400">
          <p className="text-gray-400 font-medium mb-0.5">Opportunités</p>
          <p className="text-lg font-bold text-gray-900">5</p>
          <p className="text-[9px] text-gray-400">+ 2 800 € estimé</p>
        </div>
        {/* Bottom row */}
        <div className="col-span-3 bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 font-medium">Clients à contacter</p>
            <p className="text-[9px] text-purple-600 font-semibold">Voir tout →</p>
          </div>
          {[
            { name: 'SARL Dubois Construction', reason: 'Renouvellement RC Pro', priority: 'haute' },
            { name: 'Mme Petit', reason: 'Devis multirisque habitation', priority: 'moyenne' },
            { name: 'EARL Martin', reason: 'Proposition flotte agricole', priority: 'basse' }
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-t border-gray-50 first:border-t-0">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${c.priority === 'haute' ? 'bg-red-400' : c.priority === 'moyenne' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <p className="text-[10px] text-gray-700 font-medium">{c.name}</p>
              </div>
              <p className="text-[9px] text-gray-400">{c.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className={className}>
      {children}
    </motion.div>
  )
}

export default function LandingPublic() {
  const navigate = useNavigate()
  const demoRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="bg-[#f8f7f4] text-[#0a0a0a] font-sans overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold tracking-tight">COURTIA</span>
            <span className="hidden sm:inline text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium ml-2">CRM assurance + IA native</span>
          </div>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Se connecter</button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all">
              Essai gratuit 30 jours
            </button>
          </div>
          
          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3">
            <button onClick={() => { navigate('/login'); setMenuOpen(false) }} className="w-full text-left text-sm font-semibold text-gray-500 py-2">Se connecter</button>
            <button onClick={() => { navigate('/register'); setMenuOpen(false) }} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-bold rounded-xl text-center">
              Essai gratuit 30 jours
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative px-6 pt-20 pb-24 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-purple-100/60 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <AnimatedSection>
          <span className="inline-block text-[11px] bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium mb-6 border border-purple-100">
            CRM assurance + IA native
          </span>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Le cockpit IA des courtiers<br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">qui veulent avancer plus vite.</span>
          </h1>
          
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mt-6 leading-relaxed">
            COURTIA centralise vos clients, contrats, tâches et relances. 
            ARK analyse votre portefeuille et vous indique les actions prioritaires à traiter.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-xl text-base sm:text-lg hover:shadow-xl hover:shadow-purple-200 transition-all flex items-center gap-2 justify-center shadow-lg">
              Démarrer l'essai gratuit <ArrowRight size={20} />
            </button>
            <button onClick={scrollToDemo} className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl text-base sm:text-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-2 justify-center">
              Voir la démonstration <Play size={18} />
            </button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Users size={14} /> Pensé pour les courtiers</span>
            <span className="flex items-center gap-1.5"><Brain size={14} /> IA intégrée</span>
            <span className="flex items-center gap-1.5"><RefreshCw size={14} /> Relances et priorités</span>
            <span className="flex items-center gap-1.5"><PieChart size={14} /> Portefeuille sous contrôle</span>
          </div>
        </AnimatedSection>
      </section>

      {/* MOCKUP SECTION */}
      <AnimatedSection className="px-6 max-w-5xl mx-auto -mt-8 mb-24">
        <MockDashboard />
        <p className="text-center text-xs text-gray-400 mt-3">Interface réelle — données de démonstration</p>
      </AnimatedSection>

      {/* PROBLEM SECTION */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center max-w-3xl mx-auto leading-tight">
            Votre cabinet perd du temps dans les relances,<br />
            <span className="text-gray-400">les suivis et les dossiers incomplets.</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {problems.map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* SOLUTION SECTION */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <AnimatedSection className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[11px] bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium border border-purple-100">La solution</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center max-w-3xl mx-auto leading-tight mb-16">
            COURTIA transforme votre portefeuille<br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">en plan d'action quotidien.</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {solutions.map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ARK SECTION */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#1e1b4b] to-[#0f0f1a]" />
        <div className="absolute top-[-300px] right-[-200px] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-300px] left-[-200px] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        
        <AnimatedSection className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-6">
            <span className="text-[11px] bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-medium border border-purple-500/20">L'IA native</span>
          </div>
          <div className="flex items-center gap-3 justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              ARK, l'assistant IA qui travaille dans votre CRM.
            </h2>
          </div>
          <p className="text-base text-gray-400 max-w-3xl mx-auto text-center leading-relaxed mb-16">
            ARK ne se contente pas de répondre à des questions. Il lit le contexte client, 
            résume les dossiers, propose les prochaines actions et prépare vos messages.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {arkFeatures.map((item, i) => (
              <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-purple-300" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-4">Tout ce dont vous avez besoin</h2>
          <p className="text-sm text-gray-500 text-center mb-12 max-w-xl mx-auto">Un CRM complet, pensé pour le métier de courtier en assurance.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((item, i) => (
              <div key={i} className="p-5 rounded-xl bg-gray-50 border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center mb-3">
                  <item.icon className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{item.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* PRICING */}
      <section className="py-20 px-6 bg-gray-50">
        <AnimatedSection className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center mb-4">Des plans pour chaque cabinet</h2>
          <p className="text-sm text-gray-500 text-center mb-12 max-w-xl mx-auto">Commencez gratuitement 30 jours. Sans carte bancaire.</p>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 ${plan.popular 
                ? 'bg-white border-2 border-purple-500 shadow-xl shadow-purple-100 relative scale-[1.02]' 
                : 'bg-white border border-gray-100 shadow-sm'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                    Le plus populaire
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-gray-500 mb-4 mt-1">{plan.description}</p>
                <p className="text-3xl sm:text-4xl font-black mb-1">
                  {plan.price === '—' ? 'Sur devis' : <>{plan.price}€ <span className="text-sm font-normal text-gray-400">/mois</span></>}
                </p>
                {plan.price !== '—' && (
                  <p className="text-[11px] text-gray-400 mb-6">Soit {plan.price === '89' ? '2,97' : '5,30'}€ / jour</p>
                )}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => plan.price === '—' ? scrollToDemo() : navigate('/register')} 
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-200' 
                      : plan.price === '—'
                        ? 'border-2 border-purple-200 text-purple-700 hover:border-purple-300'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <details key={i} className="group rounded-xl border border-gray-100 open:border-purple-100 open:bg-purple-50/20 transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-gray-800 list-none">
                  {item.q}
                  <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-xs text-gray-500 leading-relaxed">
                  {item.r}
                </div>
              </details>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-600 to-blue-600" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.1)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.05)_0%,_transparent_50%)]" />
        
        <AnimatedSection className="relative z-10 text-center max-w-2xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-6">
            Reprenez le contrôle<br />
            de votre portefeuille.
          </h2>
          <p className="text-white/70 text-base mb-10 max-w-lg mx-auto">
            30 jours gratuits. Sans engagement. Sans carte bancaire.
          </p>
          <button onClick={() => navigate('/register')} className="px-10 py-4 bg-white text-purple-700 font-bold rounded-xl text-lg hover:shadow-2xl hover:scale-[1.02] transition-all shadow-xl inline-flex items-center gap-2">
            Démarrer gratuitement <ArrowRight size={20} />
          </button>
        </AnimatedSection>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a0a0f] text-gray-500 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-12">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">C</span>
                </div>
                <span className="text-white font-bold">COURTIA</span>
              </div>
              <p className="text-xs leading-relaxed">Le cockpit IA des courtiers en assurance. CRM, IA, relances et pilotage.</p>
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-4">Produit</p>
              <div className="space-y-2 text-xs">
                <p>Fonctionnalités</p>
                <p>Tarifs</p>
                <p>ARK</p>
                <p>API</p>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-4">Légal</p>
              <div className="space-y-2 text-xs">
                <p>Mentions légales</p>
                <p>Confidentialité</p>
                <p>CGV</p>
                <p>Contact</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-xs text-center">
            <p>© 2026 COURTIA. Construit pour les 32 000 courtiers ORIAS de France.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
