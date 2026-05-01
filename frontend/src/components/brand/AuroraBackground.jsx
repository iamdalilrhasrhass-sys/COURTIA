/**
 * AuroraBackground — Fond de section avec halo inspiré du logo Aurora Bubble C
 * Subtile lueur violette/bleue/rose, sans aggressivité
 */
export default function AuroraBackground({ 
  intensity = 'subtle',
  hue = 'violet', // 'violet' | 'blue' | 'warm'
  children,
  className,
  style 
}) {
  const presets = {
    subtle: {
      violet: `
        radial-gradient(ellipse at 20% 20%, rgba(120,60,255,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(255,80,180,0.04) 0%, transparent 50%)
      `,
      blue: `
        radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.04) 0%, transparent 50%)
      `,
      warm: `
        radial-gradient(ellipse at 20% 30%, rgba(201,169,106,0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(255,100,200,0.04) 0%, transparent 50%)
      `,
    },
    medium: {
      violet: `
        radial-gradient(ellipse at 25% 25%, rgba(120,60,255,0.12) 0%, transparent 45%),
        radial-gradient(ellipse at 75% 75%, rgba(255,80,180,0.08) 0%, transparent 45%),
        radial-gradient(ellipse at 50% 10%, rgba(100,200,255,0.06) 0%, transparent 40%)
      `,
      blue: `
        radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.12) 0%, transparent 45%),
        radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.08) 0%, transparent 45%)
      `,
      warm: `
        radial-gradient(ellipse at 20% 30%, rgba(201,169,106,0.10) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 70%, rgba(255,100,200,0.08) 0%, transparent 45%)
      `,
    }
  }

  const bg = presets[intensity]?.[hue] || presets.subtle.violet

  return (
    <div className={className} style={{
      position: 'relative',
      background: bg,
      ...style
    }}>
      {children}
    </div>
  )
}
