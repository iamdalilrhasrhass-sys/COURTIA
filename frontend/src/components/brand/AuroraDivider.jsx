import React from 'react'

/**
 * AuroraDivider — Séparateur lumineux Aurora entre sections
 * 
 * Crée une ligne subtile avec halo iridescent.
 * 
 * Props :
 *   variant — 'subtle' | 'glow' | 'gradient' (default: 'subtle')
 *   width   — largeur max en px (default: 400)
 *   className
 */

const VARIANT_STYLES = {
  subtle: {
    line: 'rgba(255,255,255,0.06)',
    glow: 'transparent',
  },
  glow: {
    line: 'rgba(139,92,246,0.15)',
    glow: 'radial-gradient(ellipse 100% 300% at 50% 50%, rgba(139,92,246,0.12), transparent 70%)',
  },
  gradient: {
    line: 'transparent',
    glow: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(34,211,238,0.15), rgba(139,92,246,0.2), transparent)',
  },
}

export default function AuroraDivider({
  variant = 'subtle',
  width = 400,
  className = '',
}) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className={`flex items-center justify-center py-4 ${className}`} aria-hidden="true">
      <div
        style={{
          width: `min(${width}px, 70vw)`,
          height: variant === 'gradient' ? 2 : 1,
          background: styles.line,
          borderRadius: 999,
          filter: variant === 'glow' ? 'blur(1px)' : undefined,
          position: 'relative',
        }}
      >
        {/* Halo lumineux */}
        {styles.glow !== 'transparent' && (
          <div
            style={{
              position: 'absolute',
              inset: variant === 'gradient' ? '-8px 0' : '-16px -40px',
              background: styles.glow,
              filter: 'blur(12px)',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
