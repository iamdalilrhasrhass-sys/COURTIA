import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const VARIANTS = {
  default: {
    bg: 'linear-gradient(135deg, #fafaf8 0%, #f0ede8 100%)',
    border: '#e8e6e0',
    iconBg: '#f0ede8',
    titleColor: '#080808',
    descColor: '#6b7280',
    ctaBg: '#080808',
    ctaColor: 'white',
  },
  success: {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    border: '#bbf7d0',
    iconBg: '#dcfce7',
    titleColor: '#14532d',
    descColor: '#15803d',
    ctaBg: '#16a34a',
    ctaColor: 'white',
  },
  warning: {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: '#fde68a',
    iconBg: '#fef3c7',
    titleColor: '#78350f',
    descColor: '#a16207',
    ctaBg: '#d97706',
    ctaColor: 'white',
  },
  ai: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: 'rgba(37,99,235,0.25)',
    iconBg: '#dbeafe',
    titleColor: '#1e3a8a',
    descColor: '#3b82f6',
    ctaBg: '#2563eb',
    ctaColor: 'white',
  },
}

/**
 * PremiumEmptyState — état vide premium réutilisable
 * Props: { icon, title, description, ctaLabel, onCta, variant }
 */
export default function PremiumEmptyState({
  icon: Icon,
  title = 'Aucune donnée',
  description,
  ctaLabel,
  onCta,
  variant = 'default',
  delay = 0,
}) {
  const v = VARIANTS[variant] || VARIANTS.default

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 18,
        padding: '40px 32px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.1, duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: v.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Icon size={26} color={v.titleColor} />
        </motion.div>
      )}

      <h3 style={{
        fontSize: 15, fontWeight: 700,
        color: v.titleColor, margin: '0 0 6px',
        lineHeight: 1.3,
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          fontSize: 13, color: v.descColor,
          margin: '0 0 20px', lineHeight: 1.55,
          maxWidth: 320, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {description}
        </p>
      )}

      {ctaLabel && onCta && (
        <motion.button
          whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={onCta}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px',
            background: v.ctaBg, color: v.ctaColor,
            border: 'none', borderRadius: 9, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </motion.button>
      )}
    </motion.div>
  )
}
