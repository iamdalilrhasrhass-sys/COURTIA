import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingUp, Users, FileText, Percent, Star, CheckSquare } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

// ─── Responsive revenue chart ────────────────────────────────────────────────
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
  return (
    <>
      <style>{`
        .ae-chart-card {
          min-width: 0;
        }
        .ae-title {
          color: #f8fafc !important;
        }
        .ae-page-subtitle {
          color: rgba(226, 232, 240, 0.68) !important;
        }
        #root .ae-card-title {
          color: #0f172a !important;
        }
        .ae-chart-shell {
          width: 100%;
          min-width: 0;
          height: clamp(var(--ae-chart-height, 240px), 27vw, 320px);
        }
        .ae-chart-shell .recharts-wrapper,
        .ae-chart-shell .recharts-surface {
          overflow: visible;
        }
        @media (max-width: 767px) {
          .ae-container { padding: 24px 16px !important; }
          .ae-bottom-grid { grid-template-columns: 1fr !important; }
          .ae-title { font-size: 22px !important; }
          .ae-heatmap { gap: 2px !important; }
          .ae-chart-shell { height: 260px; }
          .ae-chart-heading { align-items: flex-start !important; gap: 10px; }
          .ae-chart-heading > :last-child { flex-shrink: 0; }
        }
      `}</style>
      <div
        className="ae-chart-shell"
        style={{ '--ae-chart-height': `${height}px` }}
        role="img"
        aria-label="Évolution du chiffre d’affaires mensuel de janvier à décembre"
      >
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="revenue-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.09)" strokeDasharray="4 6" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
              tick={{ fill: 'rgba(15,23,42,0.52)', fontSize: 11, fontWeight: 600 }}
              dy={9}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={58}
              domain={[(min) => Math.floor(min * 0.95), (max) => Math.ceil(max * 1.03)]}
              tickFormatter={(value) => `${Math.round(value / 1000)} k€`}
              tick={{ fill: 'rgba(15,23,42,0.48)', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(37,99,235,0.24)', strokeWidth: 1 }}
              formatter={(value) => [new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value), 'Chiffre d’affaires']}
              contentStyle={{ border: '1px solid rgba(15,23,42,0.10)', borderRadius: 12, background: 'rgba(255,255,255,0.96)', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', color: '#0f172a' }}
              labelStyle={{ color: '#475569', fontWeight: 700, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              fill="url(#revenue-area-gradient)"
              dot={{ r: 3.5, fill: '#fff', stroke: color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 3 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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

const HEATMAP_OPACITY = Array.from({ length: 35 }, (_, index) => 0.06 + ((index * 17) % 20) / 100)

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

  const activeClients = stats?.clientsParStatut?.actif || 0
  const prospects = stats?.clientsParStatut?.prospect || 0
  const _conversionRate = (activeClients + prospects > 0)
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
          <p className="ae-page-subtitle" style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
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
          <BubbleCard className="ae-chart-card" hover={false} padding={24}>
            <div className="ae-chart-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="ae-card-title" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0 }}>
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
              <h3 className="ae-card-title" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 18 }}>
                Répartition par type de produit
              </h3>
              <ProductBars data={PRODUCT_DATA} />
            </BubbleCard>

            {/* Heatmap placeholder */}
            <BubbleCard hover={false} padding={24}>
              <h3 className="ae-card-title" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0, marginBottom: 18 }}>
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
                {HEATMAP_OPACITY.map((opacity, i) => {
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

      </div>
    </div>
  )
}
