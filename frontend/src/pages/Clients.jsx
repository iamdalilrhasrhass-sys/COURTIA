import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, UserCheck, UserPlus, AlertTriangle, Users, MapPin,
  Upload, LayoutGrid, Rows, Sparkles, TrendingUp, Heart, ChevronRight,
} from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'

// ─── Aurora tokens ─────────────────────────────────────────────
const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.10)',
  arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  cyan: '#22D3EE',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ─── Demo data ────────────────────────────────────────────────
const DEMO_CLIENTS = [
  { id: 1, name: 'Sophie Moreau',    type: 'Particulier', status: 'actif',     city: 'Lyon',        contracts: 3, prime: 2480,  score: 88, lastContact: '3 j',  ark: 'Cross-sell Prévoyance' },
  { id: 2, name: 'Thomas Bernard',   type: 'Pro',         status: 'actif',     city: 'Paris',       contracts: 3, prime: 6150,  score: 84, lastContact: '8 j',  ark: null },
  { id: 3, name: 'Amélie Dubois',    type: 'Particulier', status: 'prospect',  city: 'Bordeaux',    contracts: 1, prime: 890,   score: 62, lastContact: '1 j',  ark: 'Devis à transformer' },
  { id: 4, name: 'Laurent Petit',    type: 'Particulier', status: 'a_risque',  city: 'Marseille',   contracts: 1, prime: 1340,  score: 38, lastContact: '47 j', ark: 'Relance urgente' },
  { id: 5, name: 'Claire Martin',    type: 'Pro',         status: 'actif',     city: 'Nantes',      contracts: 4, prime: 12800, score: 92, lastContact: '5 j',  ark: null },
  { id: 6, name: 'Jean Dupont',      type: 'Particulier', status: 'silencieux',city: 'Toulouse',    contracts: 2, prime: 1760,  score: 55, lastContact: '32 j', ark: 'Silencieux 32j' },
  { id: 7, name: 'Marie Lefebvre',   type: 'Particulier', status: 'actif',     city: 'Lille',       contracts: 3, prime: 3200,  score: 79, lastContact: '6 j',  ark: null },
  { id: 8, name: 'Nicolas Roux',     type: 'Pro',         status: 'prospect',  city: 'Strasbourg',  contracts: 0, prime: 0,     score: 48, lastContact: '2 j',  ark: 'Premier devis' },
  { id: 9, name: 'Isabelle Garnier', type: 'Particulier', status: 'actif',     city: 'Nice',        contracts: 4, prime: 4100,  score: 90, lastContact: '12 j', ark: null },
  { id: 10, name: 'Leroy Marie',     type: 'Particulier', status: 'a_risque',  city: 'Rennes',      contracts: 1, prime: 680,   score: 22, lastContact: '52 j', ark: 'Risque perte 80%' },
  { id: 11, name: 'Céline Fournier', type: 'Pro',         status: 'actif',     city: 'Montpellier', contracts: 3, prime: 7850,  score: 86, lastContact: '4 j',  ark: null },
  { id: 12, name: 'Karim Benali',    type: 'Particulier', status: 'silencieux',city: 'Grenoble',    contracts: 2, prime: 1200,  score: 51, lastContact: '29 j', ark: 'Devis sans réponse' },
  { id: 13, name: 'Anne Rousseau',   type: 'Particulier', status: 'actif',     city: 'Dijon',       contracts: 2, prime: 1950,  score: 76, lastContact: '14 j', ark: null },
  { id: 14, name: 'Martin Conseil',  type: 'Pro',         status: 'actif',     city: 'Lyon',        contracts: 5, prime: 15880, score: 89, lastContact: '7 j',  ark: 'Renouvellement J-21' },
  { id: 15, name: 'BatiSens Pro',    type: 'Pro',         status: 'actif',     city: 'Toulouse',    contracts: 4, prime: 9800,  score: 83, lastContact: '11 j', ark: null },
  { id: 16, name: 'Romain Gauthier', type: 'Particulier', status: 'actif',     city: 'Reims',       contracts: 3, prime: 2870,  score: 80, lastContact: '9 j',  ark: null },
]

const FILTERS = [
  { key: 'tous',       label: 'Tous' },
  { key: 'particulier',label: 'Particulier' },
  { key: 'pro',        label: 'Pro' },
  { key: 'actif',      label: 'Actifs' },
  { key: 'silencieux', label: 'Silencieux' },
  { key: 'a_risque',   label: 'À risque' },
]

const STATUS = {
  actif:      { label: 'Actif',     color: T.success,   bg: 'rgba(34,197,94,0.10)' },
  prospect:   { label: 'Prospect',  color: T.info,      bg: 'rgba(59,130,246,0.10)' },
  a_risque:   { label: 'À risque',  color: T.danger,    bg: 'rgba(239,68,68,0.12)' },
  silencieux: { label: 'Silencieux',color: T.warning,   bg: 'rgba(245,158,11,0.12)' },
  perdu:      { label: 'Perdu',     color: T.textMuted, bg: 'rgba(107,114,128,0.10)' },
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function scoreColor(s) {
  if (s >= 80) return T.success
  if (s >= 60) return T.cyan
  if (s >= 40) return T.warning
  return T.danger
}

// ─── KPI mini ──────────────────────────────────────────────
function KpiMini({ label, value, accent, icon: Icon }) {
  return (
    <div style={{
      flex: '1 1 200px',
      minWidth: 180,
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: 14,
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.6,
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 6, letterSpacing: '-0.02em' }}>{value}</div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={accent} />
        </div>
      </div>
    </div>
  )
}

// ─── Vue Bulles (grid premium) ─────────────────────────────
function BubbleClientCard({ client, onClick }) {
  const st = STATUS[client.status] || STATUS.actif
  const sCol = scoreColor(client.score)
  return (
    <div onClick={() => onClick(client.id)} style={{
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 16,
      padding: 18,
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = T.cardBgHover
      e.currentTarget.style.borderColor = T.cardBorderLight
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = T.cardBg
      e.currentTarget.style.borderColor = T.cardBorder
      e.currentTarget.style.transform = 'translateY(0)'
    }}>
      {/* Halo iridescent décoratif (bulle) */}
      <div style={{
        position: 'absolute', top: -40, right: -30,
        width: 110, height: 110, borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${sCol}22, ${T.ark}10 50%, transparent 70%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `linear-gradient(135deg, ${sCol}40, ${T.ark}30)`,
          border: `1px solid ${sCol}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: T.text,
          flexShrink: 0,
          position: 'relative',
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.15), 0 0 20px ${sCol}25`,
        }}>
          {getInitials(client.name)}
          {/* specular highlight */}
          <div style={{
            position: 'absolute', top: 4, left: 8, width: 10, height: 6,
            borderRadius: '50%', background: 'rgba(255,255,255,0.4)', filter: 'blur(2px)',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{client.name}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{client.type} • {client.city}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
          background: st.bg, color: st.color,
        }}>{st.label}</span>
        <span style={{ fontSize: 11, color: T.textMuted }}>
          {client.contracts} contrat{client.contracts !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prime annuelle</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginTop: 2 }}>
            {client.prime > 0 ? fmtEur(client.prime) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: sCol, marginTop: 2 }}>{client.score}%</div>
        </div>
      </div>

      {client.ark && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.cardBorder}`,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: T.ark,
        }}>
          <Sparkles size={11} />
          <span style={{ fontWeight: 600 }}>ARK</span>
          <span style={{ color: T.textSecondary }}>•</span>
          <span style={{ color: T.textSecondary }}>{client.ark}</span>
        </div>
      )}
    </div>
  )
}

// ─── Vue Tableau dense ─────────────────────────────────────
function ClientTable({ clients, onClick }) {
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 12, overflow: 'hidden', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['Client', 'Type', 'Ville', 'Contrats', 'Prime annuelle', 'Score', 'Dernier contact', 'ARK'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '11px 14px', fontSize: 10,
                  fontWeight: 700, color: T.textMuted, textTransform: 'uppercase',
                  letterSpacing: '0.08em', borderBottom: `1px solid ${T.cardBorder}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const st = STATUS[c.status] || STATUS.actif
              const sCol = scoreColor(c.score)
              return (
                <tr key={c.id} onClick={() => onClick(c.id)} style={{
                  borderBottom: `1px solid ${T.cardBorder}`, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: `linear-gradient(135deg, ${sCol}30, ${T.ark}20)`,
                        border: `1px solid ${sCol}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: T.text,
                      }}>{getInitials(c.name)}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: T.textSecondary }}>{c.type}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: T.textSecondary }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color={T.textMuted} /> {c.city}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: T.text, fontWeight: 600 }}>{c.contracts}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: T.text, fontWeight: 600 }}>{c.prime > 0 ? fmtEur(c.prime) : '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ width: `${c.score}%`, height: '100%', background: sCol, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sCol, minWidth: 36 }}>{c.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: T.textMuted }}>{c.lastContact}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.ark ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, color: T.ark,
                        padding: '3px 8px', borderRadius: 6,
                        background: T.arkBg, border: `1px solid ${T.arkBorder}`,
                      }}>
                        <Sparkles size={10} /> {c.ark}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: T.textDim }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Clients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [view, setView] = useState('table') // 'table' | 'bubbles'

  const filtered = useMemo(() => {
    let list = DEMO_CLIENTS
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.city.toLowerCase().includes(s) ||
        c.type.toLowerCase().includes(s),
      )
    }
    if (filter === 'particulier') list = list.filter(c => c.type === 'Particulier')
    else if (filter === 'pro')    list = list.filter(c => c.type === 'Pro')
    else if (filter !== 'tous')   list = list.filter(c => c.status === filter)
    return list
  }, [search, filter])

  const stats = useMemo(() => {
    const total = DEMO_CLIENTS.length
    const actifs = DEMO_CLIENTS.filter(c => c.status === 'actif').length
    const inactifs = DEMO_CLIENTS.filter(c => ['silencieux', 'a_risque'].includes(c.status)).length
    const avgScore = Math.round(DEMO_CLIENTS.reduce((s, c) => s + c.score, 0) / total)
    return { total, actifs, inactifs, avgScore }
  }, [])

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 24px 48px' }}>
      <VibeBackdrop intensity={0.75} />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{
        position: 'fixed', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
        top: -150, right: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <VibeScrollSection parallax={12}>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
              Portefeuille
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em',
              color: T.text, margin: 0, lineHeight: 1.15,
            }}>
              Clients
            </h1>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
              Pilotez votre portefeuille et identifiez les opportunités ARK.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/import')} style={btnGhost}>
              <Upload size={13} /> Importer
            </button>
            <button onClick={() => navigate('/clients/new')} style={btnPrimary}>
              <Plus size={13} /> Nouveau client
            </button>
          </div>
        </header>

        {/* 4 KPIs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <KpiMini label="Total"       value={stats.total}     accent={T.accent}  icon={Users} />
          <KpiMini label="Actifs"      value={stats.actifs}    accent={T.success} icon={UserCheck} />
          <KpiMini label="Inactifs"    value={stats.inactifs}  accent={T.warning} icon={AlertTriangle} />
          <KpiMini label="Score moyen" value={`${stats.avgScore}%`} accent={T.ark} icon={Heart} />
        </div>

        {/* Toolbar : recherche + filtres + view toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap', marginBottom: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: '1 1 240px', minWidth: 200,
            padding: '8px 12px',
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
            borderRadius: 9, backdropFilter: 'blur(12px)',
          }}>
            <Search size={14} color={T.textMuted} />
            <input
              type="text"
              placeholder="Rechercher (nom, ville, type)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: T.text, fontSize: 13,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '7px 12px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: filter === f.key ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
                background: filter === f.key ? 'rgba(91,77,245,0.12)' : T.cardBg,
                color: filter === f.key ? '#A5B4FC' : T.textSecondary,
                transition: 'all 0.15s',
              }}>{f.label}</button>
            ))}
          </div>

          <div style={{
            display: 'flex', padding: 3, borderRadius: 9,
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
          }}>
            <button onClick={() => setView('table')} style={viewToggleBtn(view === 'table')} title="Tableau">
              <Rows size={14} />
            </button>
            <button onClick={() => setView('bubbles')} style={viewToggleBtn(view === 'bubbles')} title="Bulles">
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* LISTE */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: T.cardBg, border: `1px dashed ${T.cardBorder}`,
            borderRadius: 14, color: T.textMuted,
          }}>
            <Users size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 4 }}>Aucun client trouvé</p>
            <p style={{ fontSize: 12 }}>Essayez un autre filtre ou une autre recherche.</p>
          </div>
        ) : view === 'table' ? (
          <ClientTable clients={filtered} onClick={(id) => navigate(`/clients/${id}`)} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {filtered.map(c => (
              <BubbleClientCard key={c.id} client={c} onClick={(id) => navigate(`/clients/${id}`)} />
            ))}
          </div>
        )}

        {/* Footer compteur */}
        {filtered.length > 0 && (
          <p style={{ marginTop: 18, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} sur {DEMO_CLIENTS.length}
          </p>
        )}
      </main>
      </VibeScrollSection>
    </div>
  )
}

const btnPrimary = {
  padding: '9px 14px',
  background: T.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 4px 14px rgba(91,77,245,0.25)',
}

const btnGhost = {
  padding: '9px 14px',
  background: 'rgba(255,255,255,0.04)',
  color: T.text,
  border: `1px solid ${T.cardBorderLight}`,
  borderRadius: 9,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const viewToggleBtn = (active) => ({
  padding: '6px 10px',
  background: active ? 'rgba(91,77,245,0.15)' : 'transparent',
  color: active ? '#A5B4FC' : T.textMuted,
  border: 'none',
  borderRadius: 7,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
})
