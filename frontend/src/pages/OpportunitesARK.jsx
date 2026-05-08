import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, TrendingUp, AlertTriangle, Clock, Package, Shield,
  FileWarning, RefreshCw, Users, Euro, Sparkles, ArrowRight,
  Filter, Phone, Mail, ChevronRight, UserCheck
} from 'lucide-react'
import api from '../api'
import PageTransition from '../components/ui/PageTransition'
import LockedFeatureCTA from '../components/LockedFeatureCTA'

// ─── Theme ────────────────────────────────────────────────────────────────
const theme = {
  bg: '#080808',
  card: '#0e0e0e',
  cardHover: '#141414',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  accent: '#5B4DF5',
  accentBg: 'rgba(91, 77, 245, 0.10)',
  green: '#10b981',
  greenBg: 'rgba(16, 185, 129, 0.10)',
  orange: '#f59e0b',
  orangeBg: 'rgba(245, 158, 11, 0.10)',
  red: '#ef4444',
  redBg: 'rgba(239, 68, 68, 0.10)',
  cyan: '#06b6d4',
  cyanBg: 'rgba(6, 182, 212, 0.10)',
  pink: '#ec4899',
  pinkBg: 'rgba(236, 72, 153, 0.10)',
}

// ─── Type config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  relance:         { label: 'Relance',   icon: RefreshCw,   color: theme.orange,  bg: theme.orangeBg },
  echeance:        { label: 'Échéance',  icon: Clock,       color: theme.cyan,   bg: theme.cyanBg },
  'multi-equipement': { label: 'Multi-équipement', icon: Package, color: theme.green,  bg: theme.greenBg },
  risque:          { label: 'Risque',    icon: AlertTriangle, color: theme.red,   bg: theme.redBg },
  'dossier-incomplet': { label: 'Dossier', icon: FileWarning, color: theme.pink,  bg: theme.pinkBg },
  exclusivite:     { label: 'Exclusivité', icon: Shield,    color: theme.accent, bg: theme.accentBg },
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const fmtNum = (v) => Number(v || 0).toLocaleString('fr-FR')

// ─── Circular Score Gauge ────────────────────────────────────────────────
function ScoreGauge({ score, size = 56 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? theme.red : score >= 40 ? theme.orange : theme.green

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size > 48 ? 14 : 11, fontWeight: 800,
        color: theme.text, fontFamily: "'Inter', sans-serif",
      }}>
        {score}
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
      padding: 20, animation: 'pulse 2s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 6 }} />
          <div style={{ width: '40%', height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
        </div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div style={{ width: '90%', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
      <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.03)', marginBottom: 14 }} />
      <div style={{ width: '40%', height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  const msg = filter === 'tous'
    ? { title: 'Aucune opportunité détectée', desc: 'Votre portefeuille est bien équilibré. Revenez plus tard pour de nouvelles analyses.' }
    : { title: `Aucune opportunité « ${TYPE_CONFIG[filter]?.label || filter} »`, desc: 'Aucune correspondance pour ce filtre.' }
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: theme.border, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <Sparkles size={28} color={theme.textMuted} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: '0 0 6px' }}>{msg.title}</p>
      <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>{msg.desc}</p>
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: theme.redBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <AlertTriangle size={28} color={theme.red} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: '0 0 6px' }}>Erreur de chargement</p>
      <p style={{ fontSize: 13, color: theme.textMuted, margin: '0 0 20px' }}>{error}</p>
      <button onClick={onRetry} style={{
        padding: '10px 24px', borderRadius: 10, border: 'none',
        background: theme.accent, color: '#fff', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'opacity 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Réessayer
      </button>
    </div>
  )
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────
function FilterTabs({ active, onChange, counts }) {
  const tabs = [
    { key: 'tous', label: 'Tous', icon: Filter },
    { key: 'relance', label: 'Relance', icon: RefreshCw },
    { key: 'echeance', label: 'Échéance', icon: Clock },
    { key: 'multi-equipement', label: 'Multi-équip.', icon: Package },
    { key: 'risque', label: 'Risque', icon: AlertTriangle },
    { key: 'dossier-incomplet', label: 'Dossier', icon: FileWarning },
    { key: 'exclusivite', label: 'Exclusivité', icon: Shield },
  ]

  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
      scrollbarWidth: 'none', msOverflowStyle: 'none',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.key
        const TabIcon = tab.icon
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, border: 'none',
            fontSize: 12, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap',
            color: isActive ? '#fff' : theme.textMuted,
            background: isActive ? theme.accent : theme.card,
            border: `1px solid ${isActive ? theme.accent : theme.border}`,
            cursor: 'pointer', transition: 'all 0.15s ease',
            flexShrink: 0,
          }}>
            <TabIcon size={14} />
            <span>{tab.label}</span>
            {counts[tab.key] > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '0 6px', borderRadius: 6,
                background: isActive ? 'rgba(255,255,255,0.2)' : theme.border,
                color: isActive ? '#fff' : theme.textMuted,
              }}>{counts[tab.key]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, title, value, format, accent, loading }) {
  const display = format === 'currency' ? fmtEur(value) : format === 'number' ? fmtNum(value) : value
  return (
    <div style={{
      flex: 1, minWidth: 140, background: theme.card, borderRadius: 14,
      border: `1px solid ${theme.border}`, padding: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </p>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${accent}15`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      {loading ? (
        <div style={{ height: 28, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s ease-in-out infinite' }} />
      ) : (
        <p style={{ fontSize: 24, fontWeight: 800, color: theme.text, margin: 0, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
          {display}
        </p>
      )}
    </div>
  )
}

// ─── Opportunity Card ─────────────────────────────────────────────────────
function OpportunityCard({ opportunity, index, onAct }) {
  const config = TYPE_CONFIG[opportunity.type] || { label: opportunity.type, icon: Zap, color: theme.accent, bg: theme.accentBg }
  const TypeIcon = config.icon

  const priorityColor = opportunity.priority === 'haute' ? theme.red
    : opportunity.priority === 'moyenne' ? theme.orange
    : theme.textMuted

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: 'easeOut' }}
      style={{
        background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
        padding: 18, transition: 'all 0.2s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = theme.cardHover; e.currentTarget.style.borderColor = theme.borderLight }}
      onMouseLeave={e => { e.currentTarget.style.background = theme.card; e.currentTarget.style.borderColor = theme.border }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Type badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: config.bg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <TypeIcon size={18} color={config.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: config.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {config.label}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
              background: `${priorityColor}15`, color: priorityColor,
              textTransform: 'capitalize',
            }}>
              {opportunity.priority}
            </span>
          </div>

          {/* Client name */}
          <p style={{ fontSize: 14, fontWeight: 600, color: theme.text, margin: '0 0 3px' }}>
            {opportunity.clientName}
          </p>

          {/* Description */}
          <p style={{ fontSize: 12, color: theme.textDim, margin: '0 0 12px', lineHeight: 1.4 }}>
            {opportunity.description}
          </p>

          {/* Scores row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ScoreGauge score={opportunity.score} size={44} />
              <button
                onClick={() => onAct(opportunity)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  fontSize: 11, fontWeight: 600,
                  background: theme.accentBg, color: theme.accent,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = theme.accentBg; e.currentTarget.style.color = theme.accent }}
              >
                <UserCheck size={13} />
                Agir
              </button>
            </div>

            {opportunity.contractDetails && opportunity.contractDetails.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 10, color: theme.textMuted }}>
                <span>{opportunity.contractDetails.length} contrat(s)</span>
                <br />
                <span style={{ color: theme.accent, fontWeight: 600 }}>
                  {fmtEur(opportunity.contractDetails.reduce((s, c) => s + (c.prime || 0), 0))}
                </span>
              </div>
            )}
          </div>

          {/* Suggested action */}
          <div style={{
            marginTop: 12, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ArrowRight size={12} color={theme.textMuted} />
            <span style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.3 }}>
              {opportunity.action}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function OpportunitesARK() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('tous')

  const loadOpportunities = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/ark/opportunities')
      setData(res.data)
    } catch (err) {
      console.error('ARK Opportunités load error:', err.message)
      setError(err.response?.data?.error || err.message || 'Impossible de charger les opportunités')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOpportunities() }, [])

  // Counts per type (for filter tabs)
  const counts = useMemo(() => {
    if (!data?.opportunities) return { tous: 0 }
    const c = { tous: data.opportunities.length }
    for (const opp of data.opportunities) {
      c[opp.type] = (c[opp.type] || 0) + 1
    }
    return c
  }, [data])

  // Filtered opportunities
  const filteredOpps = useMemo(() => {
    if (!data?.opportunities) return []
    if (filter === 'tous') return data.opportunities
    return data.opportunities.filter(o => o.type === filter)
  }, [data, filter])

  const handleAct = (opportunity) => {
    navigate(`/client/${opportunity.clientId}`)
  }

  return (
    <PageTransition>
      <LockedFeatureCTA feature="ark_premium" title="Opportunités ARK" description="Détection intelligente des opportunités commerciales, scoring de potentiel et recommandations actionnables.">
      <div style={{
        minHeight: '100vh', background: theme.bg, color: theme.text,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.accent} 0%, #7c3aed 60%, #a78bfa 100%)`,
          borderBottom: '0.5px solid rgba(255,255,255,0.15)',
          padding: '28px 32px',
        }}>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={18} color="#fff" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>ARK Opportunités</h1>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 46px' }}>
              Analyse intelligente de votre portefeuille
            </p>
          </motion.div>
        </div>

        <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
          {/* Stats cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard
              icon={Zap}
              title="Opportunités"
              value={data?.stats?.total || 0}
              format="number"
              accent={theme.accent}
              loading={loading}
            />
            <StatCard
              icon={AlertTriangle}
              title="Haute priorité"
              value={data?.stats?.highPriority || 0}
              format="number"
              accent={theme.red}
              loading={loading}
            />
            <StatCard
              icon={Euro}
              title="Revenu potentiel"
              value={data?.stats?.potentialRevenue || 0}
              format="currency"
              accent={theme.green}
              loading={loading}
            />
          </div>

          {/* Filter tabs */}
          {!loading && !error && data?.opportunities?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <FilterTabs active={filter} onChange={setFilter} counts={counts} />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={loadOpportunities} />
          ) : filteredOpps.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: theme.textMuted, margin: 0 }}>
                  {filteredOpps.length} opportunité{filteredOpps.length > 1 ? 's' : ''}
                  {filter !== 'tous' ? ` — ${TYPE_CONFIG[filter]?.label || filter}` : ''}
                </p>
              </div>
              {filteredOpps.map((opp, i) => (
                <OpportunityCard key={opp.id} opportunity={opp} index={i} onAct={handleAct} />
              ))}
            </div>
          )}
        </div>
      </div>
      </LockedFeatureCTA>
    </PageTransition>
  )
}
