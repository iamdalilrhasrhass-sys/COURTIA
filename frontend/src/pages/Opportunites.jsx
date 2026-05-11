import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Plus } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

const KANBAN_STAGES = [
  { id: 'prospect', label: 'Prospect', color: '#64748B' },
  { id: 'rdv',      label: 'RDV',      color: '#3B82F6' },
  { id: 'devis',    label: 'Devis',    color: '#F59E0B' },
  { id: 'signe',    label: 'Signé',    color: '#22C55E' },
]

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_OPPORTUNITES = [
  { id: 1, client: 'Martin Conseil', produit: 'Prévoyance TNS', potentiel: 1200, date: '15 mai' },
  { id: 2, client: 'Karim B.',       produit: 'Auto',           potentiel: 840,  date: '14 mai' },
  { id: 3, client: 'Sophie L.',      produit: 'Prévoyance',     potentiel: 520,  date: '12 mai' },
  { id: 4, client: 'BatiSens Pro',   produit: 'Flotte Auto',    potentiel: 4200, date: '10 mai' },
  { id: 5, client: 'Cabinet Moreau', produit: 'Cyber',          potentiel: 1800, date: '08 mai' },
  { id: 6, client: 'Auto Évolution', produit: 'RC Pro',         potentiel: 2700, date: '05 mai' },
  { id: 7, client: 'Groupe Ardent',  produit: 'Cyber',          potentiel: 5200, date: '02 mai' },
  { id: 8, client: 'Nadia R.',       produit: 'PJ',             potentiel: 1200, date: '29 avr' },
  { id: 9, client: 'Leroy Marie',    produit: 'MRH',            potentiel: 1800, date: '28 avr' },
  { id: 10, client: 'Dupont SAS',    produit: 'Flotte Auto',    potentiel: 5600, date: '26 avr' },
]

function initStages(items) {
  const map = { prospect: [], rdv: [], devis: [], signe: [] }
  items.forEach((o, i) => {
    const stages = ['prospect', 'rdv', 'devis', 'signe']
    const stage = stages[i % 4]
    map[stage].push({ ...o, stage })
  })
  return map
}

export default function Opportunites() {
  const navigate = useNavigate()
  const [columns, setColumns] = useState(() => initStages(DEMO_OPPORTUNITES))
  const [dragging, setDragging] = useState(null)

  function moveOpp(oppId, fromStage, toStage) {
    if (fromStage === toStage) return
    setColumns(prev => {
      const fromList = prev[fromStage] || []
      const card = fromList.find(c => c.id === oppId)
      if (!card) return prev
      return {
        ...prev,
        [fromStage]: fromList.filter(c => c.id !== oppId),
        [toStage]:   [{ ...card, stage: toStage }, ...(prev[toStage] || [])],
      }
    })
  }

  const totalCards = Object.values(columns).reduce((s, l) => s + l.length, 0)

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        <PageHeader
          title="Opportunités"
          subtitle="Glissez-déposez pour faire avancer."
          action={
            <button
              onClick={() => navigate('/clients/new')}
              style={{
                padding: '9px 16px',
                background: T.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
              }}
            >
              <Plus size={14} /> Nouvelle opportunité
            </button>
          }
        />

        {totalCards === 0 ? (
          <EmptyState
            icon="bubble"
            title="Aucune opportunité"
            message="Vos opportunités commerciales apparaîtront ici."
          />
        ) : (
          <LayoutGroup>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(220px, 1fr))`,
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 12,
            }}>
              {KANBAN_STAGES.map(stage => {
                const list = columns[stage.id] || []
                const total = list.reduce((s, o) => s + o.potentiel, 0)
                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragging) {
                        moveOpp(dragging.oppId, dragging.fromStage, stage.id)
                        setDragging(null)
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${T.cardBorder}`,
                      borderRadius: 14,
                      padding: 12,
                      minHeight: 360,
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 12, paddingBottom: 10,
                      borderBottom: `1px solid ${T.cardBorder}`,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: stage.color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>
                        {stage.label}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: T.textMuted,
                        padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                      }}>{list.length}</span>
                    </div>

                    {total > 0 && (
                      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 8 }}>
                        Potentiel : <strong style={{ color: T.success }}>{fmtEur(total)}</strong>
                      </div>
                    )}

                    <AnimatePresence>
                      {list.map(o => (
                        <motion.div
                          key={o.id}
                          layout
                          draggable
                          onDragStart={() => setDragging({ oppId: o.id, fromStage: stage.id })}
                          onDragEnd={() => setDragging(null)}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                          whileHover={{ y: -2 }}
                          style={{
                            background: T.cardBg,
                            border: `1px solid ${T.cardBorder}`,
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 8,
                            cursor: 'grab',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                            {o.client}
                          </div>
                          <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 8 }}>
                            {o.produit}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>
                              {fmtEur(o.potentiel)}
                            </span>
                            <span style={{ fontSize: 10, color: T.textMuted }}>{o.date}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {list.length === 0 && (
                      <div style={{
                        fontSize: 10, color: T.textMuted, textAlign: 'center',
                        padding: 14, border: `1px dashed ${T.cardBorder}`,
                        borderRadius: 8, marginTop: 6,
                      }}>
                        Déposez ici
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </LayoutGroup>
        )}
      </main>
    </div>
  )
}
