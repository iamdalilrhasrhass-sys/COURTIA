/**
 * Vibe3DCard — Carte avec inclinaison 3D au hover (rotateX/rotateY) + glow + backdrop blur.
 *
 * Props:
 *   - children
 *   - depth (default 8)         : amplitude inclinaison
 *   - glow (default true)       : effet lumineux au hover
 *   - glowColor (default '#8B5CF6')
 *   - style                     : inline override
 *   - onClick
 *
 * Usage:
 *   <Vibe3DCard><div>…</div></Vibe3DCard>
 */
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function Vibe3DCard({
  children,
  depth = 8,
  glow = true,
  glowColor = '#8B5CF6',
  borderColor = 'rgba(255,255,255,0.08)',
  background = 'rgba(255,255,255,0.03)',
  radius = 16,
  padding = 18,
  className = '',
  style = {},
  onClick,
  ariaLabel,
}) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 })

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    setTilt({
      rx: (0.5 - y) * depth,
      ry: (x - 0.5) * depth,
      mx: x * 100,
      my: y * 100,
    })
  }
  const handleLeave = () => setTilt({ rx: 0, ry: 0, mx: 50, my: 50 })

  return (
    <motion.div
      ref={ref}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(e)
        }
      }}
      className={`vibe-3d-card ${className}`}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      style={{
        position: 'relative',
        background,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${borderColor}`,
        borderRadius: radius,
        padding,
        transformStyle: 'preserve-3d',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        willChange: 'transform',
        ...style,
      }}
    >
      {glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(420px circle at ${tilt.mx}% ${tilt.my}%, ${glowColor}22, transparent 50%)`,
            transition: 'background 0.18s',
            borderRadius: radius,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </motion.div>
  )
}
