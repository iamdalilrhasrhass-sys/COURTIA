import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react'
import api from '../api'
import Topbar from '../components/Topbar'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function fmt(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(Number(v))
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite'
    }} />
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ title, value, sub, loading, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 * index }}
      style={{
        background: 'white',
        border: '0.5px solid #e8e6e0',
        borderRadius: 12, padding: 20
      }}
    >
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
        color: '#9ca3af', margin: '0 0 12px', textTransform: 'uppercase'
      }}>{title}</p>
      {loading
        ? <Skeleton h={32} w="60%" />
        : <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.8, color: '#0a0a0a', margin: '0 0 4px' }}>
            {value ?? '—'}
          </p>
      }
      {sub && !loading && (
        <p style={{ fontSize: 11, color: '#16a34a', margin: 0 }}>{sub}</p>
      )}
    </motion.div>
  )
}

// ─── Mini bar chart ────────────────────────────────────────────────────────────

function BarChart({ data }) {
  if (!data?.length) return (
    <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
      Pas de données
    </p>
  )
  const max = Math.max(...data.map(d => parseFloat(d.revenue) || 0), 1)
  const last = data.length - 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((parseFloat(d.revenue) / max) * 80))
        const isLast = i === last
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: 'easeOut' }}
              style={{
                width: '100%',
                background: isLast ? '#0a0a0a' : '#e8e6e0',
                borderRadius: '3px 3px 0 0',
                opacity: isLast ? 1 : 0.6
              }}
            />
            <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.mois}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Morning Brief preview block ───────────────────────────────────────────────

function MorningBriefPreview() {
  const navigate = useNavigate()
  const [actions, setActions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    api.get('/api/portfolio/morning-brief')
      .then(res => {
        if (!alive) return
        const data = res.data?.data || res.data
        setActions(data?.actions || [])
      })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2].map(i => <Skeleton key={i} h={44} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '20px 16px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
      }}>
        <AlertCircle size={18} color="#d1d5db" />
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Générez un brief pour voir vos actions
        </p>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            fontSize: 12, color: '#2563eb', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          Ouvrir le Morning Brief →
        </button>
      </div>
    )
  }

  if (!actions.length) {
    return (
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#16a34a', margin: '0 0 8px' }}>
          ✓ Aucune action urgente aujourd'hui
        </p>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            fontSize: 12, color: '#9ca3af', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'Arial, sans-serif'
          }}
        >
          Voir le brief complet →
        </button>
      </div>
    )
  }

  return (
    <div>
      <AnimatePresence>
        {actions.slice(0, 3).map((action, i) => {
          const isUrgent = action.priority === 'high' || action.priority === 'urgent'
          return (
            <motion.div
              key={action.id || i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => action.client_id && navigate(`/client/${action.client_id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', cursor: action.client_id ? 'pointer' : 'default',
                borderBottom: i < Math.min(actions.length, 3) - 1 ? '0.5px solid #fafaf8' : 'none'
              }}
              whileHover={action.client_id ? { x: 2 } : {}}
              onMouseEnter={e => { if (action.client_id) e.currentTarget.style.background = '#f7f6f2' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: isUrgent ? '#ef4444' : action.priority === 'medium' ? '#f59e0b' : '#22c55e'
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 500, color: '#0a0a0a',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {action.title || action.description}
                </p>
                {action.client_name && (
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{action.client_name}</p>
                )}
              </div>
              {isUrgent && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#dc2626',
                  background: '#fef2f2', padding: '2px 7px', borderRadius: 20,
                  flexShrink: 0
                }}>
                  Urgent
                </span>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div style={{ padding: '10px 20px', borderTop: '0.5px solid #f0ede8' }}>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            fontSize: 12, color: '#6b7280', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'Arial, sans-serif'
          }}
        >
          Voir toutes les actions ({actions.length}) →
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const retryTimerRef = useRef(null)

  const loadStats = useCallback(async (isRetry = false) => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/api/dashboard/stats', { timeout: 35000 })
      setStats(res.data)
    } catch (err) {
      setError('Impossible de charger les données')
      if (!isRetry) {
        retryTimerRef.current = setTimeout(() => loadStats(true), 5000)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.get('/ping').catch(() => {})
    loadStats()
    return () => clearTimeout(retryTimerRef.current)
  }, [loadStats])

  const topbarAction = (
    <button
      onClick={() => navigate('/clients/new')}
      style={{
        padding: '9px 18px', background: '#0a0a0a', color: 'white',
        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'Arial, sans-serif'
      }}
    >
      + Client
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <Topbar title="Tableau de bord" action={topbarAction} />

      <div style={{ padding: '28px 32px' }}>

        {/* Error banner (non-bloquant) */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: '#fef2f2', border: '0.5px solid #fecaca',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
              <button
                onClick={() => loadStats()}
                style={{
                  padding: '6px 14px', background: '#dc2626', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'Arial, sans-serif'
                }}
              >
                Réessayer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <KPICard title="Clients totaux" value={stats?.totalClients ?? '—'} loading={loading} index={0} />
          <KPICard title="Contrats actifs" value={stats?.contratsActifs ?? '—'} loading={loading} index={1} />
          <KPICard
            title="Commission du mois"
            value={fmt(stats?.commissionsMois)}
            sub={stats?.commissionsMois ? `+${Math.round(stats.commissionsMois / 12)}€ vs mois dernier` : null}
            loading={loading}
            index={2}
          />
          <KPICard title="Prime portefeuille" value={fmt(stats?.primeTotale)} loading={loading} index={3} />
        </div>

        {/* Section 2 — Clients récents + Activité + Morning Brief */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Clients récents */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: '0.5px solid #e8e6e0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>Clients récents</span>
              <button
                onClick={() => navigate('/clients')}
                style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}
              >
                Voir tout →
              </button>
            </div>
            <div>
              {loading ? (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...Array(5)].map((_, i) => <Skeleton key={i} h={36} />)}
                </div>
              ) : !stats?.clientsRecents?.length ? (
                <p style={{ padding: 20, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                  Aucun client récent
                </p>
              ) : (
                stats.clientsRecents.map((client, idx) => {
                  const initial = (client.nom?.trim() || client.prenom?.trim() || 'C')[0].toUpperCase()
                  const score = client.score_risque != null ? Number(client.score_risque) : null
                  const barColor = score === null ? '#e8e6e0' : score <= 30 ? '#dc2626' : score <= 60 ? '#f59e0b' : score <= 80 ? '#3b82f6' : '#16a34a'
                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * idx }}
                      onClick={() => navigate(`/client/${client.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 20px', cursor: 'pointer',
                        borderBottom: '0.5px solid #fafaf8'
                      }}
                      whileHover={{ x: 2 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f7f6f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#f7f6f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, color: '#0a0a0a', flexShrink: 0
                      }}>
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: '#0a0a0a',
                          margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {client.nom} {client.prenom}
                        </p>
                        <div style={{ height: 3, background: '#f7f6f2', borderRadius: 2, width: '60%' }}>
                          <div style={{ height: '100%', background: barColor, borderRadius: 2, width: score + '%', maxWidth: '100%' }} />
                        </div>
                      </div>
                      <StatusBadge status={client.statut} />
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>

          {/* Activité + Morning Brief */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Graphique revenus */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f7f6f2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>Revenus 6 mois</p>
                  <TrendingUp size={14} color="#9ca3af" />
                </div>
                {loading ? <Skeleton h={80} /> : <BarChart data={stats?.revenus6Mois} />}
              </div>
              {/* Échéances urgentes */}
              <div style={{ padding: '14px 20px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 12px' }}>Échéances urgentes</p>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(3)].map((_, i) => <Skeleton key={i} h={32} />)}
                  </div>
                ) : !stats?.alertes?.length ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#16a34a' }}>
                    <span>✓</span> Aucune échéance urgente dans les 90 jours
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.alertes.slice(0, 3).map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 8, background: '#fafaf8', border: '0.5px solid #f0ede8'
                      }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#0a0a0a' }}>{a.nom} {a.prenom}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{a.type_contrat}</p>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                          background: a.jours_restants <= 15 ? '#fef2f2' : '#fffbeb',
                          color: a.jours_restants <= 15 ? '#dc2626' : '#d97706'
                        }}>
                          J-{a.jours_restants}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Morning Brief preview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}
            >
              <div style={{
                padding: '14px 20px', borderBottom: '0.5px solid #e8e6e0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Zap size={14} color="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>Actions du jour</span>
                </div>
                <button
                  onClick={() => navigate('/morning-brief')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 12, color: '#9ca3af', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'Arial, sans-serif'
                  }}
                >
                  Brief complet <ChevronRight size={12} />
                </button>
              </div>
              <MorningBriefPreview />
            </motion.div>

          </div>
        </div>

        {/* Section 3 — Répartition portefeuille */}
        <AnimatePresence>
          {!loading && stats?.typesContrats?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
              style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e8e6e0' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>Répartition du portefeuille</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafaf8' }}>
                    {['Type de contrat', 'Nombre', 'Prime totale', '% du portefeuille'].map(h => (
                      <th key={h} style={{
                        padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                        color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase',
                        borderBottom: '0.5px solid #e8e6e0'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.typesContrats.map((type, idx) => {
                    const total = stats.typesContrats.reduce((acc, t) => acc + parseInt(t.count), 0)
                    const pct = total > 0 ? Math.round((parseInt(type.count) / total) * 100) : 0
                    return (
                      <tr key={type.type} style={{ borderBottom: idx < stats.typesContrats.length - 1 ? '0.5px solid #f7f6f2' : 'none' }}>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, color: '#0a0a0a' }}>{type.type}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: '#6b7280' }}>{type.count}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: '#0a0a0a' }}>—</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: '#f7f6f2', borderRadius: 2 }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: pct + '%' }}
                                transition={{ duration: 0.6, delay: 0.1 * idx, ease: 'easeOut' }}
                                style={{ height: '100%', background: '#0a0a0a', borderRadius: 2 }}
                              />
                            </div>
                            <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 32 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
