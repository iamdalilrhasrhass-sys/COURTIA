import React from 'react'
import { motion } from 'framer-motion'

/**
 * ARKOrb — Orbe flottant ARK animé (effet glassmorphism + pulse)
 * Props: { size, color, pulse, className }
 */
export default function ARKOrb({ size = 120, color = 'from-purple-500/30 to-indigo-500/30', pulse = true, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow outer ring */}
      <motion.div
        className={`
          absolute rounded-full
          bg-gradient-to-br ${color}
          blur-xl opacity-60
        `}
        style={{ width: size * 1.4, height: size * 1.4 }}
        animate={pulse ? {
          scale: [1, 1.08, 1],
          opacity: [0.4, 0.7, 0.4],
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main orb */}
      <motion.div
        className={`
          relative rounded-full
          bg-gradient-to-br ${color}
          backdrop-blur-xl
          border border-white/30
          shadow-xl shadow-purple-500/10
          flex items-center justify-center
        `}
        style={{ width: size, height: size }}
        animate={pulse ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Inner glow */}
        <div
          className="absolute rounded-full bg-white/20 blur-sm"
          style={{ width: size * 0.5, height: size * 0.5, top: '15%' }}
        />

        {/* ARK text */}
        <span className="text-white/90 font-bold text-sm tracking-widest" style={{ fontSize: size * 0.12 }}>
          ARK
        </span>
      </motion.div>

      {/* Orbiting particle */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-purple-400/60"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ originX: 0, originY: 0 }}
      >
        <div
          className="w-2 h-2 rounded-full bg-purple-400/60"
          style={{ transform: `translateX(${size * 0.65}px)` }}
        />
      </motion.div>
    </div>
  )
}
