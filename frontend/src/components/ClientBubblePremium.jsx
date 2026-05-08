import React, { useState, useMemo } from 'react'
import { computeClientIntelligence } from '../utils/clientIntelligence'
import { getBubbleConfigV2 } from '../utils/clientBubbleVariants'
import { openWhatsappForClient } from '../utils/whatsapp'
import ClientBubbleActionSheet from './clients/ClientBubbleActionSheet'

/**
 * ClientBubblePremium V2 — Bulle Aurora premium.
 * Refonte mai 2026 : plus petite, plus dense, status-driven.
 * Verre uniforme avec anneau coloré par signal, micro-badge critique uniquement.
 *
 * Taille réduite : 72-88px (vs 96-128px avant).
 * Animation subtile : float 6s très léger, hover scale 1.05.
 * Micro-badge : seulement "!" (alerte) et "⏱" (échéance).
 */
export default function ClientBubblePremiumV2({
  client,
  onClick,
  onViewDetail,
  onAskArk,
  onCreateTask,
  floatDelay = 0,
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const intelligence = useMemo(() => {
    if (!client) return null
    return computeClientIntelligence(client, client._quotes || [], client._appointments || [])
  }, [client])

  const bubbleConfig = useMemo(() => {
    if (!intelligence) return null
    return getBubbleConfigV2(intelligence)
  }, [intelligence])

  if (!intelligence || !bubbleConfig) {
    return <div className="w-[72px] h-[72px] rounded-full bg-gray-100/50 animate-pulse" />
  }

  const { glass, statusStyle, size, microBadge, statusLabel } = bubbleConfig
  const CX = size / 2
  const CY = size / 2
  const R = size * 0.44
  const gradId = `cb2-${client.id || Math.random().toString(36).slice(2, 8)}`

  const handleBubbleClick = () => setSheetOpen(true)
  const handleViewDetail = (id) => onViewDetail?.(id) || onClick?.(id)

  return (
    <div className="relative">
      <style>{`
        @keyframes cbFloat2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes haloPulse-${gradId} {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
      `}</style>

      <div
        onClick={handleBubbleClick}
        className="flex flex-col items-center gap-1 cursor-pointer select-none group"
        style={{
          animation: `cbFloat2 6s ease-in-out ${floatDelay}s infinite`,
          animationFillMode: 'both',
        }}
        role="button"
        tabIndex={0}
        aria-label={`${intelligence.displayName} — ${statusLabel}`}
      >
        {/* Bubble wrapper */}
        <div
          className="relative transition-all duration-200 ease-out group-hover:scale-105 group-active:scale-[0.97]"
          style={{ width: size, height: size }}
        >
          {/* Priority halo (externe) */}
          <div style={{
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${statusStyle.haloColor}, transparent 65%)`,
            filter: 'blur(10px)',
            animation: statusStyle.pulse ? `haloPulse-${gradId} 3s ease-in-out infinite` : undefined,
            pointerEvents: 'none',
          }} />

          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
            <defs>
              {/* Verre Aurora uniforme */}
              <radialGradient id={`${gradId}-body`} cx="32%" cy="28%" r="72%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="18%" stopColor={glass.light} />
                <stop offset="40%" stopColor={glass.mid} />
                <stop offset="75%" stopColor={glass.dark} />
                <stop offset="100%" stopColor="rgba(240,238,248,0.55)" />
              </radialGradient>
              {/* Film irisé Aurora */}
              <radialGradient id={`${gradId}-film`} cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="rgba(200,180,255,0.12)" />
                <stop offset="35%" stopColor="rgba(180,210,240,0.06)" />
                <stop offset="65%" stopColor="rgba(220,180,210,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
              </radialGradient>
              {/* Spéculaire (reflet) */}
              <radialGradient id={`${gradId}-spec`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                <stop offset="35%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter id={`${gradId}-blur`}>
                <feGaussianBlur stdDeviation="0.6" />
              </filter>
            </defs>

            {/* Status ring (anneau différenciateur) */}
            <circle cx={CX} cy={CY} r={R + 3.5}
              fill="none"
              stroke={statusStyle.ring}
              strokeWidth="1.2"
              opacity="0.85"
            />

            {/* Corps principal — verre */}
            <circle cx={CX} cy={CY} r={R}
              fill={`url(#${gradId}-body)`}
              stroke="rgba(255,255,255,0.40)"
              strokeWidth="0.5"
            />

            {/* Film irisé */}
            <circle cx={CX} cy={CY} r={R}
              fill={`url(#${gradId}-film)`}
              opacity="0.30"
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Spéculaire (reflet haut-gauche) */}
            <ellipse cx={CX - size * 0.16} cy={CY - size * 0.19}
              rx={size * 0.10} ry={size * 0.05}
              fill={`url(#${gradId}-spec)`}
              transform={`rotate(-10 ${CX - size * 0.16} ${CY - size * 0.19})`}
              filter={`url(#${gradId}-blur)`}
              opacity="0.75"
            />
            {/* Point brillant */}
            <ellipse cx={CX - size * 0.19} cy={CY - size * 0.22}
              rx={size * 0.028} ry={size * 0.014}
              fill="rgba(255,255,255,0.85)"
              transform={`rotate(-10 ${CX - size * 0.19} ${CY - size * 0.22})`}
            />
          </svg>

          {/* Overlay content (initiales + micro badge) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Micro badge (top-right, uniquement si critique) */}
            {microBadge && (
              <div className="absolute"
                style={{ top: size * 0.08, right: size * 0.10 }}
              >
                <span className="text-[9px] font-black leading-none"
                  style={{ color: microBadge.color, textShadow: '0 0 4px rgba(255,255,255,0.6)' }}>
                  {microBadge.symbol}
                </span>
              </div>
            )}

            {/* Initiales */}
            <span style={{
              fontSize: size * 0.20,
              fontWeight: 700,
              color: 'rgba(30,25,40,0.85)',
              textShadow: '0 1px 3px rgba(255,255,255,0.5)',
              lineHeight: 1.1,
              letterSpacing: '-0.3px',
            }}>
              {intelligence.initials}
            </span>
          </div>
        </div>

        {/* Info below */}
        <div className="flex flex-col items-center gap-0 max-w-[90px]">
          <span className="text-[10px] font-semibold text-gray-700 truncate max-w-full text-center leading-tight">
            {intelligence.displayName}
          </span>
          <span className="text-[8px] font-medium text-gray-400 uppercase tracking-wider leading-none">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Action Sheet */}
      <ClientBubbleActionSheet
        client={client}
        intelligence={intelligence}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onViewDetail={handleViewDetail}
        onAskArk={onAskArk}
        onCreateTask={onCreateTask}
      />
    </div>
  )
}
