import React from 'react'
import { Activity, Target, Heart, Sparkles, ChevronRight } from 'lucide-react'

/**
 * ClientIntelligenceOrb — Intelligence indicator for client detail page.
 * Displays one dimension (Sante, Opportunite, Relation, Action ARK).
 */
const ORB_CONFIG = {
  sante: {
    icon: Activity,
    label: 'Santé client',
    colors: {
      good: { bg: 'rgba(94,196,167,0.08)', border: 'rgba(94,196,167,0.25)', color: '#3D8B70' },
      medium: { bg: 'rgba(210,180,100,0.08)', border: 'rgba(210,180,100,0.3)', color: '#B89930' },
      bad: { bg: 'rgba(232,149,163,0.08)', border: 'rgba(232,149,163,0.3)', color: '#C46A75' },
    },
  },
  opportunite: {
    icon: Target,
    label: 'Opportunité',
    colors: {
      good: { bg: 'rgba(124,106,176,0.08)', border: 'rgba(124,106,176,0.3)', color: '#7C6AB0' },
      medium: { bg: 'rgba(148,190,255,0.08)', border: 'rgba(148,190,255,0.3)', color: '#5E9EFF' },
      bad: { bg: 'rgba(168,180,192,0.08)', border: 'rgba(168,180,192,0.2)', color: '#8A96A4' },
    },
  },
  relation: {
    icon: Heart,
    label: 'Relation',
    colors: {
      good: { bg: 'rgba(94,158,255,0.08)', border: 'rgba(94,158,255,0.3)', color: '#4A82DB' },
      medium: { bg: 'rgba(210,180,100,0.08)', border: 'rgba(210,180,100,0.3)', color: '#B89930' },
      bad: { bg: 'rgba(232,149,163,0.08)', border: 'rgba(232,149,163,0.3)', color: '#C46A75' },
    },
  },
  action: {
    icon: Sparkles,
    label: 'Action ARK',
    colors: {
      good: { bg: 'rgba(168,150,212,0.08)', border: 'rgba(168,150,212,0.3)', color: '#8B6FC0' },
      medium: { bg: 'rgba(94,158,255,0.08)', border: 'rgba(94,158,255,0.3)', color: '#5E9EFF' },
      bad: { bg: 'rgba(232,149,163,0.08)', border: 'rgba(232,149,163,0.3)', color: '#C46A75' },
    },
  },
}

export default function ClientIntelligenceOrb({ type, level = 'medium', title, subtitle, score, onClick }) {
  const config = ORB_CONFIG[type]
  if (!config) return null

  const colors = config.colors[level] || config.colors.medium
  const Icon = config.icon

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: colors.bg,
        border: `0.5px solid ${colors.border}`,
      }}
    >
      {/* Halo */}
      <div
        className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${colors.border}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: colors.border }}
          >
            <Icon size={14} style={{ color: colors.color }} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {config.label}
          </span>
        </div>

        {title && <p className="text-sm font-bold text-gray-800 mb-0.5 truncate max-w-full">{title}</p>}
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}

        {score !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Score</span>
              <span className="text-xs font-bold" style={{ color: colors.color }}>{score}/100</span>
            </div>
            <div className="w-full h-1 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, score)}%`,
                  background: colors.color,
                }}
              />
            </div>
          </div>
        )}

        {onClick && (
          <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold" style={{ color: colors.color }}>
            Voir détails
            <ChevronRight size={12} />
          </div>
        )}
      </div>
    </div>
  )
}
