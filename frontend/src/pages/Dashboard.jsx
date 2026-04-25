import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Euro, AlertTriangle, Zap, TrendingUp, Calendar } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'
import IridescentPortfolioChart from '../components/IridescentPortfolioChart'
import ClientBubbleTranslucent from '../components/ClientBubbleTranslucent'

/* ─── tiny helpers ──────────────────────────────────────── */
const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

/* ─── KPI Card ──────────────────────────── */
function KpiCard({ icon: Icon, title, value, format, accent, isCritical }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <BubbleCard
      padding={0}
      style={{
        flex: 1,
        minWidth: 180,
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 14,
        border: '0.5px solid rgba(0,0,0,0.05)',
        padding: '1rem 1.1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.5)', letterSpacing: '0.01em', fontFamily: 'Arial, sans-serif' }}>{title}</span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent || '#2563eb'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent || '#2563eb'} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.2, fontFamily: 'Arial, sans-serif' }}>{display}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: 'Arial, sans-serif' }}>
        <span style={{ color: isCritical ? '#ef4444' : '#10b981', fontWeight: 600 }}>▲ +12%</span> vs mois dernier
      </div>
    </BubbleCard>
  )
}

/* ─── Mock data ─────────────────────────────────────────── */
const MOCK_KPIS = [
  { title: 'Clients actifs', value: 60, icon: Users, accent: '#2563eb' },
  { title: 'Contrats en cours', value: 33, icon: FileText, accent: '#10b981' },
  { title: 'Revenu mensuel récurrent', value: 45338, format: 'currency', icon: Euro, accent: '#7c3aed' },
  { title: 'Tâches critiques', value: 7, icon: AlertTriangle, accent: '#ef4444', isCritical: true },
]

const MOCK_CHART_DATA = [
  { label: 'Jan', value: 31200 }, { label: 'Fév', value: 33800 },
  { label: 'Mar', value: 32100 }, { label: 'Avr', value: 36500 },
  { label: 'Mai', value: 35200 }, { label: 'Juin', value: 38900 },
  { label: 'Juil', value: 37400 }, { label: 'Août', value: 40100 },
  { label: 'Sep', value: 41800 }, { label: 'Oct', value: 43200 },
  { label: 'Nov', value: 44500 }, { label: 'Déc', value: 45338 },
]

const MOCK_INSIGHTS = [
  { dot: '#ef4444', text: "L'IA d'ARK proactive recommande : un stage de conduite pour Pierre Garcia, réduction de 12 points de risque." },
  { dot: '#f59e0b', text: "Opportunité cross-sell détectée pour Mme Martin." },
  { dot: '#10b981', text: '3 contrats à renouveler cette semaine.' },
]

const MOCK_ECHEANCES = [
  { date: '25/04', label: 'Renouvellement - Martin' },
  { date: '28/04', label: 'RDV téléphonique - Dubois' },
  { date: '02/05', label: 'Soumission - Petit' },
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
        api.get('/api/dashboard/stats'),
        api.get('/api/auth/me').catch(() => ({ data: { prenom: 'Admin' } }))
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
      { title: 'Revenu mensuel récurrent', value: stats?.primeTotale || MOCK_KPIS[2].value, format: 'currency', icon: Euro, accent: '#7c3aed' },
      { title: 'Tâches critiques', value: 7, icon: AlertTriangle, accent: '#ef4444', isCritical: true },
    ]
  }, [stats])

  const chartData = useMemo(() => {
    if (stats?.revenus12Mois) return stats.revenus12Mois.map(d => ({ label: d.mois, value: parseFloat(d.revenue) || 0 }))
    return MOCK_CHART_DATA
  }, [stats])

  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#f7f6f2' }}>
      <BubbleBackground intensity="subtle" />
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
              Bonjour {user.prenom} <span role="img" aria-label="wave">👋</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginTop: 4, fontFamily: 'Arial, sans-serif', fontWeight: 400 }}>{currentDate}</p>
          </div>
          <BubbleCard padding={0} style={{ padding: '6px 6px', borderRadius: 14, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(0,0,0,0.05)' }}>
            <BubbleButton variant="secondary" size="sm" onClick={() => navigate('/morning-brief')}>
              <Zap size={14} color="#2563eb" /> Brief du jour
            </BubbleButton>
          </BubbleCard>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        {/* Middle: Portfolio Chart + Répartition */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <BubbleCard
            padding={0}
            style={{
              flex: 3,
              minWidth: 340,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 14,
              border: '0.5px solid rgba(0,0,0,0.05)',
              padding: '1.25rem 1.5rem',
              maxHeight: 360,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
              Évolution du portefeuille
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>
              Les 12 derniers mois
            </p>
            <IridescentPortfolioChart data={chartData} />
          </BubbleCard>

          <BubbleCard
            padding={0}
            style={{
              flex: 1.2,
              minWidth: 220,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 14,
              border: '0.5px solid rgba(0,0,0,0.05)',
              padding: '1.25rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
                Répartition clients
              </h3>
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 500, fontFamily: 'Arial, sans-serif' }}>
                Progression
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  label: 'Prospects',
                  value: stats?.clientsParStatut?.prospect || 18,
                  dark: '#3b82f6',
                  light: '#93c5fd',
                },
                {
                  label: 'Actifs',
                  value: stats?.clientsParStatut?.actif || 42,
                  dark: '#10b981',
                  light: '#6ee7b7',
                },
                {
                  label: 'Inactifs',
                  value: (stats?.clientsParStatut?.inactif || 0) + (stats?.clientsParStatut?.résilié || 0) + (stats?.clientsParStatut?.perdu || 0) || 5,
                  dark: '#ef4444',
                  light: '#fca5a5',
                },
              ].map((item, i) => {
                const total = (stats?.totalClients || 65)
                const pct = ((item.value / total) * 100).toFixed(0)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>
                      <span style={{ fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: '#0a0a0a' }}>{item.value} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${item.dark}, ${item.light})`,
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </BubbleCard>
        </div>

        {/* Nouveaux clients */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', fontFamily: 'Arial, sans-serif' }}>
            Nouveaux clients
          </h3>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            Derniers prospects détectés par ARK
          </p>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
            <ClientBubbleTranslucent client={{ name: 'Isabelle Petit', initials: 'IP', score: 84, status: 'Prospect' }} />
            <ClientBubbleTranslucent client={{ name: 'Marc Durand', initials: 'MD', score: 67, status: 'Actif' }} />
            <ClientBubbleTranslucent client={{ name: 'Sophie Leroy', initials: 'SL', score: 92, status: 'Prospect' }} />
          </div>
        </div>

        {/* Bottom: Insights ARK + Échéances */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <BubbleCard
            padding={0}
            style={{
              flex: 1.5,
              minWidth: 260,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 14,
              border: '0.5px solid rgba(0,0,0,0.05)',
              padding: '1.25rem 1.25rem',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#0a0a0a', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} style={{ color: '#2563eb' }} />
              Insights ARK
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOCK_INSIGHTS.map((insight, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: i === 0 ? 'rgba(239,68,68,0.04)' : 'transparent',
                  border: '0.5px solid rgba(0,0,0,0.04)',
                  fontSize: 13, color: 'rgba(0,0,0,0.7)',
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: 1.5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: insight.dot, flexShrink: 0, marginTop: 5 }} />
                  {insight.text}
                </div>
              ))}
            </div>
          </BubbleCard>

          <BubbleCard
            padding={0}
            style={{
              flex: 1,
              minWidth: 200,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 14,
              border: '0.5px solid rgba(0,0,0,0.05)',
              padding: '1.25rem 1.25rem',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#0a0a0a', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} style={{ color: '#7c3aed' }} />
              Échéances
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOCK_ECHEANCES.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(0,0,0,0.04)',
                  fontSize: 12,
                  fontFamily: 'Arial, sans-serif',
                }}>
                  <span style={{
                    background: 'rgba(37,99,235,0.08)',
                    color: '#2563eb',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'Arial, sans-serif',
                  }}>{e.date}</span>
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

      </div>
    </div>
  )
}
