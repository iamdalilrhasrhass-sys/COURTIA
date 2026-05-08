import { useCanAccess, usePlanStore } from '../stores/planStore'
import { Sparkles, Lock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * LockedFeatureCTA — banner for premium-locked features.
 * @param {string} feature - feature key in FEATURE_GATES (e.g. 'ark_premium')
 * @param {string} title - feature name for display
 * @param {string} description - what the user is missing out on
 */
export default function LockedFeatureCTA({ feature, title, description, children }) {
  const { allowed, upgradeRequired, requiredPlanName, currentPlan, onTrial } = useCanAccess(feature)
  const loading = usePlanStore(s => s.loading)

  // Pendant le chargement initial, ne rien afficher (évite flash CTA)
  if (loading) return null

  // During trial OR if feature is accessible, show children normally
  if (onTrial || (allowed && !upgradeRequired)) {
    return children || null
  }

  // Feature locked — show CTA
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 p-6 text-center">
      {/* Subtle glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.3), transparent 60%)' }}
      />

      <div className="relative z-10">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <Lock size={18} className="text-slate-400" />
        </div>

        <h3 className="text-base font-bold text-gray-800 mb-1">
          {title || 'Fonctionnalité Premium'}
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto leading-relaxed">
          {description || `Débloquez cette fonctionnalité avec le plan ${requiredPlanName || 'Pro'}.`}
        </p>

        <a
          href="/abonnement"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md shadow-indigo-200/50"
        >
          <Sparkles size={14} />
          Passer {requiredPlanName || 'Pro'}
          <ArrowRight size={14} />
        </a>

        <p className="text-[10px] text-gray-400 mt-3">
          Actuellement : plan {currentPlan || 'Starter'}{onTrial ? ' (essai gratuit)' : ''}
        </p>
      </div>
    </div>
  )
}
