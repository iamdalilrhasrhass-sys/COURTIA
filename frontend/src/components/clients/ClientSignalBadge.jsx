import React from 'react'
import { BADGE_COLORS } from '../../utils/clientBubbleVariants'

/**
 * ClientSignalBadge — Small badge showing a signal symbol (!, €, ⏱, etc.)
 * Used inside bubbles and action sheets.
 */
export default function ClientSignalBadge({ symbol, label, size = 'sm', className = '' }) {
  const config = BADGE_COLORS[symbol] || BADGE_COLORS['?']
  const sizeClass = size === 'lg' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none ${sizeClass} ${className}`}
      style={{
        background: config.bg,
        color: config.color,
        border: config.border,
      }}
      title={label}
    >
      {symbol}
      {label && size === 'lg' && <span>{label}</span>}
    </span>
  )
}
