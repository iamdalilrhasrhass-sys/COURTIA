import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone, Calendar, Heart, ArrowRight, FileX, TrendingDown,
  TrendingUp, Sparkles, Activity, AlertTriangle, Target, Users,
  Shield, Zap, ChevronRight,
} from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280', textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)', cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)', cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.10)', arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', cyan: '#22D3EE', blue: '#3B82F6',
}

/* État neutre : tant que /contrats et /clients n'ont pas répondu, RIEN n'est
   affiché comme un chiffre. L'ancien état initial portait des constantes de
   démonstration (124 clients, 312 contrats, 248 000 €, score 82) : elles
   s'affichaient le temps du chargement et, si l'API ne répondait pas, elles
   restaient à l'écran — des chiffres fabriqués présentés comme ceux du
   cabinet. Un tiret est honnête, un faux chiffre ne l'est pas. */
const VIDE = {
  score: null,
  totalClients: null,
  totalContrats: null,
  primesAnnuelles: null,
  primeMoyenne: null,
  retention: null,
  diversification: null,
  churn: null,
  sansRenouvellement: null,
  sansContact90j: null,
  churnRisk: null,
  echeancesProches: null,
  produits: [],
  topProduit: null,
  clientSilencieux: null,
  clientsUneCouverture: null,
}

/** Palette du donut : les libellés viennent des données, jamais d'une liste fixe. */
const PALETTE = ['#5B4DF5', '#22D3EE', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6', '#14B8A6']

/** `null` s'affiche « — » : jamais 0, jamais un chiffre inventé. */
const aff = (v, suffixe = '') => (v === null || v === undefined ? '—' : `${v}${suffixe}`)

/* ─── Synthèse : lecture défensive des réponses API ──────────────────────────
   Tout ce qui s'affiche est CALCULÉ depuis /contrats et /clients. Plus aucune
   constante de démonstration ne peut se substituer aux chiffres du cabinet :
   ce qui n'est pas dérivable n'est pas affiché. */

/** Tableau utile quelle que soit l'enveloppe : [ … ], { data: [ … ] }, { donnees: [ … ] }. */
function listeDe(payload, cles = []) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.donnees)) return payload.donnees
  for (const cle of cles) {
    if (Array.isArray(payload?.[cle])) return payload[cle]
  }
  return []
}

const nombreDe = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const primeDe = (c) => nombreDe(c?.prime ?? c?.prime_annuelle ?? c?.primeAnnuelle) ?? 0

const statutDe = (ligne) => String(ligne?.statut ?? ligne?.status ?? '').toLowerCase()

const estActif = (ligne) => statutDe(ligne) === 'actif'
const estResilie = (ligne) => ['resilie', 'résilié'].includes(statutDe(ligne))

/** Jours avant échéance. Dans le modèle, `echeance` est un NOMBRE de jours ;
 *  certains payloads le renvoient en date et exposent alors `jours`
 *  (cf. lib/clientViewModel.js). Les deux formes sont acceptées. */
function joursAvantEcheance(c) {
  const direct = nombreDe(c?.echeance)
  if (direct !== null) return direct
  const jours = nombreDe(c?.jours)
  if (jours !== null) return jours
  const date = c?.dateEcheance || c?.date_echeance
  const t = date ? new Date(date).getTime() : NaN
  return Number.isNaN(t) ? null : Math.ceil((t - Date.now()) / 86400000)
}

/** Jours écoulés depuis une date (dernier contact). `null` si non datable. */
function joursDepuis(v) {
  const t = v ? new Date(v).getTime() : NaN
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

/** Champs lus — contrat : prime | prime_annuelle, statut | status,
 *  echeance | jours | dateEcheance. Client : statut | status,
 *  dernierContact | last_contact, score | score_risque, risque.
 *  @returns {Object|null} null si aucune donnée exploitable. */
function calculerSynthese(contrats, clients) {
  if (contrats.length === 0 && clients.length === 0) return null
  const synthese = {}

  if (contrats.length > 0) {
    synthese.primesAnnuelles = Math.round(
      contrats.filter(estActif).reduce((total, c) => total + primeDe(c), 0)
    )
    synthese.totalContrats = contrats.length
    synthese.primeMoyenne = Math.round(synthese.primesAnnuelles / contrats.length)
    synthese.echeancesProches = contrats.filter((c) => {
      if (estResilie(c)) return false
      const j = joursAvantEcheance(c)
      return j !== null && j <= 30
    }).length
    synthese.sansRenouvellement = contrats.filter((c) => {
      if (estResilie(c)) return false
      if (statutDe(c) === 'renouvellement') return true
      const j = joursAvantEcheance(c)
      return j !== null && j < 0
    }).length
    synthese.churn = Math.round((contrats.filter(estResilie).length / contrats.length) * 100)

    /* Répartition par branche : agrégée sur les primes réellement portées par
       les contrats chargés. Les libellés viennent des données (le type de
       chaque contrat), jamais d'une liste figée. */
    const parType = new Map()
    contrats.forEach((c) => {
      const type = String(c?.type ?? c?.type_contrat ?? c?.categorie ?? '').trim() || 'Non renseigné'
      parType.set(type, (parType.get(type) || 0) + primeDe(c))
    })
    const totalPrimes = [...parType.values()].reduce((a, b) => a + b, 0)
    if (totalPrimes > 0) {
      const branches = [...parType.entries()].sort((a, b) => b[1] - a[1])
      synthese.produits = branches.map(([label, prime], i) => ({
        label,
        prime: Math.round(prime),
        value: Math.round((prime / totalPrimes) * 100),
        color: PALETTE[i % PALETTE.length],
      }))
      synthese.topProduit = synthese.produits[0]
      // Diversification = ce qui n'est PAS concentré sur la première branche.
      synthese.diversification = Math.max(0, 100 - synthese.produits[0].value)
    }
  }

  if (clients.length > 0) {
    synthese.totalClients = clients.length
    synthese.retention = Math.round((clients.filter(estActif).length / clients.length) * 100)
    synthese.sansContact90j = clients.filter((c) => {
      const j = joursDepuis(c?.dernierContact ?? c?.last_contact ?? c?.dernier_contact)
      return j !== null && j > 90            // seuil déjà utilisé par lib/priorities.js
    }).length
    /* Client le plus silencieux : c'est LUI qui doit remonter en alerte — un
       nom réellement présent dans les données, pas un nom d'exemple. */
    synthese.clientSilencieux = clients
      .map((c) => ({
        nom: [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || c?.nom || c?.raison_sociale || 'Client',
        jours: joursDepuis(c?.dernierContact ?? c?.last_contact ?? c?.dernier_contact),
        score: nombreDe(c?.score ?? c?.score_risque),
      }))
      .filter((c) => c.jours !== null)
      .sort((a, b) => b.jours - a.jours)[0] || null
    // « À risque » = statut a_risque, celui du filtre /clients?filter=a_risque.
    // Repli sur le niveau `risque` uniquement si le client n'expose aucun statut.
    synthese.churnRisk = clients.filter((c) => {
      const statut = statutDe(c)
      if (statut) return statut === 'a_risque'
      return String(c?.risque || '').toLowerCase() === 'élevé'
    }).length
    const scores = clients
      .map((c) => nombreDe(c?.score ?? c?.score_risque))
      .filter((v) => v !== null)
    // Même définition que le back : health_score = moyenne des scores clients.
    if (scores.length > 0) {
      synthese.scoreMoyenClients = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }
  }

  if (contrats.length > 0) {
    const parClient = new Map()
    contrats.forEach((c) => {
      const id = c?.client_id ?? c?.clientId ?? c?.client?.id ?? null
      if (id === null) return
      parClient.set(id, (parClient.get(id) || 0) + 1)
    })
    if (parClient.size > 0) {
      synthese.clientsUneCouverture = [...parClient.values()].filter((n) => n === 1).length
    }
  }

  return synthese
}

/* Alertes : chaque ligne est DÉRIVÉE des dossiers chargés. Aucun nom, aucun
   montant et aucun compteur ne vient d'un texte fixe — une alerte qui n'a pas
   de donnée derrière n'est pas affichée. */
const alertsPour = (d) => {
  const liste = []
  if (d.clientSilencieux && d.clientSilencieux.jours > 45) {
    liste.push({
      id: 1, level: d.clientSilencieux.jours > 90 ? 'danger' : 'warning',
      title: `${d.clientSilencieux.nom} — ${d.clientSilencieux.jours} jours sans contact`,
      desc: d.clientSilencieux.score !== null
        ? `Score ${d.clientSilencieux.score}/100 — le plus ancien contact du portefeuille`
        : 'Le plus ancien contact du portefeuille',
      cta: 'Préparer relance', to: '/relances',
    })
  }
  if (d.sansRenouvellement > 0) {
    liste.push({
      id: 2, level: 'danger', title: `${d.sansRenouvellement} contrats sans renouvellement`,
      desc: 'Échéance dépassée — action urgente', cta: 'Voir contrats', to: '/contrats',
    })
  }
  if (d.churnRisk > 0) {
    liste.push({
      id: 3, level: 'warning', title: `${d.churnRisk} clients à risque`,
      desc: 'Statut « à risque » dans le portefeuille', cta: 'Voir clients', to: '/clients?filter=a_risque',
    })
  }
  if (d.clientsUneCouverture > 0) {
    liste.push({
      id: 4, level: 'info', title: `${d.clientsUneCouverture} clients avec une seule couverture`,
      desc: 'Un seul contrat au dossier — développement possible', cta: 'Voir clients', to: '/clients',
    })
  }
  if (d.topProduit && d.topProduit.value >= 25) {
    liste.push({
      id: 5, level: 'info', title: `Concentration ${d.topProduit.label}`,
      desc: `${d.topProduit.value}% des primes annuelles sur une seule branche`, cta: 'Voir analytics', to: '/analytics',
    })
  }
  if (d.echeancesProches > 0) {
    liste.push({
      id: 6, level: 'warning', title: `${d.echeancesProches} échéances < 30 jours`,
      desc: 'Pic de renouvellements à anticiper', cta: 'Préparer', to: '/contrats',
    })
  }
  return liste.slice(0, 5)
}

/* Recommandations : uniquement ce que les dossiers chargés permettent d'affirmer.
   Les potentiels chiffrés (« 8 400 €/an ») et les comparaisons de marché
   supposaient un référentiel externe absent : ils ne sont plus affichés. */
const recosPour = (d) => {
  const liste = []
  if (d.clientsUneCouverture > 0) {
    liste.push({
      id: 1, title: 'Développer les clients mono-contrat',
      desc: `${d.clientsUneCouverture} clients n'ont qu'une seule couverture au dossier. Prévoyance et protection juridique se proposent depuis leur fiche.`,
      cta: 'Voir les clients', to: '/clients',
    })
  }
  if (d.sansContact90j > 0) {
    liste.push({
      id: 2, title: 'Relancer les clients silencieux',
      desc: `${d.sansContact90j} clients sans contact depuis plus de 90 jours.`,
      cta: 'Voir le plan', to: '/relances',
    })
  }
  if (d.echeancesProches > 0) {
    liste.push({
      id: 3, title: 'Préparer les renouvellements',
      desc: `${d.echeancesProches} contrats arrivent à échéance dans les 30 jours : mise en concurrence à préparer.`,
      cta: 'Voir les contrats', to: '/contrats',
    })
  }
  if (d.topProduit && d.topProduit.value >= 25) {
    liste.push({
      id: 4, title: 'Rééquilibrer le portefeuille',
      desc: `${d.topProduit.label} représente ${d.topProduit.value}% des primes annuelles.`,
      cta: 'Voir analytics', to: '/analytics',
    })
  }
  return liste.slice(0, 3)
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ─── Gauge SVG ─────────────────────────────────────────────
function ScoreGauge({ score, color, size = 200 }) {
  const r = (size - 40) / 2
  const c = 2 * Math.PI * r
  const valeur = Number.isFinite(score) ? score : 0
  const offset = c - (valeur / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={T.ark} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth="12"
          strokeDasharray={c} strokeLinecap="round"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: 56, lineHeight: 1, color: T.text,
          letterSpacing: '-0.04em',
        }}>{Number.isFinite(score) ? score : '—'}</div>
        <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
          sur 100
        </div>
      </div>
    </div>
  )
}

// ─── Donut produits ─────────────────────────────────────────
function ProduitDonut({ data, size = 180 }) {
  const r = (size - 20) / 2
  const c = 2 * Math.PI * r
  let cumulative = 0
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
        {data.map((d, i) => {
          const dash = (d.value / 100) * c
          const offset = c - cumulative * (c / 100)
          cumulative += d.value
          return (
            <circle key={i}
              cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth="14"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          )
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>{data.length}</div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>branches</div>
      </div>
    </div>
  )
}

// ─── Mini KPI ───────────────────────────────────────────────
function MiniKpi({ icon: Icon, label, value, accent, delta }) {
  return (
    <div style={{
      flex: '1 1 180px',
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 12, padding: 14, backdropFilter: 'blur(12px)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.6,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={12} color={accent} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 10, fontWeight: 600, color: T.success, marginTop: 6 }}>{delta}</div>
      )}
    </div>
  )
}

const ALERT_STYLE = {
  danger:  { color: T.danger,  bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: AlertTriangle },
  warning: { color: T.warning, bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: AlertTriangle },
  info:    { color: T.blue,    bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', icon: Activity },
}

export default function SantePortefeuille() {
  const navigate = useNavigate()
  const [data, setData] = useState(VIDE)
  // Score renvoyé par /portfolio/health-score : il prime sur le calcul local.
  const scoreApi = useRef(null)

  useEffect(() => {
    let cancel = false
    api.get('/portfolio/health-score').then(res => {
      if (cancel) return
      const r = res?.data || {}
      const scoreRaw = r.score ?? r.health_score ?? null
      const score = typeof scoreRaw === 'number' ? scoreRaw : null
      if (score !== null) {
        scoreApi.current = Math.round(score)
        setData(prev => ({
          ...prev,
          score: scoreApi.current,
          totalClients: r.clients_count || prev.totalClients,
          totalContrats: r.contracts_count || prev.totalContrats,
        }))
      }
    }).catch(() => {})
    return () => { cancel = true }
  }, [])

  // Synthèse alimentée par les données réelles (contrats + clients).
  // Si la réponse est vide ou en erreur, l'écran reste en « — » : aucun chiffre
  // fabriqué ne prend le relais.
  useEffect(() => {
    let annule = false
    Promise.all([
      api.get('/contrats').catch(() => null),
      api.get('/clients').catch(() => null),
    ]).then(([resContrats, resClients]) => {
      if (annule) return
      const contrats = listeDe(resContrats?.data, ['contrats', 'contracts'])
      const clients = listeDe(resClients?.data, ['clients'])
      const synthese = calculerSynthese(contrats, clients)
      if (!synthese) return
      setData(prev => {
        const { scoreMoyenClients, ...valeurs } = synthese
        const suivant = { ...prev, ...valeurs }
        if (scoreApi.current === null && scoreMoyenClients !== undefined) {
          suivant.score = scoreMoyenClients
        }
        return suivant
      })
    }).catch(() => {})
    return () => { annule = true }
  }, [])

  const alertes = alertsPour(data)
  const recos = recosPour(data)
  const produits = data.produits || []

  const mesure = data.score !== null
  const scoreColor = !mesure ? T.textMuted
    : data.score >= 80 ? T.success : data.score >= 65 ? T.cyan : data.score >= 45 ? T.warning : T.danger
  const scoreLabel = !mesure ? 'Analyse en cours'
    : data.score >= 85 ? 'Excellent' : data.score >= 70 ? 'Bon' : data.score >= 50 ? 'À surveiller' : 'Critique'

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 24px 48px' }}>
      <VibeBackdrop intensity={0.75} />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        top: -200, left: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <VibeScrollSection parallax={12}>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
              ARK IA — Diagnostic
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em',
              color: T.text, margin: 0, lineHeight: 1.15,
            }}>
              Santé portefeuille
            </h1>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
              Vue d'ensemble du cabinet, alertes ARK et recommandations.
            </p>
          </div>
        </header>

        {/* HERO : Gauge + score + état */}
        <div style={{
          marginBottom: 18,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(255,255,255,0.02))',
          border: `1px solid rgba(139,92,246,0.18)`,
          borderRadius: 16, padding: 24,
          display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
          backdropFilter: 'blur(12px)',
        }}>
          <ScoreGauge score={data.score} color={scoreColor} size={200} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 36, color: scoreColor,
              letterSpacing: '-0.025em', marginBottom: 8,
            }}>{scoreLabel}</div>
            <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>
              {mesure ? (
                <>
                  Votre portefeuille est en <strong style={{ color: T.text }}>{scoreLabel.toLowerCase()}</strong>.
                  {data.totalClients} clients, {data.totalContrats} contrats, {fmtEur(data.primesAnnuelles)} de primes annuelles
                  {data.primeMoyenne !== null ? <> (prime moyenne {fmtEur(data.primeMoyenne)} par contrat)</> : null}.
                </>
              ) : (
                <>Analyse de vos dossiers en cours…</>
              )}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/morning-brief')} style={btnArk}>
                <Sparkles size={13} /> Voir le Morning Brief
              </button>
              <button onClick={() => navigate('/analytics')} style={btnGhost}>
                <Activity size={13} /> Analytics détaillé
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPIs — tous calculés sur les dossiers chargés */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <MiniKpi label="Prime moyenne"   value={data.primeMoyenne === null ? '—' : fmtEur(data.primeMoyenne)} accent={T.success} icon={TrendingUp} delta="par contrat" />
          <MiniKpi label="Rétention"       value={aff(data.retention, '%')}     accent={T.cyan}    icon={Heart}      delta="clients actifs" />
          <MiniKpi label="Diversification" value={aff(data.diversification, '%')} accent={T.ark}   icon={Target}     delta={produits.length ? `${produits.length} branches` : '—'} />
          <MiniKpi label="Churn"           value={aff(data.churn, '%')}         accent={T.warning} icon={TrendingDown} delta="contrats résiliés" />
        </div>

        {/* Row : Alertes + Recos ARK */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 12, marginBottom: 18,
        }}>
          <div style={{
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
            borderRadius: 12, padding: 16, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={14} color={T.warning} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Alertes actives</h3>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: T.warning }}>
                {alertes.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertes.map(a => {
                const st = ALERT_STYLE[a.level] || ALERT_STYLE.info
                return (
                  <div key={a.id} onClick={() => navigate(a.to)} style={{
                    padding: '11px 12px', borderRadius: 9,
                    background: st.bg, border: `1px solid ${st.border}`,
                    borderLeft: `3px solid ${st.color}`, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <st.icon size={14} color={st.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{a.desc}</div>
                    </div>
                    <ChevronRight size={13} color={T.textMuted} />
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(255,255,255,0.02))',
            border: `1px solid rgba(139,92,246,0.18)`,
            borderRadius: 12, padding: 16, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Sparkles size={14} color={T.ark} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Recommandations ARK</h3>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: T.arkBg, color: T.ark }}>
                {recos.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recos.map(r => (
                <div key={r.id} onClick={() => navigate(r.to)} style={{
                  padding: 12, borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.cardBorder}`, cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Zap size={12} color={T.ark} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>{r.desc}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: T.ark }}>
                    {r.cta} <ArrowRight size={11} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row : Donut produits + KPIs détaillés */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 12,
        }}>
          <div style={{
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
            borderRadius: 12, padding: 16, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Target size={14} color={T.cyan} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Répartition produits</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ProduitDonut data={produits} size={140} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {produits.length === 0 && (
                  <span style={{ fontSize: 11, color: T.textMuted }}>Aucun contrat chargé pour l'instant.</span>
                )}
                {produits.map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>{p.label}</span>
                    <span style={{ fontSize: 11, color: T.text, fontWeight: 700 }}>{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
            borderRadius: 12, padding: 16, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Activity size={14} color={T.blue} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Indicateurs détaillés</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DetailKpi icon={FileX}        label="Sans renouvellement" value={aff(data.sansRenouvellement)} accent={T.danger}  to="/contrats" navigate={navigate} />
              <DetailKpi icon={Phone}        label="Silencieux > 90 j"   value={aff(data.sansContact90j)}      accent={T.warning} to="/relances" navigate={navigate} />
              <DetailKpi icon={TrendingDown} label="Risque churn"        value={aff(data.churnRisk)}           accent={T.danger}  to="/clients?filter=a_risque" navigate={navigate} />
              <DetailKpi icon={Calendar}     label="Échéances < 30 j"    value={aff(data.echeancesProches)}    accent={T.warning} to="/contrats" navigate={navigate} />
              <DetailKpi icon={Users}        label="Clients actifs"      value={aff(data.totalClients)}        accent={T.success} to="/clients"  navigate={navigate} />
              <DetailKpi icon={Shield}       label="Contrats actifs"     value={aff(data.totalContrats)}       accent={T.cyan}    to="/contrats" navigate={navigate} />
            </div>
          </div>
        </div>
      </main>
      </VibeScrollSection>
    </div>
  )
}

function DetailKpi({ icon: Icon, label, value, accent, to, navigate }) {
  return (
    <div onClick={() => navigate(to)} style={{
      padding: 12, borderRadius: 10,
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${T.cardBorder}`,
      cursor: 'pointer', transition: 'background 0.15s',
      display: 'flex', alignItems: 'center', gap: 12,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${accent}15`, border: `1px solid ${accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} color={accent} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{label}</div>
      </div>
      <ChevronRight size={13} color={T.textMuted} />
    </div>
  )
}

const btnArk = {
  padding: '9px 14px', background: T.ark, color: '#fff', border: 'none',
  borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 4px 14px rgba(139,92,246,0.30)',
}

const btnGhost = {
  padding: '9px 14px', background: 'rgba(255,255,255,0.04)', color: T.text,
  border: `1px solid ${T.cardBorderLight}`, borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
}
