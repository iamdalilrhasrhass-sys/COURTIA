import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

/**
 * Modal déclenchée quand l'API retourne 402.
 * Props: { open, error, onClose, onUpgrade }
 * error shape: { error: 'plan_upgrade_required' | 'limit_reached' | 'capitia_addon_inactive',
 *                required_plan, limit_type, current_usage, max_usage, message }
 */
export default function PaywallModal({ open, error, onClose, onUpgrade }) {
  const navigate = useNavigate()

  const getTitle = () => {
    if (!error) return 'Fonctionnalité Premium'
    if (error.error === 'capitia_addon_inactive') return 'Module CAPITIA'
    const plan = error.required_plan || 'Pro'
    return `Fonctionnalité ${plan.charAt(0).toUpperCase() + plan.slice(1)}`
  }

  const getDescription = () => {
    if (!error) return ''
    if (error.error === 'plan_upgrade_required') {
      const plan = error.required_plan || 'supérieur'
      return `Cette fonctionnalité est disponible avec le plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}.`
    }
    if (error.error === 'limit_reached') {
      return `Vous avez atteint votre limite de ${error.limit_type || 'ressources'} (${error.current_usage}/${error.max_usage}). Passez au plan supérieur pour continuer.`
    }
    if (error.error === 'capitia_addon_inactive') {
      return 'Activez CAPITIA pour 49€/mois et accédez au module financement IOBSP.'
    }
    return error.message || 'Passez au plan supérieur pour accéder à cette fonctionnalité.'
  }

  const handleUpgrade = () => {
    const plan = error?.required_plan || 'pro'
    if (onUpgrade) {
      onUpgrade(plan)
    } else {
      navigate(`/billing?plan=${plan}`)
    }
    if (onClose) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div
              className="px-6 py-8 text-white text-center"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
            >
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-2xl font-bold">{getTitle()}</h2>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-6 text-base leading-relaxed">
                {getDescription()}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleUpgrade}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: '#2563eb' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1d4ed8' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2563eb' }}
                >
                  Passer au plan {error?.required_plan || 'Pro'}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
