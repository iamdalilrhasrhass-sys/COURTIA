import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion'

const MOTION_COMPONENTS = {
  div: motion.div,
  button: motion.button,
  a: motion.a,
  span: motion.span,
  li: motion.li
}

export default function TiltCard({ as = 'div', className = '', children, maxTilt = 8, scaleOnHover = 1.02, glare = true, ...props }) {
  const ref = useRef(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 30 })
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 30 })
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [maxTilt, -maxTilt])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-maxTilt, maxTilt])
  
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [100, 0])
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [100, 0])
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.1) 0%, transparent 60%)`

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const Component = MOTION_COMPONENTS[as] || motion.div

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: scaleOnHover }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative overflow-hidden ${className}`.trim()}
      {...props}
    >
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d", width: '100%', height: '100%' }}>
        {children}
      </div>
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 rounded-inherit mix-blend-overlay"
          style={{ background: glareBackground }}
        />
      )}
    </Component>
  )
}
