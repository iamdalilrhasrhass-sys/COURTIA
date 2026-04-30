import { motion } from 'framer-motion'

const auroraColors = {
  layer1: 'linear-gradient(120deg, rgba(168,85,247,0.55), rgba(59,130,246,0.38), rgba(34,211,238,0.22))',
  layer2: 'linear-gradient(120deg, rgba(99,102,241,0.42), rgba(236,72,153,0.25), rgba(14,165,233,0.35))',
  layer3: 'linear-gradient(120deg, rgba(45,212,191,0.25), rgba(129,140,248,0.35), rgba(217,70,239,0.22))',
}

const intensityMap = {
  soft: { opacity: 0.25, blur: 80 },
  medium: { opacity: 0.40, blur: 70 },
  strong: { opacity: 0.55, blur: 60 },
}

/**
 * AuroraBorealisBackground — 3 nappes lumineuses animées violet/bleu/cyan
 * Style aurore boréale premium, subtile, élégante
 */
export default function AuroraBorealisBackground({
  intensity = 'soft',
  className = '',
  children,
}) {
  const cfg = intensityMap[intensity] || intensityMap.soft

  const layers = [
    {
      gradient: auroraColors.layer1,
      style: {
        top: '-8%', left: '-10%',
        width: '70vw', height: '40vh',
      },
      animate: {
        x: ['-2%', '4%'],
        y: ['-1%', '3%'],
        rotate: [-4, 5],
        scale: [1, 1.08],
      },
      duration: 16,
    },
    {
      gradient: auroraColors.layer2,
      style: {
        top: '8%', right: '-18%',
        width: '65vw', height: '38vh',
      },
      animate: {
        x: ['3%', '-3%'],
        y: ['-2%', '4%'],
        rotate: [3, -4],
        scale: [0.96, 1.06],
      },
      duration: 21,
    },
    {
      gradient: auroraColors.layer3,
      style: {
        bottom: '15%', left: '22%',
        width: '62vw', height: '36vh',
      },
      animate: {
        x: ['-3%', '3%'],
        y: ['2%', '-3%'],
        rotate: [-2, 6],
        scale: [1, 1.10],
      },
      duration: 24,
    },
  ]

  return (
    <div
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{ isolation: 'isolate', position: 'absolute', inset: 0 }}
    >
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            ...layer.style,
            background: layer.gradient,
            filter: `blur(${cfg.blur}px)`,
            opacity: cfg.opacity,
            mixBlendMode: 'screen',
            willChange: 'transform',
          }}
          animate={layer.animate}
          transition={{
            duration: layer.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'mirror',
          }}
        />
      ))}

      {/* Overlay radial doux pour fondre l'aurore */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.75), transparent 45%)',
          pointerEvents: 'none',
        }}
      />

      {/* Grille subtile */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      {children}
    </div>
  )
}
