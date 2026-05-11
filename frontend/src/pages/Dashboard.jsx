import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, FileText, Euro, ArrowRight, Sparkles, Heart,
  AlertTriangle, CheckSquare, UserPlus, Clock, Bell,
  TrendingUp, TrendingDown, Activity, Calendar, Phone,
  Zap, Target, ChevronRight, FileSignature,
} from 'lucide-react'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import { VibeBackdrop, VibeHeader } from '../components/vibe'
import { BubbleCMini } from '../design/BubbleC'

// ─── Tokens Aurora Bubble C ───────────────────────────────────────
const T = {
  bg:           '#050510',
  bgSecondary:  '#080818',
  cardBg:       'rgba(255,255,255,0.03)',
  cardBgHover:  'rgba(255,255,255,0.06)',
  cardBorder:   'rgba(255,255,255,0.06)',
  cardBorderLight: 'rgba(255,255,255,0.10)',
  text:         '#FFFFFF',
  textSecondary:'#9CA3AF',
  textMuted:    '#6B7280',
  textDim:      '#4B5563',
  accent:       '#5B4DF5',
  ark:          '#8B5CF6',
  arkBg:        'rgba(139,92,246,0.08)',
  arkBorder:    'rgba(139,92,246,0.25)',
  cyan:         '#22D3EE',
  blue:         '#3B82F6',
  success:      '#22C55E',
  warning:      '#F59E0B',
  danger:       '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.rows)) return payload.rows
  return []
}

// ─── Aurora Card (glassmorphism) ─────────────────────────────────
function AuroraCard({ children, padding = 20, hover = true, accent, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 14,
        padding,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.18s, border-color 0.18s, transform 0.18s',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!hover) return
        e.currentTarget.style.background = T.cardBgHover
        e.currentTarget.style.borderColor = T.cardBorderLight
      }}
      onMouseLeave={(e) => {
        if (!hover) return
        e.currentTarget.style.background = T.cardBg
        e.currentTarget.style.borderColor = T.cardBorder
      }}
    >
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.6,
        }} />
      )}
      {children}
    </div>
  )
}

// ─── KPI Card cockpit dense ──────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = T.accent, delta, deltaPositive = true, sub }) {
  return (
    <AuroraCard padding={18} hover={false} accent={accent}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {(delta != null || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11 }}>
          {delta != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              color: deltaPositive ? T.success : T.danger, fontWeight: 600,
            }}>
              {deltaPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta}
            </span>
          )}
          {sub && <span style={{ color: T.textMuted }}>{sub}</span>}
        </div>
      )}
    </AuroraCard>
  )
}

// ─── Sparkline SVG ───────────────────────────────────────────────
function Sparkline({ points, color = T.cyan, width = 280, height = 50 }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - ((p - min) / range) * (height - 6) - 3}`).join(' ')
  const area = `${d} L ${width} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spk)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {points.map((p, i) => {
        const cx = i * step
        const cy = height - ((p - min) / range) * (height - 6) - 3
        return <circle key={i} cx={cx} cy={cy} r="2" fill={color} opacity={i === points.length - 1 ? 1 : 0.4} />
      })}
    </svg>
  )
}

// ─── Demo data (cohérent avec storytelling) ──────────────────────
const ARK_PRIORITIES = [
  { id: 1, level: 'urgent',  title: 'Renouvellement RC Pro — Martin Conseil',  meta: 'J-21 • 2 800 €', cta: 'Préparer', accent: T.danger },
  { id: 2, level: 'urgent',  title: 'Cliente silencieuse — Leroy Marie',       meta: '52 j sans contact • Risque 80%', cta: 'Appeler', accent: T.danger },
  { id: 3, level: 'haut',    title: 'Devis Auto sans réponse — Karim B.',      meta: 'Devis #247 • 1 200 €', cta: 'Relancer', accent: T.warning },
  { id: 4, level: 'haut',    title: 'Cross-sell Prévoyance — Sophie L.',       meta: 'Profil idéal • Score 92%', cta: 'Créer devis', accent: T.ark },
  { id: 5, level: 'moyen',   title: 'Échéance MRH — Dupont SAS',               meta: 'J-42 • 4 200 €', cta: 'Voir', accent: T.warning },
]

const ECHEANCES = [
  { id: 1, type: 'RC Pro',      client: 'Martin Conseil',    compagnie: 'Aurora',  date: '01 juin', jours: 21,  prime: 2800 },
  { id: 2, type: 'Flotte Auto', client: 'Auto Évolution 89', compagnie: 'Novalia', date: '15 juin', jours: 35,  prime: 8500 },
  { id: 3, type: 'MRH',         client: 'Dupont SAS',        compagnie: 'Aurora',  date: '22 juin', jours: 42,  prime: 4200 },
  { id: 4, type: 'Cyber',       client: 'Groupe Ardent',     compagnie: 'Atlas',   date: '01 juil', jours: 51,  prime: 5200 },
  { id: 5, type: 'PJ',          client: 'Cabinet Moreau',    compagnie: 'Serenis', date: '01 juil', jours: 51,  prime: 1200 },
]

const ACTIVITY = [
  { id: 1, label: 'Devis Prévoyance envoyé à Sophie L.',        when: 'il y a 1h',   color: T.blue,    icon: FileSignature },
  { id: 2, label: 'Nouveau client : Amélie Dubois',             when: 'il y a 3h',   color: T.success, icon: UserPlus },
  { id: 3, label: 'Contrat RC Pro renouvelé — Cabinet Moreau',  when: 'hier',        color: T.success, icon: FileText },
  { id: 4, label: 'Relance email envoyée à Karim B.',           when: 'hier',        color: T.warning, icon: Phone },
  { id: 5, label: 'ARK : 3 opportunités détectées',             when: 'il y a 2j',   color: T.ark,     icon: Sparkles },
  { id: 6, label: 'Tâche terminée — Vérifier RC Moreau',        when: 'il y a 2j',   color: T.textMuted, icon: CheckSquare },
]

const SUGGESTIONS = [
  { id: 1, title: 'Cross-sell Prévoyance', desc: 'Sophie L. — Profil idéal pour Prévoyance TNS. Potentiel 520€/an.', cta: 'Créer le devis', to: '/devis' },
  { id: 2, title: 'Relance ciblée', desc: 'Leroy Marie silencieuse 52j. Risque 80%. Préparer appel de bilan.', cta: 'Préparer la relance', to: '/relances' },
  { id: 3, title: 'Optimiser RC Pro', desc: 'Martin Conseil — Comparer 3 compagnies avant renouvellement J-21.', cta: 'Comparer', to: '/comparateur' },
]

const LEVEL_BADGE = {
  urgent: { label: 'Urgent', bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5' },
  haut:   { label: 'Haut',   bg: 'rgba(245,158,11,0.15)', color: '#FCD34D' },
  moyen:  { label: 'Moyen',  bg: 'rgba(91,77,245,0.15)', color: '#A5B4FC' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes, clientsRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: null })),
        getSessionUser().then(u => ({ data: u || {} })).catch(() => ({ data: {} })),
        api.get('/clients?limit=300').catch(() => ({ data: [] })),
      ])
      setStats(statsRes.data || null)
      setUser(userRes.data || {})
      setClients(normalizeRows(clientsRes.data))
    } catch (_) { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const metrics = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    const activeClients = Number(statusMap.actif || 0) || clients.length || 124
    const activeContracts = Number(stats?.contratsActifs || 0) || 312
    const annualPrime = Number(stats?.primeTotale || 0) || 248000
    const healthScore = 82
    return { activeClients, activeContracts, annualPrime, healthScore }
  }, [stats, clients])

  const userName = user?.first_name || user?.firstName || ''
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const urgentCount = ARK_PRIORITIES.filter(p => p.level === 'urgent').length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <BubbleCMini size={80} animated />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 24px 48px', color: T.text }}>
      <VibeBackdrop intensity={0.85} />

      {/* Halos décoratifs Aurora */}
      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        top: -200, left: 100, pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        bottom: -100, right: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        {/* HEADER cockpit */}
        <header style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                <Sparkles size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                ARK Intelligence active
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: '-0.025em',
              color: T.text, margin: 0, lineHeight: 1.15,
            }}>
              Cockpit
            </h1>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
              {today[0].toUpperCase() + today.slice(1)} {userName ? `• ${userName}` : ''} • <span style={{ color: T.danger, fontWeight: 600 }}>{urgentCount} urgences ARK</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/morning-brief')} style={btnPrimary}>
              <Sparkles size={13} /> Morning Brief
            </button>
            <button onClick={() => navigate('/clients/new')} style={btnGhost}>
              <UserPlus size={13} /> Nouveau client
            </button>
          </div>
        </header>

        {/* ROW 1 — 4 KPIs cockpit */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12, marginBottom: 18,
        }}>
          <KpiCard label="Clients actifs"   value={fmtNum(metrics.activeClients)}   icon={Users}    accent={T.accent}  delta="+8 ce mois" deltaPositive />
          <KpiCard label="Contrats actifs"  value={fmtNum(metrics.activeContracts)} icon={FileText} accent={T.blue}    delta="+12" deltaPositive sub="ce mois" />
          <KpiCard label="Primes annuelles" value={fmtEur(metrics.annualPrime)}     icon={Euro}     accent={T.success} delta="+5,2%" deltaPositive sub="vs M-1" />
          <KpiCard label="Score santé"      value={`${metrics.healthScore}%`}       icon={Heart}    accent={T.ark}     delta="+2 pts" deltaPositive sub="bon état" />
        </div>

        {/* ROW 2 — Priorités ARK + Échéances 30j */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: 12, marginBottom: 18,
        }}>
          {/* Priorités ARK */}
          <AuroraCard padding={18} hover={false} style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(255,255,255,0.02))' }}>
            <SectionTitle
              icon={Zap}
              iconColor={T.ark}
              title="Priorités ARK aujourd'hui"
              count={ARK_PRIORITIES.length}
              cta="Tout voir"
              onCta={() => navigate('/morning-brief')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ARK_PRIORITIES.map(p => {
                const badge = LEVEL_BADGE[p.level] || LEVEL_BADGE.moyen
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${T.cardBorder}`,
                    borderLeft: `3px solid ${p.accent}`,
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      background: badge.bg, color: badge.color,
                      textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                    }}>{badge.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{p.meta}</div>
                    </div>
                    <button style={{
                      padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {p.cta} <ChevronRight size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </AuroraCard>

          {/* Échéances 30j */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle
              icon={Calendar}
              iconColor={T.warning}
              title="Échéances 30 jours"
              count={ECHEANCES.length}
              cta="Contrats"
              onCta={() => navigate('/contrats')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ECHEANCES.map((e, i) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 0',
                  borderBottom: i < ECHEANCES.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 9,
                    background: e.jours <= 30 ? 'rgba(245,158,11,0.10)' : 'rgba(91,77,245,0.10)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 9, color: T.textMuted, lineHeight: 1 }}>J-</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: e.jours <= 30 ? T.warning : T.accent, lineHeight: 1 }}>{e.jours}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{e.type} — {e.client}</div>
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{e.compagnie} • {e.date}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, flexShrink: 0 }}>{fmtEur(e.prime)}</div>
                </div>
              ))}
            </div>
          </AuroraCard>
        </div>

        {/* ROW 3 — Performance + Activité */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
          gap: 12, marginBottom: 18,
        }}>
          {/* Performance 90j */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle icon={TrendingUp} iconColor={T.success} title="Performance 90 jours" />
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1 }}>{fmtEur(248000)}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>Primes cumulées</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.success, fontSize: 12, fontWeight: 600 }}>
                    <TrendingUp size={12} /> +12,4%
                  </span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>vs 90j précédents</span>
                </div>
              </div>
              <Sparkline
                points={[180, 195, 188, 210, 225, 218, 240, 235, 248]}
                color={T.success}
                width={180}
                height={56}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.cardBorder}` }}>
              <MiniStat label="Devis signés" value="24" delta="+6" />
              <MiniStat label="Taux transfo" value="48%" delta="+4 pts" />
              <MiniStat label="Rétention" value="94%" delta="stable" deltaPositive={null} />
            </div>
          </AuroraCard>

          {/* Activité récente */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle icon={Activity} iconColor={T.cyan} title="Activité récente" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ACTIVITY.map((a, i) => {
                const Icon = a.icon
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: `${a.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Icon size={11} color={a.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>{a.label}</div>
                    </div>
                    <span style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.when}</span>
                  </div>
                )
              })}
            </div>
          </AuroraCard>
        </div>

        {/* ROW 4 — Suggestions ARK */}
        <div style={{ marginBottom: 12 }}>
          <SectionTitle
            icon={Sparkles}
            iconColor={T.ark}
            title="Suggestions ARK"
            count={SUGGESTIONS.length}
            inline
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12, marginTop: 10,
          }}>
            {SUGGESTIONS.map(s => (
              <AuroraCard key={s.id} padding={16} onClick={() => navigate(s.to)} style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(91,77,245,0.03))',
                borderColor: 'rgba(139,92,246,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: T.arkBg, border: `1px solid ${T.arkBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={12} color={T.ark} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                    ARK Insight
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>{s.desc}</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: T.ark,
                }}>
                  {s.cta} <ArrowRight size={12} />
                </div>
              </AuroraCard>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, iconColor, title, count, cta, onCta, inline }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: inline ? 0 : 14,
    }}>
      <Icon size={15} color={iconColor || T.accent} />
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      {count != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
          background: 'rgba(139,92,246,0.10)', color: T.ark,
        }}>{count}</span>
      )}
      {cta && (
        <button onClick={onCta} style={{
          marginLeft: 'auto',
          background: 'transparent', border: 'none', color: T.textMuted,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
        onMouseEnter={e => e.currentTarget.style.color = T.text}
        onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
        >
          {cta} <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

function MiniStat({ label, value, delta, deltaPositive = true }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>{label}</div>
      {delta && (
        <div style={{
          fontSize: 10, fontWeight: 600, marginTop: 4,
          color: deltaPositive === null ? T.textMuted : deltaPositive ? T.success : T.danger,
        }}>{delta}</div>
      )}
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
  boxShadow: '0 4px 16px rgba(91,77,245,0.30)',
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
