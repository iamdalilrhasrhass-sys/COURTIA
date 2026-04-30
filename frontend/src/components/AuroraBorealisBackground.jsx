import React from 'react'
import { motion } from 'framer-motion'

const intensityMap = {
  soft: { opacity: 0.15, blur: 120, speed: 25 },
  medium: { opacity: 0.25, blur: 100, speed: 20 },
  strong: { opacity: 0.4, blur: 80, speed: 15 },
}

/**
 * AuroraBorealisBackground — nappes lumineuses animées violet/bleu/cyan
 * Props:
 *   intensity: "soft" | "medium" | "strong" (default: "soft")
 *   className: string (additionnel)
 *   children: optionnel — pour superposer du contenu par-dessus
 */
export default function AuroraBorealisBackground({
  intensity = 'soft',
  className = '',
  children,
}) {
  const cfg = intensityMap[intensity] || intensityMap.soft

  const layers = [
    {
      gradient: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3), transparent 70%)',
      size: 700,
      top: '-10%',
      left: '-15%',
      delay: 0,
    },
    {
      gradient: 'radial-gradient(ellipse at center, rgba(59,130,246,0.25), transparent 70%)',
      size: 600,
      top: '-5%',
      right: '-10%',
      delay: 3,
    },
    {
      gradient: 'radial-gradient(ellipse at center, rgba(139,92,246,0.2), transparent 70%)',
      size: 500,
      top: '20%',
      left: '10%',
      delay: 6,
    },
    {
      gradient: 'radial-gradient(ellipse at center, rgba(34,211,238,0.2), transparent 70%)',
      size: 550,
      bottom: '-10%',
      right: '-5%',
      delay: 2,
    },
    {
      gradient: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15), transparent 70%)',
      size: 450,
      bottom: '10%',
      left: '30%',
      delay: 5,
    },
  ]

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Nappes lumineuses animées */}
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none rounded-full bg-gradient-to-b"
          style={{
            width: layer.size,
            height: layer.size,
            top: layer.top,
            left: layer.left,
            right: layer.right,
            bottom: layer.bottom,
            filter: `blur(${cfg.blur}px)`,
            opacity: cfg.opacity,
            background: layer.gradient || 'radial-gradient(ellipse at center, rgba(168,85,247,0.3), transparent 70%)',
          }}
          animate={{
            x: [0, 30, -20, 40, 0],
            y: [0, -40, 20, -30, 0],
            scale: [1, 1.08, 0.95, 1.05, 1],
            rotate: [0, 3, -2, 4, 0],
          }}
          transition={{
            duration: cfg.speed + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: layer.delay,
          }}
        />
      ))}

      {/* Grille subtile par-dessus */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Contenu superposé */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  )
}
