// RiskDnaHelix.jsx
// Hélice ADN animée représentant le profil de risque d'un client.
//
// Props (toutes issues de DONNÉES SERVEUR, jamais d'un jeu d'exemple) :
//   riskFactors {Array} — [{id, label, level: 'clean'|'caution'|'risk'|'critical'|'inconnu', value}]
//   score       {number|null} — score de risque du serveur (0-100) ; null = non mesuré
//   clientName  {string}
//   onFactorClick {function(factor)} — callback au clic sur un segment
//
// AUCUNE valeur par défaut n'est dessinée : ce composant dessinait auparavant un
// jeu de facteurs d'exemple codé en dur (bonus-malus, résiliation, sinistres,
// ancienneté, usage, puissance) et calculait lui-même un score « / 100 » à partir
// de la part de facteurs « propres ». Sur une fiche client sans données de
// risque, l'écran affichait donc un profil inventé (relevé en production le
// 21/09/2026). Sans facteurs transmis, il n'y a rien à montrer : l'écran le dit.

import { useEffect, useRef, useState } from 'react'

const LEVEL_COLORS = {
  clean:    { fill: '#22C55E', glow: '#5DCAA5', label: 'Propre' },
  caution:  { fill: '#F59E0B', glow: '#FAC775', label: 'Attention' },
  risk:     { fill: '#EF4444', glow: '#F0997B', label: 'Risque' },
  critical: { fill: '#E24B4A', glow: '#F09595', label: 'Critique' },
  inconnu:  { fill: '#94A3B8', glow: '#CBD5E1', label: 'Non classé' },
}

export default function RiskDnaHelix({
  riskFactors = [],
  score = null,
  clientName = 'Client',
  onFactorClick,
  width = 340,
  height = 200,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const [hoveredFactor, setHoveredFactor] = useState(null)
  const tRef = useRef(0)

  const facteurs = Array.isArray(riskFactors) ? riskFactors : []
  const aDesFacteurs = facteurs.length > 0
  const scoreMesure = Number.isFinite(score) ? Math.round(score) : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const t = tRef.current
      const dark = window.matchMedia('(prefers-color-scheme:dark)').matches
      const strandColor = dark ? 'rgba(180,180,220,0.15)' : 'rgba(100,100,160,0.12)'
      const connectorColor = dark ? 'rgba(180,180,220,0.25)' : 'rgba(100,100,160,0.2)'

      const cx = width / 2
      const amplitude = 55
      const frequency = (2 * Math.PI) / (width * 0.7)
      const speed = t * 0.018
      const numPoints = 80

      // Strand A points
      const strandA = []
      const strandB = []
      for (let i = 0; i <= numPoints; i++) {
        const x = 20 + (i / numPoints) * (width - 40)
        const phase = i * frequency * (width - 40) + speed
        strandA.push({ x, y: cx + Math.sin(phase) * amplitude })
        strandB.push({ x, y: cx + Math.sin(phase + Math.PI) * amplitude })
      }

      // Draw backbone A
      ctx.beginPath()
      strandA.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = strandColor
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Draw backbone B
      ctx.beginPath()
      strandB.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = strandColor
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Draw base pairs (rungs) with risk factor colors
      const rungCount = facteurs.length
      facteurs.forEach((factor, fi) => {
        const progress = (fi + 1) / (rungCount + 1)
        const idx = Math.floor(progress * numPoints)
        const pA = strandA[idx]
        const pB = strandB[idx]
        if (!pA || !pB) return

        const col = LEVEL_COLORS[factor.level] ?? LEVEL_COLORS.inconnu
        const isHovered = hoveredFactor?.id === factor.id

        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.strokeStyle = col.fill
        ctx.lineWidth = isHovered ? 3 : 2
        ctx.globalAlpha = isHovered ? 1 : 0.75
        ctx.stroke()
        ctx.globalAlpha = 1

        // Node on strand A
        ctx.beginPath()
        ctx.arc(pA.x, pA.y, isHovered ? 6 : 4, 0, Math.PI * 2)
        ctx.fillStyle = col.fill
        ctx.globalAlpha = 0.9
        ctx.fill()
        ctx.globalAlpha = 1

        // Node on strand B
        ctx.beginPath()
        ctx.arc(pB.x, pB.y, isHovered ? 6 : 4, 0, Math.PI * 2)
        ctx.fillStyle = col.glow
        ctx.globalAlpha = 0.9
        ctx.fill()
        ctx.globalAlpha = 1

        // Glow on hover
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(pA.x, pA.y, 12, 0, Math.PI * 2)
          ctx.fillStyle = col.fill
          ctx.globalAlpha = 0.2
          ctx.fill()
          ctx.globalAlpha = 1
        }
      })

      tRef.current++
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height, facteurs, hoveredFactor])

  const scoreColor = scoreMesure === null
    ? 'text-slate-400'
    : scoreMesure >= 70 ? 'text-emerald-500' : scoreMesure >= 45 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Profil de risque</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{clientName}</p>
        </div>
        <div className="text-right">
          {scoreMesure === null ? (
            <p className="text-sm font-medium text-slate-400" data-testid="risque-non-mesure">non mesuré</p>
          ) : (
            <>
              <p className={`text-2xl font-semibold ${scoreColor}`}>{scoreMesure}</p>
              <p className="text-xs text-slate-400">/ 100</p>
            </>
          )}
        </div>
      </div>

      {!aDesFacteurs && (
        <p className="px-4 pb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Aucune donnée de risque n’est transmise par le serveur pour ce client :
          ni bonus-malus, ni sinistres, ni ancienneté de permis, ni zone.
          Rien n’est affiché plutôt qu’un profil d’exemple.
        </p>
      )}

      {aDesFacteurs && (
        <>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full"
            style={{ height }}
          />

          <div className="grid grid-cols-2 gap-1 p-3">
            {facteurs.map(factor => {
              const col = LEVEL_COLORS[factor.level] ?? LEVEL_COLORS.inconnu
              return (
                <button
                  key={factor.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  onMouseEnter={() => setHoveredFactor(factor)}
                  onMouseLeave={() => setHoveredFactor(null)}
                  onClick={() => onFactorClick?.(factor)}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.fill }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{factor.label}</span>
                    <span className="block text-xs text-slate-400 truncate">{factor.value}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 px-3 pb-3">
            {Object.entries(LEVEL_COLORS).map(([level, col]) => (
              <div key={level} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.fill }} />
                <span className="text-xs text-slate-400">{col.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
