import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MessageCircle } from 'lucide-react'
import AuroraEmptyState from './AuroraEmptyState'

describe('AuroraEmptyState', () => {
  it('renders a lucide component icon without crashing', () => {
    const html = renderToString(
      <AuroraEmptyState
        icon={MessageCircle}
        title="Aucun feedback"
        description="Les retours envoyés depuis l’app apparaîtront ici."
      />
    )

    expect(html).toContain('Aucun feedback')
    expect(html).toContain('svg')
  })

  it('accepts subtitle as an alias for description', () => {
    const html = renderToString(
      <AuroraEmptyState
        title="Aucun retour"
        subtitle="Les premiers feedbacks apparaîtront ici."
      />
    )

    expect(html).toContain('Les premiers feedbacks apparaîtront ici.')
  })
})
