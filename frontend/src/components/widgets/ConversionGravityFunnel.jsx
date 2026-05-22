// ConversionGravityFunnel.jsx
// Funnel animé avec hauteurs dynamiques selon nb dossiers par stade.
// ARK annote les goulets d'étranglement.
// Props :
//   stages {Array} — [{id, label, count, color?, arkNote?}]
//   onStageClick {function(stage)}

import { useEffect, useRef, useState } from 'react'

const DEFAULT_STAGES = [
  { id: 'prospect',    label: 'Prospects',     count: 42, color: '#8B5CF6', arkNote: null },
  { id: 'analyse',     label: 'En analyse',    count: 28, color: '#8B5CF6', arkNote: null },
  { id: 'devis',       label: 'Devis envoyés', count: 18, color: '#22C55E', arkNote: '4 sans réponse depuis 5j' },
  { id: 'negociation', label: 'Négociation',   count: 9,  color: '#F59E0B', arkNote: 'Goulet : 50% de drop ici' },
  { id: 'signature',   label: 'Signés',        count: 6,  color: '#22C55E', arkNote: null },
]

export default function ConversionGravityFunnel({
  stages = DEFAULT_STAGES,
  onStageClick,
  width = 400,
  height = 300,
}) {
  const [animHeight, setAnimHeight] = useState(stages.map(() => 0))
  const [hovered, setHovered] = useState(null)
  const rafRef = useRef(null)

  const maxCount = Math.max(...stages.map(s => s.count))
  const targetHeights = stages.map(s => Math.round((s.count / maxCount) * (height - 80)))

  useEffect(() => {
    let current = stages.map(() => 0)
    let frame = 0

    const animate = () => {
      frame++
      let allDone = true
      current = current.map((h, i) => {
        const target = targetHeights[i]
        const delay = i * 6
        if (frame < delay) return h
        const next = Math.min(h + Math.ceil((target - h) * 0.12) + 1, target)
        if (next < target) allDone = false
        return next
      })
      setAnimHeight([...current])
      if (!allDone) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const barW = Math.floor((width - 40) / stages.length) - 8
  const totalConversion = stages.length >= 2
    ? Math.round((stages[stages.length - 1].count / stages[0].count) * 100)
    : 0

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pipeline de conversion</p>
        <div className="text-right">
          <p className="text-xs text-slate-400">Conversion globale</p>
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{totalConversion}%</p>
        </div>
      </div>

      <div
        className="relative"
        style={{ width, height }}
      >
        {/* Floor line */}
        <div
          className="absolute bottom-10 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800"
        />

        {/* Bars */}
        {stages.map((stage, i) => {
          const h = animHeight[i] ?? 0
          const x = 20 + i * ((width - 40) / stages.length)
          const isHovered = hovered === i
          const hasNote = !!stage.arkNote

          return (
            <div
              key={stage.id}
              style={{
                position: 'absolute',
                bottom: 40,
                left: x,
                width: barW,
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onStageClick?.(stage)}
            >
              {/* ARK annotation dot */}
              {hasNote && (
                <div style={{
                  position: 'absolute',
                  top: -h - 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  boxShadow: '0 0 0 3px rgba(239,159,39,0.2)',
                }} />
              )}

              {/* Count */}
              <div style={{
                position: 'absolute',
                top: -h - 32,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: stage.color,
              }}>
                {stage.count}
              </div>

              {/* Bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: h,
                backgroundColor: stage.color,
                opacity: isHovered ? 1 : 0.8,
                borderRadius: '4px 4px 0 0',
                transition: 'opacity 0.15s',
              }} />

              {/* Label */}
              <div style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--tw-prose-body)',
              }}>
                {stage.label}
              </div>
            </div>
          )
        })}

        {/* Conversion arrows */}
        {stages.slice(0, -1).map((_, i) => {
          const rate = Math.round((stages[i+1].count / stages[i].count) * 100)
          const x = 20 + (i + 0.5) * ((width - 40) / stages.length) + barW / 2
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: 12,
                left: x,
                fontSize: 9,
                color: '#94A3B8',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              → {rate}%
            </div>
          )
        })}
      </div>

      {/* ARK notes */}
      {stages.filter(s => s.arkNote).map(s => (
        <div key={s.id} className="flex items-start gap-2 mt-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-3 py-2">
          <span className="text-amber-500 text-xs mt-0.5">★</span>
          <div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{s.label} </span>
            <span className="text-xs text-amber-600 dark:text-amber-500">{s.arkNote}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
