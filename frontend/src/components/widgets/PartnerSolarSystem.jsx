// PartnerSolarSystem.jsx
// Système solaire interactif des partenaires du cabinet.
// Props :
//   partners {Array} — [{id, name, status, compatibility, volume, branch}]
//   onPartnerClick {function(partner)}
//
// status : 'connected' | 'to_verify' | 'invalid' | 'manual' | 'inactive'
// compatibility : 0-100 (distance à l'étoile centrale — plus proche = plus compatible)
// volume : 0-100 (taille de la planète)

import { useEffect, useRef, useState } from 'react'

const STATUS_COLORS = {
  connected: { fill: '#1D9E75', label: 'Connecté' },
  to_verify: { fill: '#EF9F27', label: 'À vérifier' },
  invalid:   { fill: '#E24B4A', label: 'Invalide' },
  manual:    { fill: '#7F77DD', label: 'Manuel' },
  inactive:  { fill: '#888780', label: 'Inactif' },
}

const DEFAULT_PARTNERS = [
  { id: '1', name: 'April',       status: 'connected', compatibility: 92, volume: 75, branch: 'Auto' },
  { id: '2', name: 'Wakam',       status: 'connected', compatibility: 80, volume: 55, branch: 'Auto' },
  { id: '3', name: 'Allianz',     status: 'to_verify', compatibility: 65, volume: 90, branch: 'Multi' },
  { id: '4', name: 'Covéa',       status: 'manual',    compatibility: 50, volume: 40, branch: 'Santé' },
  { id: '5', name: 'Groupama',    status: 'connected', compatibility: 72, volume: 60, branch: 'Hab.' },
  { id: '6', name: 'MAAF',        status: 'invalid',   compatibility: 40, volume: 35, branch: 'Auto' },
]

export default function PartnerSolarSystem({
  partners = DEFAULT_PARTNERS,
  onPartnerClick,
  width = 400,
  height = 320,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const tRef = useRef(0)
  const [selected, setSelected] = useState(null)
  const orbitsRef = useRef([])

  useEffect(() => {
    // Distribute partners on different orbital paths
    orbitsRef.current = partners.map((p, i) => ({
      ...p,
      orbitRadius: 40 + (100 - p.compatibility) * 0.9,
      planetRadius: 6 + (p.volume / 100) * 12,
      speed: 0.003 + (i % 3) * 0.002 + (p.compatibility / 100) * 0.004,
      angleOffset: (i / partners.length) * Math.PI * 2,
      color: STATUS_COLORS[p.status]?.fill ?? '#888780',
    }))
  }, [partners])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = width / 2
    const cy = height / 2

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const t = tRef.current
      const dark = window.matchMedia('(prefers-color-scheme:dark)').matches

      const orbitStroke = dark ? 'rgba(200,200,255,0.07)' : 'rgba(100,100,180,0.08)'
      const sunFill = '#EF9F27'
      const sunGlow = 'rgba(239,159,39,0.15)'

      // Sun glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
      grad.addColorStop(0, 'rgba(239,159,39,0.3)')
      grad.addColorStop(1, 'rgba(239,159,39,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 30, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Sun
      ctx.beginPath()
      ctx.arc(cx, cy, 14, 0, Math.PI * 2)
      ctx.fillStyle = sunFill
      ctx.globalAlpha = 0.95
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#412402'
      ctx.font = '500 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Cabinet', cx, cy + 3)

      // Orbits + planets
      orbitsRef.current.forEach(planet => {
        const isSelected = selected?.id === planet.id

        // Orbit ring
        ctx.beginPath()
        ctx.arc(cx, cy, planet.orbitRadius, 0, Math.PI * 2)
        ctx.strokeStyle = isSelected
          ? (dark ? 'rgba(159,151,232,0.3)' : 'rgba(83,74,183,0.2)')
          : orbitStroke
        ctx.lineWidth = isSelected ? 1 : 0.5
        if (!isSelected) ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])

        // Planet position
        const angle = t * planet.speed + planet.angleOffset
        const px = cx + Math.cos(angle) * planet.orbitRadius
        const py = cy + Math.sin(angle) * planet.orbitRadius

        // Glow on selected
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(px, py, planet.planetRadius * 2.2, 0, Math.PI * 2)
          ctx.fillStyle = planet.color
          ctx.globalAlpha = 0.2
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Planet
        ctx.beginPath()
        ctx.arc(px, py, planet.planetRadius, 0, Math.PI * 2)
        ctx.fillStyle = planet.color
        ctx.globalAlpha = isSelected ? 1 : 0.85
        ctx.fill()
        ctx.globalAlpha = 1

        // Planet label
        ctx.fillStyle = dark ? 'rgba(240,240,255,0.9)' : 'rgba(30,30,50,0.85)'
        ctx.font = `${isSelected ? '600' : '500'} ${isSelected ? 9 : 8}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(planet.name, px, py + planet.planetRadius + 12)

        // Branch badge
        ctx.fillStyle = dark ? 'rgba(200,200,255,0.5)' : 'rgba(80,80,160,0.45)'
        ctx.font = '7px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(planet.branch, px, py + planet.planetRadius + 21)

        // Store current screen pos for hit detection
        planet._screenX = px
        planet._screenY = py
      })

      tRef.current++
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height, selected])

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (width / rect.width)
    const my = (e.clientY - rect.top) * (height / rect.height)

    const hit = orbitsRef.current.find(p => {
      if (!p._screenX) return false
      const dx = p._screenX - mx, dy = p._screenY - my
      return Math.sqrt(dx * dx + dy * dy) < p.planetRadius + 10
    })

    if (hit) {
      setSelected(hit)
      onPartnerClick?.(hit)
    } else {
      setSelected(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Écosystème partenaires</p>
        <div className="flex items-center gap-2">
          {Object.entries(STATUS_COLORS).slice(0,3).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.fill }} />
              <span className="text-xs text-slate-400">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full cursor-pointer"
        style={{ height }}
        onClick={handleClick}
      />

      {selected && (
        <div className="mx-3 mb-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{selected.name}</p>
            <p className="text-xs text-slate-400">{selected.branch} · Compatibilité {selected.compatibility}%</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[selected.status]?.fill + '22',
                color: STATUS_COLORS[selected.status]?.fill
              }}
            >
              {STATUS_COLORS[selected.status]?.label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
