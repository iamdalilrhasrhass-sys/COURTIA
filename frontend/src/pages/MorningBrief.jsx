import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Zap, TrendingUp, RefreshCw, ChevronRight,
  AlertCircle, CheckCircle2, Clock, BarChart2, UserPlus, CalendarDays, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import PageTransition from '../components/ui/PageTransition'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import PremiumTooltip from '../components/ui/PremiumTooltip'
import PremiumEmptyState from '../components/ui/PremiumEmptyState'
import { computeDailyPriorities } from '../lib/priorities'
const INTEGRATIONS_API_ENABLED = String(import.meta.env.VITE_INTEGRATIONS_API_ENABLED || '').trim().toLowerCase() === 'true'

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDate() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatShortDateTime(value) {
  if (!value) return 'Date inconnue'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Date inconnue'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function priorityColor(priority) {
  if (priority === 'high' || priority === 'urgent') return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626' }
  if (priority === 'medium') return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#f59e0b' }
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' }
}

function priorityLabel(p) {
  if (p === 'high' || p === 'urgent') return 'Urgent'
  if (p === 'medium') return 'Moyen'
  return 'Normal'
}

function dateValue(...values) {
  for (const value of values) {
    if (!value) continue
    const time = new Date(value).getTime()
    if (!Number.isNaN(time)) return time
  }
  return null
}

function buildLocalPortfolioScore(clients = [], contrats = [], taches = []) {
  const now = Date.now()
  const totalClients = clients.length
  const activeContracts = contrats.filter(c => ['actif', 'active', 'en_cours'].includes(String(c.status || c.statut || '').toLowerCase())).length
  const clientsWithContact = clients.filter(c => c.email || c.phone || c.telephone || c.mobile).length
  const overdueTasks = taches.filter(t => {
    const due = dateValue(t.echeance, t.due_date, t.date_echeance)
    return due && due < now && !['terminee', 'done', 'completed'].includes(String(t.statut || t.status || '').toLowerCase())
  }).length
  const upcomingRenewals = contrats.filter(c => {
    const due = dateValue(c.date_echeance, c.echeance, c.end_date, c.renewal_date)
    if (!due) return false
    const days = Math.ceil((due - now) / 86400000)
    return days >= 0 && days <= 45
  }).length

  const contactScore = totalClients ? Math.round((clientsWithContact / totalClients) * 100) : 72
  const coverageScore = totalClients ? Math.min(100, Math.round((activeContracts / Math.max(totalClients, 1)) * 65 + 25)) : 70
  const taskScore = Math.max(45, 92 - overdueTasks * 9)
  const renewalScore = Math.max(45, 88 - upcomingRenewals * 6)
  const healthScore = Math.round((contactScore * 0.25) + (coverageScore * 0.25) + (taskScore * 0.25) + (renewalScore * 0.25))

  return {
    health_score: Math.max(45, Math.min(92, healthScore)),
    breakdown: {
      contacts: contactScore,
      contrats: coverageScore,
      taches: taskScore,
      echeances: renewalScore,
    },
    grade: null,
    generated_at: new Date().toISOString(),
    source: 'local_fallback',
  }
}

function getBreakdownValue(value) {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.score === 'number') return value.score
  return 0
}

function getBreakdownLabel(key, value) {
  if (value && typeof value === 'object' && value.label) return value.label
  return key.replace(/_/g, ' ')
}

function mapArkRecommendation(card = {}) {
  const action = card.suggested_action || {}
  const target = action.target || {}
  const clientId = card.client_id || (target.type === 'client' ? target.id : null)
  return {
    id: `ark-${card.id || card.kind || card.title}`,
    clientId,
    clientNom: card.client_name || 'Priorité ARK',
    titre: card.title || 'Action recommandée',
    sousTitre: card.rationale || 'ARK a détecté un signal portefeuille à traiter.',
    cta: {
      label: action.label || (clientId ? 'Ouvrir la fiche' : 'Voir le cockpit'),
      target: clientId ? `/clients/${clientId}` : '/dashboard',
    },
  }
}

function splitArkRecommendations(cards = []) {
  const grouped = { critiques: [], importantes: [], suggerees: [] }
  cards.slice(0, 5).forEach((card) => {
    const mapped = mapArkRecommendation(card)
    const priority = Number(card.priority || 0)
    if (priority >= 85) grouped.critiques.push(mapped)
    else if (priority >= 65) grouped.importantes.push(mapped)
    else grouped.suggerees.push(mapped)
  })
  return grouped
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function Shimmer({ w = '100%', h = 20, r = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite'
    }} />
  )
}

function BriefSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: 20 }}>
          <Shimmer h={14} w="40%" mb={10} />
          <Shimmer h={20} w="80%" mb={8} />
          <Shimmer h={14} w="60%" />
        </div>
      ))}
    </div>
  )
}

function ScoreSkeleton() {
  return (
    <div style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 16, padding: 28 }}>
      <Shimmer h={16} w="50%" mb={16} />
      <Shimmer h={80} w="80px" r={50} mb={16} />
      <Shimmer h={14} w="70%" />
    </div>
  )
}

// ─── Composants ────────────────────────────────────────────────────────────────

function ScoreRing({ score, plan }) {
  const isExact = ['pro', 'elite', 'premium', 'trial'].includes(plan)
  const displayScore = isExact ? score : null
  const displayRange = !isExact ? '60-80' : null
  const size = 96
  const stroke = 8
  const radius = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const pct = isExact && score ? Math.min(score / 100, 1) : 0.7
  const offset = circumference * (1 - pct)
  const color = isExact
    ? (score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444')
    : '#9ca3af'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f0ede8" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div style={{ marginTop: -size - 8, height: size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {isExact ? (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ fontSize: 26, fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}
          >
            <AnimatedNumber value={displayScore} duration={1.1} />
          </motion.span>
        ) : (
          <span style={{ fontSize: 16, fontWeight: 700, color: '#9ca3af', lineHeight: 1 }}>{displayRange}</span>
        )}
        <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>/100</span>
      </div>
    </div>
  )
}

function ActionCard({ action, index }) {
  const navigate = useNavigate()
  const colors = priorityColor(action.priority)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.35 }}
      style={{
        background: 'white',
        border: `0.5px solid ${colors.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        cursor: action.client_id ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14
      }}
      whileHover={action.client_id ? { y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } : {}}
      onClick={() => action.client_id && navigate(`/clients/${action.client_id}`)}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors.dot, marginTop: 5, flexShrink: 0
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase', color: colors.text,
            background: colors.bg, padding: '2px 7px', borderRadius: 20
          }}>
            {priorityLabel(action.priority)}
          </span>
          {action.action_type && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{action.action_type}</span>
          )}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 4px', lineHeight: 1.4 }}>
          {action.title || action.description}
        </p>
        {action.client_name && (
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{action.client_name}</p>
        )}
        {action.due_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Clock size={11} color="#9ca3af" />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {new Date(action.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
        {/* Action buttons */}
        <div className="mb-action-buttons" style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); toast.success('Action marquée comme traitée') }}
            style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 6,
              fontFamily: 'Arial, sans-serif'
            }}
          >
            Traiter
          </button>
          <button
            onClick={e => { e.stopPropagation(); toast.success('Relance programmée') }}
            style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: 'none', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6,
              fontFamily: 'Arial, sans-serif'
            }}
          >
            Relancer
          </button>
          {action.client_id && (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/clients/${action.client_id}`) }}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Voir client
            </button>
          )}
        </div>
      </div>
      {action.client_id && <ChevronRight size={14} color="#d1d5db" style={{ marginTop: 4, flexShrink: 0 }} />}
    </motion.div>
  )
}

function BlockError({ message, onRetry }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '24px 16px', textAlign: 'center'
    }}>
      <AlertCircle size={20} color="#d1d5db" />
      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            fontSize: 12, color: '#2563eb', background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Arial, sans-serif'
          }}
        >
          Réessayer
        </button>
      )}
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────

// ─── Carte de priorité ───────────────────────────────────────────────────────

function PriorityCard({ priority, level, navigate }) {
  const colorMap = {
    critique:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626', badge: '#fee2e2' },
    importante: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#f59e0b', badge: '#fef9c3' },
    suggeree:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e', badge: '#dcfce7' },
  }
  const c = colorMap[level]
  const [arkLoading, setArkLoading] = useState(false)
  const [arkResult, setArkResult] = useState(null)

  async function handleExplainArk(e) {
    e.stopPropagation()
    if (arkLoading || arkResult) return
    setArkLoading(true)
    try {
      const { askArk } = await import('../lib/ark/client')
      const result = await askArk('analyserClient', { id: priority.clientId, nom: priority.clientNom }, null, [])
      setArkResult(result)
    } catch {
      toast.error('ARK indisponible')
    } finally {
      setArkLoading(false)
    }
  }

  return (
    <div
      style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer' }}
      onClick={() => navigate(priority.cta.target)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', margin: '0 0 2px' }}>{priority.clientNom}</p>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>{priority.titre}</p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{priority.sousTitre}</p>
          <div className="mb-action-buttons" style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); navigate(priority.cta.target) }}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 6, fontFamily: 'Arial, sans-serif' }}
            >
              {priority.cta.label}
            </button>
            <button
              onClick={handleExplainArk}
              disabled={arkLoading}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'none', color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, fontFamily: 'Arial, sans-serif', opacity: arkLoading ? 0.6 : 1 }}
            >
              {arkLoading ? '…' : 'Expliquer avec ARK'}
            </button>
          </div>
          {arkResult && (
            <div style={{ marginTop: 10, background: 'white', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #e8e6e0' }}>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{arkResult.resume}</p>
              {arkResult.actions.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 14 }}>
                  {arkResult.actions.slice(0, 2).map((a, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{a.label}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={14} color="#d1d5db" style={{ marginTop: 4, flexShrink: 0 }} />
      </div>
    </div>
  )
}

function PrioritySection({ label, items, level, navigate, color }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '1px 7px', borderRadius: 20 }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((p, i) => <PriorityCard key={p.id || i} priority={p} level={level} navigate={navigate} />)}
      </div>
    </div>
  )
}

export default function MorningBrief() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('Courtier')
  const [priorities, setPriorities] = useState(null)
  const [briefLoading, setBriefLoading] = useState(true)
  const [score, setScore] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(true)
  const [scoreError, setScoreError] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [integrationEvents, setIntegrationEvents] = useState([])
  const [whatsappThreads, setWhatsappThreads] = useState([])
  const [briefSource, setBriefSource] = useState(null)

  useEffect(() => {
    let cancelled = false
    const loadSession = async () => {
      try {
        const user = await getSessionUser()
        if (cancelled) return
        if (user?.first_name) setFirstName(user.first_name)
        if (user?.plan) {
          setCurrentPlan(user.plan)
          return
        }
      } catch {
        // fallback below
      }

      try {
        const planResponse = await api.get('/plans/info')
        if (!cancelled && planResponse.data?.plan) {
          setCurrentPlan(planResponse.data.plan)
        }
      } catch {
        // optional plan info
      }
    }

    loadSession()
    return () => { cancelled = true }
  }, [])

  const fetchPriorities = useCallback(async () => {
    setBriefLoading(true)
    try {
      const eventsRequest = INTEGRATIONS_API_ENABLED
        ? api.get('/integrations/google-calendar/events?limit=6').catch(() => ({ data: { rows: [] } }))
        : Promise.resolve({ data: { rows: [] } })
      const threadsRequest = INTEGRATIONS_API_ENABLED
        ? api.get('/integrations/whatsapp/threads?limit=6').catch(() => ({ data: { rows: [] } }))
        : Promise.resolve({ data: { rows: [] } })
      const [clientsRes, contratsRes, tachesRes, eventsRes, threadsRes] = await Promise.all([
        api.get('/clients?limit=1000').catch(() => ({ data: [] })),
        api.get('/contrats').catch(() => ({ data: [] })),
        api.get('/taches').catch(() => ({ data: [] })),
        eventsRequest,
        threadsRequest,
      ])
      const clients  = Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.data || [])
      const contrats = Array.isArray(contratsRes.data) ? contratsRes.data : (contratsRes.data?.data || [])
      const taches   = Array.isArray(tachesRes.data) ? tachesRes.data : (tachesRes.data?.data || [])
      setIntegrationEvents(Array.isArray(eventsRes?.data?.rows) ? eventsRes.data.rows : [])
      setWhatsappThreads(Array.isArray(threadsRes?.data?.rows) ? threadsRes.data.rows : [])

      const proactive = await api.post('/ark/morning-brief').catch(() => null)
      const proactiveCards = Array.isArray(proactive?.data?.cards) ? proactive.data.cards : []
      if (proactiveCards.length > 0) {
        setPriorities(splitArkRecommendations(proactiveCards))
        setBriefSource({
          mode: proactive.data?.mode || 'local_fallback',
          configurationRequired: Boolean(proactive.data?.configuration_required),
        })
      } else {
        setPriorities(computeDailyPriorities(clients, contrats, taches))
        setBriefSource({ mode: 'local_fallback', configurationRequired: true })
      }
    } catch {
      setPriorities({ critiques: [], importantes: [], suggerees: [] })
      setBriefSource({ mode: 'local_fallback', configurationRequired: true })
    } finally {
      setBriefLoading(false)
    }
  }, [])

  const fetchScore = useCallback(async () => {
    setScoreLoading(true)
    setScoreError(null)
    try {
      const res = await api.get('/portfolio/health-score')
      setScore(res.data?.data || res.data)
    } catch (err) {
      try {
        const [clientsRes, contratsRes, tachesRes] = await Promise.all([
          api.get('/clients?limit=1000').catch(() => ({ data: [] })),
          api.get('/contrats').catch(() => ({ data: [] })),
          api.get('/taches').catch(() => ({ data: [] })),
        ])
        const clients  = Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.data || [])
        const contrats = Array.isArray(contratsRes.data) ? contratsRes.data : (contratsRes.data?.data || [])
        const taches   = Array.isArray(tachesRes.data) ? tachesRes.data : (tachesRes.data?.data || [])
        setScore(buildLocalPortfolioScore(clients, contrats, taches))
      } catch {
        setScoreError(err.response?.data?.message || 'Score indisponible')
      }
    } finally {
      setScoreLoading(false)
    }
  }, [])

  // Hydratation initiale du brief et du score portefeuille.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPriorities(); fetchScore() }, [fetchPriorities, fetchScore])

  const handleRegenerate = async () => {
    if (regenerating) return
    setRegenerating(true)
    try { await fetchPriorities(); await fetchScore() }
    catch { toast.error('Actualisation impossible', { duration: 3000 }) }
    finally { setRegenerating(false) }
  }

  const totalPriorities = priorities ? (priorities.critiques.length + priorities.importantes.length + priorities.suggerees.length) : 0
  const scoreBreakdown = score?.breakdown || score?.health_breakdown

  return (
    <PageTransition>
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 767px) {
          .mb-header { padding: 14px 16px !important; flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
          .mb-content { padding: 20px 16px !important; }
          .mb-main-grid { grid-template-columns: 1fr !important; }
          .mb-header-btn { align-self: flex-end; }
          .mb-action-buttons { flex-wrap: wrap !important; }
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-header"
        style={{
          background: 'white',
          borderBottom: '0.5px solid #e8e6e0',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>
              {getGreeting()}, {firstName}
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, textTransform: 'capitalize' }}>
              {formatDate()}
            </p>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="mb-header-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8,
            background: regenerating ? '#f0ede8' : '#0a0a0a',
            color: regenerating ? '#9ca3af' : 'white',
            border: 'none', cursor: regenerating ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'Arial, sans-serif',
            transition: 'all 0.2s'
          }}
        >
          <motion.div animate={{ rotate: regenerating ? 360 : 0 }} transition={{ duration: 1, repeat: regenerating ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={14} />
          </motion.div>
          {regenerating ? 'Actualisation…' : 'Actualiser'}
        </button>
      </motion.div>

      {/* Contenu */}
      <div className="mb-content" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="mb-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* Colonne gauche — Actions du jour */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Zap size={16} color="#0a0a0a" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>Priorités du jour</span>
              {!briefLoading && totalPriorities > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', background: '#f0ede8', padding: '2px 8px', borderRadius: 20 }}>
                  {totalPriorities}
                </span>
              )}
              {!briefLoading && briefSource && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#5b4df5', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>
                  {briefSource.configurationRequired ? 'ARK mode local' : 'ARK IA prête'}
                </span>
              )}
            </div>

            {briefLoading ? (
              <BriefSkeleton />
            ) : totalPriorities === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '0.5px solid #bbf7d0', borderRadius: 16, padding: '36px 24px', textAlign: 'center' }}
              >
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} style={{ display: 'inline-flex', marginBottom: 14 }}>
                  <CheckCircle2 size={36} color="#22c55e" />
                </motion.div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#14532d', margin: '0 0 6px' }}>Tout est sous contrôle aujourd'hui.</p>
                <p style={{ fontSize: 13, color: '#15803d', margin: '0 0 14px' }}>Profitez-en pour prospecter.</p>
                <button
                  onClick={() => navigate('/clients/new')}
                  style={{ padding: '8px 16px', background: '#15803d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}
                >
                  + Nouveau client
                </button>
              </motion.div>
            ) : (
              <>
                <PrioritySection label="Critiques" items={priorities.critiques} level="critique" navigate={navigate} color="#dc2626" />
                <PrioritySection label="Importantes" items={priorities.importantes} level="importante" navigate={navigate} color="#d97706" />
                <PrioritySection label="Suggérées" items={priorities.suggerees} level="suggeree" navigate={navigate} color="#22c55e" />
              </>
            )}

          </motion.div>

          {/* Colonne droite — Score + Métriques */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Score de santé */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                background: 'white',
                border: '0.5px solid #e8e6e0',
                borderRadius: 16,
                padding: 24
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <BarChart2 size={15} color="#0a0a0a" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>Score portefeuille</span>
              </div>

              {scoreLoading ? (
                <ScoreSkeleton />
              ) : scoreError ? (
                <BlockError message={scoreError} onRetry={fetchScore} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <ScoreRing
                    score={score?.health_score || score?.score || 0}
                    plan={currentPlan}
                  />

                  {score?.source === 'local_fallback' && (
                    <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', margin: '-4px 0 0', lineHeight: 1.5 }}>
                      Score estimé localement pendant l'actualisation du moteur portefeuille.
                    </p>
                  )}

                  {/* Breakdown si Pro/Elite */}
                  {(['pro', 'elite', 'premium', 'trial'].includes(currentPlan)) && scoreBreakdown && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(scoreBreakdown).slice(0, 3).map(([key, val]) => {
                        const numericValue = getBreakdownValue(val)
                        const label = getBreakdownLabel(key, val)
                        return (
                        <PremiumTooltip key={key} content={`${label} : ${numericValue}/100`} position="top">
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>
                                {label}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a' }}>{numericValue}</span>
                            </div>
                            <div style={{ height: 3, background: '#f7f6f2', borderRadius: 2 }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: Math.min(numericValue, 100) + '%' }}
                                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                                style={{ height: '100%', background: '#0a0a0a', borderRadius: 2 }}
                              />
                            </div>
                          </div>
                        </PremiumTooltip>
                      )})}
                    </div>
                  )}

                  {/* Fourchette pour Start */}
                  {currentPlan === 'start' && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>
                        Score détaillé disponible avec Pro
                      </p>
                      <button
                        onClick={() => navigate('/billing?plan=pro')}
                        style={{
                          fontSize: 12, color: '#2563eb', background: 'none',
                          border: 'none', cursor: 'pointer', textDecoration: 'underline',
                          fontFamily: 'Arial, sans-serif'
                        }}
                      >
                        Voir mon score exact →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              style={{
                background: 'white',
                border: '0.5px solid #e8e6e0',
                borderRadius: 16,
                padding: 18
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CalendarDays size={15} color="#0a0a0a" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>Signaux intégrations</span>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                Agenda et WhatsApp enrichissent les priorités ARK dès qu’ils sont connectés.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Rendez-vous synchronisés: {integrationEvents.length}
                  </p>
                  {integrationEvents.slice(0, 1).map((event) => (
                    <p key={event.id || event.external_event_id} style={{ margin: '4px 0 0', fontSize: 11, color: '#334155' }}>
                      {event.title || 'Événement'} · {formatShortDateTime(event.start_time)}
                    </p>
                  ))}
                </div>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#14532d' }}>
                    Threads WhatsApp: {whatsappThreads.length}
                  </p>
                  {whatsappThreads.slice(0, 1).map((thread) => (
                    <p key={thread.id || thread.phone} style={{ margin: '4px 0 0', fontSize: 11, color: '#166534' }}>
                      <MessageSquare size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                      {thread.last_message_preview || 'Dernier message client'}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Raccourcis */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{
                background: 'white',
                border: '0.5px solid #e8e6e0',
                borderRadius: 16,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f0ede8' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>Raccourcis</span>
              </div>
              {[
                { label: 'Tableau de bord', path: '/dashboard', icon: <TrendingUp size={14} /> },
                { label: 'Mes clients', path: '/clients', icon: <CheckCircle2 size={14} /> },
                { label: 'Mes contrats', path: '/contrats', icon: <BarChart2 size={14} /> },
              ].map((item, i) => (
                <motion.div
                  key={item.path}
                  whileHover={{ x: 3 }}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 18px', cursor: 'pointer',
                    borderBottom: i < 2 ? '0.5px solid #f7f6f2' : 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#6b7280' }}>
                    {item.icon}
                    <span style={{ fontSize: 13, color: '#0a0a0a' }}>{item.label}</span>
                  </div>
                  <ChevronRight size={13} color="#d1d5db" />
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
    </PageTransition>
  )
}
