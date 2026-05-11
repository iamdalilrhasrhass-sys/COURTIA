/**
 * VibeScrollSection — wrapper avec scroll parallax + fade-in.
 *
 * Usage:
 *   <VibeScrollSection delay={0.1}>...</VibeScrollSection>
 */
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function VibeScrollSection({
  children,
  delay = 0,
  parallax = 20,
  stagger = 0,
  style = {},
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [parallax, -parallax])
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.4, 1, 1, 0.4])

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...style, willChange: 'transform, opacity' }}
    >
      <motion.div style={{ y, opacity }}>{children}</motion.div>
    </motion.section>
  )
}
