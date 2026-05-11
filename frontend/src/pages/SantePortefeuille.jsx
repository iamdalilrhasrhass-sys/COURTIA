import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone, Calendar, Heart, ArrowRight, FileX, TrendingDown,
  TrendingUp, Sparkles, Activity, AlertTriangle, Target, Users,
  Shield, Zap, ChevronRight,
} from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280', textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)', cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)', cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.10)', arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', cyan: '#22D3EE', blue: '#3B82F6',
}

const DEMO = {
  score: 82,
  totalClients: 124,
  totalContrats: 312,
  primesAnnuelles: 248000,
  croissance: 5.2,
  retention: 94,
  diversification: 78,
  churn: 6,
  sansRenouvellement: 14,
  sansContact90j: 27,
  churnRisk: 9,
  echeancesProches: 18,
}

const ALERTS = [
  { id: 1, level: 'danger',  title: 'Leroy Marie — 52 jours sans contact', desc: 'Risque de perte estimé à 80%', cta: 'Préparer relance', to: '/relances' },
  { id: 2, level: 'warning', title: '14 contrats sans renouvellement', desc: 'Échéance dépassée — action urgente', cta: 'Voir contrats', to: '/contrats' },
  { id: 3, level: 'warning', title: 'Devis #247 sans réponse', desc: 'Karim B. — 23 jours sans relance', cta: 'Relancer', to: '/devis' },
  { id: 4, level: 'info',    title: 'Forte concentration RC Pro', desc: 'Diversification à améliorer (3 branches dominantes)', cta: 'Voir analytics', to: '/analytics' },
  { id: 5, level: 'info',    title: '18 échéances < 30 jours', desc: 'Pic de renouvellements à anticiper', cta: 'Préparer', to: '/contrats' },
]

const RECOS = [
  { id: 1, title: 'Cross-sell Prévoyance', desc: '12 clients Auto sans Prévoyance. Potentiel estimé : 8 400 €/an.', cta: 'Lancer campagne', to: '/devis' },
  { id: 2, title: 'Relance silencieux',    desc: '27 clients silencieux > 90j. Plan d\'appels priorisé prêt.',     cta: 'Voir le plan',    to: '/relances' },
  { id: 3, title: 'Optimiser MRH',         desc: '6 contrats MRH au-dessus du marché. Comparer compagnies.',       cta: 'Comparer',         to: '/comparateur' },
]

const PRODUITS = [
  { label: 'Auto',        value: 28, color: '#5B4DF5' },
  { label: 'Habitation',  value: 22, color: '#22D3EE' },
  { label: 'Santé',       value: 18, color: '#22C55E' },
  { label: 'RC Pro',      value: 14, color: '#F59E0B' },
  { label: 'Prévoyance',  value: 10, color: '#8B5CF6' },
  { label: 'Cyber/PJ',    value: 8,  color: '#EF4444' },
]

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ─── Gauge SVG ─────────────────────────────────────────────
function ScoreGauge({ score, color, size = 200 }) {
  const r = (size - 40) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
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
        }}>{score}</div>
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
  const [data, setData] = useState(DEMO)

  useEffect(() => {
    let cancel = false
    api.get('/portfolio/health-score').then(res => {
      if (cancel) return
      const r = res?.data || {}
      const scoreRaw = r.score ?? r.health_score ?? null
      const score = typeof scoreRaw === 'number' ? scoreRaw : null
      if (score !== null) {
        setData(prev => ({
          ...prev,
          score: Math.round(score),
          totalClients: r.clients_count || prev.totalClients,
          totalContrats: r.contracts_count || prev.totalContrats,
        }))
      }
    }).catch(() => {})
    return () => { cancel = true }
  }, [])

  const scoreColor = data.score >= 80 ? T.success : data.score >= 65 ? T.cyan : data.score >= 45 ? T.warning : T.danger
  const scoreLabel = data.score >= 85 ? 'Excellent' : data.score >= 70 ? 'Bon' : data.score >= 50 ? 'À surveiller' : 'Critique'

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 24px 48px' }}>
      <VibeBackdrop intensity={0.75} />
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
              Votre portefeuille est en <strong style={{ color: T.text }}>{scoreLabel.toLowerCase()}</strong>.
              {data.totalClients} clients, {data.totalContrats} contrats, {fmtEur(data.primesAnnuelles)} de primes annuelles.
              Croissance <strong style={{ color: T.success }}>+{data.croissance}%</strong> sur 90j.
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

        {/* 4 KPIs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <MiniKpi label="Croissance"      value={`+${data.croissance}%`}   accent={T.success} icon={TrendingUp} delta="vs 90j" />
          <MiniKpi label="Rétention"       value={`${data.retention}%`}     accent={T.cyan}    icon={Heart}      delta="stable" />
          <MiniKpi label="Diversification" value={`${data.diversification}%`} accent={T.ark}   icon={Target}     delta="6 branches" />
          <MiniKpi label="Churn"           value={`${data.churn}%`}         accent={T.warning} icon={TrendingDown} delta="à surveiller" />
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
                {ALERTS.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALERTS.map(a => {
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
                {RECOS.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RECOS.map(r => (
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
              <ProduitDonut data={PRODUITS} size={140} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRODUITS.map(p => (
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
              <DetailKpi icon={FileX}        label="Sans renouvellement" value={data.sansRenouvellement} accent={T.danger}  to="/contrats" navigate={navigate} />
              <DetailKpi icon={Phone}        label="Silencieux > 90 j"   value={data.sansContact90j}      accent={T.warning} to="/relances" navigate={navigate} />
              <DetailKpi icon={TrendingDown} label="Risque churn"        value={data.churnRisk}           accent={T.danger}  to="/clients?filter=a_risque" navigate={navigate} />
              <DetailKpi icon={Calendar}     label="Échéances < 30 j"    value={data.echeancesProches}    accent={T.warning} to="/contrats" navigate={navigate} />
              <DetailKpi icon={Users}        label="Clients actifs"      value={data.totalClients}        accent={T.success} to="/clients"  navigate={navigate} />
              <DetailKpi icon={Shield}       label="Contrats actifs"     value={data.totalContrats}       accent={T.cyan}    to="/contrats" navigate={navigate} />
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
