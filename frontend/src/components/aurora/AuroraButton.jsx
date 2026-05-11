/**
 * AuroraButton — Bouton premium Aurora Design System
 * Variants : primary, ghost, outline, danger
 * Sizes : sm, md, lg
 */
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: {
    bg: 'linear-gradient(135deg, var(--aurora-violet) 0%, var(--aurora-pink) 100%)',
    text: 'var(--aurora-text-primary)',
    border: 'transparent',
    shadow: 'var(--aurora-shadow-glow)',
    hoverShadow: 'var(--aurora-shadow-glow-strong)'
  },
  ghost: {
    bg: 'transparent',
    text: 'var(--aurora-text-secondary)',
    border: 'transparent',
    shadow: 'none',
    hoverBg: 'var(--aurora-bg-surface)'
  },
  outline: {
    bg: 'transparent',
    text: 'var(--aurora-violet-soft)',
    border: 'var(--aurora-border-violet)',
    shadow: 'none',
    hoverBg: 'rgba(139,92,246,0.1)'
  },
  danger: {
    bg: 'linear-gradient(135deg, var(--aurora-rose) 0%, var(--aurora-pink) 100%)',
    text: 'var(--aurora-text-primary)',
    border: 'transparent',
    shadow: '0 0 20px rgba(244,63,94,0.3)',
    hoverShadow: '0 0 40px rgba(244,63,94,0.5)'
  }
}

const sizes = {
  sm: { padding: '6px 12px', fontSize: 'var(--aurora-text-sm)', height: 32 },
  md: { padding: '10px 18px', fontSize: 'var(--aurora-text-base)', height: 40 },
  lg: { padding: '14px 24px', fontSize: 'var(--aurora-text-lg)', height: 48 }
}

/**
 * @param {Object} props
 * @param {'primary'|'ghost'|'outline'|'danger'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {boolean} props.loading
 * @param {boolean} props.disabled
 * @param {React.ReactNode} props.icon
 * @param {React.ReactNode} props.children
 * @param {string} props.className
 * @param {function} props.onClick
 */
export function AuroraButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={`aurora-focus-ring ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: s.padding,
        minHeight: s.height,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--aurora-font-body)',
        color: v.text,
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--aurora-radius-md)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        boxShadow: v.shadow,
        transition: 'all var(--aurora-duration-fast) var(--aurora-ease)',
        WebkitFontSmoothing: 'antialiased',
        letterSpacing: 'var(--aurora-tracking-wide)'
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          if (v.hoverBg) e.currentTarget.style.background = v.hoverBg
          if (v.hoverShadow) e.currentTarget.style.boxShadow = v.hoverShadow
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = v.bg
          e.currentTarget.style.boxShadow = v.shadow
        }
      }}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="aurora-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </motion.button>
  )
}

export default AuroraButton
