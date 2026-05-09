import React from 'react'

export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`courtia-glass-card ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  )
}
