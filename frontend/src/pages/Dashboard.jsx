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
import { VibeBackdrop, VibeHeader, Vibe3DCard, VibeScrollSection, VibeStagger } from '../components/vibe'
import VibePage, { GlowHover, Particles, ScrollGlow } from '../components/vibe/VibePage'
import { GlassPanel, CockpitMetricCard, PriorityHalo, ArkStatusBadge, EmptyStateAurora, MobileCockpitCard, SectionGlow } from '../components/aurora/Aurora3D'
import { libelleSante, variation } from '../lib/cockpitTendances'
import { fmtMontant, fmtNombre } from '../lib/monnaie'
import { BubbleCMini } from '../design/BubbleC'
import ArkVoiceCockpit from '../components/voice/ArkVoiceCockpit'
import EmailInboxUnified from '../components/inbox/EmailInboxUnified'
import DDACompliance from '../components/dda/DDACompliance'
import DealFlowRiver from '../components/widgets/DealFlowRiver'
import ConversionGravityFunnel from '../components/widgets/ConversionGravityFunnel'
import ArkActivityFeed from '../components/widgets/ArkActivityFeed'

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

// Devise centrale du cabinet : CHF en Suisse, EUR sinon (lib/monnaie).
const fmtEur = (v) => fmtMontant(v, { maximumFractionDigits: 0 })
const fmtNum = (v) => fmtNombre(v)

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

// ─── Blocs du cockpit : CALCULÉS, jamais écrits en dur ───────────────
// L'ancienne version portait des listes d'exemple (« Martin Conseil »,
// « Leroy Marie », « Devis #247 », « 24 devis signés », « +12,4% »). Elles
// s'affichaient telles quelles — dans le cockpit d'un vrai cabinet comme dans
// la démonstration publique — et contredisaient les compteurs du haut de page
// (8 clients, 15 contrats, 7 échéances sous 30 jours). Tout est désormais
// dérivé des dossiers réellement chargés ; ce qui ne peut pas être calculé
// n'est pas affiché.

const joursDe = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null }
const joursDepuisDate = (v) => {
  const t = v ? new Date(v).getTime() : NaN
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000))
}
const nomDe = (c) => {
  if (typeof c === 'string') return c.trim() || 'Client'
  return [c?.prenom, c?.nom].filter(Boolean).join(' ').trim()
    || c?.nom || c?.raison_sociale || c?.nomClient || 'Client'
}
/** Nom du client d'un contrat : le champ `client` peut être une chaîne (API
 *  réelle et démo) ou un objet ; `nomClient` prime quand il existe. */
const nomContrat = (c) => c?.nomClient || nomDe(c?.client)
const primeDe = (c) => Number(c?.prime ?? c?.prime_annuelle ?? c?.primeAnnuelle) || 0
const echeanceDe = (c) => {
  const n = joursDe(c?.jours ?? c?.echeance_nombre)
  if (n !== null) return n
  const direct = joursDe(c?.echeance)
  if (direct !== null) return direct
  const d = c?.dateEcheance ?? c?.date_echeance
  const t = d ? new Date(d).getTime() : NaN
  return Number.isNaN(t) ? null : Math.round((t - Date.now()) / 86400000)
}
const resilie = (c) => ['resilie', 'résilié'].includes(String(c?.statut ?? c?.status ?? '').toLowerCase())

/** Priorités du jour : échéances proches, clients silencieux, scores faibles. */
function construirePriorites(contrats, clients) {
  const liste = []
  contrats.forEach((c) => {
    const j = echeanceDe(c)
    if (j === null || j > 30 || resilie(c)) return
    liste.push({
      id: `c${c.id}`,
      level: j <= 7 ? 'urgent' : 'haut',
      title: `${j <= 0 ? 'Échéance dépassée' : `Renouvellement ${c.type || 'contrat'}`} — ${nomContrat(c)}`,
      meta: `${j <= 0 ? `${Math.abs(j)} j de retard` : `J-${j}`} • ${fmtEur(primeDe(c))}`,
      cta: 'Préparer', accent: j <= 7 ? T.danger : T.warning, to: '/contrats',
    })
  })
  clients.forEach((c) => {
    const jours = joursDepuisDate(c?.dernierContact ?? c?.last_contact ?? c?.dernier_contact)
    if (jours === null || jours <= 45) return
    liste.push({
      id: `s${c.id}`, level: jours > 90 ? 'urgent' : 'haut',
      title: `Client silencieux — ${nomDe(c)}`,
      meta: `${jours} j sans contact`, cta: 'Appeler',
      accent: jours > 90 ? T.danger : T.warning, to: '/relances',
    })
  })
  clients.forEach((c) => {
    const score = Number(c?.score ?? c?.score_risque)
    if (!Number.isFinite(score) || score >= 60) return
    liste.push({
      id: `r${c.id}`, level: 'moyen',
      title: `Score faible — ${nomDe(c)}`, meta: `Score ${score}/100`,
      cta: 'Voir', accent: T.ark, to: `/clients/${c.id}`,
    })
  })
  const ordre = { urgent: 0, haut: 1, moyen: 2 }
  return liste.sort((a, b) => ordre[a.level] - ordre[b.level]).slice(0, 5)
}

/** Échéances à venir (30 jours), triées par urgence réelle. */
function construireEcheances(contrats) {
  return contrats
    .map((c) => ({ ...c, jours: echeanceDe(c) }))
    .filter((c) => c.jours !== null && c.jours <= 30 && !resilie(c))
    .sort((a, b) => a.jours - b.jours)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      type: c.type || 'Contrat',
      client: nomContrat(c),
      compagnie: c.compagnie || '—',
      jours: c.jours,
      date: c.dateEcheance ? String(c.dateEcheance).slice(0, 10) : `J-${c.jours}`,
      prime: primeDe(c),
    }))
}

/** Activité récente : dossiers créés et échéances proches, datés réellement. */
function construireActivite(clients, contrats) {
  const items = []
  clients.forEach((c) => {
    const t = c?.created_at || c?.createdAt
    const ts = t ? new Date(t).getTime() : NaN
    if (Number.isFinite(ts)) {
      items.push({ id: `na${c.id}`, label: `Client ajouté : ${nomDe(c)}`, ts, color: T.success, icon: UserPlus })
    }
  })
  contrats.forEach((c) => {
    const j = echeanceDe(c)
    if (j === null || j > 30) return
    items.push({
      id: `ec${c.id}`,
      label: `Échéance dans ${j} j — ${c.type || 'contrat'} ${nomContrat(c)}`.trim(),
      ts: Date.now() - (30 - j) * 86400000, color: T.warning, icon: FileText,
    })
  })
  return items
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 6)
    .map((i) => ({ ...i, when: new Date(i.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }))
}

/** Suggestions ARK : uniquement des constats dérivables des dossiers chargés. */
function construireSuggestions(contrats, clients) {
  const liste = []
  const parClient = new Map()
  contrats.forEach((c) => {
    const id = c?.client_id ?? c?.clientId ?? c?.client?.id
    if (id !== null && id !== undefined) parClient.set(id, (parClient.get(id) || 0) + 1)
  })
  const mono = [...parClient.values()].filter((n) => n === 1).length
  if (mono > 0) {
    liste.push({
      id: 1, title: 'Développer les clients mono-contrat',
      desc: `${mono} clients n'ont qu'une seule couverture au dossier.`,
      cta: 'Voir les clients', to: '/clients',
    })
  }
  const aConsolider = clients.filter((c) => {
    const s = Number(c?.score ?? c?.score_risque)
    return Number.isFinite(s) && s < 70
  }).length
  if (aConsolider > 0) {
    liste.push({
      id: 2, title: 'Dossiers à consolider',
      desc: `${aConsolider} clients ont un score de risque inférieur à 70/100.`,
      cta: 'Voir la liste', to: '/clients',
    })
  }
  const proches = contrats.filter((c) => {
    const j = echeanceDe(c)
    return j !== null && j <= 30 && !resilie(c)
  }).length
  if (proches > 0) {
    liste.push({
      id: 3, title: 'Renouvellements à préparer',
      desc: `${proches} contrats arrivent à échéance dans les 30 jours.`,
      cta: 'Voir les contrats', to: '/contrats',
    })
  }
  return liste.slice(0, 3)
}

const LEVEL_BADGE = {
  urgent: { label: 'Urgent', bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5' },
  haut:   { label: 'Haut',   bg: 'rgba(245,158,11,0.15)', color: '#FCD34D' },
  moyen:  { label: 'Moyen',  bg: 'rgba(91,77,245,0.15)', color: '#A5B4FC' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [contrats, setContrats] = useState([])
  const [devis, setDevis] = useState([])
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ first_name: '', last_name: '' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes, clientsRes, contratsRes, devisRes, oppRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: null })),
        getSessionUser().then(u => ({ data: u || {} })).catch(() => ({ data: {} })),
        api.get('/clients?limit=300').catch(() => ({ data: [] })),
        api.get('/contrats').catch(() => ({ data: [] })),
        api.get('/devis').catch(() => ({ data: [] })),
        api.get('/opportunites').catch(() => ({ data: [] })),
      ])
      setStats(statsRes.data || null)
      setUser(userRes.data || {})
      setClients(normalizeRows(clientsRes.data))
      setContrats(normalizeRows(contratsRes.data))
      setDevis(normalizeRows(devisRes.data))
      setOpportunites(normalizeRows(oppRes.data))
    } catch (_) { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const metrics = useMemo(() => {
    const statusMap = stats?.clientsParStatut || {}
    // Aucun repli chiffré : les anciennes valeurs (124 clients, 312 contrats,
    // 248 000 de primes, score 82) étaient FABRIQUÉES. Quand un appel échouait, le
    // cockpit annonçait 124 clients pendant que les autres écrans en affichaient
    // 8 — une contradiction visible par le prospect. On retombe sur les données
    // réellement chargées, sinon sur 0, ce qui reste honnête.
    const activeClients = Number(statusMap.actif || 0) || clients.length || 0
    const activeContracts = Number(stats?.contratsActifs || 0) || 0
    const annualPrime = Number(stats?.primeTotale || 0) || 0
    const scoreClients = clients.length
      ? Math.round(clients.reduce((t, c) => t + (Number(c.score) || 0), 0) / clients.length)
      : 0
    const healthScore = Number(stats?.health_score ?? stats?.scoreMoyen ?? 0) || scoreClients || 0
    return { activeClients, activeContracts, annualPrime, healthScore }
  }, [stats, clients])

  /* Tendances : uniquement ce qui est calculable. Les anciennes valeurs
     (« +8 ce mois », « +12 ce mois », « +5,2 % vs M-1 », « +2 pts ») étaient
     écrites en dur et s'affichaient même sur un cabinet vide. L'API ne fournit
     pas d'historique : on n'affiche donc AUCUNE variation, sauf si un nombre de
     créations du mois est réellement renvoyé. */
  const aDesDonnees = clients.length > 0 || metrics.activeContracts > 0
  const tendanceClients = variation(metrics.activeClients, stats?.clientsMoisPrecedent)
  const tendanceContrats = variation(metrics.activeContracts, stats?.contratsMoisPrecedent)
  const tendanceSante = libelleSante(metrics.healthScore, aDesDonnees)

  const userName = user?.first_name || user?.firstName || ''
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  /* Blocs du cockpit : calculés sur les dossiers chargés (aucune liste d'exemple). */
  const priorites = useMemo(() => construirePriorites(contrats, clients), [contrats, clients])
  const echeances = useMemo(() => construireEcheances(contrats), [contrats])
  const activite = useMemo(() => construireActivite(clients, contrats), [clients, contrats])
  const suggestions = useMemo(() => construireSuggestions(contrats, clients), [contrats, clients])
  const urgentCount = priorites.filter(p => p.level === 'urgent').length

  /* Pipeline et tunnel : comptés sur les devis et opportunités réellement
     chargés. Les anciennes valeurs (14 / 9 / 7 / 4 / 6 et 42 / 28 / 18 / 9 / 6)
     étaient écrites en dur et ne correspondaient à aucun dossier du cabinet. */
  const statutDevis = (d) => String(d?.statut ?? d?.status ?? '').toLowerCase()
  const pipeline = useMemo(() => {
    const signes = devis.filter(d => ['accepte', 'signe', 'signé'].includes(statutDevis(d))).length
    const envoyes = devis.filter(d => statutDevis(d) === 'envoye').length
    const aEnvoyer = devis.filter(d => ['preparation', 'brouillon'].includes(statutDevis(d))).length
    return [
      { id: 'opp', label: 'Opportunités', count: opportunites.length, color: T.accent },
      { id: 'prep', label: 'Devis à envoyer', count: aEnvoyer, color: T.ark },
      { id: 'env', label: 'Devis envoyés', count: envoyes, color: T.warning },
      { id: 'sig', label: 'Signés', count: signes, color: T.success },
    ]
  }, [devis, opportunites])

  const tunnel = useMemo(() => {
    const signes = devis.filter(d => ['accepte', 'signe', 'signé'].includes(statutDevis(d))).length
    const envoyes = devis.filter(d => statutDevis(d) === 'envoye').length
    // Étapes strictement décroissantes : un entonnoir qui n'est pas décroissant
    // afficherait un taux de conversion supérieur à 100 %.
    return [
      { id: 'devis', label: 'Devis émis', count: devis.length, color: T.cyan },
      { id: 'envoye', label: 'En attente', count: envoyes, color: T.warning, arkNote: envoyes > 0 ? `${envoyes} sans réponse` : null },
      { id: 'signe', label: 'Signés', count: signes, color: T.success },
    ]
  }, [devis, opportunites])

  const isEmpty = !stats && clients.length === 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <BubbleCMini size={80} animated />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div style={{ minHeight: '100vh', padding: '24px 24px 48px', color: T.text }}>
        <VibeBackdrop intensity={0.85} />
        <EmptyStateAurora
          icon={Sparkles}
          title="Aucune donnée pour le moment"
          description="Votre cockpit s'enrichira dès que vous ajouterez vos premiers clients et contrats. L'IA ARK analysera automatiquement vos priorités."
          actionLabel="Ajouter un client"
          onAction={() => navigate('/clients/new')}
        />
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

      {/* 500x VIBE — particules animées + glow scroll */}
      <Particles count={40} />
      <ScrollGlow />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        {/* SectionGlow — halo lumineux en haut du dashboard */}
        <SectionGlow color="#8fe7ff" style={{ top: -10 }} />

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

        {/* ROW 1 — 4 KPIs cockpit avec CockpitMetricCard */}
        <VibeScrollSection delay={0.1} parallax={15}>
        <VibeStagger style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18}} itemStyle={{flex: '1 1 220px'}}>
          <PriorityHalo color="#5B4DF5" intensity={0.7}>
            <CockpitMetricCard label="Clients actifs" value={fmtNum(metrics.activeClients)} icon={Users} color="#5B4DF5" trend={tendanceClients} />
          </PriorityHalo>
          <PriorityHalo color="#3B82F6" intensity={0.7}>
            <CockpitMetricCard label="Contrats actifs" value={fmtNum(metrics.activeContracts)} icon={FileText} color="#3B82F6" trend={tendanceContrats} />
          </PriorityHalo>
          <PriorityHalo color="#22C55E" intensity={0.7}>
            <CockpitMetricCard label="Primes annuelles" value={fmtEur(metrics.annualPrime)} icon={Euro} color="#22C55E" trend={null} />
          </PriorityHalo>
          <PriorityHalo color="#8B5CF6" intensity={0.7}>
            <CockpitMetricCard label="Score santé" value={`${metrics.healthScore}%`} icon={Heart} color="#8B5CF6" trend={tendanceSante} />
          </PriorityHalo>
        </VibeStagger>
        </VibeScrollSection>

        {/* MobileCockpitCard — cockpit visuel mobile uniquement */}
        <MobileCockpitCard
          modules={[
            { name: 'Clients', status: `${metrics.activeClients} actifs`, color: '#8fe7ff' },
            { name: 'Contrats', status: `${metrics.activeContracts} actifs`, color: '#a986ff' },
            { name: 'Relances', status: `${urgentCount} urgentes`, color: '#ff9a55' },
            { name: 'Primes', status: fmtEur(metrics.annualPrime), color: '#ff65bb' },
          ]}
          title="Votre cockpit, en un coup d'œil"
        />

        {/* ROW 2 — Priorités ARK + Échéances 30j */}
        <VibeScrollSection delay={0.15} parallax={25}>
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
              count={priorites.length}
              cta="Tout voir"
              onCta={() => navigate('/morning-brief')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorites.length === 0 && (
                <div style={{ fontSize: 12, color: T.textMuted, padding: '10px 2px' }}>
                  Aucune priorité détectée sur les dossiers chargés.
                </div>
              )}
              {priorites.map(p => {
                const badge = LEVEL_BADGE[p.level] || LEVEL_BADGE.moyen
                const isUrgent = p.level === 'urgent'
                const item = (
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
                return isUrgent ? <PriorityHalo key={p.id} color={p.accent} intensity={0.9}>{item}</PriorityHalo> : item
              })}
            </div>
          </AuroraCard>

          {/* Échéances 30j */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle
              icon={Calendar}
              iconColor={T.warning}
              title="Échéances 30 jours"
              count={echeances.length}
              cta="Contrats"
              onCta={() => navigate('/contrats')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {echeances.length === 0 && (
                <div style={{ fontSize: 12, color: T.textMuted, padding: '10px 2px' }}>
                  Aucune échéance dans les 30 jours.
                </div>
              )}
              {echeances.map((e, i) => {
                const isUrgent = e.jours <= 30
                const row = (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 0',
                    borderBottom: i < echeances.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
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
                )
                return isUrgent ? <PriorityHalo key={e.id} color={T.warning} intensity={0.7}>{row}</PriorityHalo> : row
              })}
            </div>
          </AuroraCard>
        </div>
        </VibeScrollSection>

        {/* ROW 3 — Performance + Activité */}
        <VibeScrollSection delay={0.2} parallax={30}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
          gap: 12, marginBottom: 18,
        }}>
          {/* Portefeuille — uniquement des valeurs calculées */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle icon={TrendingUp} iconColor={T.success} title="Portefeuille" />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1 }}>{fmtEur(metrics.annualPrime)}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>Primes annuelles suivies</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.cardBorder}` }}>
              <MiniStat label="Clients actifs" value={String(metrics.activeClients)} />
              <MiniStat label="Contrats actifs" value={String(metrics.activeContracts)} />
              <MiniStat label="Échéances 30 j" value={String(echeances.length)} />
            </div>
          </AuroraCard>

          {/* Activité récente */}
          <AuroraCard padding={18} hover={false}>
            <SectionTitle icon={Activity} iconColor={T.cyan} title="Activité récente" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activite.length === 0 && (
                <div style={{ fontSize: 12, color: T.textMuted, padding: '10px 2px' }}>
                  Aucune activité enregistrée sur les dossiers chargés.
                </div>
              )}
              {activite.map((a, i) => {
                const Icon = a.icon
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < activite.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
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
        </VibeScrollSection>

        {/* ROW 4 — Suggestions ARK (calculées ; le bloc disparaît s'il n'y a rien) */}
        {suggestions.length > 0 && (
        <VibeScrollSection delay={0.25} parallax={20}>
        <div style={{ marginBottom: 12 }}>
          <SectionTitle
            icon={Sparkles}
            iconColor={T.ark}
            title="Suggestions ARK"
            count={suggestions.length}
            inline
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12, marginTop: 10,
          }}>
            {suggestions.map(s => (
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
        </VibeScrollSection>
        )}

        {/* ARK VOICE — P0 : Assistant téléphonique IA */}
        <VibeScrollSection delay={0.25} parallax={18}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
            <ArkVoiceCockpit apiBase="/api" authToken={localStorage.getItem('courtia_token') || localStorage.getItem('token')} />
          </div>
        </VibeScrollSection>

        {/* DDA COMPLIANCE — Conformité réglementaire */}
        <VibeScrollSection delay={0.35} parallax={18}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
            <DDACompliance apiBase="/api" authToken={localStorage.getItem('courtia_token') || localStorage.getItem('token')} />
          </div>
        </VibeScrollSection>

        {/* EMAIL INBOX — Boîte mail unifiée classifiée IA */}
        <VibeScrollSection delay={0.45} parallax={18}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
            <EmailInboxUnified apiBase="/api" authToken={localStorage.getItem('courtia_token') || localStorage.getItem('token')} />
          </div>
        </VibeScrollSection>

        {/* DEAL FLOW — Pipeline visuel des dossiers */}
        <VibeScrollSection delay={0.55} parallax={14}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>Pipeline dossiers</h3>
              <DealFlowRiver stages={pipeline} />
            </div>
            <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>Tunnel de conversion</h3>
              <ConversionGravityFunnel stages={tunnel} />
            </div>
          </div>
        </VibeScrollSection>

        {/* ARK ACTIVITY FEED */}
        <VibeScrollSection delay={0.60} parallax={14}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
            <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={T.ark} /> Activité ARK
              </h3>
              <ArkActivityFeed onRefresh={() => Promise.resolve([])} autoRefresh={false} />
            </div>
          </div>
        </VibeScrollSection>

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
