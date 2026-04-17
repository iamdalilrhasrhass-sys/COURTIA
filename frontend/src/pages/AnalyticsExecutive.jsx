import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingUp, Users, FileText, Heart, Lock, ChevronUp, ChevronDown, AlertTriangle, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react'
import api from '../api'
import PaywallModal from '../components/PaywallModal'
import LockedFeature from '../components/LockedFeature'
import PageTransition from '../components/ui/PageTransition'
import InteractiveBarChart from '../components/ui/InteractiveBarChart'
import PremiumTooltip from '../components/ui/PremiumTooltip'
import PremiumEmptyState from '../components/ui/PremiumEmptyState'

// ─── Shimmer skeleton ────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -400px 0 }
  100% { background-position:  400px 0 }
}
`
function Skeleton({ h = 20, w = '100%', r = 8 }) {
  return (
    <>
      <style>{shimmerKf}</style>
      <div style={{
        height: h, width: w, borderRadius: r,
        background: 'linear-gradient(90deg,#ede9e0 25%,#f5f2ec 50%,#ede9e0 75%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.4s ease infinite',
      }} />
    </>
  )
}

// ─── Count-up number animation ────────────────────────────────────────────────
function CountUp({ to, duration = 1.2, prefix = '', suffix = '', decimals = 0 }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, v =>
    `${prefix}${v.toFixed(decimals)}${suffix}`
  )
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(v))
    const ctrl = animate(mv, to, { duration, ease: 'easeOut' })
    return () => { ctrl.stop(); unsub() }
  }, [to]) // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{display}</span>
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconColor, label, value, prefix = '', suffix = '', decimals = 0, delta, loading, delay = 0 }) {
  const positive = delta >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '24px 20px',
        border: '1px solid #e8e6e0',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${iconColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={iconColor} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b6660', letterSpacing: '0.01em' }}>{label}</span>
      </div>

      {loading ? (
        <Skeleton h={36} w="60%" />
      ) : (
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1814', lineHeight: 1 }}>
          <CountUp to={Number(value) || 0} prefix={prefix} suffix={suffix} decimals={decimals} />
        </div>
      )}

      {!loading && delta != null && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          {positive ? (
            <ChevronUp size={14} color="#16a34a" />
          ) : (
            <ChevronDown size={14} color="#dc2626" />
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: positive ? '#16a34a' : '#dc2626' }}>
            {positive ? '+' : ''}{delta.toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, color: '#9b9690' }}>vs 30j précédents</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Bar chart data ───────────────────────────────────────────────────────────
const MOCK_BARS = [
  { label: 'Jan', value: 12 },
  { label: 'Fév', value: 18 },
  { label: 'Mar', value: 14 },
  { label: 'Avr', value: 22 },
  { label: 'Mai', value: 19 },
  { label: 'Jun', value: 27 },
  { label: 'Jul', value: 24 },
  { label: 'Aoû', value: 16 },
  { label: 'Sep', value: 31 },
  { label: 'Oct', value: 28 },
  { label: 'Nov', value: 35 },
  { label: 'Déc', value: 30 },
]

// ─── Insight IA card ──────────────────────────────────────────────────────────
const INSIGHTS = [
  { title: 'Pic de renouvellements', body: 'Septembre concentre 23 % des échéances annuelles. Anticipez vos relances dès mi-août.', color: '#2563eb' },
  { title: 'Segment en croissance', body: 'Les contrats Santé ont progressé de +18 % ce trimestre. Fort potentiel de cross-sell.', color: '#7c3aed' },
  { title: 'Taux de rétention', body: 'Votre taux de rétention est 4 points au-dessus de la moyenne nationale (87 % vs 83 %).', color: '#16a34a' },
]

function InsightCard({ insight, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: '#fff',
        border: '1px solid #e8e6e0',
        borderRadius: 14,
        padding: '18px 20px',
        borderLeft: `3px solid ${insight.color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Sparkles size={13} color={insight.color} />
        <span style={{ fontSize: 12, fontWeight: 700, color: insight.color, letterSpacing: '0.02em' }}>
          Insight IA
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1814', margin: '0 0 5px', lineHeight: 1.3 }}>
        {insight.title}
      </p>
      <p style={{ fontSize: 12, color: '#6b6660', margin: 0, lineHeight: 1.5 }}>
        {insight.body}
      </p>
    </motion.div>
  )
}

// ─── Lead Scoring mock ────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { name: 'Martin Dupont', score: 92, tags: ['Auto', 'MRH'] },
  { name: 'Sophie Bernard', score: 78, tags: ['Santé'] },
  { name: 'Lucas Moreau', score: 65, tags: ['Pro', 'RC'] },
  { name: 'Isabelle Petit', score: 55, tags: ['Vie'] },
]

function LeadScoreBar({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 3 }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30 }}>{score}</span>
    </div>
  )
}

// ─── Compliance Banner ────────────────────────────────────────────────────────
function ComplianceBanner({ data }) {
  const ok = data?.status === 'ok' || data?.compliant === true
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 12,
      background: ok ? '#f0fdf4' : '#fef9c3',
      border: `1px solid ${ok ? '#bbf7d0' : '#fef08a'}`,
    }}>
      {ok ? (
        <CheckCircle2 size={20} color="#16a34a" />
      ) : (
        <AlertTriangle size={20} color="#ca8a04" />
      )}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ok ? '#166534' : '#92400e' }}>
          {ok ? 'Conformité DDA : à jour' : 'Conformité DDA : points à vérifier'}
        </div>
        <div style={{ fontSize: 12, color: ok ? '#15803d' : '#a16207', marginTop: 2 }}>
          {data?.message || (ok ? 'Aucun manquement détecté sur les 30 derniers jours.' : 'Certaines formations ou documents sont à renouveler.')}
        </div>
      </div>
      <a
        href="/taches?filter=dda"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, color: ok ? '#15803d' : '#a16207',
          textDecoration: 'none', marginLeft: 'auto', flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Voir mon tableau <ExternalLink size={11} />
      </a>
    </div>
  )
}

// ─── Period selector ─────────────────────────────────────────────────────────
const PERIODS = [
  { key: '30j', label: '30 jours' },
  { key: '90j', label: '90 jours' },
  { key: '1an', label: '1 an' },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsExecutive() {
  const [period, setPeriod] = useState('30j')
  const [kpis, setKpis] = useState({})
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [errorKpis, setErrorKpis] = useState(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallError, setPaywallError] = useState(null)
  const [complianceData, setComplianceData] = useState(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  // Fetch executive KPIs
  useEffect(() => {
    setLoadingKpis(true)
    setErrorKpis(null)
    api.get(`/api/analytics/executive?period=${period}`)
      .then(res => {
        if (!aliveRef.current) return
        setKpis(res.data?.data || {})
      })
      .catch(err => {
        if (!aliveRef.current) return
        if (err.response?.status === 402) {
          setPaywallError(err.response.data)
          setPaywallOpen(true)
        } else {
          setErrorKpis('Impossible de charger les KPIs.')
        }
      })
      .finally(() => {
        if (aliveRef.current) setLoadingKpis(false)
      })
  }, [period])

  // Fetch compliance (best-effort, no paywall)
  useEffect(() => {
    api.get('/api/analytics/compliance')
      .then(res => {
        if (aliveRef.current) setComplianceData(res.data?.data || res.data || null)
      })
      .catch(() => {}) // silent
  }, [])

  const {
    ca_estimated = 0,
    clients_count = 0,
    contracts_count = 0,
    new_clients_30d = 0,
    new_contracts_30d = 0,
    portfolio_health_score = 0,
    growth_rate_30d = 0,
  } = kpis

  return (
    <PageTransition>
    <div style={{ padding: '32px 28px', maxWidth: 960, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #1e40af, #2563eb)',
          borderRadius: 20,
          padding: '28px 32px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <TrendingUp size={22} color="#93c5fd" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Analytics Executive
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              Vue d'ensemble de votre portefeuille
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#bfdbfe', fontWeight: 400 }}>
              Indicateurs clés et performance sur la période sélectionnée.
            </p>
          </div>

          {/* Period selector */}
          <div style={{
            display: 'flex', gap: 6,
            background: 'rgba(255,255,255,0.12)',
            padding: 4,
            borderRadius: 10,
          }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: period === p.key ? '#fff' : 'transparent',
                  color: period === p.key ? '#1e40af' : 'rgba(255,255,255,0.75)',
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── KPI error ── */}
      {errorKpis && !paywallOpen && (
        <div style={{ marginBottom: 20 }}>
          <PremiumEmptyState
            icon={TrendingUp}
            title="Vos analyses arrivent bientôt"
            description="Enrichissez votre portefeuille avec des clients et contrats pour débloquer vos KPIs."
            ctaLabel="Configurer mon espace"
            onCta={() => window.location.href = '/parametres'}
            variant="default"
          />
        </div>
      )}

      {/* ── KPI Grid (4 cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <KpiCard
          icon={TrendingUp}
          iconColor="#2563eb"
          label="CA estimé"
          value={ca_estimated}
          prefix=""
          suffix=" €"
          decimals={0}
          delta={growth_rate_30d != null ? Number(growth_rate_30d) : null}
          loading={loadingKpis}
          delay={0}
        />
        <KpiCard
          icon={Users}
          iconColor="#7c3aed"
          label="Clients actifs"
          value={clients_count}
          delta={new_clients_30d != null ? (clients_count > 0 ? (new_clients_30d / clients_count) * 100 : 0) : null}
          loading={loadingKpis}
          delay={0.07}
        />
        <KpiCard
          icon={FileText}
          iconColor="#0891b2"
          label="Contrats en cours"
          value={contracts_count}
          delta={new_contracts_30d != null ? (contracts_count > 0 ? (new_contracts_30d / contracts_count) * 100 : 0) : null}
          loading={loadingKpis}
          delay={0.14}
        />
        <KpiCard
          icon={Heart}
          iconColor="#16a34a"
          label="Santé portefeuille"
          value={portfolio_health_score}
          suffix="%"
          decimals={1}
          loading={loadingKpis}
          delay={0.21}
        />
      </div>

      {/* ── Bar Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 20px',
          border: '1px solid #e8e6e0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', margin: 0 }}>
              Évolution des nouveaux contrats
            </h2>
            <p style={{ fontSize: 12, color: '#9b9690', margin: '4px 0 0' }}>
              Sur les 12 derniers mois — le mois en cours est mis en avant
            </p>
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: '#2563eb',
            background: '#eff6ff', padding: '6px 14px', borderRadius: 8,
          }}>
            {loadingKpis ? '—' : new_contracts_30d} <span style={{ fontSize: 13, fontWeight: 600 }}>ce mois</span>
          </div>
        </div>
        <InteractiveBarChart
          data={MOCK_BARS}
          formatValue={v => `${v} contrats`}
          height={140}
        />
      </motion.div>

      {/* ── Insights IA ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={15} color="#2563eb" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', margin: 0 }}>
            Insights IA
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: '#eff6ff', color: '#2563eb',
            padding: '2px 8px', borderRadius: 20,
          }}>Pro</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {INSIGHTS.map((ins, i) => (
            <InsightCard key={i} insight={ins} delay={0.28 + i * 0.07} />
          ))}
        </div>
      </div>

      {/* ── Lead Scoring (LockedFeature) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.5 }}
        style={{ marginBottom: 28 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', margin: '0 0 14px' }}>
          Lead Scoring
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 700,
            background: '#eff6ff', color: '#2563eb',
            padding: '2px 8px', borderRadius: 20,
          }}>Pro</span>
        </h2>
        <LockedFeature feature="lead_scoring" requiredPlan="pro" label="Lead Scoring Pro">
          <div style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e8e6e0',
            overflow: 'hidden',
          }}>
            {MOCK_LEADS.map((lead, i) => {
              const scoreColor = lead.score >= 80 ? '#16a34a' : lead.score >= 60 ? '#ca8a04' : '#dc2626'
              const tooltipLabel = lead.score >= 80 ? 'Lead chaud — à contacter en priorité' : lead.score >= 60 ? 'Lead tiède — opportunité à suivre' : 'Lead froid — à requalifier'
              return (
                <motion.div
                  key={lead.name}
                  whileHover={{ backgroundColor: '#fafaf8' }}
                  transition={{ duration: 0.12 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: i < MOCK_LEADS.length - 1 ? '1px solid #f5f2ec' : 'none',
                    cursor: 'default',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#1e40af',
                  }}>
                    {lead.name.charAt(0)}
                  </div>

                  {/* Name + tags */}
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>{lead.name}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                      {lead.tags.map(t => (
                        <span key={t} style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '1px 6px', borderRadius: 4,
                          background: '#f0ede8', color: '#6b6660',
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Score bar + tooltip */}
                  <PremiumTooltip content={`${tooltipLabel} (score : ${lead.score}/100)`} position="top">
                    <div style={{ flex: 1 }}>
                      <LeadScoreBar score={lead.score} />
                    </div>
                  </PremiumTooltip>
                </motion.div>
              )
            })}
          </div>
        </LockedFeature>
      </motion.div>

      {/* ── Compliance Banner (LockedFeature) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.5 }}
        style={{ marginBottom: 12 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', margin: '0 0 14px' }}>
          Tableau de bord conformité
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 700,
            background: '#f5f3ff', color: '#7c3aed',
            padding: '2px 8px', borderRadius: 20,
          }}>Elite</span>
        </h2>
        <LockedFeature feature="compliance_dashboard" requiredPlan="elite" label="Conformité Elite">
          <ComplianceBanner data={complianceData} />
        </LockedFeature>
      </motion.div>

      {/* ── Paywall Modal ── */}
      <PaywallModal
        open={paywallOpen}
        error={paywallError}
        onClose={() => setPaywallOpen(false)}
        onUpgrade={(plan) => { window.location.href = `/billing?plan=${plan}` }}
      />
    </div>
    </PageTransition>
  )
}
