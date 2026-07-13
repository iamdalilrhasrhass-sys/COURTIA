import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { VibeBackdrop, VibeHeader, VibeScrollSection, Vibe3DCard } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import {
  FileText, Search, Plus, Upload, Zap, TrendingUp, Calendar, AlertTriangle,
  Shield, ChevronRight, Users, Euro, Clock, Briefcase, Sparkles,
  LayoutGrid, List
} from 'lucide-react'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_CONTRACTS = [
  { id: 1, client: 'Martin Conseil', type: 'Pro', produit: 'RC Pro', compagnie: 'Aurora Assurances', prime: 2800, effet: '2025-01-15', echeance: '2026-06-01', jours: 21, statut: 'actif', risque: 72, ark: 'Échéance dans 21j. Préparer relance.' },
  { id: 2, client: 'Dupont SAS', type: 'Pro', produit: 'Flotte Auto', compagnie: 'Novalia Courtage', prime: 12400, effet: '2024-09-01', echeance: '2026-09-01', jours: 114, statut: 'actif', risque: 35, ark: null },
  { id: 3, client: 'Leroy Marie', type: 'Particulier', produit: 'Habitation', compagnie: 'Helios Protection', prime: 680, effet: '2024-03-01', echeance: '2026-03-01', jours: -70, statut: 'actif', risque: 80, ark: 'Cliente silencieuse 52j. Score risque 80%.' },
  { id: 4, client: 'SCP Dubois', type: 'Pro', produit: 'Décennale', compagnie: 'Nivalis Pro', prime: 3500, effet: '2024-06-22', echeance: '2026-06-22', jours: 42, statut: 'actif', risque: 45, ark: null },
  { id: 5, client: 'BatiSens Pro', type: 'Pro', produit: 'MRH', compagnie: 'Aurora Assurances', prime: 4200, effet: '2024-11-01', echeance: '2026-11-01', jours: 174, statut: 'actif', risque: 20, ark: null },
  { id: 6, client: 'Karim B.', type: 'Particulier', produit: 'Auto', compagnie: 'Novalia Courtage', prime: 1100, effet: '2025-05-04', echeance: '2026-05-04', jours: -7, statut: 'actif', risque: 65, ark: 'Devis #247 sans réponse. Relancer.' },
  { id: 7, client: 'Sophie L.', type: 'Particulier', produit: 'Santé', compagnie: 'Helios Protection', prime: 420, effet: '2025-02-01', echeance: '2026-02-01', jours: -98, statut: 'actif', risque: 38, ark: 'Opportunité MRH non souscrite.' },
  { id: 8, client: 'Groupe Ardent', type: 'Pro', produit: 'Cyber', compagnie: 'Atlas Assurances', prime: 2400, effet: '2025-07-01', echeance: '2026-07-01', jours: 51, statut: 'actif', risque: 25, ark: null },
  { id: 9, client: 'Moreau Éric', type: 'Particulier', produit: 'Auto', compagnie: 'Serenis Risk', prime: 2400, effet: '2024-06-15', echeance: '2026-06-15', jours: 35, statut: 'actif', risque: 30, ark: null },
  { id: 10, client: 'Nadia R.', type: 'Particulier', produit: 'Prévoyance', compagnie: 'Aurora Assurances', prime: 680, effet: '2025-08-01', echeance: '2026-08-01', jours: 82, statut: 'actif', risque: 15, ark: null },
  { id: 11, client: 'Auto Évolution 89', type: 'Pro', produit: 'Flotte Auto', compagnie: 'Novalia Courtage', prime: 8500, effet: '2024-04-15', echeance: '2026-04-15', jours: -26, statut: 'renouvellement', risque: 55, ark: 'Échéance dépassée. Renouvellement urgent.' },
  { id: 12, client: 'Maison Lefèvre', type: 'Particulier', produit: 'Habitation', compagnie: 'Helios Protection', prime: 550, effet: '2025-03-01', echeance: '2026-03-01', jours: -70, statut: 'actif', risque: 42, ark: null },
  { id: 13, client: 'Transports Galli', type: 'Pro', produit: 'RC Pro', compagnie: 'Aurora Assurances', prime: 3600, effet: '2025-01-01', echeance: '2026-01-01', jours: -129, statut: 'resilie', risque: 0, ark: null },
  { id: 14, client: 'Cabinet Moreau', type: 'Pro', produit: 'PJ', compagnie: 'Serenis Risk', prime: 1200, effet: '2025-06-01', echeance: '2026-06-01', jours: 21, statut: 'actif', risque: 40, ark: null },
  { id: 15, client: 'Duval Corinne', type: 'Particulier', produit: 'Santé', compagnie: 'Novalia Courtage', prime: 950, effet: '2025-05-01', echeance: '2026-05-01', jours: -10, statut: 'actif', risque: 62, ark: 'Échéance dépassée de 10j. Action immédiate.' },
  { id: 16, client: 'BatiSens Pro', type: 'Pro', produit: 'RC Pro', compagnie: 'Atlas Assurances', prime: 5600, effet: '2024-10-01', echeance: '2026-10-01', jours: 143, statut: 'actif', risque: 18, ark: null },
]

const STATUT_STYLE = {
  actif: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', label: 'Actif' },
  renouvellement: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'Renouvellement' },
  resilie: { bg: 'rgba(239,68,68,0.06)', text: '#9CA3AF', label: 'Résilié' },
}

const FILTERS = ['Tous', 'Actifs', 'Renouvellement', 'Résiliés', 'Échéance proche', 'Risque élevé', 'Opportunité ARK']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div className="courtia-mobile-kpi" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

function ContractCard({ c, navigate }) {
  const jourColor = c.jours <= 0 ? T.danger : c.jours <= 30 ? T.warning : T.success
  const statut = STATUT_STYLE[c.statut] || STATUT_STYLE.actif
  return (
    <Vibe3DCard
      onClick={() => navigate(`/clients/${c.id}`)}
      depth={10}
      glowColor={c.ark ? T.ark : T.accent}
      borderColor={T.cardBorder}
      background={T.cardBg}
      radius={12}
      padding={14}
      ariaLabel={`Contrat ${c.client} ${c.produit}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.client}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{c.produit} • {c.compagnie}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statut.bg, color: statut.text }}>{statut.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(c.prime)}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: jourColor }}>{c.jours <= 0 ? `Échu J+${Math.abs(c.jours)}` : `J-${c.jours}`}</span>
      </div>
      {c.ark && (
        <div style={{ background: T.arkBg, border: `1px solid ${T.arkBorder}`, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 10, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} color={T.ark} /> <strong style={{ color: '#a78bfa' }}>ARK :</strong> {c.ark}
        </div>
      )}
    </Vibe3DCard>
  )
}

export default function Contrats() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [viewMode, setViewMode] = useState('cards')

  const filtered = useMemo(() => {
    let list = DEMO_CONTRACTS
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.client.toLowerCase().includes(q) || c.produit.toLowerCase().includes(q) || c.compagnie.toLowerCase().includes(q))
    }
    if (filter === 'Actifs') list = list.filter(c => c.statut === 'actif')
    else if (filter === 'Renouvellement') list = list.filter(c => c.statut === 'renouvellement')
    else if (filter === 'Résiliés') list = list.filter(c => c.statut === 'resilie')
    else if (filter === 'Échéance proche') list = list.filter(c => c.jours <= 30 && c.jours > -999)
    else if (filter === 'Risque élevé') list = list.filter(c => c.risque >= 60)
    else if (filter === 'Opportunité ARK') list = list.filter(c => c.ark)
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    actifs: DEMO_CONTRACTS.filter(c => c.statut === 'actif').length,
    total: DEMO_CONTRACTS.length,
    primes: DEMO_CONTRACTS.reduce((s, c) => s + c.prime, 0),
    echeance30: DEMO_CONTRACTS.filter(c => c.jours <= 30 && c.jours > -999).length,
    risque: DEMO_CONTRACTS.filter(c => c.risque >= 60).length,
    ark: DEMO_CONTRACTS.filter(c => c.ark).length,
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.85} />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <VibeHeader
          kicker="PORTEFEUILLE"
          title="Contrats"
          subtitle="Suivez vos contrats, échéances et alertes portefeuille."
          bubbleSize={50}
          actions={(
            <>
              <button onClick={() => navigate('/contrats/new')} style={btnStyle(T.accent)}><Plus size={13} /> Ajouter</button>
              <button style={btnStyle(null)}><Upload size={13} /> Importer</button>
              <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
            </>
          )}
        />

        {/* HIGHLIGHT echeance */}
        <div
          onClick={() => { setFilter('Échéance proche') }}
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(91,77,245,0.04))',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={16} color={T.warning} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
              {stats.echeance30} contrats à échéance ce mois
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              Préparez les renouvellements maintenant — ARK a déjà priorisé.
            </div>
          </div>
          <button style={{
            padding: '8px 14px', borderRadius: 8,
            background: T.warning, color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Préparer renouvellements <ChevronRight size={12} />
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={FileText} title="Contrats actifs" value="14 / 312" />
          <KpiCard icon={Euro} title="Primes annuelles" value={fmtEur(stats.primes)} />
          <KpiCard icon={Calendar} title="Échéances ≤30j" value={stats.echeance30} accent={T.warning} />
          <KpiCard icon={AlertTriangle} title="À risque" value={stats.risque} accent={T.danger} />
          <KpiCard icon={Sparkles} title="Alertes ARK" value={stats.ark} accent={T.ark} />
        </div>

        {/* TOOLBAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filter === f ? `${T.accent}22` : T.cardBg,
                color: filter === f ? T.accent : T.textSecondary,
                border: filter === f ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
                padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}`,
                width: 200, outline: 'none',
              }} />
            </div>
            <button onClick={() => setViewMode('cards')} style={{ padding: 6, borderRadius: 6, background: viewMode === 'cards' ? `${T.accent}22` : 'transparent', border: 'none', color: viewMode === 'cards' ? T.accent : T.textMuted, cursor: 'pointer' }}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('table')} style={{ padding: 6, borderRadius: 6, background: viewMode === 'table' ? `${T.accent}22` : 'transparent', border: 'none', color: viewMode === 'table' ? T.accent : T.textMuted, cursor: 'pointer' }}><List size={16} /></button>
          </div>
        </div>

        {/* VIEW */}
        {viewMode === 'cards' ? (
          <VibeScrollSection delay={0.05} parallax={14}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.04 * i, ease: [0.16,1,0.3,1] }}
                >
                  <ContractCard c={c} navigate={navigate} />
                </motion.div>
              ))}
            </div>
          </VibeScrollSection>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                  {['Client', 'Produit', 'Compagnie', 'Prime', 'Échéance', 'Statut', 'Risque', 'ARK', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: T.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const jourColor = c.jours <= 0 ? T.danger : c.jours <= 30 ? T.warning : T.success
                  const statut = STATUT_STYLE[c.statut] || STATUT_STYLE.actif
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.cardBorder}`, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      onClick={() => navigate(`/clients/${c.id}`)}>
                      <td style={{ padding: '10px 12px', color: T.text, fontWeight: 600 }}>{c.client}</td>
                      <td style={{ padding: '10px 12px', color: T.textSecondary }}>{c.produit}</td>
                      <td style={{ padding: '10px 12px', color: T.textMuted }}>{c.compagnie}</td>
                      <td style={{ padding: '10px 12px', color: T.text, fontWeight: 600 }}>{fmtEur(c.prime)}</td>
                      <td style={{ padding: '10px 12px', color: jourColor, fontWeight: 600 }}>
                        {c.jours <= 0 ? `Échu J+${Math.abs(c.jours)}` : `J-${c.jours}`}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statut.bg, color: statut.text }}>{statut.label}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: c.risque >= 60 ? T.danger : T.success, fontWeight: 600 }}>{c.risque}%</td>
                      <td style={{ padding: '10px 12px' }}>{c.ark ? <Sparkles size={14} color={T.ark} /> : null}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={e => { e.stopPropagation(); navigate(`/clients/${c.id}`) }} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, background: 'transparent', color: T.ark, border: `1px solid ${T.arkBorder}`, cursor: 'pointer' }}>
                          Voir <ChevronRight size={10} style={{ verticalAlign: 'middle' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <Shield size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucun contrat trouvé.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: color ? `${color}15` : T.cardBg,
    color: color || T.text,
    border: color ? `1px solid ${color}30` : `1px solid ${T.cardBorder}`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}
