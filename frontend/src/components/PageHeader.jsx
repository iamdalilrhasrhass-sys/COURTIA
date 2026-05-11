import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * PageHeader — header standard simplifié (Linear/Notion style).
 *
 * <PageHeader
 *   breadcrumb={[{ label: 'Clients', to: '/clients' }, { label: 'Sophie M.' }]}
 *   title="Clients"
 *   subtitle="Pilotez votre portefeuille."
 *   action={<button>+ Nouveau client</button>}
 * />
 */
export default function PageHeader({
  breadcrumb,
  title,
  subtitle,
  action,
  children,
  style,
}) {
  return (
    <header
      style={{
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style,
      }}
    >
      {Array.isArray(breadcrumb) && breadcrumb.length > 0 && (
        <nav
          aria-label="breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: '#6B7280',
            marginBottom: 4,
          }}
        >
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <ChevronRight size={12} style={{ color: '#4B5563' }} />}
              {b.to ? (
                <Link to={b.to} style={{ color: '#9CA3AF', textDecoration: 'none' }}>
                  {b.label}
                </Link>
              ) : (
                <span style={{ color: '#9CA3AF' }}>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: 13,
                color: '#9CA3AF',
                margin: '4px 0 0',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{action}</div>}
      </div>

      {children}
    </header>
  )
}
