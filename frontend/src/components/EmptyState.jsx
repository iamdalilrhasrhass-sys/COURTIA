export default function EmptyState({ icon = '📭', title, subtitle, ctaLabel, onCta }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: 'white', borderRadius: 12,
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      {title && <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>{title}</p>}
      {subtitle && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>{subtitle}</p>}
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{
          padding: '9px 20px', background: '#2563eb', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
        }}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
