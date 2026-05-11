/**
 * VibeBackdrop — fond cosmique noir "La Bulle" pour les pages V2 utilisateur connecté.
 * - #020108 base
 * - Aurores radiales subtiles violet/cyan
 * - Grain léger
 *
 * Usage:
 *   <VibeBackdrop />
 */
import { motion } from 'framer-motion'

export default function VibeBackdrop({ intensity = 1, color = '#8B5CF6' }) {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -2,
          background: '#020108',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 * intensity }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: `
            radial-gradient(900px 600px at 18% 12%, ${color}1A 0%, transparent 60%),
            radial-gradient(700px 500px at 82% 22%, rgba(56,189,248,0.10) 0%, transparent 60%),
            radial-gradient(900px 700px at 50% 100%, rgba(236,72,153,0.08) 0%, transparent 70%)
          `,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          opacity: 0.04,
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
          mixBlendMode: 'soft-light',
        }}
      />
    </>
  )
}
