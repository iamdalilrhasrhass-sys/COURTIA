import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Loader, ArrowRight, Star, Sparkles } from 'lucide-react'
import api from '../api'
import PricingCard from '../components/PricingCard'
import { usePlanStore, PLANS_DEFINITION } from '../stores/planStore'

export default function Pricing() {
  const navigate = useNavigate()
  const currentPlan = usePlanStore(s => s.currentPlan)
  const [loading, setLoading] = useState(null)
  const [annual, setAnnual] = useState(false)

  const plans = Object.values(PLANS_DEFINITION)

  const handleChoose = async (planId) => {
    if (currentPlan === planId) return
    setLoading(planId)
    try {
      const { data } = await api.post('/billing/create-checkout-session', { plan: planId })
      if (data.mock) {
        navigate(`/billing?status=success&plan=${planId}&mock=true`)
      } else if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Pricing checkout error:', err)
      navigate(`/billing?status=cancel`)
    } finally {
      setLoading(null)
    }
  }

  const handleContact = () => {
    window.location.href = 'mailto:commercial@courtia.fr?subject=Demande%20devis%20Premium'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Plans simples & transparents
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
              Le tarif qui grandit avec vous
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
              Choisissez le plan adapté à votre activité. Pas de frais cachés, pas d'engagement.
              {currentPlan && (
                <span className="block mt-2 text-purple-600 font-medium">
                  Plan actuel : {PLANS_DEFINITION[currentPlan]?.name || currentPlan}
                </span>
              )}
            </p>
          </div>

          {/* Toggle mensuel/annuel */}
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !annual ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  annual ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annuel
                <span className="ml-1.5 text-xs opacity-80">-2 mois</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 -mt-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              annual={annual}
              loading={loading === plan.id}
              current={currentPlan === plan.id}
              onChoose={plan.price === null ? handleContact : () => handleChoose(plan.id)}
            />
          ))}
        </div>

        {/* Comparaison des features */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Comparaison détaillée
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Fonctionnalité</th>
                    <th className="text-center py-4 px-6 font-medium text-gray-900">Starter</th>
                    <th className="text-center py-4 px-6 font-medium text-purple-700 bg-purple-50/50">Pro</th>
                    <th className="text-center py-4 px-6 font-medium text-gray-900">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'CRM', starter: 'Basique', pro: 'Complet', premium: 'Complet' },
                    { label: 'ARK Assistant', starter: 'Limité', pro: 'Complet', premium: 'Complet' },
                    { label: 'REACH Prospection', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <Check className="w-4 h-4 text-green-500 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Automations & relances', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <Check className="w-4 h-4 text-green-500 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Scoring client', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <Check className="w-4 h-4 text-green-500 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Rapports avancés', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <Check className="w-4 h-4 text-green-500 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Clients', starter: '3 max', pro: 'Illimité', premium: 'Illimité' },
                    { label: 'Multi-utilisateurs', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <X className="w-4 h-4 text-red-400 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Support prioritaire', starter: <X className="w-4 h-4 text-red-400 mx-auto" />, pro: <X className="w-4 h-4 text-red-400 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                    { label: 'Import CSV', starter: <Check className="w-4 h-4 text-green-500 mx-auto" />, pro: <Check className="w-4 h-4 text-green-500 mx-auto" />, premium: <Check className="w-4 h-4 text-green-500 mx-auto" /> },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="py-3 px-6 font-medium text-gray-700">{row.label}</td>
                      <td className="py-3 px-6 text-center text-gray-600">{row.starter}</td>
                      <td className="py-3 px-6 text-center bg-purple-50/30 text-gray-800 font-medium">{row.pro}</td>
                      <td className="py-3 px-6 text-center text-gray-600">{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {[
              { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Le changement est effectif immédiatement.' },
              { q: 'Y a-t-il un engagement ?', a: 'Aucun engagement. Vous pouvez résilier à tout moment depuis votre espace abonnement.' },
              { q: 'Comment fonctionne la période d\'essai ?', a: 'Les 30 premiers jours sont gratuits avec toutes les fonctionnalités du plan Pro. Aucune carte bancaire requise.' },
              { q: 'Le paiement est-il sécurisé ?', a: 'Tous les paiements sont traités par Stripe, leader mondial des paiements en ligne. Vos données bancaires ne transitent jamais sur nos serveurs.' },
            ].map((faq, i) => (
              <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-4 text-gray-500 text-sm leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronDown({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
