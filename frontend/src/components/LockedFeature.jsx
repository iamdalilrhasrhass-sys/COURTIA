import { motion } from 'framer-motion'
import { Lock, CheckCircle2 } from 'lucide-react'
import { usePlanStore } from '../stores/planStore'
import { useNavigate } from 'react-router-dom'

const PLAN_CONFIG = {
  pro: {
    badge: { bg: '#eff6ff', color: '#2563eb', label: 'Pro' },
    btnBg: '#2563eb',
    benefits: [
      'Lead scoring et priorisation automatique',
      'Analyses avancés et insights IA',
      'Rapports personnalisés exportables',
    ],
  },
  elite: {
    badge: { bg: '#f5f3ff', color: '#7c3aed', label: 'Elite' },
    btnBg: '#7c3aed',
    benefits: [
      'Tableau de bord conformité DDA complet',
      'Accès illimité à toutes les fonctions IA',
      'Support dédié et onboarding personnalisé',
    ],
  },
}

/**
 * Wrapper qui affiche une lock card premium si la feature est locked.
 * Props: { feature, requiredPlan, label, children }
 */
export default function LockedFeature({ feature, requiredPlan = 'pro', label = 'Premium', children }) {
  const features = usePlanStore(s => s.features)
  const allowed = features[feature] === true
  const navigate = useNavigate()

  if (allowed) return children

  const cfg = PLAN_CONFIG[requiredPlan] || PLAN_CONFIG.pro

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'white',
        border: '1px solid #e8e6e0',
        borderRadius: 16,
        padding: '32px 28px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Padlock */}
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: cfg.badge.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Lock size={24} color={cfg.btnBg} />
      </motion.div>

      {/* Badge */}
      <span style={{
        display: 'inline-block', marginBottom: 10,
        fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
        background: cfg.badge.bg, color: cfg.badge.color,
        padding: '3px 10px', borderRadius: 20,
      }}>
        Plan {cfg.badge.label}
      </span>

      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#080808', margin: '0 0 6px' }}>
        {label}
      </h3>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
        Disponible avec le plan <strong style={{ color: '#080808' }}>{cfg.badge.label}</strong>.
        Passez à la vitesse supérieure.
      </p>

      {/* Bénéfices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, textAlign: 'left', maxWidth: 280, margin: '0 auto 20px' }}>
        {cfg.benefits.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <CheckCircle2 size={14} color={cfg.btnBg} style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ y: -1, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onClick={() => navigate(`/billing?plan=${requiredPlan}`)}
        style={{
          padding: '11px 24px',
          background: '#080808', color: 'white',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, fontFamily: 'Arial, sans-serif',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = cfg.btnBg }}
        onMouseLeave={e => { e.currentTarget.style.background = '#080808' }}
      >
        Débloquer le plan {cfg.badge.label}
      </motion.button>
    </motion.div>
  )
}
