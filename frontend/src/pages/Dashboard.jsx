import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  FileText,
  Euro,
  Calendar,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Bell,
  AlertTriangle,
  Briefcase,
  CheckSquare,
} from 'lucide-react'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraCard from '../components/brand/AuroraCard'
import AuroraButton from '../components/brand/AuroraButton'
import AuroraBadge from '../components/AuroraBadge'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import AuroraDivider from '../components/brand/AuroraDivider'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.rows)) return payload.rows
  return []
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'actif'
  if (s === 'lost') return 'perdu'
  if (s === 'at_risk') return 'a_risque'
  return s
}

function toTimestamp(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

function isTaskDone(task) {
  return ['terminee', 'done', 'completed'].includes(String(task?.statut || task?.status || '').toLowerCase())
}

function KpiCard({ icon: Icon, title, value, format, accent, subtitle }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <AuroraCard padding={20} className="flex-1 min-w-[170px]">
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

function InsightRow({ icon: Icon, text, accent = '#7c3aed', highlight = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${highlight ? 'border' : ''}`}
      style={{
        background: highlight ? `${accent}08` : 'transparent',
        borderColor: highlight ? `${accent}20` : 'transparent',
        color: 'rgba(0,0,0,0.75)',
      }}
    >
      <Icon size={14} color={accent} className="shrink-0" />
      <span>{text}</span>
    </button>
  )
}

function CockpitCommandCenter({ userName, activeClients, activeContracts, urgentTasks, navigate }) {
  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#050713] shadow-2xl shadow-slate-950/20">
      <div className="relative p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(124,58,237,0.24),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.16),transparent_30%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-violet-100">
              <Sparkles size={13} />
              Cockpit portefeuille
            </div>
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              {userName ? `Bonjour ${userName}, voici vos signaux métier du jour.` : 'Voici vos signaux métier du jour.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/58">
              COURTIA priorise vos échéances, vos risques de résiliation, vos relances et vos opportunités multi-équipement.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <AuroraButton variant="primary" size="sm" icon={<Zap size={14} />} onClick={() => navigate('/morning-brief')}>
                Morning Brief
              </AuroraButton>
              <AuroraButton variant="secondary" size="sm" icon={<Users size={14} />} onClick={() => navigate('/clients/new')}>
                Nouveau client
              </AuroraButton>
              <AuroraButton variant="secondary" size="sm" icon={<CheckSquare size={14} />} onClick={() => navigate('/taches')}>
                Voir les tâches
              </AuroraButton>
              <AuroraButton variant="secondary" size="sm" icon={<Sparkles size={14} />} onClick={() => navigate('/capitia')}>
                Ouvrir ARK
              </AuroraButton>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Clients actifs', activeClients],
              ['Contrats actifs', activeContracts],
              ['Tâches urgentes', urgentTasks],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 text-center backdrop-blur-xl">
                <p className="text-2xl font-black text-white">{fmtNum(value)}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/38">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })
  const [snapshotTs, setSnapshotTs] = useState(0)

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes, clientsRes, tasksRes] = await Promise.all([
        api.get('/dashboard/stats'),
        getSessionUser().then((sessionUser) => ({ data: sessionUser || {} })).catch(() => ({ data: {} })),
        api.get('/clients?limit=300').catch(() => ({ data: [] })),
        api.get('/taches').catch(() => ({ data: [] })),
      ])

      setStats(statsRes.data || null)
      setUser(userRes.data || {})
      setClients(normalizeRows(clientsRes.data))
      setTasks(normalizeRows(tasksRes.data))
      setSnapshotTs(Date.now())
    } catch {
      console.error('Impossible de charger le cockpit.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Le chargement initial hydrate toutes les tuiles en une seule passe.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAllData() }, [loadAllData])

  const metrics = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    const activeClients = Number(statusMap.actif || 0) || clients.filter((c) => normalizeStatus(c.status || c.statut) === 'actif').length
    const prospects = Number(statusMap.prospect || 0) || clients.filter((c) => normalizeStatus(c.status || c.statut) === 'prospect').length
    const atRiskClients = Number(statusMap.a_risque || 0) || clients.filter((c) => Number(c.risk_score ?? c.score_risque ?? c.riskScore ?? 0) >= 70).length

    const urgentTasks = tasks.filter((task) => {
      if (isTaskDone(task)) return false
      const p = String(task.priorite || '').toLowerCase()
      const due = toTimestamp(task.echeance || task.due_date || task.date_echeance)
      const dueSoon = due !== null && snapshotTs > 0 && (due - snapshotTs) <= 48 * 3600 * 1000
      return p === 'urgente' || p === 'haute' || dueSoon
    }).length

    return {
      activeClients,
      prospects,
      atRiskClients,
      urgentTasks,
      activeContracts: Number(stats?.contratsActifs || 0),
      annualPrime: Number(stats?.primeTotale || 0),
    }
  }, [stats, clients, tasks, snapshotTs])

  const insights = useMemo(() => {
    const list = []

    const renewalAlerts = Array.isArray(stats?.alertes) ? stats.alertes.slice(0, 2) : []
    renewalAlerts.forEach((item) => {
      const fullName = `${item.prenom || ''} ${item.nom || ''}`.trim() || 'Client'
      const days = Number(item.jours_restants || 0)
      list.push({
        text: `${fullName} arrive à échéance dans ${days} jours (${item.type_contrat || 'contrat'}).`,
        icon: Calendar,
        accent: '#f59e0b',
        route: '/contrats',
        highlight: days <= 15,
      })
    })

    const risky = [...clients]
      .filter((c) => Number(c.risk_score ?? c.score_risque ?? c.riskScore ?? 0) >= 70)
      .sort((a, b) => Number(b.risk_score ?? b.score_risque ?? b.riskScore ?? 0) - Number(a.risk_score ?? a.score_risque ?? a.riskScore ?? 0))
      .slice(0, 2)
    risky.forEach((c) => {
      const name = `${c.prenom || ''} ${c.nom || ''}`.trim() || c.name || 'Client'
      const score = Number(c.risk_score ?? c.score_risque ?? c.riskScore ?? 0)
      list.push({
        text: `${name} présente un risque élevé (${score}/100) : action de rétention recommandée.`,
        icon: AlertTriangle,
        accent: '#ef4444',
        route: `/clients/${c.id}`,
        highlight: true,
      })
    })

    const opportunities = [...clients]
      .filter((c) => normalizeStatus(c.status || c.statut) === 'actif')
      .filter((c) => Number(c.contracts_count ?? c.nb_contrats ?? 1) <= 1)
      .slice(0, 2)
    opportunities.forEach((c) => {
      const name = `${c.prenom || ''} ${c.nom || ''}`.trim() || c.name || 'Client'
      list.push({
        text: `${name} est mono-contrat : proposer un multi-équipement cette semaine.`,
        icon: Briefcase,
        accent: '#7c3aed',
        route: `/clients/${c.id}`,
      })
    })

    const overdueTasks = tasks
      .filter((t) => !isTaskDone(t))
      .filter((t) => {
        const due = toTimestamp(t.echeance || t.due_date || t.date_echeance)
        return due !== null && snapshotTs > 0 && due < snapshotTs
      })
      .slice(0, 2)
    overdueTasks.forEach((task) => {
      list.push({
        text: `Tâche en retard: ${task.titre || task.title || 'Action à traiter'} — prioriser aujourd'hui.`,
        icon: Bell,
        accent: '#d97706',
        route: '/taches',
      })
    })

    return list.slice(0, 6)
  }, [stats, clients, tasks, snapshotTs])

  const chartData = useMemo(() => {
    const rows = Array.isArray(stats?.revenus6Mois) ? stats.revenus6Mois : []
    const cleaned = rows.map((r) => ({ label: r.mois || '-', value: Number(r.revenue || 0) }))
    const max = cleaned.reduce((acc, row) => Math.max(acc, row.value), 0)
    return { rows: cleaned, max }
  }, [stats])

  const statusDistribution = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    const entries = [
      { label: 'Prospects', value: Number(statusMap.prospect || 0), color: '#7c3aed' },
      { label: 'Actifs', value: Number(statusMap.actif || 0), color: '#06b6d4' },
      { label: 'À risque', value: Number(statusMap.a_risque || 0), color: '#ef4444' },
      { label: 'Perdus', value: Number(statusMap.perdu || statusMap['résilié'] || 0), color: '#9ca3af' },
    ]
    const total = entries.reduce((acc, item) => acc + item.value, 0)
    return { entries, total }
  }, [stats])

  const userName = user?.first_name || user?.firstName || ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CourtiaLogoLoader fullScreen={false} message="COURTIA analyse votre portefeuille…" />
      </div>
    )
  }

  const isEmpty = !stats || (metrics.activeClients === 0 && metrics.activeContracts === 0)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div className="px-4 md:px-8 py-6 md:py-8" style={{ maxWidth: 1280, margin: '0 auto' }}>

        <AuroraPageHeader
          title="Dashboard"
          subtitle="Cockpit courtier: priorités ARK, risques, échéances et actions commerciales."
          badge="Cockpit"
          dark
          actions={
            <AuroraButton variant="primary" size="sm" icon={<Zap size={14} />} onClick={() => navigate('/morning-brief')}>
              Morning Brief
            </AuroraButton>
          }
        />

        <CockpitCommandCenter
          userName={userName}
          activeClients={metrics.activeClients}
          activeContracts={metrics.activeContracts}
          urgentTasks={metrics.urgentTasks}
          navigate={navigate}
        />

        {isEmpty ? (
          <AuroraEmptyState
            title="Votre cockpit est prêt."
            description="Ajoutez vos premiers clients et contrats pour activer les priorités ARK, les alertes d'échéance et les recommandations métier."
            action={{ label: 'Ajouter un client', href: '/clients/new' }}
          />
        ) : (
          <>
            <div className="flex gap-4 mb-6 flex-wrap">
              <KpiCard title="Clients actifs" value={metrics.activeClients} format="number" icon={Users} accent="#7c3aed" />
              <KpiCard title="Prospects" value={metrics.prospects} format="number" icon={TrendingUp} accent="#06b6d4" />
              <KpiCard title="Contrats actifs" value={metrics.activeContracts} format="number" icon={FileText} accent="#8b5cf6" />
              <KpiCard title="Prime annuelle" value={metrics.annualPrime} format="currency" icon={Euro} accent="#10b981" />
              <KpiCard title="Tâches urgentes" value={metrics.urgentTasks} format="number" icon={Calendar} accent="#f59e0b" />
              <KpiCard title="Clients à risque" value={metrics.atRiskClients} format="number" icon={AlertTriangle} accent="#ef4444" />
            </div>

            <AuroraCard padding={20} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} color="#7c3aed" />
                <h3 className="text-sm font-bold" style={{ color: '#0a0a0a' }}>Priorités ARK du jour</h3>
                <AuroraBadge>{insights.length} signaux</AuroraBadge>
              </div>

              {insights.length === 0 ? (
                <AuroraEmptyState
                  compact
                  title="Aucun signal urgent pour le moment"
                  description="Continuez à enrichir clients, contrats et tâches pour activer davantage de recommandations ARK." 
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {insights.map((item, idx) => (
                    <InsightRow
                      key={`${item.text}-${idx}`}
                      icon={item.icon}
                      text={item.text}
                      accent={item.accent}
                      highlight={item.highlight}
                      onClick={() => navigate(item.route)}
                    />
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <AuroraButton variant="ghost" size="sm" onClick={() => navigate('/morning-brief')}>
                  Ouvrir le Morning Brief complet <ArrowRight size={12} />
                </AuroraButton>
              </div>
            </AuroraCard>

            <div className="flex gap-4 mb-6 flex-wrap">
              <AuroraCard padding={20} className="flex-[3] min-w-[280px]">
                <h3 className="text-sm font-bold mb-1" style={{ color: '#0a0a0a' }}>Évolution du portefeuille</h3>
                <p className="mb-3 text-xs" style={{ color: 'rgba(0,0,0,0.42)' }}>Primes observées sur les 6 derniers mois (contrats actifs).</p>

                {chartData.rows.length === 0 ? (
                  <AuroraEmptyState compact title="Historique insuffisant" description="Les données mensuelles apparaîtront dès que des contrats actifs seront historisés." />
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {chartData.rows.map((row) => {
                      const h = chartData.max > 0 ? Math.max(4, (row.value / chartData.max) * 100) : 4
                      return (
                        <div key={row.label} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-md transition-all" style={{ height: `${h}%`, background: 'linear-gradient(180deg, #7c3aed, #a78bfa)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'rgba(0,0,0,0.35)' }}>{row.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </AuroraCard>

              <AuroraCard padding={20} className="flex-[1.5] min-w-[220px]">
                <h3 className="text-sm font-bold mb-1" style={{ color: '#0a0a0a' }}>Répartition clients</h3>
                <p className="mb-3 text-xs" style={{ color: 'rgba(0,0,0,0.42)' }}>Segments portefeuille: prospect, actif, risque, perdu.</p>

                {statusDistribution.total === 0 ? (
                  <AuroraEmptyState compact title="Aucune répartition disponible" description="Ajoutez des clients pour voir la distribution métier." />
                ) : (
                  statusDistribution.entries.map((item) => {
                    const pct = Math.round((item.value / statusDistribution.total) * 100)
                    return (
                      <div key={item.label} className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold" style={{ color: 'rgba(0,0,0,0.5)' }}>{item.label}</span>
                          <span className="font-bold" style={{ color: '#0a0a0a' }}>{item.value} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </AuroraCard>
            </div>

            <AuroraCard padding={20}>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#0a0a0a' }}>
                <Calendar size={16} className="inline mr-2" color="#7c3aed" />
                Échéances à venir
              </h3>

              {Array.isArray(stats?.alertes) && stats.alertes.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {stats.alertes.map((alert, idx) => {
                    const fullName = `${alert.prenom || ''} ${alert.nom || ''}`.trim() || 'Client'
                    const days = Number(alert.jours_restants || 0)
                    const urgent = days <= 15
                    return (
                      <button
                        key={`${fullName}-${idx}`}
                        type="button"
                        onClick={() => navigate('/contrats')}
                        className="text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: urgent ? '#f59e0b08' : 'transparent', border: `0.5px solid ${urgent ? '#f59e0b20' : 'rgba(0,0,0,0.04)'}` }}
                      >
                        <AuroraBadge color={urgent ? '#f59e0b' : '#7c3aed'} size="sm">J-{days}</AuroraBadge>
                        <span className="font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>{fullName} · {alert.type_contrat || 'Contrat'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <AuroraEmptyState compact title="Aucune échéance proche" description="Aucune échéance à moins de 90 jours sur vos contrats actifs." />
              )}
            </AuroraCard>
          </>
        )}

        <AuroraDivider variant="subtle" />
        <div className="text-center text-[11px]" style={{ color: 'rgba(0,0,0,0.15)' }}>
          COURTIA — Cockpit intelligent courtier
        </div>
      </div>
    </div>
  )
}
