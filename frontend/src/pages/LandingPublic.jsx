import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Check, Star, Play, ChevronDown, Shield, Zap, Clock, Smartphone, Mail, Send, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const plans = [
  { name: "L'Essentiel", price: '89', description: 'Pour courtier indépendant', features: ['Morning Brief', 'Score client', 'Tags & Kanban', 'Documents générés', 'DDA Quiz'], cta: 'Démarrer gratuit 30 jours' },
  { name: 'Le Cabinet', price: '159', description: 'Pour cabinet en croissance', popular: true, features: ['Tout Essentiel +', 'Automations', 'Newsletters', 'Analytiques avancées', 'Email IA', 'Conformité', 'Support prioritaire'], cta: 'Démarrer gratuit 30 jours' },
  { name: 'Le Réseau', price: '350', description: 'Pour cabinet performant', features: ['Tout Cabinet +', 'Analytiques executives', 'Assistant réglementaire', 'Export avancé', 'API publique', 'Marque blanche', 'Multi-agences', 'Manager dédié'], cta: 'Contacter Dalil' }
]

function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className={className}>
      {children}
    </motion.div>
  )
}

export default function LandingPublic() {
  const navigate = useNavigate()
  const workflowRef = useRef(null)

  const scrollToWorkflow = () => workflowRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="bg-white text-[#0a0a0a] font-sans">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">COURTIA</span>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-500 hover:text-gray-800">Se connecter</button>
          <button onClick={() => navigate('/register')} className="px-4 py-2 bg-[#534AB7] text-white text-sm font-bold rounded-lg hover:bg-[#4539a8] transition-colors">Essai gratuit 30 jours</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
          Votre prochain dossier : <span className="text-[#534AB7]">30 secondes.</span>
        </h1>
        <p className="text-4xl md:text-5xl font-bold mt-3 text-gray-400">ARK s'occupe du reste.</p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-6 leading-relaxed">
          Le seul CRM qui envoie automatiquement vos documents au grossiste, relance vos clients par WhatsApp et indexe les réponses. Sans que vous touchiez à quoi que ce soit.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <button onClick={() => navigate('/register')} className="px-8 py-4 bg-[#534AB7] text-white font-bold rounded-xl text-lg hover:bg-[#4539a8] transition-colors flex items-center gap-2 justify-center shadow-lg">
            Démarrer gratuitement 30 jours <ArrowRight size={20} />
          </button>
          <button onClick={scrollToWorkflow} className="px-8 py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-lg hover:border-gray-300 transition-colors">
            Voir une démonstration
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 px-6">
          {[
            { value: '32 000', label: 'courtiers ORIAS' },
            { value: '0€', label: 'de frais SMS' },
            { value: '4h', label: 'gagnées/dossier' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-[#534AB7]">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section ref={workflowRef} className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: Zap, title: 'Vous créez le dossier', desc: '30 secondes. ARK remplit le reste automatiquement depuis vos templates.' },
            { step: '02', icon: Send, title: 'ARK envoie les docs', desc: 'Transmission automatique au grossiste. Vous ne touchez à rien.' },
            { step: '03', icon: CheckCircle, title: 'Validation indexée', desc: 'La réponse arrive dans COURTIA. Documents classés, client notifié.' }
          ].map((item, i) => (
            <AnimatedSection key={i}>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#534AB7]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-[#534AB7]" />
                </div>
                <p className="text-sm font-bold text-[#534AB7] mb-2">{item.step}</p>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Des plans pour chaque cabinet</h2>
          <p className="text-gray-500 text-center mb-12">Commencez gratuitement 30 jours. Sans carte bancaire.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div key={i} className={`bg-white rounded-2xl p-8 border-2 ${plan.popular ? 'border-[#534AB7] shadow-xl relative' : 'border-gray-100'}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#534AB7] text-white text-xs font-bold px-4 py-1 rounded-full">Le plus populaire</div>}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <p className="text-3xl font-black mb-6">{plan.price}€ <span className="text-sm font-normal text-gray-400">/mois</span></p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={16} className="text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  plan.popular ? 'bg-[#534AB7] text-white hover:bg-[#4539a8]' : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}>{plan.cta}</button>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => navigate('/tarifs')} className="text-sm text-[#534AB7] font-semibold hover:underline">Voir tous les détails →</button>
          </div>
        </div>
      </section>

      {/* VIDEO PLACEHOLDER */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Démonstration ARK en direct</h2>
        <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform z-10">
            <Play className="w-8 h-8 text-[#534AB7] ml-1" />
          </div>
          <p className="absolute bottom-4 text-white text-sm font-medium">90 secondes</p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-[#534AB7] text-white text-center px-6">
        <h2 className="text-3xl font-bold mb-4">Prêt à automatiser ?</h2>
        <p className="text-white/80 mb-8">30 jours gratuits. Sans engagement. Sans carte bancaire.</p>
        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-white text-[#534AB7] font-bold rounded-xl text-lg hover:bg-gray-100 transition-colors shadow-xl">
          Démarrer maintenant
        </button>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 text-center text-sm text-gray-400">
        <p className="font-bold text-gray-600 mb-2">COURTIA</p>
        <p>courtia.fr · contact@courtia.fr</p>
        <p className="mt-2">Construit pour les 32 000 courtiers ORIAS de France</p>
      </footer>
    </div>
  )
}
