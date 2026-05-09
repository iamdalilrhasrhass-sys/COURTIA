import React from 'react'
import GlassCard from './GlassCard'

export default function EmptyState({ title, description, action }) {
  return (
    <GlassCard className="courtia-empty-state">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </GlassCard>
  )
}
