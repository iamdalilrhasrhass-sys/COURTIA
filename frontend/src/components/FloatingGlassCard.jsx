import { motion } from 'framer-motion'

export default function FloatingGlassCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl p-4 ${className}`}
      style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
      animate={{
        y: [0, -10, 0],
        rotate: [1, -1, 1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
