import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  TrendingUp, Target, Euro, Shield, Zap, Sparkles, Search, Plus,
  ChevronRight, User, FileText, BarChart3, Star, Kanban, List as ListIcon
} from 'lucide-react'
import { VibeBackdrop, VibeHeader, VibeScrollSection, Vibe3DCard } from '../components/vibe'

const KANBAN_STAGES = [
  { id: 'prospect', label: 'Prospect', color: '#64748B', desc: 'À qualifier' },
  { id: 'rdv',      label: 'RDV',      color: '#3B82F6', desc: 'Contact pris' },
  { id: 'devis',    label: 'Devis',    color: '#F59E0B', desc: 'Proposition envoyée' },
  { id: 'signe',    label: 'Signé',    color: '#22C55E', desc: 'Contrat finalisé' },
]

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_OPPORTUNITES = [
  { id: 1, client: 'Martin Conseil', produitActuel: 'RC Pro + Flotte Auto', produitReco: 'Prévoyance TNS', potentiel: 1200, confiance: 78, type: 'prevoyance', ark: 'Client professionnel avec RC Pro et Flotte Auto. Aucune couverture Prévoyance dirigeant. Potentiel estimé : 1 200 €/an.' },
  { id: 2, client: 'Karim B.', produitActuel: 'Habitation', produitReco: 'Auto', potentiel: 840, confiance: 72, type: 'multi', ark: 'Client actif sur Habitation. Devis Auto en cours. Forte probabilité de conversion.' },
  { id: 3, client: 'Sophie L.', produitActuel: 'Santé', produitReco: 'Prévoyance', potentiel: 520, confiance: 85, type: 'prevoyance', ark: 'Cliente Santé active. Nouveau devis Prévoyance envoyé. Probabilité 85% de transformation.' },
  { id: 4, client: 'BatiSens Pro', produitActuel: 'MRH + RC Pro', produitReco: 'Flotte Auto', potentiel: 4200, confiance: 55, type: 'multi', ark: 'Entreprise avec MRH et RC Pro. Aucune couverture flotte. Potentiel multi-équipement élevé.' },
  { id: 5, client: 'Cabinet Moreau', produitActuel: 'RC Pro + PJ', produitReco: 'Cyber', potentiel: 1800, confiance: 68, type: 'cyber', ark: 'Cabinet avec RC Pro et PJ. Exposition numérique sans couverture Cyber. Risque croissant.' },
  { id: 6, client: 'Auto Évolution 89', produitActuel: 'Flotte Auto', produitReco: 'RC Pro', potentiel: 2700, confiance: 62, type: 'multi', ark: 'Client mono-produit Flotte Auto. Aucune RC Pro. Obligation réglementaire pour garage.' },
  { id: 7, client: 'Groupe Ardent', produitActuel: 'RC Pro', produitReco: 'Cyber + Décennale', potentiel: 5200, confiance: 41, type: 'multi', ark: 'Groupe avec RC Pro uniquement. Recommandation Cyber + Décennale. Potentiel combiné 5 200 €/an.' },
  { id: 8, client: 'Nadia R.', produitActuel: 'Santé', produitReco: 'Prévoyance + PJ', potentiel: 1200, confiance: 72, type: 'multi', ark: 'Cliente Santé active et fidèle. Aucune couverture Prévoyance ni PJ. Score fidélité 81%.' },
  { id: 9, client: 'Leroy Marie', produitActuel: 'Habitation', produitReco: 'MRH + Auto', potentiel: 1800, confiance: 50, type: 'multi', ark: 'Cliente mono-produit Habitation. Silencieuse depuis 52 jours. Opportunité de réengagement avec MRH.' },
  { id: 10, client: 'Dupont SAS', produitActuel: 'RC Pro', produitReco: 'Flotte Auto + PJ', potentiel: 5600, confiance: 45, type: 'multi', ark: 'Client RC Pro actif. Devis PJ envoyé sans réponse. Proposition combinée PJ + Flotte Auto.' },
]

const FILTERS = ['Toutes', 'Confiance élevée', 'Mono-produit', 'Multi-équipement', 'Prévoyance', 'Auto', 'Cyber', 'Renouvellement']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

function initStages(items) {
  // Distribuer artificiellement les opps existantes dans les colonnes
  const map = { prospect: [], rdv: [], devis: [], signe: [] }
  items.forEach((o, i) => {
    if (o.confiance < 50) map.prospect.push({ ...o, stage: 'prospect' })
    else if (o.confiance < 65) map.rdv.push({ ...o, stage: 'rdv' })
    else if (o.confiance < 80) map.devis.push({ ...o, stage: 'devis' })
    else map.signe.push({ ...o, stage: 'signe' })
  })
  return map
}

export default function Opportunites() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'
  const [columns, setColumns] = useState(() => initStages(DEMO_OPPORTUNITES))
  const [dragging, setDragging] = useState(null) // { oppId, fromStage }

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

  const filtered = useMemo(() => {
    let list = DEMO_OPPORTUNITES
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o => o.client.toLowerCase().includes(q) || o.produitReco.toLowerCase().includes(q))
    }
    if (filter === 'Confiance élevée') list = list.filter(o => o.confiance >= 70)
    else if (filter === 'Mono-produit') list = list.filter(o => o.type === 'mono')
    else if (filter === 'Multi-équipement') list = list.filter(o => o.type === 'multi')
    else if (filter === 'Prévoyance') list = list.filter(o => o.type === 'prevoyance')
    else if (filter === 'Auto') list = list.filter(o => o.produitReco === 'Auto')
    else if (filter === 'Cyber') list = list.filter(o => o.type === 'cyber')
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    total: DEMO_OPPORTUNITES.length,
    potentiel: DEMO_OPPORTUNITES.reduce((s, o) => s + o.potentiel, 0),
    confianceHaute: DEMO_OPPORTUNITES.filter(o => o.confiance >= 70).length,
    aTraiter: DEMO_OPPORTUNITES.filter(o => o.confiance >= 50).length,
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.85} color="#22C55E" />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,197,94,0.03) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        <VibeHeader
          kicker="ACQUISITION"
          title="Opportunités"
          subtitle="ARK détecte le potentiel commercial de votre portefeuille."
          bubbleSize={50}
          actions={(
            <>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
                style={btnStyle(null)}
                title="Basculer vue"
              >
                {viewMode === 'list' ? <><Kanban size={13} /> Kanban</> : <><ListIcon size={13} /> Liste</>}
              </button>
              <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
            </>
          )}
        />

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={TrendingUp} title="Détectées" value={stats.total} />
          <KpiCard icon={Euro} title="Potentiel estimé" value={fmtEur(stats.potentiel)} accent={T.success} />
          <KpiCard icon={Star} title="Confiance élevée" value={stats.confianceHaute} accent={T.success} />
          <KpiCard icon={Target} title="À traiter" value={stats.aTraiter} accent={T.warning} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filter === f ? T.accent + '22' : T.cardBg,
                color: filter === f ? T.accent : T.textSecondary,
                border: filter === f ? '1px solid ' + T.accent + '40' : '1px solid ' + T.cardBorder,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
              width: 200, outline: 'none',
            }} />
          </div>
        </div>

        {viewMode === 'list' ? (
          <VibeScrollSection delay={0.05} parallax={12}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.42, ease: [0.16,1,0.3,1] }}
                  whileHover={{ rotateX: 2, rotateY: -2, y: -2 }}
                  style={{
                    background: T.cardBg,
                    border: '1px solid ' + T.cardBorder,
                    borderRadius: 12,
                    padding: '14px 16px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{o.client}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: T.cardBg, color: T.textMuted }}>{o.type === 'prevoyance' ? 'Prévoyance' : o.type === 'cyber' ? 'Cyber' : o.type === 'multi' ? 'Multi-équipement' : 'Mono-produit'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>{o.produitActuel} → <strong style={{ color: T.success }}>{o.produitReco}</strong></div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textSecondary, marginTop: 6 }}>
                        <span style={{ color: T.success, fontWeight: 600 }}>{fmtEur(o.potentiel)}</span>
                        <span>Confiance : <strong style={{ color: o.confiance >= 70 ? T.success : o.confiance >= 50 ? T.warning : T.textMuted }}>{o.confiance}%</strong></span>
                      </div>
                    </div>
                    <div style={{ width: 60, height: 6, background: T.cardBg, borderRadius: 3, overflow: 'hidden', alignSelf: 'center' }}>
                      <div style={{ width: o.confiance + '%', height: '100%', background: o.confiance >= 70 ? T.success : o.confiance >= 50 ? T.warning : T.textMuted, borderRadius: 3 }} />
                    </div>
                  </div>
                  {o.ark && (
                    <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 10, color: '#c4b5fd' }}>
                      <Sparkles size={10} color={T.ark} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      <strong style={{ color: '#a78bfa' }}>ARK :</strong> {o.ark}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button style={actionBtnStyle(T.accent)}><Plus size={11} /> Créer devis</button>
                    <button style={actionBtnStyle(null)}><FileText size={11} /> Argumentaire</button>
                    <button onClick={() => navigate('/clients/' + o.id)} style={actionBtnStyle(T.ark)}><User size={11} /> Voir client</button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
                <TrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>Aucune opportunité trouvée.</p>
              </div>
            )}
          </VibeScrollSection>
        ) : (
          /* ────────────────── KANBAN ────────────────── */
          <LayoutGroup>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(220px, 1fr))`,
                gap: 14,
                overflowX: 'auto',
                paddingBottom: 12,
              }}
            >
              {KANBAN_STAGES.map(stage => {
                const list = columns[stage.id] || []
                const total = list.reduce((s, o) => s + o.potentiel, 0)
                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => { e.preventDefault() }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragging) {
                        moveOpp(dragging.oppId, dragging.fromStage, stage.id)
                        setDragging(null)
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${stage.color}22`,
                      borderRadius: 14,
                      padding: 10,
                      minHeight: 360,
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${stage.color}22` }}>
                      <div style={{ width: 10, height: 10, borderRadius: 5, background: stage.color, boxShadow: `0 0 12px ${stage.color}` }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{stage.label}</div>
                        <div style={{ fontSize: 10, color: T.textMuted }}>{stage.desc}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, padding: '2px 8px', borderRadius: 10, background: `${stage.color}1A` }}>{list.length}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 8 }}>
                      Potentiel cumulé : <strong style={{ color: T.success }}>{fmtEur(total)}</strong>
                    </div>
                    <AnimatePresence>
                      {list.map((o) => (
                        <motion.div
                          key={o.id}
                          layout
                          draggable
                          onDragStart={() => setDragging({ oppId: o.id, fromStage: stage.id })}
                          onDragEnd={() => setDragging(null)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ rotateX: 3, rotateY: -3, y: -2, scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${T.cardBorder}`,
                            borderRadius: 10,
                            padding: 10,
                            marginBottom: 8,
                            cursor: 'grab',
                            transformStyle: 'preserve-3d',
                            willChange: 'transform',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>{o.client}</div>
                          <div style={{ fontSize: 10, color: T.textSecondary, marginBottom: 6 }}>
                            {o.produitActuel} → <strong style={{ color: T.success }}>{o.produitReco}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                            <span style={{ color: T.success, fontWeight: 600 }}>{fmtEur(o.potentiel)}</span>
                            <span style={{ color: o.confiance >= 70 ? T.success : o.confiance >= 50 ? T.warning : T.textMuted }}>{o.confiance}%</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {list.length === 0 && (
                      <div style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', padding: 14, border: `1px dashed ${T.cardBorder}`, borderRadius: 8, marginTop: 6 }}>
                        Déposez ici
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
              <Sparkles size={11} style={{ verticalAlign: 'middle' }} color={T.ark} /> Glissez-déposez les opportunités entre colonnes pour faire évoluer leur statut.
            </div>
          </LayoutGroup>
        )}
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: color ? color + '15' : T.cardBg,
    color: color || T.text,
    border: color ? '1px solid ' + color + '30' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}

function actionBtnStyle(color) {
  return {
    padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
    background: color ? color + '12' : T.cardBg,
    color: color || T.textSecondary,
    border: color ? '1px solid ' + color + '25' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}
