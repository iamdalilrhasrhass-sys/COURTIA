import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, FileText, Euro, ArrowRight, Sparkles,
  AlertTriangle, CheckSquare, UserPlus, Clock,
} from 'lucide-react'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import { VibeBackdrop, VibeHeader } from '../components/vibe'
import { BubbleCMini } from '../design/BubbleC'
import EmptyState from '../components/EmptyState'
import SimpleCard from '../components/SimpleCard'

const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

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

function isTaskDone(task) {
  return ['terminee', 'done', 'completed'].includes(String(task?.statut || task?.status || '').toLowerCase())
}

// ─── KPI Card ─────────────────────────────────────────────────────
function Kpi({ icon: Icon, label, value, accent }) {
  return (
    <SimpleCard padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <Icon size={16} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </SimpleCard>
  )
}

// ─── Demo data ────────────────────────────────────────────────────
const DEMO_TODO = [
  { id: 1, label: 'Relancer Martin Conseil — RC Pro échéance J-21', priority: 'haute' },
  { id: 2, label: 'Appeler Leroy Marie (silence 52 jours)', priority: 'haute' },
  { id: 3, label: 'Devis Auto Karim B. — relance', priority: 'moyenne' },
]

const DEMO_ACTIVITY = [
  { id: 1, label: 'Devis Prévoyance envoyé à Sophie L.', when: 'il y a 1h' },
  { id: 2, label: 'Nouveau client : Amélie Dubois', when: 'il y a 3h' },
  { id: 3, label: 'Contrat RC Pro renouvelé — Cabinet Moreau', when: 'hier' },
  { id: 4, label: 'Relance email envoyée à Karim B.', when: 'hier' },
]

const PRIO_DOT = {
  haute:   T.danger,
  moyenne: T.warning,
  basse:   T.textMuted,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes, clientsRes, tasksRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: null })),
        getSessionUser().then(u => ({ data: u || {} })).catch(() => ({ data: {} })),
        api.get('/clients?limit=300').catch(() => ({ data: [] })),
        api.get('/taches').catch(() => ({ data: [] })),
      ])
      setStats(statsRes.data || null)
      setUser(userRes.data || {})
      setClients(normalizeRows(clientsRes.data))
      setTasks(normalizeRows(tasksRes.data))
    } catch (_) { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const metrics = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    const activeClients = Number(statusMap.actif || 0) ||
      clients.filter(c => normalizeStatus(c.status || c.statut) === 'actif').length
    const activeContracts = Number(stats?.contratsActifs || 0)
    const annualPrime = Number(stats?.primeTotale || 0)
    const urgentTasks = tasks.filter(t => !isTaskDone(t) && ['urgente','haute'].includes(String(t.priorite||'').toLowerCase())).length
    return { activeClients, activeContracts, annualPrime, urgentTasks }
  }, [stats, clients, tasks])

  const userName = user?.first_name || user?.firstName || ''
  const isEmpty = !loading && metrics.activeClients === 0 && metrics.activeContracts === 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <BubbleCMini size={80} animated />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.9} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

        {/* HEADER showcase Vibe3D conservé */}
        <VibeHeader
          kicker="ACCUEIL"
          title={userName ? `Bonjour ${userName}` : 'Accueil'}
          subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          bubbleSize={56}
        />

        {isEmpty ? (
          <EmptyState
            icon="bubble"
            title="Votre cockpit est prêt"
            message="Ajoutez votre premier client pour voir vos chiffres ici ✨"
            cta={{ label: 'Nouveau client', to: '/clients/new' }}
          />
        ) : (
          <>
            {/* 3 KPI clés */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              <Kpi label="Clients actifs"   value={fmtNum(metrics.activeClients)}   icon={Users}    accent={T.accent} />
              <Kpi label="Contrats actifs"  value={fmtNum(metrics.activeContracts)} icon={FileText} accent="#3B82F6" />
              <Kpi label="Prime annuelle"   value={fmtEur(metrics.annualPrime)}     icon={Euro}     accent={T.success} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 16,
            }}>
              {/* À faire aujourd'hui */}
              <SimpleCard padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CheckSquare size={15} color={T.accent} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>
                    À faire aujourd'hui
                  </h3>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(139,92,246,0.10)', color: T.accent,
                    marginLeft: 'auto',
                  }}>{DEMO_TODO.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DEMO_TODO.map(t => (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: PRIO_DOT[t.priority] || T.textMuted,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, color: T.text, flex: 1, lineHeight: 1.4 }}>{t.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/taches')}
                  style={{
                    marginTop: 14,
                    background: 'transparent',
                    color: T.accent,
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Voir toutes les tâches <ArrowRight size={12} />
                </button>
              </SimpleCard>

              {/* Activité récente */}
              <SimpleCard padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Clock size={15} color={T.accent} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>
                    Activité récente
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {DEMO_ACTIVITY.map((a, i) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      gap: 12, padding: '10px 0',
                      borderBottom: i < DEMO_ACTIVITY.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                    }}>
                      <span style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>{a.label}</span>
                      <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>{a.when}</span>
                    </div>
                  ))}
                </div>
              </SimpleCard>
            </div>

            {/* Action principale */}
            <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/clients/new')}
                style={{
                  padding: '10px 18px',
                  background: T.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
                }}
              >
                <UserPlus size={14} /> Nouveau client
              </button>
              <button
                onClick={() => navigate('/morning-brief')}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(139,92,246,0.08)',
                  color: T.accent,
                  border: '1px solid rgba(139,92,246,0.20)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} /> Morning Brief
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
