import React, { useState } from 'react'
import { usePlanStore } from '../stores/planStore'

// Mapping limitKey → clé dans limits (backend)
const LIMIT_KEYS_MAP = {
  clients: 'max_clients',
  contracts: 'max_contracts',
  ark_messages: 'max_ark_messages_monthly',
  generated_docs: 'max_pdf_generations_monthly'
}

/**
 * Badge quota pour sidebar.
 * Props: { limitKey: 'clients' | 'contracts' | 'ark_messages' | 'generated_docs', label: string }
 */
export default function UsageBadge({ limitKey, label }) {
  const usage = usePlanStore(s => s.usage)
  const limits = usePlanStore(s => s.limits)
  const [showTooltip, setShowTooltip] = useState(false)

  const limitField = LIMIT_KEYS_MAP[limitKey] || `max_${limitKey}`
  const max = limits[limitField]
  const current = usage[limitKey] || 0
  const isUnlimited = max === null || max === undefined

  const ratio = isUnlimited ? 0 : (max > 0 ? current / max : 0)

  const getColor = () => {
    if (isUnlimited) return '#10b981'
    if (ratio >= 0.9) return '#ef4444'
    if (ratio >= 0.7) return '#f59e0b'
    return '#10b981'
  }

  const color = getColor()

  return (
    <div
      className="flex items-center gap-2 text-xs relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-gray-700 truncate">{label}</span>
          <span className="text-gray-500 ml-1 shrink-0">
            {current} / {isUnlimited ? '∞' : max}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: isUnlimited ? '100%' : `${Math.min(ratio * 100, 100)}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
          {isUnlimited
            ? `${label} : illimité (${current} utilisés)`
            : `${label} : ${current} / ${max} (${Math.round(ratio * 100)}%)`
          }
        </div>
      )}
    </div>
  )
}
