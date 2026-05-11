import { BubbleCMini } from '../design/BubbleC'
import { Search, FileText, Inbox, Sparkles } from 'lucide-react'

/**
 * EmptyState — message ludique + BubbleC mini animée + CTA clair.
 * Usage :
 *   <EmptyState
 *     icon="bubble" | "search" | "doc" | "inbox"
 *     title="Pas encore de client"
 *     message="Commençons votre première bulle ✨"
 *     cta={{ label: 'Nouveau client', to: '/clients/new' }}
 *   />
 *
 * Rétro-compat avec l'ancien API (icon emoji string, subtitle, ctaLabel, onCta).
 */
export default function EmptyState({
  icon = 'bubble',
  title,
  message,
  subtitle,        // legacy
  ctaLabel,        // legacy
  onCta,           // legacy
  cta,             // { label, to, onClick }
  compact = false,
}) {
  const text = message || subtitle
  const ctaResolved = cta || (ctaLabel ? { label: ctaLabel, onClick: onCta } : null)

  const renderIcon = () => {
    if (icon === 'search')  return <Search size={28} strokeWidth={1.6} color="#9CA3AF" />
    if (icon === 'doc')     return <FileText size={28} strokeWidth={1.6} color="#9CA3AF" />
    if (icon === 'inbox')   return <Inbox size={28} strokeWidth={1.6} color="#9CA3AF" />
    if (icon === 'sparkle') return <Sparkles size={28} strokeWidth={1.6} color="#8B5CF6" />
    if (typeof icon === 'string' && icon.length <= 4) return <span style={{ fontSize: 34 }}>{icon}</span>
    // default : BubbleC mini
    return <BubbleCMini size={compact ? 56 : 84} animated showHalo={false} />
  }

  function handleCta(e) {
    if (!ctaResolved) return
    if (ctaResolved.onClick) ctaResolved.onClick(e)
    if (ctaResolved.to) {
      // utilise pushState pour éviter un import react-router-dom ici
      window.history.pushState({}, '', ctaResolved.to)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  return (
    <div
      role="status"
      style={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '56px 24px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        {renderIcon()}
      </div>
      {title && (
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </p>
      )}
      {text && (
        <p
          style={{
            fontSize: 13,
            color: '#9CA3AF',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          {text}
        </p>
      )}
      {ctaResolved && (
        <button
          onClick={handleCta}
          style={{
            padding: '9px 18px',
            background: '#8B5CF6',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(139,92,246,0.35)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.25)' }}
        >
          {ctaResolved.label}
        </button>
      )}
    </div>
  )
}
