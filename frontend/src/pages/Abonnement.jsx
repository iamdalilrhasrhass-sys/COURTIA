import { useState } from 'react'
import { Check, Star, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import api from '../api'

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center text-left">
        <h3 className="text-base font-semibold text-gray-800">{q}</h3>
        <ChevronDown className={`transform transition-transform duration-300 ${open ? 'rotate-180 text-blue-600' : 'text-gray-400'}`} size={20} />
      </button>
      {open && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><p className="pt-2 text-sm text-gray-500">{a}</p></motion.div>}
    </div>
  )
}

const getHash = (str) => { let hash = 0; for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return hash; }
const getHSL = (str) => `hsl(${getHash(str) % 360}, 70%, 55%)`
const getGradient = (str) => `linear-gradient(135deg, ${getHSL(str)} 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

const TestimonialCard = ({ text, author, city }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex text-yellow-400 gap-0.5 mb-3">{Array(5).fill(0).map((_,i) => <Star key={i} size={16} fill="currentColor" />)}</div>
        <p className="text-gray-600 italic">"{text}"</p>
        <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0" style={{background: getGradient(author)}}>
                {(author || '?').charAt(0)}
            </div>
            <div>
                <p className="font-semibold text-sm text-gray-900">{author}</p>
                <p className="text-xs text-gray-500">{city}</p>
            </div>
        </div>
    </div>
)


export default function Abonnement() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handleCheckout = async (plan) => {
    setLoadingPlan(plan)
    try {
      const { data } = await api.post('/api/stripe/create-checkout-session', { plan, billingCycle })
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la redirection vers Stripe.')
    } finally {
        setLoadingPlan(null)
    }
  }

  const plans = {
    monthly: [
      { id: 'starter', name: 'Starter', price: 39, badge: 'Fondateur', badgeClass: 'bg-gray-100 text-gray-600', features: ['100 clients', 'Dashboard KPIs', 'ARK Chat basique', 'Gestion contrats', 'Support email'] },
      { id: 'pro', name: 'Pro', price: 69, badge: 'Populaire', badgeClass: 'bg-[#2563eb] text-white', features: ['500 clients', 'ARK complet + analyses', 'Import CSV', 'Rapports avancés', 'Support prioritaire', '3 collaborateurs'], popular: true },
      { id: 'elite', name: 'Elite', price: 129, badge: 'Illimité', badgeClass: 'bg-gradient-to-r from-amber-400 to-orange-400 text-black', features: ['Clients illimités', 'ARK Vocal', 'API publique', 'Multi-agences', 'Account Manager', 'Collaborateurs illimités', 'Formation personnalisée'] },
    ],
    annually: [
      { id: 'starter', name: 'Starter', price: Math.round(39*12*0.8), per: '/an', badge: 'Fondateur', badgeClass: 'bg-gray-100 text-gray-600', features: ['100 clients', 'Dashboard KPIs', 'ARK Chat basique', 'Gestion contrats', 'Support email'] },
      { id: 'pro', name: 'Pro', price: Math.round(69*12*0.8), per: '/an', badge: 'Populaire', badgeClass: 'bg-[#2563eb] text-white', features: ['500 clients', 'ARK complet + analyses', 'Import CSV', 'Rapports avancés', 'Support prioritaire', '3 collaborateurs'], popular: true },
      { id: 'elite', name: 'Elite', price: Math.round(129*12*0.8), per: '/an', badge: 'Illimité', badgeClass: 'bg-gradient-to-r from-amber-400 to-orange-400 text-black', features: ['Clients illimités', 'ARK Vocal', 'API publique', 'Multi-agences', 'Account Manager', 'Collaborateurs illimités', 'Formation personnalisée'] },
    ]
  }

  const currentPlans = plans[billingCycle]

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <main className="py-12 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-4 py-1 text-sm font-semibold mb-4">Offre Fondateur — 50 places</span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-transparent bg-clip-text">Choisissez votre plan</h1>
          <p className="mt-2 text-gray-400 max-w-2xl mx-auto">Débloquez la puissance de l'IA pour votre cabinet de courtage. Simple, transparent et sans engagement.</p>
          <div className="mt-8 inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${billingCycle === 'monthly' ? 'bg-white shadow' : 'text-gray-500'}`}>Mensuel</button>
            <button onClick={() => setBillingCycle('annually')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all flex items-center gap-2 ${billingCycle === 'annually' ? 'bg-white shadow' : 'text-gray-500'}`}>Annuel <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">-20%</span></button>
          </div>
        </div>

        <div className="mt-10 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {currentPlans.map(plan => {
            const isElite = plan.id === 'elite';
            return (
              <div key={plan.id} className={`rounded-2xl p-8 transition-all duration-300 relative overflow-hidden ${
                plan.popular ? 'bg-white border-2 border-[#2563eb] shadow-2xl shadow-blue-500/10 scale-105 z-10' : 
                isElite ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white border border-gray-700 shadow-xl' :
                'bg-white border border-gray-200 shadow-sm'
              }`}>
                {plan.popular && <div className="absolute top-4 -right-12 text-[10px] font-bold text-white bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-12 py-1 rotate-45">RECOMMANDÉ</div>}
                <div className="flex justify-between items-start">
                  <h3 className={`text-xl font-bold ${isElite ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  {plan.badge && <span className={`px-3 py-1 text-xs font-bold rounded-full ${plan.badgeClass}`}>{plan.badge}</span>}
                </div>
                <p className="mt-6"><span className={`text-5xl font-black ${isElite ? 'text-white' : 'text-gray-900'}`}>{plan.price}€</span><span className={`text-lg font-semibold ${isElite ? 'text-gray-400' : 'text-gray-500'}`}>{plan.per || '/mois'}</span></p>
                <ul className={`mt-8 space-y-4 text-sm ${isElite ? 'text-gray-300' : 'text-gray-600'}`}>
                  {plan.features.map(f => (<li key={f} className="flex items-start gap-3"><Check className={`${isElite ? 'text-amber-400' : 'text-emerald-500'} mt-0.5 flex-shrink-0`} size={18} /><span>{f}</span></li>))}
                </ul>
                <button onClick={() => handleCheckout(plan.id)} disabled={!!loadingPlan} className={`w-full mt-10 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ease-out hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.id === 'starter' ? 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50' : 
                  plan.popular ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg hover:shadow-blue-500/30' : 
                  'bg-gradient-to-r from-amber-400 to-orange-400 text-black'
                }`}>
                  {loadingPlan === plan.id ? 'Redirection...' : 'Choisir ce plan'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-16 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">Ils font confiance à COURTIA</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard text="COURTIA a transformé ma façon de gérer mon portefeuille. Les scores me font gagner un temps précieux." author="Julie Martin" city="Lyon" />
            <TestimonialCard text="L'interface est intuitive et l'IA est bluffante. Je ne pourrais plus m'en passer pour prioriser mes actions." author="Lucas Dubois" city="Marseille" />
            <TestimonialCard text="Enfin un CRM pensé pour les courtiers. Simple, efficace et orienté business. Je recommande à 100%." author="Chloé Petit" city="Paris" />
          </div>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">Questions fréquentes</h2>
          <div className="mt-8">
            <FAQItem q="Puis-je changer de plan plus tard ?" a="Absolument. Vous pouvez faire évoluer ou réduire votre plan à tout moment depuis vos paramètres de facturation." />
            <FAQItem q="Y a-t-il un engagement ?" a="Non, tous nos plans sont sans engagement. Vous pouvez annuler votre abonnement à tout moment, sans frais." />
            <FAQItem q="Comment fonctionne ARK ?" a="ARK est notre assistant IA intégré. Il analyse les données de vos clients pour générer des scores, identifier des opportunités et vous aider à prioriser vos actions. Dans le plan Pro, il peut aussi répondre à vos questions en langage naturel." />
            <FAQItem q="Mes données sont-elles sécurisées ?" a="La sécurité est notre priorité absolue. Vos données sont chiffrées (AES-256) et hébergées en Europe sur des serveurs conformes aux normes les plus strictes." />
            <FAQItem q="Puis-je annuler à tout moment ?" a="Oui. Vous pouvez annuler votre abonnement quand vous le souhaitez. Vous conserverez l'accès à votre plan jusqu'à la fin de la période de facturation en cours." />
          </div>
        </div>
      </main>
      <footer className="text-center py-12"><p className="text-xs text-gray-300">Rhasrhass®</p></footer>
    </div>
  )
}
