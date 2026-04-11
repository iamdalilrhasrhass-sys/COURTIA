export default function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
      padding: '16px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{message || 'Une erreur est survenue'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: '7px 16px', background: '#dc2626', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0
        }}>
          Réessayer
        </button>
      )}
    </div>
  )
}
