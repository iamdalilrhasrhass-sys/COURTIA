export default function RhasrhassSignature({ compact = false, className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 6 : 8,
        padding: compact ? '5px 10px' : '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.16)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(173,216,255,0.12) 28%, rgba(255,255,255,0.08) 60%, rgba(206,250,255,0.16))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 6px 22px rgba(5,10,25,0.28)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      aria-label="COURTIA — une création RHASRHASS™"
    >
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          letterSpacing: 0,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.82)',
          whiteSpace: 'nowrap',
        }}
      >
        COURTIA
      </span>
      <span style={{ color: 'rgba(255,255,255,0.46)', fontSize: compact ? 10 : 11 }}>—</span>
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          letterSpacing: 0,
          color: 'rgba(255,255,255,0.72)',
          whiteSpace: 'nowrap',
        }}
      >
        une création
      </span>
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: 'uppercase',
          color: 'rgba(220,245,255,0.95)',
          textShadow: '0 1px 0 rgba(255,255,255,0.45), 0 0 16px rgba(124,211,255,0.24)',
          whiteSpace: 'nowrap',
        }}
      >
        RHASRHASS™
      </span>
    </div>
  )
}
