import React from 'react'

export default function Halo({ tone = 'cyan', className = '' }) {
  return <span className={`courtia-halo courtia-halo--${tone} ${className}`.trim()} aria-hidden="true" />
}
