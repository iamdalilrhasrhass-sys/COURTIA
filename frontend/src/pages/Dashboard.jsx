import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronRight, TrendingUp, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../api'
import Topbar from '../components/Topbar'
import StatusBadge from '../components/StatusBadge'
import PageTransition from '../components/ui/PageTransition'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import InteractiveBarChart from '../components/ui/InteractiveBarChart'
import PremiumEmptyState from '../components/ui/PremiumEmptyState'

// ─── Shimmer skeleton ──────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.6s ease-in-out infinite',
    }} />
  )
}

// ─── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ value, suffix = '%', invert = false }) {
  if (value === null || value === undefined) return null
  const positive = invert ? value < 0 : value > 0
  const neutral = value === 0
  const color = neutral ? '#9ca3af' : positive ? '#16a34a' : '#dc2626'
  const bg = neutral ? '#f0ede8' : positive ? '#f0fdf4' : '#fef2f2'
  const Icon = neutral ? null : positive ? ChevronUp : ChevronDown
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: '2px 7px', borderRadius: 20,
    }}>
      {Icon && <Icon size={11} />}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ title, value, format = 'number', trend, trendSuffix, loading, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 * index, type: 'spring', stiffness: 240, damping: 24 }}
      whileHover={{ y: -3, boxShadow: '0 10px 36px rgba(0,0,0,0.07)' }}
      style={{
        background: 'white',
        border: '1px solid #e8e6e0',
        borderRadius: 14,
        padding: '20px 20px 16px',
        cursor: 'default',
      }}
    >
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
        color: '#9ca3af', margin: '0 0 14px', textTransform: 'uppercase',
      }}>{title}</p>

      {loading ? (
        <Skeleton h={34} w="70%" r={6} />
      ) : (
        <p style={{
          fontSize: 28, fontWeight: 700, letterSpacing: -0.8,
          color: '#080808', margin: '0 0 8px', lineHeight: 1,
        }}>
          <AnimatedNumber value={value} format={format} />
        </p>
      )}

      {!loading && trend !== null && trend !== undefined && (
        <TrendBadge value={trend} suffix={trendSuffix || '%'} />
      )}
    </motion.div>
  )
}

// ─── Score ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 36 }) {
  const r = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const filled = score !== null ? Math.max(0, Math.min(100, score)) : 0
  const dash = (filled / 100) * circ

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size} height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ede8" strokeWidth={3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={score === null ? '#e8e6e0' : color}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {score !== null && (
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color,
        }}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Morning Brief preview ─────────────────────────────────────────────────────

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

  const priorityDot = (p) => {
    if (p === 'high' || p === 'urgent') return '#ef4444'
    if (p === 'medium') return '#f59e0b'
    return '#22c55e'
  }

  if (loading) {
    return (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => <Skeleton key={i} h={40} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <AlertCircle size={20} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px' }}>
          Aucun brief généré aujourd'hui
        </p>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            fontSize: 12, fontWeight: 600, color: 'white',
            background: '#080808', border: 'none', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', fontFamily: 'Arial, sans-serif',
          }}
        >
          Générer le Morning Brief →
        </button>
      </div>
    )
  }

  if (!actions?.length) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', margin: '0 0 12px' }}>
          Aucune action urgente aujourd'hui
        </p>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            fontSize: 12, color: '#6b7280', background: 'none',
            border: '1px solid #e8e6e0', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer', fontFamily: 'Arial, sans-serif',
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
        {actions.slice(0, 3).map((action, i) => (
          <motion.div
            key={action.id || i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            onClick={() => action.client_id && navigate(`/client/${action.client_id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 20px', cursor: action.client_id ? 'pointer' : 'default',
              borderBottom: i < Math.min(actions.length, 3) - 1 ? '1px solid #f7f6f2' : 'none',
              transition: 'background 0.15s',
            }}
            whileHover={action.client_id ? { x: 2 } : {}}
            onMouseEnter={e => { if (action.client_id) e.currentTarget.style.background = '#f7f6f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
          >
            <motion.div
              animate={{ scale: action.priority === 'high' || action.priority === 'urgent' ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: priorityDot(action.priority),
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 500, color: '#080808', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {action.title || action.description}
              </p>
              {action.client_name && (
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{action.client_name}</p>
              )}
            </div>
            {(action.priority === 'high' || action.priority === 'urgent') && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#dc2626',
                background: '#fef2f2', padding: '2px 8px', borderRadius: 20, flexShrink: 0,
              }}>
                Urgent
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ede8' }}>
        <button
          onClick={() => navigate('/morning-brief')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#2563eb',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Arial, sans-serif', padding: 0,
          }}
        >
          Voir toutes les actions ({actions.length}) <ChevronRight size={13} />
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
    } catch {
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

  // Données graphique
  const chartData = stats?.revenus6Mois?.map(d => ({
    label: d.mois,
    value: parseFloat(d.revenue) || 0,
  })) || []

  // Tendance commissions vs mois précédent (données réelles uniquement)
  const commTrend = (stats?.commissionsMois && stats?.commissionsMoisPrecedent && stats.commissionsMoisPrecedent > 0)
    ? Math.round(((stats.commissionsMois - stats.commissionsMoisPrecedent) / stats.commissionsMoisPrecedent) * 100)
    : null

  const topbarAction = (
    <button
      onClick={() => navigate('/clients/new')}
      style={{
        padding: '9px 18px', background: '#080808', color: 'white',
        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Arial, sans-serif',
      }}
    >
      + Client
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
      `}</style>

      <Topbar title="Tableau de bord" action={topbarAction} />

      <PageTransition>
        <div style={{ padding: '28px 32px' }}>

          {/* ── Error banner ── */}
          <AnimatePresence>
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
                <button
                  onClick={() => loadStats()}
                  style={{
                    padding: '6px 14px', background: '#dc2626', color: 'white',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Réessayer
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <KPICard
              title="Clients totaux"
              value={stats?.totalClients}
              format="number"
              loading={loading}
              index={0}
            />
            <KPICard
              title="Contrats actifs"
              value={stats?.contratsActifs}
              format="number"
              loading={loading}
              index={1}
            />
            <KPICard
              title="Commission du mois"
              value={stats?.commissionsMois}
              format="currency"
              trend={commTrend}
              loading={loading}
              index={2}
            />
            <KPICard
              title="Prime portefeuille"
              value={stats?.primeTotale}
              format="currency"
              loading={loading}
              index={3}
            />
          </div>

          {/* ── Section 2 : clients + graphique + brief ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Clients récents */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
            >
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #f0ede8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Clients récents</span>
                <button
                  onClick={() => navigate('/clients')}
                  style={{
                    fontSize: 12, color: '#2563eb', fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Voir tout →
                </button>
              </div>

              <div>
                {loading ? (
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} h={44} />)}
                  </div>
                ) : !stats?.clientsRecents?.length ? (
                  <p style={{ padding: 20, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                    Aucun client récent
                  </p>
                ) : (
                  stats.clientsRecents.map((client, idx) => {
                    const initial = (client.nom?.trim() || client.prenom?.trim() || 'C')[0].toUpperCase()
                    const score = client.score_risque != null ? Number(client.score_risque) : null
                    const scoreColor =
                      score === null ? '#e8e6e0'
                      : score <= 30 ? '#dc2626'
                      : score <= 60 ? '#f59e0b'
                      : score <= 80 ? '#3b82f6'
                      : '#16a34a'

                    return (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.04 * idx }}
                        onClick={() => navigate(`/client/${client.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 20px', cursor: 'pointer',
                          borderBottom: idx < stats.clientsRecents.length - 1 ? '1px solid #f7f6f2' : 'none',
                          transition: 'background 0.15s',
                        }}
                        whileHover={{ x: 2 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f7f6f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        {/* Avatar 40px */}
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e8e6e0, #d4d0c8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: '#080808', flexShrink: 0,
                        }}>
                          {initial}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, color: '#080808',
                            margin: '0 0 2px', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {client.nom} {client.prenom}
                          </p>
                          <StatusBadge status={client.statut} />
                        </div>

                        {/* Score ring SVG */}
                        <ScoreRing score={score} color={scoreColor} size={36} />
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Graphique revenus + échéances */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
                style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
              >
                {/* Bar chart */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f7f6f2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Revenus 6 mois</span>
                    <TrendingUp size={14} color="#9ca3af" />
                  </div>
                  <p style={{ fontSize: 10, color: '#c4bfb8', margin: '0 0 12px' }}>
                    Survolez un mois pour voir le détail · cliquez pour verrouiller
                  </p>
                  {loading
                    ? <Skeleton h={90} />
                    : chartData.length === 0
                      ? <PremiumEmptyState
                          icon={TrendingUp}
                          title="Aucun revenu à afficher"
                          description="Les revenus apparaîtront ici dès que vos contrats seront renseignés."
                          ctaLabel="Voir les contrats"
                          onCta={() => window.location.assign('/contrats')}
                          variant="default"
                        />
                      : <InteractiveBarChart
                          data={chartData}
                          height={90}
                          barColor="#e8e6e0"
                          activeBarColor="#2563eb"
                        />
                  }
                </div>

                {/* Échéances urgentes */}
                <div style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#080808', margin: '0 0 12px' }}>
                    Échéances urgentes
                  </p>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...Array(3)].map((_, i) => <Skeleton key={i} h={36} />)}
                    </div>
                  ) : !stats?.alertes?.length ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
                      <span style={{ fontSize: 15 }}>✓</span> Aucune échéance dans les 90 jours
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {stats.alertes.slice(0, 3).map((a, i) => {
                        const j = a.jours_restants
                        const urgent = j <= 7
                        const warning = j <= 30
                        const badgeBg = urgent ? '#fef2f2' : warning ? '#fffbeb' : '#fefce8'
                        const badgeColor = urgent ? '#dc2626' : warning ? '#d97706' : '#ca8a04'

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * i }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '9px 12px', borderRadius: 9,
                              background: '#fafaf8', border: '1px solid #f0ede8',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0ede8'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fafaf8'}
                          >
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#080808' }}>
                                {a.nom} {a.prenom}
                              </p>
                              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{a.type_contrat}</p>
                            </div>
                            <motion.span
                              animate={urgent ? { scale: [1, 1.08, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              style={{
                                fontSize: 12, fontWeight: 800,
                                padding: '4px 10px', borderRadius: 20,
                                background: badgeBg, color: badgeColor,
                                flexShrink: 0,
                              }}
                            >
                              J-{j}
                            </motion.span>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Morning Brief preview */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
              >
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #e8e6e0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles size={15} color="#f59e0b" />
                    </motion.div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Actions du jour</span>
                  </div>
                  <button
                    onClick={() => navigate('/morning-brief')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: '#2563eb',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'Arial, sans-serif', padding: 0,
                    }}
                  >
                    Brief complet <ChevronRight size={12} />
                  </button>
                </div>
                <MorningBriefPreview />
              </motion.div>

            </div>
          </div>

          {/* ── Section 3 : Répartition portefeuille ── */}
          <AnimatePresence>
            {!loading && stats?.typesContrats?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.35 }}
                style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e6e0' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Répartition du portefeuille</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafaf8' }}>
                      {['Type de contrat', 'Nombre', 'Prime totale', '% du portefeuille'].map(h => (
                        <th key={h} style={{
                          padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                          color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase',
                          borderBottom: '1px solid #e8e6e0',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.typesContrats.map((type, idx) => {
                      const total = stats.typesContrats.reduce((acc, t) => acc + (Number(t.count) || 0), 0)
                      const pct = total > 0 ? Math.round(((Number(type.count) || 0) / total) * 100) : 0
                      return (
                        <tr
                          key={type.type}
                          style={{
                            borderBottom: idx < stats.typesContrats.length - 1 ? '1px solid #f7f6f2' : 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                          <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, color: '#080808' }}>{type.type}</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: '#6b7280' }}>{type.count}</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: '#080808' }}>—</td>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, height: 5, background: '#f7f6f2', borderRadius: 3 }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: pct + '%' }}
                                  transition={{ duration: 0.6, delay: 0.1 * idx, ease: 'easeOut' }}
                                  style={{ height: '100%', background: '#080808', borderRadius: 3 }}
                                />
                              </div>
                              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 32, fontWeight: 600 }}>
                                {pct}%
                              </span>
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
      </PageTransition>
    </div>
  )
}
