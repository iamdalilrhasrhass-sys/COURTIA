export default function Topbar({ title, subtitle, action }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') }
    catch { return {} }
  })()
  const initial = (user.firstName || user.first_name || user.email || 'U')[0].toUpperCase()
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{
      background: '#f7f6f2',
      borderBottom: '0.5px solid #e8e6e0',
      padding: '20px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#0a0a0a', margin: 0, letterSpacing: -0.3 }}>{title}</h1>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{subtitle || today}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {action}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 600, flexShrink: 0,
          cursor: 'default'
        }}>
          {initial}
        </div>
      </div>
    </div>
  )
}
