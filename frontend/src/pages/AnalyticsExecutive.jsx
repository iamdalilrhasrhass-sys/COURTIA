import { useState, useEffect, useMemo } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingUp, Users, FileText, Percent, Star, CheckSquare } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, format = 'number' }) {
  const motionValue = useMotionValue(0)
  const transform = useTransform(motionValue, (v) => {
    if (format === 'currency') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    if (format === 'percent') return `${v.toFixed(1)}%`
    return Math.round(v).toLocaleString('fr-FR')
  })
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
    const unsubscribe = transform.onChange(setDisplayValue)
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, format, motionValue, transform])

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
            fontFamily: 'Arial, sans-serif',
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
const MONTHLY_DATA = [
  { month: 'Jan', value: 98000 },
  { month: 'Fév', value: 105000 },
  { month: 'Mar', value: 112000 },
  { month: 'Avr', value: 108000 },
  { month: 'Mai', value: 125000 },
  { month: 'Jun', value: 132000 },
  { month: 'Jul', value: 128000 },
  { month: 'Aoû', value: 140000 },
  { month: 'Sep', value: 135000 },
  { month: 'Oct', value: 142000 },
  { month: 'Nov', value: 138000 },
  { month: 'Déc', value: 142000 },
]

function MiniLineChart({ data = MONTHLY_DATA, color = '#2563eb', height = 180 }) {
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

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ')

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
            fontFamily="Arial, sans-serif"
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
const PRODUCT_DATA = [
  { label: 'Auto', value: 42, color: '#2563eb' },
  { label: 'Habitation', value: 28, color: '#7c3aed' },
  { label: 'Santé', value: 18, color: '#10b981' },
  { label: 'Prévoyance', value: 12, color: '#f59e0b' },
]

function ProductBars({ data = PRODUCT_DATA }) {
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

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function AnalyticsExecutive() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const { data } = await api.get('/api/dashboard/stats')
        setStats(data)
      } catch (err) {
        console.error('Impossible de charger les statistiques:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const activeClients = stats?.clientsParStatut?.actif || 0
  const prospects = stats?.clientsParStatut?.prospect || 0
  const conversionRate = (activeClients + prospects > 0)
    ? (activeClients / (activeClients + prospects)) * 100
    : 0

  // KPI config — 6 cards
  const kpis = [
    { title: 'Taux résiliation', value: 3.2, format: 'percent', icon: Percent, color: '#dc2626' },
    { title: 'Score de satisfaction', value: 72, format: 'number', icon: Star, color: '#f59e0b' },
    { title: 'CA Cumul annuel', value: 142000, format: 'currency', icon: TrendingUp, color: '#10b981' },
    { title: 'Nouveaux clients/mois', value: 5.3, format: 'percent', icon: Users, color: '#2563eb' },
    { title: 'Contrats vendus/mois', value: 11, format: 'number', icon: FileText, color: '#7c3aed' },
    { title: 'Tâches complétées/sem', value: 24, format: 'number', icon: CheckSquare, color: '#ec4899' },
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
          <h1 className="ae-title" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 28, color: '#0a0a0a', margin: 0 }}>
            Analyses dirigeants
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
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
              <h3 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0 }}>
                Évolution mensuelle du CA
              </h3>
              <BubbleBadge color="#2563eb" size="sm">Cumul annuel +14%</BubbleBadge>
            </div>
            <MiniLineChart data={MONTHLY_DATA} color="#2563eb" height={200} />
          </BubbleCard>

          {/* 2-column bottom section */}
          <div className="ae-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Product repartition */}
            <BubbleCard hover={false} padding={24}>
              <h3 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 18 }}>
                Répartition par type de produit
              </h3>
              <ProductBars data={PRODUCT_DATA} />
            </BubbleCard>

            {/* Heatmap placeholder */}
            <BubbleCard hover={false} padding={24}>
              <h3 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 18 }}>
                Activité hebdomadaire
              </h3>
              <div
                className="ae-heatmap"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  aspectRatio: '7 / 5',
                }}
              >
                {Array.from({ length: 35 }).map((_, i) => {
                  const intensity = Math.random()
                  const opacity = 0.04 + intensity * 0.18
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: 'var(--r-sm, 8px)',
                        background: `rgba(37,99,235,${opacity})`,
                        border: '0.5px solid rgba(0,0,0,0.04)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                    />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>
                <span>Lun</span>
                <span>Mar</span>
                <span>Mer</span>
                <span>Jeu</span>
                <span>Ven</span>
                <span>Sam</span>
                <span>Dim</span>
              </div>
            </BubbleCard>
          </div>
        </div>

        {/* Fallback if no data */}
        {!loading && !stats && (
          <BubbleCard hover={false} padding={40} style={{ marginTop: 24, textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 8 }}>
              Données non disponibles
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', margin: 0 }}>
              Nous ne pouvons pas afficher les analyses pour le moment. Veuillez réessayer plus tard ou contacter le support.
            </p>
          </BubbleCard>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)' }}>Rhasrhass®</p>
        </div>
      </div>
    </div>
  )
}
