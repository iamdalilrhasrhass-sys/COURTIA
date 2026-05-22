// ArkRadarCombat.jsx
// Radar chart hexagonal comparant jusqu'à 4 offres sur 6 axes ARK.
// Props :
//   offers {Array} — [{id, partnerName, scores: {price,coverage,acceptance,margin,stability,speed}, recommended}]
//   onOfferClick {function(offer)}
//
// Scores : 0-100 sur chaque axe.

import { useState } from 'react'

const AXES = [
  { key: 'price',       label: 'Prix' },
  { key: 'coverage',    label: 'Couverture' },
  { key: 'acceptance',  label: 'Acceptation' },
  { key: 'margin',      label: 'Marge' },
  { key: 'stability',   label: 'Stabilité' },
  { key: 'speed',       label: 'Rapidité' },
]

const OFFER_COLORS = ['#534AB7', '#1D9E75', '#D85A30', '#888780']
const OFFER_BG     = ['#EEEDFE', '#E1F5EE', '#FAECE7', '#F1EFE8']

const DEFAULT_OFFERS = [
  { id: '1', partnerName: 'April',    recommended: true,  scores: { price:88, coverage:75, acceptance:90, margin:70, stability:80, speed:95 } },
  { id: '2', partnerName: 'Wakam',    recommended: false, scores: { price:72, coverage:85, acceptance:80, margin:55, stability:70, speed:60 } },
  { id: '3', partnerName: 'Allianz',  recommended: false, scores: { price:60, coverage:90, acceptance:70, margin:45, stability:90, speed:40 } },
]

function polarPoint(cx, cy, r, angleIndex, total) {
  const angle = (angleIndex / total) * 2 * Math.PI - Math.PI / 2
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function offerToPolygon(offer, cx, cy, maxR) {
  return AXES.map((axis, i) => {
    const val = (offer.scores[axis.key] ?? 0) / 100
    return polarPoint(cx, cy, maxR * val, i, AXES.length)
  })
}

export default function ArkRadarCombat({
  offers = DEFAULT_OFFERS,
  onOfferClick,
  size = 280,
}) {
  const [activeAxis, setActiveAxis] = useState(null)
  const [hiddenOffers, setHiddenOffers] = useState(new Set())

  const cx = size / 2
  const cy = size / 2 + 10
  const maxR = size * 0.36
  const levels = [0.25, 0.5, 0.75, 1]

  const toggleOffer = (id) => {
    setHiddenOffers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sortedByAxis = activeAxis
    ? [...offers].sort((a, b) => (b.scores[activeAxis] ?? 0) - (a.scores[activeAxis] ?? 0))
    : offers

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Comparateur ARK</p>
        {activeAxis && (
          <button
            className="text-xs text-slate-400 hover:text-slate-600"
            onClick={() => setActiveAxis(null)}
          >
            Réinitialiser tri ×
          </button>
        )}
      </div>

      <div className="flex gap-4 items-start">
        {/* Radar SVG */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
          {/* Grid rings */}
          {levels.map(level => (
            <polygon
              key={level}
              points={AXES.map((_, i) => {
                const p = polarPoint(cx, cy, maxR * level, i, AXES.length)
                return `${p.x},${p.y}`
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-slate-200 dark:text-slate-700"
            />
          ))}

          {/* Axis lines */}
          {AXES.map((axis, i) => {
            const end = polarPoint(cx, cy, maxR, i, AXES.length)
            const isActive = activeAxis === axis.key
            return (
              <line
                key={axis.key}
                x1={cx} y1={cy} x2={end.x} y2={end.y}
                stroke={isActive ? '#534AB7' : 'currentColor'}
                strokeWidth={isActive ? 1.5 : 0.5}
                className={isActive ? '' : 'text-slate-200 dark:text-slate-700'}
              />
            )
          })}

          {/* Offer polygons */}
          {offers.map((offer, oi) => {
            if (hiddenOffers.has(offer.id)) return null
            const pts = offerToPolygon(offer, cx, cy, maxR)
            const pointStr = pts.map(p => `${p.x},${p.y}`).join(' ')
            const color = OFFER_COLORS[oi % OFFER_COLORS.length]
            const bg = OFFER_BG[oi % OFFER_BG.length]
            return (
              <g key={offer.id}>
                <polygon
                  points={pointStr}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={color}
                  strokeWidth={offer.recommended ? 2 : 1}
                  strokeOpacity={0.8}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s' }}
                  onClick={() => onOfferClick?.(offer)}
                />
                {offer.recommended && pts.map((p, pi) => (
                  <circle key={pi} cx={p.x} cy={p.y} r={3} fill={color} opacity={0.8} />
                ))}
              </g>
            )
          })}

          {/* Axis labels — clickable to sort */}
          {AXES.map((axis, i) => {
            const labelPt = polarPoint(cx, cy, maxR + 20, i, AXES.length)
            const isActive = activeAxis === axis.key
            return (
              <text
                key={axis.key}
                x={labelPt.x}
                y={labelPt.y + 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight={isActive ? '600' : '400'}
                fill={isActive ? '#534AB7' : 'currentColor'}
                className={isActive ? '' : 'text-slate-500 dark:text-slate-400'}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveAxis(prev => prev === axis.key ? null : axis.key)}
              >
                {axis.label}
              </text>
            )
          })}

          {/* Center */}
          <circle cx={cx} cy={cy} r={3} fill="currentColor" className="text-slate-300" />
        </svg>

        {/* Offer legend + scores */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {sortedByAxis.map((offer, oi) => {
            const color = OFFER_COLORS[oi % OFFER_COLORS.length]
            const bg = OFFER_BG[oi % OFFER_BG.length]
            const isHidden = hiddenOffers.has(offer.id)
            const displayScore = activeAxis
              ? offer.scores[activeAxis] ?? 0
              : Math.round(Object.values(offer.scores).reduce((a, b) => a + b, 0) / AXES.length)

            return (
              <button
                key={offer.id}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left border transition-all ${isHidden ? 'opacity-40' : ''}`}
                style={{ borderColor: color + '40', backgroundColor: bg }}
                onClick={() => toggleOffer(offer.id)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate" style={{ color: color }}>{offer.partnerName}</span>
                    {offer.recommended && (
                      <span className="text-xs px-1 rounded" style={{ backgroundColor: color + '20', color }}>★ ARK</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    {activeAxis ? AXES.find(a => a.key === activeAxis)?.label : 'Score global'}
                  </span>
                </span>
                <span className="text-sm font-semibold flex-shrink-0" style={{ color }}>{displayScore}</span>
              </button>
            )
          })}

          <p className="text-xs text-slate-400 mt-1">
            Clic sur un axe pour trier · clic sur une offre pour masquer
          </p>
        </div>
      </div>
    </div>
  )
}
