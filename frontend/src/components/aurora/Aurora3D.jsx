/**
 * Aurora3D — Système visuel premium réutilisable
 * Cohérence Aurora Bubble C dans toute la plateforme
 */
import React from 'react'
import { motion } from 'framer-motion'

/* ══════════════════════════════════════════════════════════════
   AuroraBackground — fond 3D cosmique avec drift
   À injecter dans AppPrivateLayout
   ══════════════════════════════════════════════════════════════ */
export function AuroraBackground({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      position: 'relative',
      isolation: 'isolate',
      minHeight: '100vh',
      background: '#02030b',
      ...style
    }}>
      {/* Aurora nebula layer */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 10% 20%, rgba(139,92,246,0.12) 0%, transparent 30%),
          radial-gradient(circle at 85% 70%, rgba(34,211,238,0.10) 0%, transparent 30%),
          radial-gradient(circle at 40% 50%, rgba(255,101,187,0.06) 0%, transparent 40%)
        `,
        filter: 'blur(60px)'
      }} />
      {/* Subtle grid overlay */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(circle at 50% 10%, black 0%, transparent 60%)'
      }} />
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   AuroraOrb — la Bubble C emblématique
   ══════════════════════════════════════════════════════════════ */
export function AuroraOrb({ size = 48, glow = true, className = '', style = {} }) {
  return (
    <motion.div
      className={className}
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(255,128,224,0.3), rgba(139,92,246,0.2) 40%, rgba(34,211,238,0.15) 70%, transparent)',
        boxShadow: glow
          ? '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(34,211,238,0.15), inset 0 0 20px rgba(255,255,255,0.1)'
          : '0 0 20px rgba(139,92,246,0.15)',
        border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        ...style
      }}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   GlassPanel — carte glassmorphism premium
   ══════════════════════════════════════════════════════════════ */
export function GlassPanel({ children, hover = true, glow = false, onClick, className = '', style = {}, ...props }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -3, scale: 1.01 } : {}}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        background: 'linear-gradient(145deg, rgba(14,16,28,0.65), rgba(5,6,12,0.8))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: 20,
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        boxShadow: glow
          ? '0 30px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.15), inset 0 1px 1px rgba(255,255,255,0.1)'
          : '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ...style
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CockpitMetricCard — carte métrique flottante avec halo
   ══════════════════════════════════════════════════════════════ */
export function CockpitMetricCard({ label, value, icon: Icon, color = '#8fe7ff', trend, onClick, style = {} }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'linear-gradient(145deg, rgba(14,16,28,0.7), rgba(5,6,12,0.85))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: 'rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: '18px 20px',
        backdropFilter: 'blur(20px)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Color halo */}
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: color, opacity: 0.08, filter: 'blur(20px)'
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f8f8ff', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
          {trend && <div style={{ fontSize: 11, color, marginTop: 4 }}>{trend}</div>}
        </div>
        {Icon && <Icon size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PriorityHalo — halo autour d'un élément important
   ══════════════════════════════════════════════════════════════ */
export function PriorityHalo({ children, color = '#ff65bb', intensity = 1 }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: -6, borderRadius: 'inherit',
        background: color, opacity: 0.08 * intensity, filter: 'blur(12px)'
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ArkStatusBadge — badge de statut façon Aurora
   ══════════════════════════════════════════════════════════════ */
export function ArkStatusBadge({ label, variant = 'info', style = {} }) {
  const colors = {
    success: { bg: 'rgba(141,255,207,0.1)', border: 'rgba(141,255,207,0.25)', text: '#8dffcf', dot: '#8dffcf' },
    warning: { bg: 'rgba(255,154,85,0.1)', border: 'rgba(255,154,85,0.25)', text: '#ff9a55', dot: '#ff9a55' },
    danger:  { bg: 'rgba(255,101,187,0.1)', border: 'rgba(255,101,187,0.25)', text: '#ff65bb', dot: '#ff65bb' },
    info:    { bg: 'rgba(143,231,255,0.1)', border: 'rgba(143,231,255,0.25)', text: '#8fe7ff', dot: '#8fe7ff' },
    neutral: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: '#c7c9da', dot: '#c7c9da' },
  }
  const c = colors[variant] || colors.info
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 99,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.02em',
      ...style
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, boxShadow: `0 0 8px ${c.dot}` }} />
      {label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════
   AuroraDivider — séparateur lumineux subtil
   ══════════════════════════════════════════════════════════════ */
export function AuroraDivider({ style = {} }) {
  return <div aria-hidden style={{
    height: 1, background: 'linear-gradient(90deg, transparent, rgba(143,231,255,0.1) 20%, rgba(169,134,255,0.1) 80%, transparent)',
    margin: '12px 0', ...style
  }} />
}

/* ══════════════════════════════════════════════════════════════
   SectionGlow — halo de section
   ══════════════════════════════════════════════════════════════ */
export function SectionGlow({ color = '#8fe7ff', style = {} }) {
  return <div aria-hidden style={{
    position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
    width: 200, height: 60, borderRadius: '50%',
    background: color, opacity: 0.06, filter: 'blur(40px)',
    pointerEvents: 'none', ...style
  }} />
}

/* ══════════════════════════════════════════════════════════════
   EmptyStateAurora — état vide premium avec mini orbe et CTA
   ══════════════════════════════════════════════════════════════ */
export function EmptyStateAurora({ icon: Icon, title, description, action, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
        minHeight: 300
      }}
    >
      <AuroraOrb size={56} style={{ marginBottom: 20, opacity: 0.6 }} />
      {Icon && <Icon size={28} style={{ color: 'rgba(255,255,255,0.25)', position: 'absolute', marginTop: -8 }} />}
      <h3 style={{ color: '#f8f8ff', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ color: '#8f93ad', fontSize: '0.85rem', lineHeight: 1.55, maxWidth: 340, margin: '0 0 20px' }}>{description}</p>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '10px 22px', borderRadius: 99, border: '1px solid rgba(143,231,255,0.25)',
            background: 'rgba(143,231,255,0.08)', color: '#8fe7ff', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LoadingAurora — loader premium avec orbe pulsante
   ══════════════════════════════════════════════════════════════ */
export function LoadingAurora({ label = 'Chargement...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent)',
          boxShadow: '0 0 30px rgba(139,92,246,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      />
      <span style={{ color: '#8f93ad', fontSize: '0.8rem' }}>{label}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PremiumCTA — bouton CTA avec halo et glass
   ══════════════════════════════════════════════════════════════ */
export function PremiumCTA({ children, onClick, href, variant = 'primary', style = {}, ...props }) {
  const Component = href ? 'a' : 'button'
  const baseStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 999, border: 'none', minHeight: 46, padding: '0 24px',
    fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer',
    textDecoration: 'none', transition: 'all 0.35s cubic-bezier(0.2,0.8,0.2,1)',
    fontSize: '0.9rem',
  }
  const variants = {
    primary: {
      ...baseStyle,
      background: 'linear-gradient(135deg, #a9f1ff 0%, #b9a4ff 48%, #ff71bd 100%)',
      color: '#04050a',
      boxShadow: '0 12px 30px rgba(255,101,187,0.3), inset 0 1px 1px rgba(255,255,255,0.6)',
    },
    secondary: {
      ...baseStyle,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#f7f7ff',
      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
    },
    ghost: {
      ...baseStyle,
      background: 'transparent',
      color: '#c7c9da',
    }
  }
  return (
    <motion.div whileHover={{ y: -2, scale: 1.02 }} style={{ display: 'inline-block', ...style }}>
      <Component
        href={href}
        onClick={onClick}
        style={variants[variant]}
        {...props}
      >
        {children}
      </Component>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MobileCockpitCard — version mobile du cockpit visuel
   (utilisé aussi dans le dashboard mobile)
   ══════════════════════════════════════════════════════════════ */
export function MobileCockpitCard({ modules = [], title = "Vos priorités, sans effort" }) {
  const defaultModules = [
    { name: 'Clients', status: '8 actifs', color: '#8fe7ff' },
    { name: 'Contrats', status: '3 échéances', color: '#a986ff' },
    { name: 'Relances', status: '4 à faire', color: '#ff9a55' },
    { name: 'DDA', status: '1 incomplet', color: '#ff65bb' },
  ]
  const items = modules.length > 0 ? modules : defaultModules
  return (
    <div className="mobile-cockpit-card">
      <div className="mcc-orb">
        <AuroraOrb size={64} />
        <div className="mcc-orb-label">ARK</div>
      </div>
      <div className="mcc-title">{title}</div>
      <div className="mcc-grid">
        {items.map((m, i) => (
          <div key={i} className="mcc-chip" style={{ '--mc': m.color }}>
            <span>{m.name}</span>
            <small>{m.status}</small>
          </div>
        ))}
      </div>
      <div className="mcc-footer">
        <span className="mcc-dot" />
        <b>ARK actif</b>
        <small>Surveille vos priorités</small>
      </div>
    </div>
  )
}

export default {
  AuroraBackground,
  AuroraOrb,
  GlassPanel,
  CockpitMetricCard,
  PriorityHalo,
  ArkStatusBadge,
  AuroraDivider,
  SectionGlow,
  EmptyStateAurora,
  LoadingAurora,
  PremiumCTA,
  MobileCockpitCard
}
