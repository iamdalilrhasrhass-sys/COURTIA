import { motion } from 'framer-motion'

/**
 * Carte réutilisable premium — wrapper motion.div avec hover optionnel.
 * Props: { children, delay, hover, glass, onClick, style }
 */
export default function PremiumCard({ children, delay = 0, hover = false, glass = false, onClick, style = {} }) {
  const baseStyle = {
    background: glass ? 'rgba(255,255,255,0.7)' : 'white',
    backdropFilter: glass ? 'blur(12px)' : undefined,
    border: '1px solid #e8e6e0',
    borderRadius: 16,
    padding: 24,
    fontFamily: 'Arial, sans-serif',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={hover ? { y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' } : undefined}
      onClick={onClick}
      style={baseStyle}
    >
      {children}
    </motion.div>
  )
}
