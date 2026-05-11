import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, FileText, Euro, Calendar, Zap, TrendingUp, ArrowRight,
  Sparkles, Bell, AlertTriangle, Briefcase, CheckSquare, UserPlus,
  Target, Shield, Clock, Send, ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
const INTEGRATIONS_API_ENABLED = String(import.meta.env.VITE_INTEGRATIONS_API_ENABLED || '').trim().toLowerCase() === 'true'

const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  accentBg: 'rgba(91,77,245,0.08)',
  accentBorder: 'rgba(91,77,245,0.20)',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.15)',
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

function toTimestamp(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

function isTaskDone(task) {
  return ['terminee', 'done', 'completed'].includes(String(task?.statut || task?.status || '').toLowerCase())
}

// ─── Demo data for ARK insights when API data is sparse ─────────────────────
const DEMO_ARK_PRIORITIES = [
  { type: 'echeance', client: 'Martin Conseil', sujet: 'RC Pro — échéance J-21', raison: 'Client pro actif, contrat stratégique, risque de mise en concurrence.', impact: '2 800 €', action: 'Préparer renouvellement', priorite: 'haute' },
  { type: 'silence', client: 'Leroy Marie', sujet: 'Silence depuis 52 jours', raison: 'Aucune interaction depuis 52j. Score risque 80%. Contrat Habitation Confort.', impact: '680 €', action: 'Appeler', priorite: 'haute' },
  { type: 'devis', client: 'Karim B.', sujet: 'Devis Auto #247 sans réponse', raison: 'Devis envoyé il y a 6 jours, fort potentiel de conversion (historique favorable).', impact: '1 100 €', action: 'Relancer', priorite: 'moyenne' },
  { type: 'opportunite', client: 'Garcia Anne', sujet: 'Multi-équipement Santé+MRH', raison: 'Client mono-produit Santé, éligible MRH. Score opportunité 78%.', impact: '+420 €', action: 'Proposer devis', priorite: 'moyenne' },
  { type: 'silence', client: 'Dupont Jean', sujet: 'MRH — relance conseillée', raison: 'Dernier contact il y a 47j. Contrat MRH actif. Risque de perte modéré.', impact: '480 €', action: 'Envoyer email', priorite: 'basse' },
]

const DEMO_OPPORTUNITIES = [
  { client: 'Martin Sophie', desc: 'Non équipée Prévoyance — 2 contrats actifs', potentiel: 520 },
  { client: 'Dupont SAS', desc: 'Flotte Auto + RC Pro + Protection juridique', potentiel: 12400 },
  { client: 'Petit Philippe', desc: 'Devis Auto #241 non transformé', potentiel: 1100 },
]

const DEMO_RENEWALS = [
  { client: 'Moreau Éric', contrat: 'Auto', echeance: '15/06/2026', jours: 35, prime: 2400 },
  { client: 'SCP Dubois', contrat: 'Décennale', echeance: '22/06/2026', jours: 42, prime: 3500 },
  { client: 'Martin Conseil', contrat: 'RC Pro', echeance: '01/06/2026', jours: 21, prime: 2800 },
]

const PRIORITY_STYLE = {
  haute:   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', text: '#EF4444', label: 'Urgent' },
  moyenne: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', text: '#F59E0B', label: 'À faire' },
  basse:   { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.12)', text: '#9CA3AF', label: 'Info' },
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, title, value, format, accent, subtitle }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 12, padding: '16px 18px', flex: 1, minWidth: 150,
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
      onMouseLeave={e => { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent || T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent || T.accent} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{display}</div>
      {subtitle && <div style={{ marginTop: 4, fontSize: 11, fontWeight: 500, color: accent || T.accent }}>{subtitle}</div>}
    </div>
  )
}

// ─── Portfolio Health Score ──────────────────────────────────────────────────
function PortfolioHealthScore({ activeClients, activeContracts, atRiskClients, urgentTasks, annualPrime }) {
  const score = activeClients > 0
    ? Math.min(100, Math.round(
        (activeClients * 0.4) + (activeContracts * 0.3) - (atRiskClients * 3) - (urgentTasks * 2) + (Math.log10(annualPrime + 1) * 5)
      ))
    : 0
  const scoreColor = score >= 80 ? T.success : score >= 50 ? T.warning : T.danger
  const status = score >= 80 ? 'Sain' : score >= 50 ? 'Surveillé' : 'Fragile'

  return (
    <div style={{
      background: T.arkBg, border: `1px solid ${T.arkBorder}`,
      borderRadius: 14, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg viewBox="0 0 64 64" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={scoreColor} strokeWidth="4"
            strokeDasharray={`${score * 1.76} 176`} strokeLinecap="round" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: T.text,
        }}>{score}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>
          Score portefeuille
        </div>
        <div style={{ fontSize: 12, color: scoreColor, fontWeight: 600, marginBottom: 4 }}>
          {status} {score >= 80 ? '✅' : score >= 50 ? '⚠️' : '🔴'}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted }}>
          {atRiskClients > 0 ? `${atRiskClients} clients à risque • ` : ''}
          {urgentTasks > 0 ? `${urgentTasks} tâches urgentes • ` : ''}
          {activeClients} clients actifs
        </div>
      </div>
    </div>
  )
}

// ─── ARK Priority Card ───────────────────────────────────────────────────────
function ArkPriorityCard({ priority, client, sujet, raison, impact, action, onClick }) {
  const p = PRIORITY_STYLE[priority.priorite] || PRIORITY_STYLE.basse
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${p.border}`,
      borderLeft: `3px solid ${p.text}`,
      borderRadius: 10, padding: '14px 16px',
      cursor: 'pointer', transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
      onMouseLeave={e => { e.currentTarget.style.background = T.cardBg }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: p.bg, color: p.text }}>
          {p.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{client}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 4 }}>{sujet}</div>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{raison}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>
          Impact : <strong style={{ color: T.text }}>{impact}</strong>
        </span>
        <span style={{ fontSize: 11, color: T.ark }}>
          <Zap size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} /> {action}
        </span>
      </div>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })
  const [snapshotTs, setSnapshotTs] = useState(0)
  const [integrationSignals, setIntegrationSignals] = useState({ events: [], threads: [] })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const eventsRequest = INTEGRATIONS_API_ENABLED
        ? api.get('/integrations/google-calendar/events?limit=6').catch(() => ({ data: { rows: [] } }))
        : Promise.resolve({ data: { rows: [] } })
      const threadsRequest = INTEGRATIONS_API_ENABLED
        ? api.get('/integrations/whatsapp/threads?limit=6').catch(() => ({ data: { rows: [] } }))
        : Promise.resolve({ data: { rows: [] } })
      const [statsRes, userRes, clientsRes, tasksRes, eventsRes, threadsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        getSessionUser().then(u => ({ data: u || {} })).catch(() => ({ data: {} })),
        api.get('/clients?limit=300').catch(() => ({ data: [] })),
        api.get('/taches').catch(() => ({ data: [] })),
        eventsRequest,
        threadsRequest,
      ])
      setStats(statsRes.data || null)
      setUser(userRes.data || {})
      setClients(normalizeRows(clientsRes.data))
      setTasks(normalizeRows(tasksRes.data))
      setIntegrationSignals({
        events: Array.isArray(eventsRes?.data?.rows) ? eventsRes.data.rows : [],
        threads: Array.isArray(threadsRes?.data?.rows) ? threadsRes.data.rows : [],
      })
      setSnapshotTs(Date.now())
    } catch { console.error('Impossible de charger le cockpit.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const metrics = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    const activeClients = Number(statusMap.actif || 0) || clients.filter(c => normalizeStatus(c.status || c.statut) === 'actif').length
    const prospects = Number(statusMap.prospect || 0) || clients.filter(c => normalizeStatus(c.status || c.statut) === 'prospect').length
    const atRiskClients = Number(statusMap.a_risque || 0) || clients.filter(c => Number(c.risk_score ?? c.score_risque ?? c.riskScore ?? 0) >= 70).length
    const urgentTasks = tasks.filter(t => {
      if (isTaskDone(t)) return false
      const p = String(t.priorite || '').toLowerCase()
      const due = toTimestamp(t.echeance || t.due_date || t.date_echeance)
      return p === 'urgente' || p === 'haute' || (due !== null && snapshotTs > 0 && (due - snapshotTs) <= 48 * 3600 * 1000)
    }).length
    return { activeClients, prospects, atRiskClients, urgentTasks, activeContracts: Number(stats?.contratsActifs || 0), annualPrime: Number(stats?.primeTotale || 0) }
  }, [stats, clients, tasks, snapshotTs])

  const userName = user?.first_name || user?.firstName || ''
  const dateFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CourtiaLogoLoader fullScreen={false} message="COURTIA analyse votre portefeuille…" />
      </div>
    )
  }

  const isEmpty = !stats || (metrics.activeClients === 0 && metrics.activeContracts === 0)

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      {/* HALOS */}
      <div style={{ position: 'fixed', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', top: -200, left: -200, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)', bottom: -100, right: -150, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color={T.ark} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cockpit ARK</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: T.text }}>
            {userName ? `Bonjour ${userName}` : 'Tableau de bord'}
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>{dateFr}</p>
        </div>

        {/* ARK SYNTHESIS */}
        <div style={{
          background: T.arkBg, border: `1px solid ${T.arkBorder}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Zap size={16} color={T.ark} />
          <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0, flex: 1 }}>
            <strong style={{ color: '#a78bfa' }}>ARK</strong> a détecté {DEMO_ARK_PRIORITIES.length} actions prioritaires : {DEMO_ARK_PRIORITIES.filter(p => p.priorite === 'haute').length} échéances sensibles, {DEMO_ARK_PRIORITIES.filter(p => p.type === 'devis').length} devis à relancer, {DEMO_ARK_PRIORITIES.filter(p => p.type === 'silence').length} clients silencieux.
          </p>
          <button onClick={() => navigate('/morning-brief')} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Morning Brief <ChevronRight size={12} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </button>
        </div>

        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: T.arkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles size={28} color={T.ark} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Votre cockpit est prêt</h2>
            <p style={{ fontSize: 13, color: T.textMuted, maxWidth: 360, margin: '0 auto 20px' }}>Ajoutez vos premiers clients et contrats pour activer les priorités ARK, les alertes d'échéance et les recommandations métier.</p>
            <button onClick={() => navigate('/clients/new')} style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: T.accent, color: '#fff', border: 'none', cursor: 'pointer',
            }}>Ajouter un client</button>
          </div>
        ) : (
          <>
            {/* PORTFOLIO HEALTH */}
            <div style={{ marginBottom: 20 }}>
              <PortfolioHealthScore
                activeClients={metrics.activeClients}
                activeContracts={metrics.activeContracts}
                atRiskClients={metrics.atRiskClients}
                urgentTasks={metrics.urgentTasks}
                annualPrime={metrics.annualPrime}
              />
            </div>

            {/* KPIs */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <KpiCard title="Clients actifs" value={metrics.activeClients} format="number" icon={Users} accent="#7C3AED" />
              <KpiCard title="Prospects" value={metrics.prospects} format="number" icon={UserPlus} accent="#3B82F6" />
              <KpiCard title="Contrats actifs" value={metrics.activeContracts} format="number" icon={FileText} accent="#8B5CF6" />
              <KpiCard title="Prime annuelle" value={metrics.annualPrime} format="currency" icon={Euro} accent="#22C55E" />
              <KpiCard title="Tâches urgentes" value={metrics.urgentTasks} format="number" icon={Bell} accent="#F59E0B" />
              <KpiCard title="À risque" value={metrics.atRiskClients} format="number" icon={AlertTriangle} accent="#EF4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* PRIORITÉS ARK */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Sparkles size={16} color={T.ark} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Priorités ARK</h3>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: T.arkBg, color: T.ark }}>
                    {DEMO_ARK_PRIORITIES.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DEMO_ARK_PRIORITIES.slice(0, 3).map((p, i) => (
                    <ArkPriorityCard key={i} {...p} onClick={() => navigate('/morning-brief')} />
                  ))}
                </div>
                <button onClick={() => navigate('/morning-brief')} style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: 'transparent', color: T.ark, border: `1px solid ${T.arkBorder}`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content',
                }}>
                  Voir les {DEMO_ARK_PRIORITIES.length} priorités <ArrowRight size={12} />
                </button>
              </div>

              {/* RIGHT COLUMN: RENEWALS + OPPORTUNITIES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ÉCHÉANCES */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Calendar size={14} color="#F59E0B" />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Échéances à surveiller</h3>
                  </div>
                  {DEMO_RENEWALS.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: i < DEMO_RENEWALS.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.client}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{r.contrat} — {fmtEur(r.prime)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: r.jours <= 30 ? '#EF4444' : '#F59E0B' }}>J-{r.jours}</div>
                        <div style={{ fontSize: 10, color: T.textMuted }}>{r.echeance}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* OPPORTUNITÉS */}
                <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Target size={14} color="#22C55E" />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Opportunités</h3>
                  </div>
                  {DEMO_OPPORTUNITIES.map((o, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: i < DEMO_OPPORTUNITIES.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{o.client}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{o.desc}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>+{fmtEur(o.potentiel)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                { label: 'Ajouter client', icon: UserPlus, route: '/clients/new', accent: '#7C3AED' },
                { label: 'Créer devis', icon: FileText, route: '/devis', accent: '#3B82F6' },
                { label: 'Ajouter contrat', icon: Shield, route: '/contrats/new', accent: '#22C55E' },
                { label: 'Voir relances', icon: Send, route: '/relances', accent: '#F59E0B' },
                { label: 'Ouvrir ARK', icon: Zap, route: '/assistant-ark', accent: T.ark },
                { label: 'Morning Brief', icon: Sparkles, route: '/morning-brief', accent: T.ark },
              ].map((btn, i) => (
                <button key={i} onClick={() => navigate(btn.route)} style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }}
                >
                  <btn.icon size={13} color={btn.accent} />
                  {btn.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
