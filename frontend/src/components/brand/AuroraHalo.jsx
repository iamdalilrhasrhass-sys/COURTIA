/**
 * AuroraHalo — Halo lumineux subtil inspiré du C bulle
 * S'utilise comme overlay décoratif sur une section ou une carte
 */
export default function AuroraHalo({
  size = 600,
  color = 'rgba(120,60,255,0.10)',
  position = 'center',
  blur = 80,
  animation = true,
  className,
  style
}) {
  const positions = {
    'top-left': { top: '-20%', left: '-20%' },
    'top-right': { top: '-20%', right: '-20%', left: 'auto' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'bottom-left': { bottom: '-20%', left: '-20%', top: 'auto' },
    'bottom-right': { bottom: '-20%', right: '-20%', top: 'auto', left: 'auto' },
  }

  const pos = positions[position] || positions.center

  return (
    <div className={className} style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: `blur(${blur}px)`,
      pointerEvents: 'none',
      zIndex: 0,
      animation: animation ? 'auroraHaloFloat 12s ease-in-out infinite alternate' : 'none',
      ...pos,
      ...style
    }} />
  )
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('aurora-halo-styles')) {
  const s = document.createElement('style')
  s.id = 'aurora-halo-styles'
  s.textContent = `
    @keyframes auroraHaloFloat {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
      100% { transform: translate(-50%, -45%) scale(1.12); opacity: 1; }
    }
  `
  document.head.appendChild(s)
}
