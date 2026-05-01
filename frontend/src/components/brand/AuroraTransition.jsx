import React from 'react'

/**
 * AuroraTransition — Pont visuel continu entre deux sections
 * 
 * Crée un dégradé progressif avec halo Aurora pour lier deux sections
 * sans rupture brutale. Le dégradé part du bas de la section précédente
 * et fond vers la suivante.
 * 
 * Props:
 *   height — hauteur en px (default: 120)
 *   color — couleur du halo (default: aurora violet)
 *   phrase — texte de transition optionnel
 *   position — 'top' | 'bottom' | 'both' (default: 'both')
 */
export default function AuroraTransition({ 
  height = 120, 
  color = 'rgba(139,92,246,0.08)', 
  colorSecondary = 'rgba(34,211,238,0.04)',
  phrase = null,
  position = 'both',
  className = ''
}) {
  return (
    <div 
      className={`relative overflow-hidden pointer-events-none ${className}`}
      style={{ height, marginTop: position === 'top' || position === 'both' ? 0 : -height }}
    >
      {/* Halo principal */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% ${position === 'top' ? '0%' : '100%'}, ${color} 0%, transparent 70%),
          radial-gradient(ellipse 60% 80% at 30% 50%, ${colorSecondary} 0%, transparent 60%)
        `,
        filter: 'blur(20px)',
        opacity: 0.7,
      }} />

      {/* Ligne lumineuse subtile */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(600px, 60vw)',
        height: 1,
        background: `linear-gradient(90deg, transparent, ${color}, ${colorSecondary}, ${color}, transparent)`,
        filter: 'blur(2px)',
        opacity: 0.5,
        top: position === 'top' ? 0 : 'auto',
        bottom: position === 'bottom' ? 0 : 'auto',
      }} />

      {/* Phrase de transition */}
      {phrase && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <p style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            maxWidth: 500,
            lineHeight: 1.6,
            letterSpacing: '0.02em',
            textShadow: '0 0 30px rgba(139,92,246,0.15)',
          }}>
            {phrase}
          </p>
        </div>
      )}
    </div>
  )
}
