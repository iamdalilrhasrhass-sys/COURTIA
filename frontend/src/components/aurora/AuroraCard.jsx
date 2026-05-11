/**
 * AuroraCard — Carte glassmorphism premium
 * Props : hover, glow, header/body/footer slots
 */
import { motion } from 'framer-motion'

/**
 * @param {Object} props
 * @param {boolean} props.hover - Animation au survol
 * @param {boolean} props.glow - Halo lumineux
 * @param {React.ReactNode} props.header
 * @param {React.ReactNode} props.footer
 * @param {React.ReactNode} props.children
 * @param {string} props.className
 * @param {Object} props.style
 */
export function AuroraCard({
  hover = true,
  glow = false,
  header,
  footer,
  children,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -2, scale: 1.005 } : {}}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        background: 'var(--aurora-bg-surface)',
        border: '1px solid var(--aurora-border-soft)',
        borderRadius: 'var(--aurora-radius-lg)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        boxShadow: glow ? 'var(--aurora-shadow-glow)' : 'var(--aurora-shadow-card)',
        overflow: 'hidden',
        transition: 'all var(--aurora-duration-base) var(--aurora-ease)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.background = 'var(--aurora-bg-surface-hover)'
          e.currentTarget.style.borderColor = 'var(--aurora-border-base)'
          e.currentTarget.style.boxShadow = glow ? 'var(--aurora-shadow-glow-strong)' : 'var(--aurora-shadow-elevated)'
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.background = 'var(--aurora-bg-surface)'
          e.currentTarget.style.borderColor = 'var(--aurora-border-soft)'
          e.currentTarget.style.boxShadow = glow ? 'var(--aurora-shadow-glow)' : 'var(--aurora-shadow-card)'
        }
      }}
      {...props}
    >
      {header && (
        <div style={{
          padding: 'var(--aurora-space-4) var(--aurora-space-5)',
          borderBottom: '1px solid var(--aurora-border-soft)',
          fontWeight: 600,
          color: 'var(--aurora-text-primary)'
        }}>
          {header}
        </div>
      )}
      <div style={{ padding: 'var(--aurora-space-5)' }}>
        {children}
      </div>
      {footer && (
        <div style={{
          padding: 'var(--aurora-space-3) var(--aurora-space-5)',
          borderTop: '1px solid var(--aurora-border-soft)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          {footer}
        </div>
      )}
    </motion.div>
  )
}

export default AuroraCard
