import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Euro, Calendar, ArrowUpRight, Zap, TrendingUp } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'
import Logo from '../components/Logo'

/* ─── tiny helpers ──────────────────────────────────────── */
const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

/* ─── BubblePortfolioMap (inline SVG chart with smooth bezier + floating bubbles) ── */
function BubblePortfolioMap({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const points = data || [
    { label: 'Jan', value: 120 }, { label: 'Fév', value: 145 },
    { label: 'Mar', value: 132 }, { label: 'Avr', value: 168 },
    { label: 'Mai', value: 155 }, { label: 'Juin', value: 178 },
  ]
  const max = Math.max(...points.map(p => p.value), 1)
  const w = 600, h = 200
  const pad = { top: 20, bottom: 30, left: 44, right: 28 }

  const xScale = (i) => pad.left + (i / Math.max(points.length - 1, 1)) * (w - pad.left - pad.right)
  const yScale = (v) => pad.top + h - pad.bottom - ((v / max) * (h - pad.top - pad.bottom - 10))

  /* ── build cubic bezier path through all points ───── */
  const buildBezierPath = (pts) => {
    if (pts.length === 0) return ''
    let d = `M${xScale(0).toFixed(1)},${yScale(pts[0].value).toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const x1 = xScale(i - 1), y1 = yScale(pts[i - 1].value)
      const x2 = xScale(i),     y2 = yScale(pts[i].value)
      const dx = x2 - x1
      const cp1x = (x1 + dx / 3).toFixed(1)
      const cp1y = y1.toFixed(1)
      const cp2x = (x2 - dx / 3).toFixed(1)
      const cp2y = y2.toFixed(1)
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2.toFixed(1)},${y2.toFixed(1)}`
    }
    return d
  }

  const lineD = buildBezierPath(points)
  const lastX = xScale(points.length - 1)
  const firstX = xScale(0)
  const bottomY = h - pad.bottom + 2
  const areaD = lineD + ` L${lastX.toFixed(1)},${bottomY} L${firstX.toFixed(1)},${bottomY} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', maxHeight: 230 }}>
      <defs>
        {/* Area fill gradient */}
        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
        </linearGradient>

        {/* Iridescent bubble gradient — inspired by Logo.jsx */}
        <radialGradient id="bubbleMain" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="rgba(255,255,255,1)" />
          <stop offset="18%" stopColor="rgba(255,255,255,0.88)" />
          <stop offset="38%" stopColor="rgba(232,247,255,0.72)" />
          <stop offset="60%" stopColor="rgba(186,230,253,0.55)" />
          <stop offset="82%" stopColor="rgba(167,139,250,0.6)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.7)" />
        </radialGradient>

        <linearGradient id="bubbleIris" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(186,230,253,0.35)" />
          <stop offset="33%" stopColor="rgba(196,181,253,0.3)" />
          <stop offset="66%" stopColor="rgba(253,186,116,0.25)" />
          <stop offset="100%" stopColor="rgba(236,72,153,0.35)" />
        </linearGradient>

        <filter id="bubbleSoft"><feGaussianBlur stdDeviation="0.4" /></filter>
      </defs>

      {/* Smooth filled area */}
      <path d={areaD} fill="url(#portfolioGrad)" />

      {/* Smooth bezier curve line */}
      <path d={lineD} fill="none" stroke="url(#bubbleIris)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" style={{ mixBlendMode: 'screen' }} />
      <path d={lineD} fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Floating data-point bubbles */}
      {points.map((p, i) => {
        const cx = xScale(i)
        const cy = yScale(p.value)
        const isHovered = hoveredIndex === i
        const r = isHovered ? 11 : 5.5

        return (
          <g key={i}
            style={{ animation: `bubbleFloat${i % 3} 3.6s ease-in-out infinite`, animationDelay: `${i * 0.25}s`, transformOrigin: `${cx}px ${cy}px` }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Hover glow ring */}
            {isHovered && (
              <circle cx={cx} cy={cy} r={16} fill="none" stroke="rgba(37,99,235,0.18)" strokeWidth="6" opacity="0.5" />
            )}

            {/* Main iridescent bubble */}
            <circle cx={cx} cy={cy} r={r} fill="url(#bubbleMain)" stroke="rgba(148,163,184,0.5)" strokeWidth="0.7" filter="url(#bubbleSoft)" />
            <circle cx={cx} cy={cy} r={r} fill="url(#bubbleIris)" opacity="0.32" style={{ mixBlendMode: 'screen' }} />

            {/* Specular highlight */}
            <ellipse cx={cx - r * 0.28} cy={cy - r * 0.32} rx={r * 0.42} ry={r * 0.28} fill="rgba(255,255,255,0.82)" transform={`rotate(-15 ${cx - r * 0.28} ${cy - r * 0.32})`} filter="url(#bubbleSoft)" />

            {/* Value label on hover */}
            {isHovered && (
              <g>
                <rect x={cx - 28} y={cy - 32} width={56} height={20} rx={6} fill="rgba(15,15,15,0.85)" />
                <text x={cx} y={cy - 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
                  {fmtEur(p.value)}
                </text>
              </g>
            )}

            {/* Month label at bottom */}
            <text x={cx} y={h - 5} textAnchor="middle" fontSize="11" fill="rgba(0,0,0,0.45)" fontFamily="Arial, sans-serif">{p.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─── KPI Card using BubbleCard ──────────────────────────── */
function KpiCard({ icon: Icon, title, value, format, accent }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <BubbleCard padding={20} style={{ flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.5)', letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent || '#2563eb'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent || '#2563eb'} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.2 }}>{display}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>
        <span style={{ color: '#10b981', fontWeight: 600 }}>▲ +12%</span> vs mois dernier
      </div>
    </BubbleCard>
  )
}

/* ─── Mock data ─────────────────────────────────────────── */
const MOCK_KPIS = [
  { title: 'Clients actifs', value: 42, icon: Users, accent: '#2563eb' },
  { title: 'Contrats en cours', value: 89, icon: FileText, accent: '#10b981' },
  { title: 'CA Mensuel', value: 28450, format: 'currency', icon: Euro, accent: '#7c3aed' },
  { title: 'Tâches dues', value: 7, icon: Calendar, accent: '#f59e0b' },
]

const MOCK_INSIGHTS = [
  'Client M. Dupont — échéance contrat Auto dans 15 jours',
  'Opportunité cross-sell détectée pour Mme Martin',
  '3 contrats à renouveler cette semaine',
  'ARK recommande un suivi prioritaire pour client #1042',
  'Sinistre déclaré: contrat INC-2024-089 à traiter',
]

const MOCK_ECHEANCES = [
  { date: '25/04', label: 'Renouvellement - Martin' },
  { date: '28/04', label: 'RDV téléphonique - Dubois' },
  { date: '02/05', label: 'Soumission - Petit' },
  { date: '05/05', label: 'Relance cotisation - Bernard' },
]

/* ─── MAIN ──────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ prenom: 'Chargement...' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/auth/me').catch(() => ({ data: { prenom: 'Admin' } }))
      ])
      console.log('Dashboard stats API response:', statsRes.data)
      setStats(statsRes.data)
      setUser(userRes.data)
    } catch (err) { console.error("Erreur de chargement du dashboard:", err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const kpis = useMemo(() => {
    if (!stats) return MOCK_KPIS
    return [
      { title: 'Clients actifs', value: stats?.totalClients || MOCK_KPIS[0].value, icon: Users, accent: '#2563eb' },
      { title: 'Contrats en cours', value: stats?.contratsActifs || MOCK_KPIS[1].value, icon: FileText, accent: '#10b981' },
      { title: 'CA Mensuel', value: stats?.primeTotale || MOCK_KPIS[2].value, format: 'currency', icon: Euro, accent: '#7c3aed' },
      { title: 'Tâches dues', value: 7, icon: Calendar, accent: '#f59e0b' },
    ]
  }, [stats])

  const chartData = useMemo(() => {
    if (stats?.revenus6Mois) return stats.revenus6Mois.map(d => ({ label: d.mois, value: parseFloat(d.revenue) || 0 }))
    return [
      { label: 'Jan', value: 18400 }, { label: 'Fév', value: 21200 },
      { label: 'Mar', value: 19800 }, { label: 'Avr', value: 24500 },
      { label: 'Mai', value: 23200 }, { label: 'Juin', value: 28450 },
    ]
  }, [stats])

  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f7f6f2' }}>
      <BubbleBackground intensity="subtle" />
      <div className="px-4 md:px-8" style={{ position: 'relative', zIndex: 1, padding: '28px 32px', maxWidth: 1280 }}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#0a0a0a' }}>
              Bonjour {user.prenom} <span role="img" aria-label="wave">👋</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>{currentDate}</p>
          </div>
          <BubbleButton variant="secondary" size="sm" onClick={() => navigate('/morning-brief')}>
            <Zap size={14} color="#2563eb" /> Morning Brief
          </BubbleButton>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        {/* Middle: Portfolio Map + small stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <BubbleCard padding={24} style={{ flex: 3, minWidth: 300 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#0a0a0a' }}>
              Évolution du portefeuille
            </h3>
            <BubblePortfolioMap data={chartData} />
          </BubbleCard>
          <BubbleCard padding={24} style={{ flex: 1.2, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#0a0a0a' }}>
              Répartition clients
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Prospects', value: stats?.clientsParStatut?.prospect || 18, color: '#2563eb' },
                { label: 'Actifs', value: stats?.clientsParStatut?.actif || 42, color: '#10b981' },
                { label: 'Inactifs', value: (stats?.clientsParStatut?.inactif || 0) + (stats?.clientsParStatut?.résilié || 0) + (stats?.clientsParStatut?.perdu || 0) || 5, color: '#9ca3af' },
              ].map((item, i) => {
                const total = (stats?.totalClients || 65)
                const pct = ((item.value / total) * 100).toFixed(0)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: '#0a0a0a' }}>{item.value} ({pct}%)</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </BubbleCard>
        </div>

        {/* Bottom: Insights + Échéances */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <BubbleCard padding={20} style={{ flex: 1.5, minWidth: 260 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#0a0a0a' }}>
              <TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#2563eb' }} />
              ARK Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(MOCK_INSIGHTS).map((insight, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: i === 0 ? '#2563eb08' : 'transparent',
                  border: '0.5px solid rgba(0,0,0,0.04)',
                  fontSize: 13, color: 'rgba(0,0,0,0.7)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#2563eb' : i < 3 ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                  {insight}
                </div>
              ))}
            </div>
          </BubbleCard>
          <BubbleCard padding={20} style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#0a0a0a' }}>
              <Calendar size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#7c3aed' }} />
              Échéances
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_ECHEANCES.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(0,0,0,0.04)',
                  fontSize: 12,
                }}>
                  <BubbleBadge color={i === 0 ? '#f59e0b' : '#2563eb'} size="sm">{e.date}</BubbleBadge>
                  <span style={{ color: 'rgba(0,0,0,0.7)', fontWeight: 500 }}>{e.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <BubbleButton variant="ghost" size="sm" onClick={() => navigate('/taches')}>
                Voir toutes les échéances →
              </BubbleButton>
            </div>
          </BubbleCard>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: 'rgba(0,0,0,0.2)' }}>
          COURTIA®
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @keyframes bubbleFloat0 { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes bubbleFloat1 { 0%,100% { transform: translateY(-1px) } 50% { transform: translateY(2px) } }
        @keyframes bubbleFloat2 { 0%,100% { transform: translateY(0.5px) } 55% { transform: translateY(-2.5px) } }
        @media (max-width: 768px) {
          .dashboard-kpi-row { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
