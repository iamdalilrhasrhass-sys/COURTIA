import { useState } from 'react'

export default function TiltCard({ as: Component = 'div', className = '', children, maxTilt = 4, ...props }) {
  const [style, setStyle] = useState({})

  function handleMove(event) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setStyle({ transform: `perspective(1200px) rotateX(${(-y * maxTilt).toFixed(2)}deg) rotateY(${(x * maxTilt).toFixed(2)}deg) translateY(-2px)` })
  }

  return (
    <Component
      className={`courtia-tilt-card ${className}`.trim()}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={() => setStyle({})}
      {...props}
    >
      {children}
    </Component>
  )
}
