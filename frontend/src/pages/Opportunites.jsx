import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Plus, Sparkles, TrendingUp, Target, Calendar, Euro } from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280', textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)', cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)', cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.10)',
  arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', cyan: '#22D3EE',
}

const KANBAN_STAGES = [
  { id: 'prospect', label: 'Prospect', color: '#64748B', glyph: '🌱' },
  { id: 'rdv',      label: 'RDV',      color: '#3B82F6', glyph: '📞' },
  { id: 'devis',    label: 'Devis',    color: '#F59E0B', glyph: '📋' },
  { id: 'signe',    label: 'Signé',    color: '#22C55E', glyph: '✅' },
]

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_OPPS = [
  { id: 1, client: 'Martin Conseil',  produit: 'Prévoyance TNS', potentiel: 1200, proba: 70, date: '15 mai', stage: 'devis',    ark: true },
  { id: 2, client: 'Karim B.',        produit: 'Auto',           potentiel: 840,  proba: 60, date: '14 mai', stage: 'devis',    ark: false },
  { id: 3, client: 'Sophie L.',       produit: 'Prévoyance',     potentiel: 520,  proba: 85, date: '12 mai', stage: 'rdv',      ark: true },
  { id: 4, client: 'BatiSens Pro',    produit: 'Flotte Auto',    potentiel: 4200, proba: 50, date: '10 mai', stage: 'prospect', ark: false },
  { id: 5, client: 'Cabinet Moreau',  produit: 'Cyber',          potentiel: 1800, proba: 90, date: '08 mai', stage: 'signe',    ark: false },
  { id: 6, client: 'Auto Évolution',  produit: 'RC Pro',         potentiel: 2700, proba: 55, date: '05 mai', stage: 'rdv',      ark: false },
  { id: 7, client: 'Groupe Ardent',   produit: 'Cyber',          potentiel: 5200, proba: 40, date: '02 mai', stage: 'prospect', ark: true },
  { id: 8, client: 'Nadia R.',        produit: 'PJ',             potentiel: 1200, proba: 75, date: '29 avr', stage: 'devis',    ark: false },
  { id: 9, client: 'Leroy Marie',     produit: 'MRH',            potentiel: 1800, proba: 30, date: '28 avr', stage: 'prospect', ark: true },
  { id: 10, client: 'Dupont SAS',     produit: 'Flotte Auto',    potentiel: 5600, proba: 80, date: '26 avr', stage: 'signe',    ark: false },
]

function initStages(items) {
  const map = { prospect: [], rdv: [], devis: [], signe: [] }
  items.forEach(o => map[o.stage]?.push(o))
  return map
}

function Card({ o, dragStart, dragEnd }) {
  const probaColor = o.proba >= 70 ? T.success : o.proba >= 50 ? T.warning : T.danger
  return (
    <motion.div
      layout draggable
      onDragStart={() => dragStart(o.id, o.stage)}
      onDragEnd={dragEnd}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      whileHover={{ y: -2 }}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderLeft: o.ark ? `3px solid ${T.ark}` : `1px solid ${T.cardBorder}`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        cursor: 'grab',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{o.client}</div>
        {o.ark && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
            background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <Sparkles size={8} /> ARK
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 10 }}>{o.produit}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.success }}>{fmtEur(o.potentiel)}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: `${probaColor}15`, color: probaColor,
        }}>{o.proba}%</span>
      </div>
      {/* progress proba */}
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${o.proba}%`, height: '100%', background: probaColor, borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.textMuted }}>
        <Calendar size={9} /> {o.date}
      </div>
    </motion.div>
  )
}

export default function Opportunites() {
  const navigate = useNavigate()
  const [columns, setColumns] = useState(() => initStages(DEMO_OPPS))
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

  const totals = useMemo(() => {
    return KANBAN_STAGES.reduce((acc, s) => {
      const list = columns[s.id] || []
      acc[s.id] = { count: list.length, sum: list.reduce((x, o) => x + o.potentiel, 0) }
      return acc
    }, {})
  }, [columns])

  const grandTotal = Object.values(totals).reduce((s, v) => s + v.sum, 0)
  const arkCount = Object.values(columns).flat().filter(o => o.ark).length

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 24px 48px' }}>
      <VibeBackdrop intensity={0.75} />
      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
        top: -200, left: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <VibeScrollSection parallax={12}>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1320, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
              ACTIONS
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em',
              color: T.text, margin: 0, lineHeight: 1.15,
            }}>
              Opportunités
            </h1>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
              Pipeline commercial — glissez les cartes pour faire avancer.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              padding: '9px 14px', borderRadius: 9,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <TrendingUp size={13} color={T.success} />
              <span style={{ fontSize: 11, color: T.textMuted }}>Potentiel total</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.success }}>{fmtEur(grandTotal)}</span>
            </div>
            {arkCount > 0 && (
              <div style={{
                padding: '9px 14px', borderRadius: 9,
                background: T.arkBg, border: `1px solid ${T.arkBorder}`,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Sparkles size={13} color={T.ark} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.ark }}>{arkCount} suggestion{arkCount > 1 ? 's' : ''} ARK</span>
              </div>
            )}
            <button onClick={() => navigate('/devis/new')} style={btnPrimary}>
              <Plus size={13} /> Nouvelle opportunité
            </button>
          </div>
        </header>

        <LayoutGroup>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(260px, 1fr))`,
            gap: 12,
            overflowX: 'auto', paddingBottom: 12,
          }}>
            {KANBAN_STAGES.map(stage => {
              const list = columns[stage.id] || []
              const total = totals[stage.id] || { count: 0, sum: 0 }
              return (
                <div key={stage.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging) { moveOpp(dragging.oppId, dragging.fromStage, stage.id); setDragging(null) }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${T.cardBorder}`,
                    borderRadius: 14,
                    padding: 12,
                    minHeight: 460,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: 10, marginBottom: 12,
                    borderBottom: `1px solid ${T.cardBorder}`,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: stage.color, boxShadow: `0 0 12px ${stage.color}88` }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{stage.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', color: T.textSecondary,
                    }}>{total.count}</span>
                  </div>

                  {/* Total potentiel */}
                  <div style={{
                    fontSize: 10, color: T.textMuted, marginBottom: 10,
                    padding: '6px 10px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Potentiel</span>
                    <strong style={{ color: T.success, fontSize: 12 }}>{fmtEur(total.sum)}</strong>
                  </div>

                  <AnimatePresence>
                    {list.map(o => <Card key={o.id} o={o} dragStart={(id, s) => setDragging({ oppId: id, fromStage: s })} dragEnd={() => setDragging(null)} />)}
                  </AnimatePresence>

                  {list.length === 0 && (
                    <div style={{
                      fontSize: 11, color: T.textMuted, textAlign: 'center',
                      padding: 16, border: `1px dashed ${T.cardBorder}`, borderRadius: 8, marginTop: 6,
                    }}>Déposez une carte ici</div>
                  )}
                </div>
              )
            })}
          </div>
        </LayoutGroup>

      </main>
      </VibeScrollSection>
    </div>
  )
}

const btnPrimary = {
  padding: '9px 14px', background: T.accent, color: '#fff', border: 'none',
  borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 4px 14px rgba(91,77,245,0.25)',
}
