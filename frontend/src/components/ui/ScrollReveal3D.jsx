import { motion, useReducedMotion } from 'framer-motion'

export default function ScrollReveal3D({ children, className = '', delay = 0, as = 'div', blur = true, yOffset = 40, rotation = 12 }) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as] || motion.div
  
  return (
    <Component
      className={`courtia-scroll-reveal-3d ${className}`.trim()}
      initial={reduceMotion ? false : { 
        opacity: 0, 
        y: yOffset, 
        rotateX: rotation, 
        scale: 0.94,
        filter: blur ? 'blur(12px)' : 'blur(0px)'
      }}
      whileInView={reduceMotion ? undefined : { 
        opacity: 1, 
        y: 0, 
        rotateX: 0, 
        scale: 1,
        filter: 'blur(0px)'
      }}
      viewport={{ once: true, margin: '-5% 0px -5% 0px' }}
      transition={{ 
        duration: 0.8, 
        delay, 
        ease: [0.16, 1, 0.3, 1] // Custom spring-like easing
      }}
      style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
    >
      {children}
    </Component>
  )
}
