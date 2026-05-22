// CommissionForecastBar.jsx
// Barres de commissions (données réelles + prédiction ARK 3 mois).
// Props :
//   data {Array} — [{month, amount, type: 'real'|'forecast', confidence?}]
//   currency {'EUR'} — devise
//   onBarClick {function({month, amount})}
//
// Note : ne nécessite pas Recharts. Pure SVG.

import { useState } from 'react'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const now = new Date()
function generateDefaultData() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 9 + i, 1)
    const m = d.getMonth()
    const isForecast = d > now
    const base = 1800 + Math.sin(i * 0.7) * 600 + Math.random() * 400
    return {
      month: `${MONTHS_FR[m]} ${d.getFullYear().toString().slice(2)}`,
      amount: isForecast ? base * 1.1 : base,
      type: isForecast ? 'forecast' : 'real',
      confidence: isForecast ? Math.round(70 + Math.random() * 20) : 100,
      annotation: i === 7 ? 'Renouvellements PRO' : i === 10 ? 'Prévision campagne Auto' : null,
    }
  })
}

export default function CommissionForecastBar({
  data = generateDefaultData(),
  currency = 'EUR',
  onBarClick,
  width = 560,
  height = 240,
}) {
  const [hovered, setHovered] = useState(null)

  const maxAmount = Math.max(...data.map(d => d.amount))
  const chartH = height - 60
  const chartW = width - 40
  const barWidth = Math.floor((chartW / data.length) * 0.6)
  const barGap = (chartW / data.length)

  const totalReal = data.filter(d => d.type === 'real').reduce((s, d) => s + d.amount, 0)
  const totalForecast = data.filter(d => d.type === 'forecast').reduce((s, d) => s + d.amount, 0)

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.round(n))

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Commissions 12 mois</p>
          <p className="text-xs text-slate-400">Données réelles + prédiction ARK</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-slate-400">Encaissé</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(totalReal)}</p>
          </div>
          <div>
            <p className="text-xs text-violet-500">Prévu ARK</p>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{fmt(totalForecast)}</p>
          </div>
        </div>
      </div>

      <div className="relative" style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          {/* Y grid lines */}
          {[0.25, 0.5, 0.75, 1].map(level => {
            const y = 20 + chartH * (1 - level)
            return (
              <g key={level}>
                <line x1={20} y1={y} x2={width - 20} y2={y}
                  stroke="currentColor" strokeWidth={0.5} strokeDasharray="4,4"
                  className="text-slate-100 dark:text-slate-800"
                />
                <text x={18} y={y + 4} textAnchor="end" fontSize={9}
                  fill="currentColor" className="text-slate-400">
                  {fmt(maxAmount * level)}
                </text>
              </g>
            )
          })}

          {/* Today divider */}
          {(() => {
            const todayIdx = data.findIndex(d => d.type === 'forecast')
            if (todayIdx < 0) return null
            const x = 20 + todayIdx * barGap
            return (
              <g>
                <line x1={x} y1={20} x2={x} y2={20 + chartH}
                  stroke="#7F77DD" strokeWidth={1} strokeDasharray="3,3" />
                <text x={x + 3} y={30} fontSize={8} fill="#7F77DD">Aujourd'hui</text>
              </g>
            )
          })()}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = Math.round((d.amount / maxAmount) * chartH)
            const x = 20 + i * barGap + (barGap - barWidth) / 2
            const y = 20 + chartH - barH
            const isHovered = hovered === i
            const isReal = d.type === 'real'

            return (
              <g key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onBarClick?.(d)}
              >
                {/* Bar */}
                <rect
                  x={x} y={y} width={barWidth} height={barH}
                  rx={3}
                  fill={isReal ? '#8B5CF6' : '#9F97E8'}
                  opacity={isReal ? (isHovered ? 1 : 0.85) : (isHovered ? 0.7 : 0.45)}
                />

                {/* Confidence stripe (forecast only) */}
                {!isReal && d.confidence && (
                  <rect
                    x={x} y={y} width={barWidth} height={Math.round(barH * (1 - d.confidence/100))}
                    rx={3}
                    fill="#EEEDFE"
                    opacity={0.5}
                  />
                )}

                {/* Annotation dot */}
                {d.annotation && (
                  <circle cx={x + barWidth/2} cy={y - 8} r={4}
                    fill="#EF9F27" />
                )}

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={Math.min(x - 10, width - 120)} y={y - 44}
                      width={110} height={38}
                      rx={4}
                      fill="white"
                      stroke="#E2E8F0"
                      strokeWidth={0.5}
                      filter="none"
                    />
                    <text x={Math.min(x - 10, width - 120) + 8} y={y - 28}
                      fontSize={9} fontWeight="500"
                      fill="#1e293b">
                      {d.month} — {fmt(d.amount)}
                    </text>
                    <text x={Math.min(x - 10, width - 120) + 8} y={y - 14}
                      fontSize={8} fill="#94A3B8">
                      {isReal ? 'Réel' : `Prédiction ARK — ${d.confidence}% conf.`}
                    </text>
                    {d.annotation && (
                      <text x={Math.min(x - 10, width - 120) + 8} y={y - 4}
                        fontSize={8} fill="#EF9F27" fontWeight="500">
                        ★ {d.annotation}
                      </text>
                    )}
                  </g>
                )}

                {/* X label */}
                <text
                  x={x + barWidth/2} y={20 + chartH + 16}
                  textAnchor="middle" fontSize={9}
                  fill={isReal ? 'currentColor' : '#9F97E8'}
                  className={isReal ? 'text-slate-500' : ''}
                >
                  {d.month}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-violet-700" />
          <span className="text-xs text-slate-500">Réel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-violet-300" />
          <span className="text-xs text-slate-500">Prédiction ARK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-500">Événement ARK</span>
        </div>
      </div>
    </div>
  )
}
