/**
 * SimpleCard — alternative épurée à Vibe3DCard pour les listes.
 * Hover subtil : background plus clair + shadow douce, pas de rotation 3D.
 */
export default function SimpleCard({
  children,
  onClick,
  href,
  to,
  padding = 20,
  style,
  className,
  ...rest
}) {
  const isInteractive = Boolean(onClick || href || to)
  const handleClick = (e) => {
    if (onClick) onClick(e)
    if (to) {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }
  return (
    <div
      onClick={isInteractive ? handleClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={className}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding,
        cursor: isInteractive ? 'pointer' : 'default',
        transition: 'background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isInteractive) return
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'
      }}
      onMouseLeave={(e) => {
        if (!isInteractive) return
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
