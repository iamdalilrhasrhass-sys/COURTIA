import { useState, useEffect, useMemo } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { TrendingUp, Users, FileText, Percent, Star, CheckSquare } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'
import { fmtMontant, fmtNombre } from '../lib/monnaie'

// ─── Animated Number ──────────────────────────────────────────────────────────
/** Formatage d'une valeur mesurée. Une valeur absente reste « — ». */
function formatValeur(v, format) {
  if (!Number.isFinite(v)) return '—'
  // Devise du cabinet : CHF en Suisse, EUR sinon.
  if (format === 'currency') return fmtMontant(v, { maximumFractionDigits: 0 })
  if (format === 'percent') return `${v.toFixed(1)}%`
  return fmtNombre(Math.round(v))
}

function AnimatedNumber({ value, format = 'number' }) {
  // POURQUOI CE GARDE-FOU (cause racine de l'écran /analytics qui tuait le
  // cockpit) : framer-motion `animate(motionValue, keyframes, …)` lit
  // `keyframes.default` sans vérifier que les keyframes existent. Appelé avec
  // `value === null` — le cas NORMAL d'un indicateur non mesuré — il lève
  // « Cannot read properties of null (reading 'default') » pendant le rendu.
  // Aucune frontière d'erreur n'entoure les routes privées : React démontait
  // alors TOUT l'arbre, la sidebar disparaissait et l'écran de secours
  // « Le cockpit n'a pas pu se charger » remplaçait l'application.
  // Une valeur absente n'est donc ni animée ni calculée : elle s'affiche « — ».
  const mesurable = typeof value === 'number' && Number.isFinite(value)
  const motionValue = useMotionValue(0)
  // La valeur RESTE affichée telle qu'elle est mesurée : l'animation ne fait que
  // l'habiller. On n'attend donc jamais qu'un abonnement à une valeur dérivée se
  // déclenche pour afficher le chiffre (sans cela, un indicateur mesuré pouvait
  // rester bloqué sur « — », c'est-à-dire annoncé comme non mesuré).
  const [displayValue, setDisplayValue] = useState(() => (mesurable ? formatValeur(value, format) : '—'))

  useEffect(() => {
    if (!mesurable) {
      // Rien à animer : on affiche l'état honnête, et on n'appelle PAS animate().
      setDisplayValue('—')
      return undefined
    }
    setDisplayValue(formatValeur(value, format))
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(formatValeur(v, format)),
    })
    return () => controls.stop()
  }, [mesurable, value, format, motionValue])

  return <span>{displayValue}</span>
}

// ─── KPI Bubble Card ─────────────────────────────────────────────────────────
function KPICard({ icon: Icon, title, value, format = 'number', loading, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      <BubbleCard hover padding={22}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.5)', margin: 0, lineHeight: 1.3 }}>
            {title}
          </p>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--r-md, 12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${color}12`,
              color: color,
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
        </div>
        {loading ? (
          <div style={{ height: 32, width: '70%', background: 'rgba(0,0,0,0.04)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <p style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#0a0a0a',
            margin: 0,
            fontFamily: 'var(--c-font-body, Inter, sans-serif)',
            letterSpacing: '-0.02em',
          }}>
            <AnimatedNumber value={value} format={format} />
          </p>
        )}
      </BubbleCard>
    </motion.div>
  )
}

// ─── Mini SVG Line Chart ─────────────────────────────────────────────────────
// Plus AUCUNE série posée en dur : la courbe ne reçoit que la série réellement
// mesurée (`revenus6Mois` de GET /api/dashboard/stats). L'ancienne constante
// MONTHLY_DATA (98 000 → 142 000 de CA) servait de valeur par défaut et
// affichait donc un chiffre d'affaires inventé dès qu'aucune donnée n'arrivait.
function MiniLineChart({ data = [], color = '#2563eb', height = 180 }) {
  const width = 100
  const padding = { top: 10, right: 8, bottom: 24, left: 8 }
  const chartW = width
  const chartH = height

  const values = data.map((d) => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const xScale = (i) => padding.left + (i / (data.length - 1)) * (chartW - padding.left - padding.right)
  const yScale = (v) => padding.top + (1 - (v - min) / range) * (chartH - padding.top - padding.bottom)

  const _points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ')

  const pathD = data.reduce((acc, d, i) => {
    const x = xScale(i)
    const y = yScale(d.value)
    if (i === 0) return `M ${x} ${y}`
    const prevX = xScale(i - 1)
    const prevY = yScale(data[i - 1].value)
    const cpx1 = (prevX + x) / 2
    return `${acc} C ${cpx1} ${prevY}, ${cpx1} ${y}, ${x} ${y}`
  }, '')

  const areaD = `${pathD} L ${xScale(data.length - 1)} ${chartH - padding.bottom} L ${xScale(0)} ${chartH - padding.bottom} Z`

  return (
    <>
      <style>{`
        .mini-chart-svg {
          max-height: 320px;
          width: 100%;
          height: auto;
          display: block;
        }
        @media (max-width: 767px) {
          .mini-chart-svg {
            max-height: 260px;
          }
          .ae-container { padding: 24px 16px !important; }
          .ae-bottom-grid { grid-template-columns: 1fr !important; }
          .ae-title { font-size: 22px !important; }
          .ae-heatmap { gap: 2px !important; }
        }
      `}</style>
      <svg className="mini-chart-svg" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          x2={chartW - padding.right}
          y1={yScale(min + range * pct)}
          y2={yScale(min + range * pct)}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="0.3"
        />
      ))}
      {/* Area fill */}
      <path d={areaD} fill={`${color}10`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="2" fill={color} stroke="white" strokeWidth="1" />
      ))}
      {/* Month labels */}
      {data.filter((_, i) => i % 2 === 0).map((d, i) => {
        const idx = i * 2
        return (
          <text
            key={idx}
            x={xScale(idx)}
            y={chartH - 4}
            textAnchor="middle"
            fill="rgba(0,0,0,0.35)"
            fontSize="4"
            fontWeight="500"
            fontFamily="var(--c-font-body, Inter, sans-serif)"
          >
            {d.month}
          </text>
        )
      })}
      </svg>
    </>
  )
}

// ─── Product Repartition Bars ─────────────────────────────────────────────────
// Libellés lisibles des types réellement renvoyés par l'API (min. en base).
const LIBELLES_PRODUIT = {
  auto: 'Auto',
  habitation: 'Habitation',
  mrh: 'Habitation',
  sante: 'Santé',
  prévoyance: 'Prévoyance',
  prevoyance: 'Prévoyance',
  rc_pro: 'RC Pro',
  flotte: 'Flotte auto',
  cyber: 'Cyber',
  pj: 'Protection juridique',
  decennale: 'Décennale',
  vie: 'Vie',
  autre: 'Autre',
}
// Palette du design system COURTIA (mêmes teintes que les KPI de l'écran).
const COULEURS_PRODUIT = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#64748b']

function libelleProduit(type) {
  const cle = String(type || '').trim().toLowerCase()
  if (LIBELLES_PRODUIT[cle]) return LIBELLES_PRODUIT[cle]
  return cle ? cle.charAt(0).toUpperCase() + cle.slice(1) : 'Type non renseigné'
}

function ProductBars({ data = [] }) {
  const maxVal = Math.max(...data.map((d) => d.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.65)' }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a' }}>{item.value}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 9999, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxVal) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 9999,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Message unique des sections que le produit ne mesure pas encore. */
function NonMesure({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <BubbleBadge color="#94a3b8" size="sm">non mesuré</BubbleBadge>
      <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: 0 }}>{children}</p>
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function AnalyticsExecutive() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const { data } = await api.get('/dashboard/stats')
        setStats(data)
      } catch (err) {
        console.error('Impossible de charger les statistiques:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Série de CA réellement mesurée (revenus6Mois renvoyé par /api/dashboard/stats).
  const serieCa = Array.isArray(stats?.revenus6Mois)
    ? stats.revenus6Mois.map((r) => ({ month: r.mois, value: Number(r.revenue) || 0 }))
    : []

  // Répartition par type de produit — CALCULÉE à partir des contrats réellement
  // enregistrés (`typesContrats` de /api/dashboard/stats). L'ancien écran posait
  // Auto 42 % / Habitation 28 % / Santé 18 % / Prévoyance 12 % EN DUR, pour
  // n'importe quel cabinet — y compris un cabinet vide — sur une page qui
  // affirme ne montrer que des mesures réelles.
  const repartitionProduits = useMemo(() => {
    const lignes = Array.isArray(stats?.typesContrats) ? stats.typesContrats : []
    const total = lignes.reduce((somme, l) => somme + (Number(l?.count) || 0), 0)
    if (!total) return []
    return lignes
      .map((l) => ({ type: l?.type, count: Number(l?.count) || 0 }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((l, i) => ({
        label: libelleProduit(l.type),
        value: Math.round((l.count / total) * 1000) / 10, // 1 décimale, en %
        color: COULEURS_PRODUIT[i % COULEURS_PRODUIT.length],
      }))
  }, [stats])

  const activeClients = stats?.clientsParStatut?.actif || 0
  const prospects = stats?.clientsParStatut?.prospect || 0
  const _conversionRate = (activeClients + prospects > 0)
    ? (activeClients / (activeClients + prospects)) * 100
    : 0

  // KPI — uniquement des mesures réelles (POST /api/dashboard/stats le jour où
  // l'indicateur est calculé). Les indicateurs que le produit ne mesure pas
  // encore s'affichent « — » : avant ce correctif, la page annonçait un CA de
  // 142 000 de CA, un taux de résiliation de 3,2 % et 24 tâches/semaine EN DUR, pour
  // n'importe quel cabinet, même totalement vide.
  const kpis = [
    { title: 'Taux résiliation', value: null, format: 'vide', icon: Percent, color: '#dc2626' },
    { title: 'Score de satisfaction', value: null, format: 'vide', icon: Star, color: '#f59e0b' },
    { title: 'Primes annuelles suivies', value: stats?.primeTotale ?? null, format: 'currency', icon: TrendingUp, color: '#10b981' },
    { title: 'Taux de conversion', value: stats?.tauxConversion ?? null, format: 'percent', icon: Users, color: '#2563eb' },
    { title: 'Contrats actifs', value: stats?.contratsActifs ?? null, format: 'number', icon: FileText, color: '#7c3aed' },
    { title: 'Clients au portefeuille', value: stats?.totalClients ?? null, format: 'number', icon: CheckSquare, color: '#ec4899' },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BubbleBackground intensity="normal" />

      <div className="ae-container" style={{ position: 'relative', zIndex: 1, padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <h1 className="ae-title" style={{ fontFamily: 'var(--c-font-display, Inter, sans-serif)', fontWeight: 700, fontSize: 28, color: 'var(--c-text-primary, #f4f6ff)', margin: 0 }}>
            Analyses dirigeants
          </h1>
          <p style={{ fontSize: 13, color: 'var(--c-text-secondary, rgba(244,246,255,0.72))', marginTop: 4 }}>
            Vue d'ensemble et indicateurs clés de votre portefeuille.
          </p>
        </motion.div>

        {/* 6 KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {kpis.map((kpi, i) => (
            <KPICard
              key={kpi.title}
              icon={kpi.icon}
              title={kpi.title}
              value={kpi.value}
              format={kpi.format}
              loading={false}
              color={kpi.color}
              index={i}
            />
          ))}
        </div>

        {/* Chart + bottom sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Monthly evolution chart */}
          <BubbleCard hover={false} padding={24}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--c-font-display, Inter, sans-serif)', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0 }}>
                Évolution mensuelle du CA
              </h3>
              {serieCa.length > 1
                ? <BubbleBadge color="#2563eb" size="sm">{serieCa.length} mois mesurés</BubbleBadge>
                : <BubbleBadge color="#94a3b8" size="sm">non mesuré</BubbleBadge>}
            </div>
            {serieCa.length > 1
              ? <MiniLineChart data={serieCa} color="#2563eb" height={200} />
              : <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: 0 }}>
                  Pas encore d'historique de primes : la courbe s'affichera dès que des contrats
                  seront enregistrés sur plusieurs mois. Aucune courbe d'exemple n'est affichée.
                </p>}
          </BubbleCard>

          {/* 2-column bottom section */}
          <div className="ae-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Product repartition — mesurée, ou déclarée non mesurée */}
            <BubbleCard hover={false} padding={24}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'var(--c-font-display, Inter, sans-serif)', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0 }}>
                  Répartition par type de produit
                </h3>
                {repartitionProduits.length > 0 && (
                  <BubbleBadge color="#2563eb" size="sm">
                    {repartitionProduits.reduce((s, p) => s + p.value, 0).toFixed(0)} % mesurés
                  </BubbleBadge>
                )}
              </div>
              {repartitionProduits.length > 0 ? (
                <ProductBars data={repartitionProduits} />
              ) : (
                <NonMesure>
                  Aucun contrat enregistré pour ce cabinet : il n'y a donc aucune répartition à
                  afficher. Aucune répartition d'exemple n'est présentée.
                </NonMesure>
              )}
            </BubbleCard>

            {/* Activité hebdomadaire — aucune source de mesure : on le dit */}
            <BubbleCard hover={false} padding={24}>
              <h3 style={{ fontFamily: 'var(--c-font-display, Inter, sans-serif)', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 18 }}>
                Activité hebdomadaire
              </h3>
              {/* L'ancien écran dessinait ici une grille de 35 cases colorées par
                  Math.random() : le motif changeait à CHAQUE rendu et se présentait
                  comme l'activité du cabinet. Aucune mesure d'activité par jour de
                  semaine n'existe côté API : la case est donc vide et l'écran le dit. */}
              <NonMesure>
                L'activité par jour de la semaine n'est pas mesurée par COURTIA : aucune carte
                de chaleur n'est affichée tant que la mesure n'existe pas.
              </NonMesure>
            </BubbleCard>
          </div>
        </div>

        {/* Fallback if no data */}
        {!loading && !stats && (
          <BubbleCard hover={false} padding={40} style={{ marginTop: 24, textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--c-font-display, Inter, sans-serif)', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 8 }}>
              Données non disponibles
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', margin: 0 }}>
              Nous ne pouvons pas afficher les analyses pour le moment. Veuillez réessayer plus tard ou contacter le support.
            </p>
          </BubbleCard>
        )}

      </div>
    </div>
  )
}
