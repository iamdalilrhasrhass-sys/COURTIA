import React from 'react'
import AuroraBackground from '../components/ui/AuroraBackground'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import GlassCard from '../components/ui/GlassCard'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import StatusPill from '../components/ui/StatusPill'

export default function DevUi() {
  return (
    <main className="courtia-dev-ui courtia-token-surface">
      <AuroraBackground />
      <section>
        <Badge>Design system V1</Badge>
        <h1>COURTIA Foundations</h1>
        <p>Composants Aurora Bubble C partagés pour les prochaines PR V1.</p>
      </section>

      <GlassCard className="courtia-dev-ui__grid">
        <div>
          <h2>Actions</h2>
          <div className="courtia-dev-ui__row">
            <Button>Primaire</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </div>
        <div>
          <h2>Formulaires</h2>
          <Input placeholder="Nom du cabinet" />
          <Select defaultValue="pro">
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="cabinet">Cabinet</option>
          </Select>
        </div>
        <div>
          <h2>Statuts</h2>
          <div className="courtia-dev-ui__row">
            <StatusPill status="success">Connecté</StatusPill>
            <StatusPill status="warning">Configuration requise</StatusPill>
            <StatusPill status="danger">Bloqué</StatusPill>
          </div>
        </div>
      </GlassCard>

      <EmptyState
        title="Aucune donnée pour le moment"
        description="L’état vide reste premium, lisible et actionnable."
        action={<Button variant="secondary">Créer une action</Button>}
      />
    </main>
  )
}
