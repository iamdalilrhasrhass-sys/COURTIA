import React from 'react'

export default function AuroraBackground({ className = '' }) {
  return (
    <div className={`courtia-aurora-bg ${className}`.trim()} aria-hidden="true">
      <span className="courtia-aurora-bg__halo courtia-aurora-bg__halo--violet" />
      <span className="courtia-aurora-bg__halo courtia-aurora-bg__halo--cyan" />
      <span className="courtia-aurora-bg__grid" />
    </div>
  )
}
