import { useState } from 'react'
import api from '../api'

export default function Paywall({ feature, plan }) {
  const [loading, setLoading] = useState(null)

  const upgrade = async (target) => {
    setLoading(target)
    try {
      const { data } = await api.post('/stripe/checkout', { plan: target })
      window.location.href = data.url
    } catch (err) {
      console.error('Paywall upgrade failed:', err)
      alert('Impossible de procéder au paiement. Vérifiez votre connexion.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Fonctionnalité Premium</h2>
        <p className="text-sm text-gray-500 mb-6">
          Cette fonctionnalité nécessite un plan supérieur.
          {plan && <span className="block mt-1">Plan actuel : <strong>{plan}</strong></span>}
          {feature && <span className="block mt-1 text-xs text-gray-400">Fonctionnalité : {feature}</span>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => upgrade('pro')}
            disabled={loading === 'pro'}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading === 'pro' ? 'Redirection...' : 'Passer Pro — 159€/mois'}
          </button>
          <button
            onClick={() => upgrade('premium')}
            disabled={loading === 'premium'}
            className="px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {loading === 'premium' ? 'Redirection...' : 'Premium — sur devis'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">30 jours d'essai gratuits. Sans engagement.</p>
      </div>
    </div>
  )
}
