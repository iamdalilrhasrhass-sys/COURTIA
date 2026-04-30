export default function AuroraBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6 ${className}`}
      style={{
        background: 'radial-gradient(circle at 18% 10%, rgba(255,255,255,0.34), transparent 28%), linear-gradient(135deg, rgba(175,169,236,0.22), rgba(83,74,183,0.08))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '0.5px solid rgba(175,169,236,0.34)',
        color: '#AFA9EC',
      }}
    >
      {children}
    </span>
  )
}
