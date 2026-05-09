import React from 'react'

export default function Badge({ tone = 'info', className = '', children }) {
  return <span className={`courtia-badge courtia-badge--${tone} ${className}`.trim()}>{children}</span>
}
