import React from 'react'

export default function StatusPill({ status = 'neutral', children }) {
  return <span className={`courtia-status-pill courtia-status-pill--${status}`}>{children}</span>
}
