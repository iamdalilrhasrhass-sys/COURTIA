import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'

const DEFAULT_INSIGHTS = [
  'Priorisez les clients avec échéance sous 30 jours.',
  'Relancez les opportunités à forte prime annuelle.',
  'Vérifiez les dossiers incomplets avant émission.',
]

const VARIANTS = {
  blue: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: 'rgba(37,99,235,0.2)',
    dotColor: '#22c55e',
    accentColor: '#2563eb',
    textColor: '#1e40af',
    subColor: '#3b82f6',
    bulletBg: 'rgba(37,99,235,0.08)',
  },
  dark: {
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    border: 'rgba(37,99,235,0.3)',
    dotColor: '#22c55e',
    accentColor: '#60a5fa',
    textColor: 'white',
    subColor: '#94a3b8',
    bulletBg: 'rgba(255,255,255,0.06)',
  },
}

/**
 * ArkInsightPanel — panneau IA réutilisable
 * Props: { title, subtitle, insights, ctaLabel, onCta, variant }
 */
export default function ArkInsightPanel({
  title = 'ARK recommande',
  subtitle,
  insights = [],
  ctaLabel,
  onCta,
  variant = 'blue',
  delay = 0,
}) {
  const v = VARIANTS[variant] || VARIANTS.blue
  const items = insights.length > 0 ? insights : DEFAULT_INSIGHTS

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 16,
        padding: '20px 22px',
        boxShadow: '0 2px 12px rgba(37,99,235,0.07)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: v.dotColor,
          boxShadow: `0 0 0 3px ${v.dotColor}33`,
          animation: 'arkDot 2s ease infinite',
          flexShrink: 0,
        }} />
        <style>{`@keyframes arkDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.25)}}`}</style>

        <Sparkles size={13} color={v.accentColor} />
        <span style={{ fontSize: 12, fontWeight: 700, color: v.accentColor, letterSpacing: '0.02em' }}>
          {title}
        </span>

        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', color: v.subColor,
          background: v.bulletBg, padding: '2px 6px', borderRadius: 4,
        }}>IA ACTIVE</span>
      </div>

      {subtitle && (
        <p style={{ fontSize: 12, color: v.subColor, margin: '0 0 12px', lineHeight: 1.4 }}>
          {subtitle}
        </p>
      )}

      {/* Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.slice(0, 3).map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.06 * i + 0.1, duration: 0.28 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 10px',
              background: v.bulletBg,
              borderRadius: 9,
            }}
          >
            <div style={{
              width: 4, height: 4, borderRadius: '50%',
              background: v.accentColor,
              marginTop: 5, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: v.textColor, lineHeight: 1.45 }}>
              {typeof insight === 'string' ? insight : insight.text || insight}
            </span>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      {ctaLabel && onCta && (
        <motion.button
          whileHover={{ x: 2 }}
          transition={{ duration: 0.12 }}
          onClick={onCta}
          style={{
            marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: v.accentColor,
            padding: 0, fontFamily: 'Arial, sans-serif',
          }}
        >
          {ctaLabel} <ArrowRight size={12} />
        </motion.button>
      )}
    </motion.div>
  )
}
