import React from 'react'

const STATUS_COLORS = {
  active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  risque: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  dry_run: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  pending: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
}

const SIZE_MAP = {
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-3 py-1 text-sm gap-2',
}

const DOT_SIZE = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
}

/**
 * PremiumBadge — Badge premium avec indicateur coloré
 * Props: { status, children, size, pulse, dot }
 */
export default function PremiumBadge({ status = 'active', children, size = 'sm', pulse = false, dot = true }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.inactive

  return (
    <span
      className={`
        inline-flex items-center
        font-medium rounded-full
        transition-all duration-200
        ${colors.bg} ${colors.text}
        ${SIZE_MAP[size] || SIZE_MAP.sm}
      `}
    >
      {dot && (
        <span
          className={`
            rounded-full
            ${DOT_SIZE[size] || DOT_SIZE.sm}
            ${colors.dot}
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}
      {children}
    </span>
  )
}
