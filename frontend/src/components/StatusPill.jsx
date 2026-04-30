import React from 'react'

const STATUS_CONFIG = {
  actif: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Actif' },
  inactif: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Inactif' },
  risque: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Risque' },
  dry_run: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Dry Run' },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Succès' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Attention' },
  error: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Erreur' },
  pending: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'En attente' },
}

/**
 * StatusPill — Petit statut coloré (actif/inactif/risque/dry_run)
 * Props: { status, label, size, pulse }
 */
export default function StatusPill({ status = 'inactif', label, size = 'sm', pulse = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactif
  const displayLabel = label || config.label
  const isSmall = size === 'sm'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        whitespace-nowrap
        ${config.bg} ${config.text}
        ${isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}
        transition-all duration-200
      `}
    >
      <span
        className={`
          rounded-full
          ${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'}
          ${config.dot}
          ${pulse ? 'animate-pulse' : ''}
        `}
      />
      {displayLabel}
    </span>
  )
}
