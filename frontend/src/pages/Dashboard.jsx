import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Euro, Calendar, Zap, TrendingUp, ArrowRight, Sparkles, Bell } from 'lucide-react'
import api from '../api'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraCard from '../components/brand/AuroraCard'
import AuroraButton from '../components/brand/AuroraButton'
import AuroraBadge from '../components/AuroraBadge'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import AuroraDivider from '../components/brand/AuroraDivider'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'

/* ─── helpers ──────────────────────────────────────────── */
const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

/* ─── KPI Card ─────────────────────────────────────────── */
function KpiCard({ icon: Icon, title, value, format, accent, subtitle }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <AuroraCard padding={20} className="flex-1 min-w-[160px]">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(0,0,0,0.45)' }}>{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent || '#7c3aed'}12` }}>
          <Icon size={18} color={accent || '#7c3aed'} />
        </div>
      </div>
      <div className="text-2xl font-black" style={{ color: '#0a0a0a' }}>{display}</div>
      {subtitle && <div className="mt-1.5 text-xs font-medium" style={{ color: accent || '#7c3aed' }}>{subtitle}</div>}
    </AuroraCard>
  )
}

/* ─── Insight Row ───────────────────────────────────────── */
function InsightRow({ icon: Icon, children, accent = '#7c3aed', highlight = false }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${highlight ? 'border' : ''}`}
      style={{
        background: highlight ? `${accent}08` : 'transparent',
        borderColor: highlight ? `${accent}20` : 'transparent',
        color: 'rgba(0,0,0,0.7)',
      }}
    >
      <Icon size={14} color={accent} className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/* ─── MAIN ──────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/auth/me').catch(() => ({ data: {} }))
      ])
      setStats(statsRes.data)
      setUser(userRes.data || {})
    } catch (err) {
      console.error('Dashboard load error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const kpis = useMemo(() => {
    return [
      { title: 'Clients actifs', value: stats?.totalClients || 0, icon: Users, accent: '#7c3aed', subtitle: stats?.nouveauxClientsMois ? `+${stats.nouveauxClientsMois} ce mois` : null },
      { title: 'Contrats en cours', value: stats?.contratsActifs || 0, icon: FileText, accent: '#06b6d4', subtitle: stats?.contratsUrgents ? `${stats.contratsUrgents} urgents` : null },
      { title: 'CA Mensuel', value: stats?.primeTotale || 0, format: 'currency', icon: Euro, accent: '#8b5cf6', subtitle: stats?.commissionsMois ? `${fmtEur(stats.commissionsMois)} commissions` : null },
      { title: 'Tâches à faire', value: 7, icon: Calendar, accent: '#f59e0b', subtitle: '3 en retard' },
    ]
  }, [stats])

  const userName = user?.first_name || user?.firstName || ''

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ background: '#f7f6f2' }}>
        <CourtiaLogoLoader fullScreen={false} message="COURTIA analyse votre portefeuille…" />
      </div>
    )
  }

  // Empty state — aucun client
  const isEmpty = !stats || (stats.totalClients === 0 && stats.contratsActifs === 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <div className="px-4 md:px-8 py-6 md:py-8" style={{ maxWidth: 1280, margin: '0 auto' }}>
        
        {/* Header cockpit */}
        <AuroraPageHeader
          title={userName ? `Bonjour ${userName}` : 'Tableau de bord'}
          subtitle="Voici les priorités de votre portefeuille aujourd'hui."
          badge="Cockpit"
          actions={
            <AuroraButton variant="primary" size="sm" icon={<Zap size={14} />} onClick={() => navigate('/morning-brief')}>
              Morning Brief
            </AuroraButton>
          }
        />

        {isEmpty ? (
          /* ─── EMPTY STATE ─── */
          <AuroraEmptyState
            title="Votre portefeuille est prêt à prendre forme."
            description="Ajoutez votre premier client pour débloquer le cockpit COURTIA. ARK analysera automatiquement votre portefeuille."
            action={{ label: 'Ajouter un client', href: '/clients/new' }}
          />
        ) : (
          <>
            {/* KPI row */}
            <div className="flex gap-4 mb-6 flex-wrap">
              {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
            </div>

            {/* Morning Brief — ARK Insights */}
            <AuroraCard padding={20} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} color="#7c3aed" />
                <h3 className="text-sm font-bold" style={{ color: '#0a0a0a' }}>ARK a détecté 4 priorités aujourd'hui</h3>
                <AuroraBadge>Moteur intelligent</AuroraBadge>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <InsightRow icon={Bell} accent="#f59e0b" highlight>Ce client arrive à échéance dans 18 jours — relancez-le.</InsightRow>
                <InsightRow icon={TrendingUp} accent="#7c3aed">Ce prospect chaud n'a pas été relancé depuis 7 jours.</InsightRow>
                <InsightRow icon={FileText} accent="#06b6d4">Ce dossier manque une pièce justificative.</InsightRow>
                <InsightRow icon={Users} accent="#8b5cf6">Cette famille peut être multi-équipée — opportunité +340€.</InsightRow>
              </div>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <AuroraButton variant="ghost" size="sm" onClick={() => navigate('/morning-brief')}>
                  Voir le brief complet <ArrowRight size={12} />
                </AuroraButton>
              </div>
            </AuroraCard>

            {/* Middle row: Chart + Distribution */}
            <div className="flex gap-4 mb-6 flex-wrap">
              <AuroraCard padding={20} className="flex-[3] min-w-[280px]">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#0a0a0a' }}>Évolution du portefeuille</h3>
                <div className="flex items-end gap-2 h-32">
                  {[
                    { label: 'Jan', value: 18.4 }, { label: 'Fév', value: 21.2 },
                    { label: 'Mar', value: 19.8 }, { label: 'Avr', value: 24.5 },
                    { label: 'Mai', value: 23.2 }, { label: 'Juin', value: 28.5 },
                  ].map((d, i) => {
                    const h = (d.value / 30) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-md transition-all" style={{
                          height: `${h}%`,
                          background: `linear-gradient(180deg, #7c3aed, #a78bfa)`,
                          minHeight: 4,
                        }} />
                        <span className="text-[10px] font-medium" style={{ color: 'rgba(0,0,0,0.35)' }}>{d.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10b981' }}>
                  <TrendingUp size={12} /> +22% ce mois
                </div>
              </AuroraCard>

              <AuroraCard padding={20} className="flex-[1.5] min-w-[200px]">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#0a0a0a' }}>Répartition</h3>
                {[
                  { label: 'Prospects', value: 18, color: '#7c3aed' },
                  { label: 'Actifs', value: 42, color: '#06b6d4' },
                  { label: 'Inactifs', value: 5, color: '#9ca3af' },
                ].map((item, i) => {
                  const total = 65
                  const pct = ((item.value / total) * 100).toFixed(0)
                  return (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold" style={{ color: 'rgba(0,0,0,0.5)' }}>{item.label}</span>
                        <span className="font-bold" style={{ color: '#0a0a0a' }}>{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </AuroraCard>
            </div>

            {/* Échéances */}
            <AuroraCard padding={20}>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#0a0a0a' }}>
                <Calendar size={16} className="inline mr-2" color="#7c3aed" />
                Échéances à venir
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { date: '25 mai', label: 'Renouvellement — M. Martin', urgent: true },
                  { date: '28 mai', label: 'RDV — Mme Dubois', urgent: false },
                  { date: '2 juin', label: 'Soumission — M. Petit', urgent: false },
                  { date: '5 juin', label: 'Relance — M. Bernard', urgent: true },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: e.urgent ? '#f59e0b08' : 'transparent', border: `0.5px solid ${e.urgent ? '#f59e0b20' : 'rgba(0,0,0,0.04)'}` }}
                  >
                    <AuroraBadge color={e.urgent ? '#f59e0b' : '#7c3aed'} size="sm">{e.date}</AuroraBadge>
                    <span className="font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>{e.label}</span>
                  </div>
                ))}
              </div>
            </AuroraCard>
          </>
        )}

        <AuroraDivider variant="subtle" />
        <div className="text-center text-[11px]" style={{ color: 'rgba(0,0,0,0.15)' }}>
          COURTIA — Cockpit intelligent
        </div>
      </div>
    </div>
  )
}
