import { Check } from 'lucide-react'

export default function PricingCard({ plan, annual, loading, current, onChoose }) {
  const annualPrice = plan.price ? Math.round(plan.price * 10) : null // 2 mois gratuits

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 shadow-sm transition-all hover:shadow-lg ${
        plan.highlighted
          ? 'border-purple-500 ring-1 ring-purple-500 scale-105'
          : 'border-gray-200'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
          Recommandé
        </div>
      )}
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

        <div className="mt-4 flex items-baseline gap-1">
          {plan.price !== null ? (
            <>
              <span className="text-4xl font-bold text-gray-900">
                {annual ? annualPrice : plan.price}
              </span>
              <span className="text-gray-500 text-sm">
                €{annual ? '/an' : plan.interval}
              </span>
            </>
          ) : (
            <span className="text-3xl font-bold text-gray-900">Sur devis</span>
          )}
        </div>

        {annual && plan.price !== null && (
          <p className="mt-1 text-xs text-green-600 font-medium">
            Économisez {plan.price * 2}€ par an
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {plan.features_list.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={onChoose}
          disabled={loading || current}
          className={`mt-8 w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            current
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : plan.highlighted
              ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {loading ? 'Redirection...' : current ? 'Plan actuel' : plan.price === null ? 'Nous contacter' : 'Choisir'}
        </button>
      </div>
    </div>
  )
}
