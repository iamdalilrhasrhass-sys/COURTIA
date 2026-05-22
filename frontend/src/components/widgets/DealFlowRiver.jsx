// DealFlowRiver.jsx
// Simulation de particules fluides représentant les dossiers dans le pipeline.
// Chaque particule = un dossier. Couleur = urgence. Vitesse = priorité ARK.
// Props :
//   stages {Array} — [{id, label, count, color?}]
//   onStageClick {function(stage)}

import { useEffect, useRef, useState } from 'react'

const DEFAULT_STAGES = [
  { id: 'prospect',    label: 'Prospect',       count: 14, color: '#7F77DD' },
  { id: 'analyse',     label: 'Analyse ARK',    count: 9,  color: '#1D9E75' },
  { id: 'devis',       label: 'Devis envoyé',   count: 7,  color: '#EF9F27' },
  { id: 'negociation', label: 'Négociation',    count: 4,  color: '#D85A30' },
  { id: 'signature',   label: 'Signé',          count: 6,  color: '#1D9E75' },
]

function createParticles(stages, W, H) {
  const particles = []
  const stageWidth = W / stages.length

  stages.forEach((stage, si) => {
    const count = Math.min(stage.count, 18)
    for (let i = 0; i < count; i++) {
      const stageX = si * stageWidth
      particles.push({
        id: `${stage.id}-${i}`,
        stageIdx: si,
        x: stageX + 10 + Math.random() * (stageWidth - 20),
        y: H * 0.2 + Math.random() * H * 0.6,
        vx: (Math.random() - 0.3) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        r: 3 + Math.random() * 4,
        color: stage.color,
        alpha: 0.6 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      })
    }
  })
  return particles
}

export default function DealFlowRiver({
  stages = DEFAULT_STAGES,
  onStageClick,
  width = 600,
  height = 200,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const particlesRef = useRef([])
  const tRef = useRef(0)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    particlesRef.current = createParticles(stages, width, height)
  }, [stages, width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const stageWidth = width / stages.length

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const t = tRef.current
      const dark = window.matchMedia('(prefers-color-scheme:dark)').matches

      // Draw stage lanes
      stages.forEach((stage, si) => {
        const x = si * stageWidth
        const isHovered = hovered?.id === stage.id
        ctx.fillStyle = dark
          ? (isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)')
          : (isHovered ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.015)')
        ctx.fillRect(x, 0, stageWidth - 1, height)

        // Flow line (river bank)
        const flowY = height / 2 + Math.sin(t * 0.015 + si * 0.8) * 12
        ctx.beginPath()
        ctx.moveTo(x, flowY)
        for (let px = x; px < x + stageWidth; px += 2) {
          const wave = Math.sin((px * 0.05) + t * 0.02 + si * 1.2) * 8
          ctx.lineTo(px, height / 2 + wave)
        }
        ctx.strokeStyle = dark
          ? `rgba(${hexToRgb(stage.color)},0.08)`
          : `rgba(${hexToRgb(stage.color)},0.06)`
        ctx.lineWidth = 30
        ctx.stroke()
      })

      // Separators
      for (let i = 1; i < stages.length; i++) {
        const x = i * stageWidth
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Update + draw particles
      particlesRef.current.forEach(p => {
        const si = p.stageIdx
        const laneX = si * stageWidth
        const laneRight = laneX + stageWidth - 1

        // Gentle drift + wave
        p.x += p.vx + Math.sin(t * 0.025 + p.phase) * 0.15
        p.y += p.vy + Math.cos(t * 0.02 + p.phase * 1.3) * 0.12

        // Bounce off lane walls
        if (p.x < laneX + p.r) { p.x = laneX + p.r; p.vx = Math.abs(p.vx) * 0.6 }
        if (p.x > laneRight - p.r) { p.x = laneRight - p.r; p.vx = -Math.abs(p.vx) * 0.6 }
        if (p.y < p.r + 20) { p.y = p.r + 20; p.vy = Math.abs(p.vy) * 0.5 }
        if (p.y > height - p.r - 20) { p.y = height - p.r - 20; p.vy = -Math.abs(p.vy) * 0.5 }

        // Viscosity (slow to a gentle drift)
        p.vx *= 0.97
        p.vy *= 0.97
        if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.05
        if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.05

        // Draw
        const pulse = Math.sin(t * 0.04 + p.phase) * 0.2 + 0.8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha * pulse
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Stage labels (bottom)
      stages.forEach((stage, si) => {
        const x = si * stageWidth + stageWidth / 2
        ctx.fillStyle = dark ? 'rgba(200,200,220,0.7)' : 'rgba(50,50,80,0.7)'
        ctx.font = '500 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(stage.label, x, height - 8)

        ctx.fillStyle = stage.color
        ctx.font = '600 13px sans-serif'
        ctx.fillText(stage.count, x, 18)
      })

      tRef.current++
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [stages, width, height, hovered])

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (width / rect.width)
    const si = Math.floor(mx / (width / stages.length))
    setHovered(stages[si] ?? null)
  }

  const handleClick = (e) => {
    if (hovered) onStageClick?.(hovered)
  }

  const total = stages.reduce((s, st) => s + st.count, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Deal Flow River</p>
        <p className="text-xs text-slate-400">{total} dossiers actifs</p>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full cursor-pointer"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
      />

      <div className="flex gap-1 px-3 pb-3 pt-1">
        {stages.map(s => (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full h-1 rounded-full" style={{ backgroundColor: s.color + '40' }}>
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${(s.count / Math.max(...stages.map(x => x.count))) * 100}%`,
                  backgroundColor: s.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
