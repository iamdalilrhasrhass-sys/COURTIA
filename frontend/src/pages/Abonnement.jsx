import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 py-5">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center text-left">
        <h3 className="text-base font-semibold text-gray-800">{q}</h3>
        <span className={`transform transition-transform duration-300 ${open ? 'rotate-45' : ''}`}><Plus size={20} /></span>
      </button>
      {open && <p className="mt-3 text-sm text-gray-600 animate-fade-in" style={{animationDuration: '300ms'}}>{a}</p>}
    </div>
  )
}

const TestimonialCard = ({ text, author, company, avatarUrl }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-gray-700">"{text}"</p>
        <div className="flex items-center gap-3 mt-4">
            <img src={avatarUrl} alt={author} className="w-10 h-10 rounded-full object-cover" />
            <div>
                <p className="font-semibold text-sm text-gray-900">{author}</p>
                <p className="text-xs text-gray-500">{company}</p>
            </div>
        </div>
    </div>
)


export default function Abonnement() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(false)

  const handleCheckout = async (plan) => {
    setLoading(plan)
    try {
      const { data } = await api.post('/api/stripe/create-checkout-session', { plan, billingCycle })
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la redirection vers Stripe.')
      setLoading(false)
    }
  }

  const plans = {
    monthly: [
      { id: 'starter', name: 'Starter', price: 39, badge: 'Fondateur', badgeClass: 'bg-gray-100 text-gray-700', features: ['Jusqu\'à 100 clients', 'Scores & Segments', 'Module Tâches', 'Support Email'], popular: false },
      { id: 'pro', name: 'Pro', price: 69, badge: 'Populaire', badgeClass: 'bg-[#2563eb] text-white', features: ['Jusqu\'à 500 clients', 'Tout Starter', 'Assistant IA - ARK', 'Rapports avancés'], popular: true },
      { id: 'elite', name: 'Elite', price: 129, badge: 'Illimité', badgeClass: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white', features: ['Clients illimités', 'Tout Pro', 'API & Intégrations', 'Support prioritaire'], popular: false },
    ],
    annually: [
      { id: 'starter', name: 'Starter', price: Math.round(39*12*0.8), per: '/an', badge: 'Fondateur', badgeClass: 'bg-gray-100 text-gray-700', features: ['Jusqu\'à 100 clients', 'Scores & Segments', 'Module Tâches', 'Support Email'], popular: false },
      { id: 'pro', name: 'Pro', price: Math.round(69*12*0.8), per: '/an', badge: 'Populaire', badgeClass: 'bg-[#2563eb] text-white', features: ['Jusqu\'à 500 clients', 'Tout Starter', 'Assistant IA - ARK', 'Rapports avancés'], popular: true },
      { id: 'elite', name: 'Elite', price: Math.round(129*12*0.8), per: '/an', badge: 'Illimité', badgeClass: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white', features: ['Clients illimités', 'Tout Pro', 'API & Intégrations', 'Support prioritaire'], popular: false },
    ]
  }

  const currentPlans = plans[billingCycle]

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      <main className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-transparent bg-clip-text">Choisissez votre plan</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Débloquez la puissance de l'IA pour votre cabinet de courtage. Simple, transparent et sans engagement.</p>
          <div className="mt-10 flex justify-center items-center gap-4">
            <span className={`font-semibold ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>Mensuel</span>
            <button onClick={() => setBillingCycle(c => c === 'monthly' ? 'annually' : 'monthly')} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-300 ease-in-out ${billingCycle === 'annually' ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
              <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${billingCycle === 'annually' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`font-semibold ${billingCycle === 'annually' ? 'text-blue-600' : 'text-gray-500'}`}>Annuel <span className="text-emerald-500 font-bold">(-20%)</span></span>
          </div>
        </div>

        <div className="mt-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {currentPlans.map(plan => (
            <div key={plan.id} className={`bg-white rounded-2xl p-8 border transition-all duration-300 ${plan.popular ? 'border-2 border-[#2563eb] shadow-2xl shadow-blue-500/20 scale-105 z-10' : 'border-gray-200 shadow-lg'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.badge && <span className={`px-3 py-1 text-xs font-semibold rounded-full ${plan.badgeClass}`}>{plan.badge}</span>}
              </div>
              <p className="mt-6"><span className="text-6xl font-black text-gray-900">{plan.price}€</span><span className="text-lg font-semibold text-gray-500">{plan.per || '/mois'}</span></p>
              <ul className="mt-8 space-y-4 text-sm text-gray-600">
                {plan.features.map(f => (<li key={f} className="flex items-start gap-3"><Check className="text-emerald-500 mt-0.5 flex-shrink-0" size={18} /><span>{f}</span></li>))}
              </ul>
              <button onClick={() => handleCheckout(plan.id)} disabled={loading} className="w-full mt-10 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ease-out hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white hover:shadow-blue-500/30">
                {loading === plan.id ? 'Redirection...' : 'Choisir ce plan'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-28 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">Ils nous font confiance</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard text="COURTIA a transformé ma façon de gérer mon portefeuille. Les scores me font gagner un temps précieux." author="Julie Martin" company="Assurances Martin & Fils" avatarUrl="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
            <TestimonialCard text="L'interface est intuitive et l'IA est bluffante. Je ne pourrais plus m'en passer pour prioriser mes actions." author="Lucas Dubois" company="Cabinet Dubois Conseil" avatarUrl="https://i.pravatar.cc/150?u=a042581f4e29026705d" />
            <TestimonialCard text="Enfin un CRM pensé pour les courtiers. Simple, efficace et orienté business. Je recommande à 100%." author="Chloé Petit" company="CP Assur" avatarUrl="https://i.pravatar.cc/150?u=a042581f4e29026706d" />
          </div>
        </div>

        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">Questions fréquentes</h2>
          <div className="mt-8">
            <FAQItem q="Puis-je changer de plan plus tard ?" a="Absolument. Vous pouvez faire évoluer ou réduire votre plan à tout moment depuis vos paramètres de facturation." />
            <FAQItem q="Quelle est votre politique d'annulation ?" a="Vous pouvez annuler votre abonnement à tout moment. Vous conserverez l'accès à votre plan jusqu'à la fin de la période de facturation en cours." />
            <FAQItem q="Y a-t-il des frais d'installation ?" a="Non, il n'y a aucun frais caché ou d'installation. Vous payez simplement le prix de l'abonnement mensuel ou annuel." />
            <FAQItem q="Les données de mes clients sont-elles en sécurité ?" a="La sécurité est notre priorité absolue. Vos données sont chiffrées (AES-256) et hébergées en Europe sur des serveurs conformes aux normes les plus strictes." />
            <FAQItem q="Comment fonctionne le support client ?" a="Le support est disponible par email pour tous les plans. Les plans Pro et Elite bénéficient d'un support prioritaire avec des temps de réponse garantis." />
          </div>
        </div>
      </main>
      <footer className="text-center py-8">
        <p className="text-xs text-gray-400">Rhasrhass®</p>
      </footer>
    </div>
  )
}
