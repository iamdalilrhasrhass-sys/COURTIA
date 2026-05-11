import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, TrendingUp, Clock, CheckCircle2, XCircle, Send, Euro, Zap,
  ChevronRight, Sparkles, Plus, Search, AlertTriangle, Target
} from 'lucide-react'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_DEVIS = [
  { id: 1, client: 'Karim B.', produit: 'Auto', montant: 1100, statut: 'envoye', dateEnvoi: '2026-05-04', derniereRelance: null, probabilite: 72, ark: 'Devis envoyé il y a 6j. Client actif sur Habitation. Forte probabilité de conversion.' },
  { id: 2, client: 'Garcia Anne', produit: 'MRH', montant: 420, statut: 'preparation', dateEnvoi: null, derniereRelance: null, probabilite: 85, ark: 'Opportunité MRH détectée. Score opportunité 78%. Client mono-produit Santé.' },
  { id: 3, client: 'Petit Philippe', produit: 'Auto', montant: 1100, statut: 'envoye', dateEnvoi: '2026-04-22', derniereRelance: '2026-04-29', probabilite: 45, ark: 'Devis envoyé il y a 18j sans réponse. Relancer par téléphone.' },
  { id: 4, client: 'BatiSens Pro', produit: 'Prévoyance', montant: 950, statut: 'accepte', dateEnvoi: '2026-04-15', derniereRelance: '2026-04-25', probabilite: 100, ark: null },
  { id: 5, client: 'Martin Conseil', produit: 'Prévoyance', montant: 1200, statut: 'preparation', dateEnvoi: null, derniereRelance: null, probabilite: 65, ark: 'Client RC Pro actif. Prévoyance TNS non souscrite. Opportunité 65%.' },
  { id: 6, client: 'Leroy Marie', produit: 'MRH', montant: 380, statut: 'refuse', dateEnvoi: '2026-03-10', derniereRelance: '2026-03-20', probabilite: 0, ark: 'Refus client. Motif : déjà couvert. Proposer revue globale.' },
  { id: 7, client: 'Dupont SAS', produit: 'PJ', montant: 2100, statut: 'envoye', dateEnvoi: '2026-05-02', derniereRelance: null, probabilite: 60, ark: 'Devis PJ. Client RC Pro actif. Multi-équipement favorable.' },
  { id: 8, client: 'Auto Évolution 89', produit: 'Flotte Auto', montant: 8500, statut: 'accepte', dateEnvoi: '2026-05-01', derniereRelance: null, probabilite: 100, ark: null },
  { id: 9, client: 'Cabinet Moreau', produit: 'Cyber', montant: 1800, statut: 'expire', dateEnvoi: '2026-03-01', derniereRelance: '2026-03-20', probabilite: 10, ark: 'Devis expiré. Relancer avec mise à jour garanties.' },
  { id: 10, client: 'Sophie L.', produit: 'Prévoyance', montant: 520, statut: 'envoye', dateEnvoi: '2026-05-06', derniereRelance: null, probabilite: 70, ark: 'Nouveau devis Prévoyance. Cliente Santé active.' },
]

const STATUT_STYLE = {
  preparation: { bg: 'rgba(100,116,139,0.08)', text: '#9CA3AF', label: 'Préparation' },
  envoye: { bg: 'rgba(59,130,246,0.08)', text: '#3B82F6', label: 'Envoyé' },
  accepte: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', label: 'Accepté' },
  refuse: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', label: 'Refusé' },
  expire: { bg: 'rgba(100,116,139,0.06)', text: '#6B7280', label: 'Expiré' },
}

const FILTERS = ['Tous', 'Préparation', 'Envoyés', 'À relancer', 'Acceptés', 'Refusés', 'Expirés', 'Opportunité ARK']

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

function DevisCard({ d, navigate }) {
  const statut = STATUT_STYLE[d.statut] || STATUT_STYLE.envoye
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
      style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
      onClick={() => navigate('/clients/' + d.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{d.client}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{d.produit}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statut.bg, color: statut.text }}>{statut.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(d.montant)}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.textMuted }}>Probabilité</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: d.probabilite >= 70 ? T.success : d.probabilite >= 40 ? T.warning : T.danger }}>{d.probabilite}%</div>
        </div>
      </div>
      {d.ark && (
        <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} color={T.ark} /> <strong style={{ color: '#a78bfa' }}>ARK :</strong> {d.ark}
        </div>
      )}
    </motion.div>
  )
}

export default function Devis() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')

  const filtered = useMemo(() => {
    let list = DEMO_DEVIS
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.client.toLowerCase().includes(q) || d.produit.toLowerCase().includes(q))
    }
    if (filter === 'Préparation') list = list.filter(d => d.statut === 'preparation')
    else if (filter === 'Envoyés') list = list.filter(d => d.statut === 'envoye')
    else if (filter === 'À relancer') list = list.filter(d => d.statut === 'envoye' && !d.derniereRelance)
    else if (filter === 'Acceptés') list = list.filter(d => d.statut === 'accepte')
    else if (filter === 'Refusés') list = list.filter(d => d.statut === 'refuse')
    else if (filter === 'Expirés') list = list.filter(d => d.statut === 'expire')
    else if (filter === 'Opportunité ARK') list = list.filter(d => d.ark)
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    total: DEMO_DEVIS.length,
    aRelancer: DEMO_DEVIS.filter(d => d.statut === 'envoye' && !d.derniereRelance).length,
    potentiel: DEMO_DEVIS.filter(d => d.statut !== 'refuse' && d.statut !== 'expire').reduce((s, d) => s + d.montant, 0),
    taux: Math.round(DEMO_DEVIS.filter(d => d.statut === 'accepte').length / DEMO_DEVIS.length * 100),
    acceptes: DEMO_DEVIS.filter(d => d.statut === 'accepte').length,
    ark: DEMO_DEVIS.filter(d => d.ark).length,
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileText size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Devis</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Suivez vos propositions et transformez-les en contrats.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/devis/new')} style={btnStyle(T.accent)}><Plus size={13} /> Créer</button>
            <button onClick={() => navigate('/relances')} style={btnStyle(T.warning)}><Send size={13} /> Relancer</button>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={FileText} title="Devis en cours" value="10 / 42" />
          <KpiCard icon={Send} title="À relancer" value={stats.aRelancer} accent={T.warning} />
          <KpiCard icon={Euro} title="Potentiel" value={fmtEur(stats.potentiel)} />
          <KpiCard icon={TrendingUp} title="Transformation" value={stats.taux + '%'} accent={T.success} />
          <KpiCard icon={CheckCircle2} title="Acceptés mois" value={stats.acceptes} accent={T.success} />
          <KpiCard icon={Sparkles} title="Alertes ARK" value={stats.ark} accent={T.ark} />
        </div>

        {/* TOOLBAR */}
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
                padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
                width: 200, outline: 'none',
              }} />
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(d => <DevisCard key={d.id} d={d} navigate={navigate} />)}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucun devis trouvé.</p>
          </div>
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
