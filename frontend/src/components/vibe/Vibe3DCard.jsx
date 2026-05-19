import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion'

export default function Vibe3DCard({
  children,
  depth = 12,
  glow = true,
  glowColor = '#8B5CF6',
  borderColor = 'rgba(255,255,255,0.08)',
  background = 'linear-gradient(145deg, rgba(20,20,20,0.6), rgba(0,0,0,0.8))',
  radius = 24,
  padding = 24,
  className = '',
  style = {},
  onClick,
  ariaLabel,
}) {
  const ref = useRef(null)
  
  // Motion values for smooth 144hz tracking
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  
  const springConfig = { stiffness: 300, damping: 20 }
  const mouseXSpring = useSpring(x, springConfig)
  const mouseYSpring = useSpring(y, springConfig)
  const mxSpring = useSpring(mx, springConfig)
  const mySpring = useSpring(my, springConfig)
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [depth, -depth])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-depth, depth])
  const scale = useTransform(mouseXSpring, [-0.5, 0, 0.5], [1.02, 1, 1.02])
  
  const glowBackground = useMotionTemplate`radial-gradient(circle at ${mxSpring}% ${mySpring}%, ${glowColor}33, transparent 60%)`

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    x.set(mouseX / width - 0.5)
    y.set(mouseY / height - 0.5)
    mx.set((mouseX / width) * 100)
    my.set((mouseY / height) * 100)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    mx.set(50)
    my.set(50)
  }

  return (
    <motion.div
      ref={ref}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden group ${className}`}
      style={{
        rotateX,
        rotateY,
        scale,
        background,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${borderColor}`,
        borderRadius: radius,
        padding,
        transformStyle: 'preserve-3d',
        perspective: 1200,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        ...style,
      }}
    >
      {/* 3D Border Glow that tracks mouse */}
      {glow && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: glowBackground }}
        />
      )}
      
      {/* Content translated on Z axis for popping out */}
      <div style={{ position: 'relative', zIndex: 10, transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </motion.div>
  )
}
