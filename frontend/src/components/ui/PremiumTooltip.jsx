import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Tooltip au hover positionné dynamiquement.
 * Props: { content, children, position }
 * position: 'top' | 'bottom' (default 'top')
 */
export default function PremiumTooltip({ content, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  const isTop = position !== 'bottom'

  const tooltipStyle = {
    position: 'absolute',
    [isTop ? 'bottom' : 'top']: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#080808',
    color: 'white',
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    lineHeight: 1.4,
    padding: '6px 12px',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
    zIndex: 50,
    pointerEvents: 'none',
  }

  const arrowStyle = {
    position: 'absolute',
    [isTop ? 'bottom' : 'top']: -4,
    left: '50%',
    marginLeft: -5,
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    [isTop ? 'borderTop' : 'borderBottom']: '5px solid #080808',
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && content && (
          <motion.div
            initial={{ opacity: 0, y: isTop ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isTop ? 4 : -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={tooltipStyle}
          >
            {content}
            <div style={arrowStyle} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
