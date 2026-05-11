/**
 * VibeStagger — children appear séquentiellement avec fade + slide-up.
 * Chaque enfant est wrappé dans un motion.div pour l'animation. Pour utiliser
 * en contexte flex, fournir `itemStyle={{ flex: '1 1 150px' }}` ou similaire.
 *
 * Usage:
 *   <VibeStagger style={{display:'flex',gap:12,flexWrap:'wrap'}} itemStyle={{flex:'1 1 150px'}}>
 *     <Card /> <Card />
 *   </VibeStagger>
 */
import { motion } from 'framer-motion'
import { Children } from 'react'

export default function VibeStagger({ children, delay = 0.05, base = 0.1, style = {}, itemStyle = {} }) {
  return (
    <div style={style}>
      {Children.map(children, (child, i) => (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: base + i * delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={itemStyle}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
