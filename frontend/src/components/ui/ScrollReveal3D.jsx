import { motion, useReducedMotion } from 'framer-motion'

export default function ScrollReveal3D({ children, className = '', delay = 0, as = 'div' }) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as] || motion.div
  return (
    <Component
      className={`courtia-scroll-reveal-3d ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 22, rotateX: 3, scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: '-8% 0px -8% 0px' }}
      transition={{ duration: 0.48, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}
