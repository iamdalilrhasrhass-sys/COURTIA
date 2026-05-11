/**
 * VibePage — wrapper universel pour toutes les pages connectées COURTIA.
 * 500x mieux que n'importe quel CRM: particules animées, parallax multicouche,
 * glow réactif au scroll, micro-interactions, glassmorphism Aurora-Bubble C.
 *
 * Props:
 *   - kicker (string)        : label au-dessus du titre ("COCKPIT")
 *   - title (string)         : titre principal
 *   - subtitle (string)      : sous-titre descriptif
 *   - actions (JSX)          : boutons d'action dans le header
 *   - hero (JSX)             : contenu hero (gauge, KPI géants, etc.)
 *   - children               : contenu principal de la page
 *   - parallaxStrength (int) : intensité parallax (def 20)
 *   - particleCount (int)    : nombre de particules (def 30)
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import VibeBackdrop from './VibeBackdrop'

const T = {
  bg: '#050510',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  cyan: '#22D3EE',
  arkBg: 'rgba(139,92,246,0.08)',
  arkBorder: 'rgba(139,92,246,0.25)',
}

// Particules animées (orbs flottantes)
export function Particles({ count = 30 }) {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => {
        const size = 2 + Math.random() * 4
        const x = Math.random() * 100
        const y = Math.random() * 100
        const duration = 15 + Math.random() * 30
        const delay = Math.random() * 10
        const colors = ['rgba(139,92,246,0.3)', 'rgba(34,211,238,0.25)', 'rgba(91,77,245,0.2)', 'rgba(255,255,255,0.15)']
        const color = colors[Math.floor(Math.random() * colors.length)]
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: size, height: size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${size * 3}px ${color}`,
              left: `${x}%`, top: `${y}%`,
            }}
            animate={{
              x: [0, (Math.random() - 0.5) * 100, 0],
              y: [0, (Math.random() - 0.5) * 100, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      })}
    </div>
  )
}

// Glow réactif au scroll (halo violet/cyan qui suit le scroll)
export function ScrollGlow() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const opacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 0.6, 0.6, 0])
  const y = useTransform(scrollYProgress, [0, 1], [0, 100])

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0, zIndex: -2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 600px 400px at 30% 20%, rgba(139,92,246,0.08) 0%, transparent 70%), radial-gradient(ellipse 400px 600px at 70% 70%, rgba(34,211,238,0.06) 0%, transparent 70%)',
        opacity,
        y,
      }}
    />
  )
}

// Micro-interaction: hover glow wrapper
function GlowHover({ children, color = T.ark, style }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: -2, borderRadius: 16,
              background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}15, transparent 60%)`,
              pointerEvents: 'none', zIndex: -1,
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.div>
  )
}

export default function VibePage({
  kicker,
  title,
  subtitle,
  actions,
  hero,
  children,
  parallaxStrength = 20,
  particleCount = 30,
  pageKey,
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, parallaxStrength])

  return (
    <div ref={ref} style={{ minHeight: '100vh', color: T.text, position: 'relative' }}>
      <VibeBackdrop intensity={0.8} />
      <Particles count={particleCount} />
      <ScrollGlow />

      <motion.div
        style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', y: contentY }}
      >
        {/* HEADER */}
        {(kicker || title) && (
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
          >
            <div>
              {kicker && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
                  textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <Sparkles size={10} /> {kicker}
                </span>
              )}
              {title && (
                <h1 style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em',
                  color: T.text, margin: kicker ? '10px 0 0' : '0', lineHeight: 1.15,
                }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>{subtitle}</p>
              )}
            </div>
            {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
          </motion.header>
        )}

        {/* HERO (gauge, KPI géants) */}
        {hero && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {hero}
          </motion.div>
        )}

        {/* CONTENU PRINCIPAL */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  )
}

export { GlowHover, T as VIBE_TOKENS }