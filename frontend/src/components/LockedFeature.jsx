import React from 'react'
import { usePlanStore } from '../stores/planStore'
import { useNavigate } from 'react-router-dom'

/**
 * Wrapper qui blur le contenu si la feature est locked.
 * Props: { feature: string, requiredPlan: 'pro' | 'elite', label: string, children }
 */
export default function LockedFeature({ feature, requiredPlan = 'pro', label = 'Premium', children }) {
  const features = usePlanStore(s => s.features)
  const allowed = features[feature] === true
  const navigate = useNavigate()

  const handleUpgrade = () => {
    navigate(`/billing?plan=${requiredPlan}`)
  }

  return (
    <div className="relative">
      <div className={allowed ? '' : 'blur-sm pointer-events-none select-none'}>
        {children}
      </div>
      {!allowed && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ backdropFilter: 'blur(2px)', backgroundColor: 'rgba(255,255,255,0.3)' }}
        >
          <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 text-center max-w-xs">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h3 className="font-bold text-gray-900 mb-1">Fonction {label}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Disponible avec le plan{' '}
              <span className="font-semibold capitalize">{requiredPlan}</span>
            </p>
            <button
              onClick={handleUpgrade}
              className="w-full py-2 px-4 rounded-lg text-white font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1d4ed8' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2563eb' }}
            >
              Débloquer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
