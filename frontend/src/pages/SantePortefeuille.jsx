/**
 * SantePortefeuille — Dashboard santé globale du portefeuille.
 * Route : /sante-portefeuille
 *
 * - Score global 0-100 (gauge animé)
 * - Alertes : sans renouvellement, sans contact >90j, churn risk
 * - Visualisation 3D : camembert animé répartition produits
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useAnimation } from 'framer-motion'
import {
  Activity, AlertTriangle, Users, Phone, FileX, TrendingDown, RefreshCw,
  Sparkles, ArrowRight, Heart, ShieldCheck, ShieldAlert, Calendar,
} from 'lucide-react'
import { VibeBackdrop, VibeHeader, Vibe3DCard, VibeScrollSection } from '../components/vibe'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)',
  accent: '#8B5CF6', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const DEMO = {
  score: 76,
  totalClients: 124,
  totalContrats: 312,
  primesAnnuelles: 248000,
  sansRenouvellement: 14,
  sansContact90j: 27,
  churnRisk: 9,
  echeancesProches: 18,
  repartition: [
    { name: 'Auto', value: 28, color: '#8B5CF6' },
    { name: 'Habitation', value: 22, color: '#22D3EE' },
    { name: 'Santé', value: 14, color: '#22C55E' },
    { name: 'RC Pro', value: 12, color: '#F59E0B' },
    { name: 'Prévoyance', value: 10, color: '#EC4899' },
    { name: 'Autres', value: 14, color: '#64748B' },
  ],
  topRisques: [
    { client: 'Leroy Marie', motif: 'Silence 52j · Score risque 80%', score: 80, type: 'contact' },
    { client: 'Duval Corinne', motif: 'Échéance dépassée (-10j)', score: 75, type: 'echeance' },
    { client: 'Auto Évolution 89', motif: 'Renouvellement non confirmé', score: 70, type: 'renouvellement' },
    { client: 'Karim B.', motif: 'Devis #247 sans réponse', score: 65, type: 'devis' },
  ],
  evolution: [
    { mois: 'Nov', score: 68 },
    { mois: 'Déc', score: 71 },
    { mois: 'Jan', score: 70 },
    { mois: 'Fév', score: 73 },
    { mois: 'Mar', score: 74 },
    { mois: 'Avr', score: 76 },
  ],
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

export default function SantePortefeuille() {
  const navigate = useNavigate()
  const [data, setData] = useState(DEMO)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
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
    }).catch(() => { /* keep DEMO */ })
    .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [])

  const scoreColor = data.score >= 75 ? T.success : data.score >= 50 ? T.warning : T.danger
  const scoreLabel = data.score >= 80 ? 'Excellent' : data.score >= 65 ? 'Sain' : data.score >= 45 ? 'À surveiller' : 'Critique'

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 60px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.9} color={scoreColor} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        <VibeHeader
          kicker="ARK · PORTEFEUILLE"
          title="Santé du portefeuille"
          subtitle="Diagnostic global, alertes prioritaires et signaux faibles détectés par ARK."
          bubbleSize={56}
          actions={(
            <>
              <button onClick={() => navigate('/morning-brief')} style={btnGhost}>
                <Sparkles size={13} /> Morning Brief
              </button>
              <button onClick={() => window.location.reload()} style={btnGhost}>
                <RefreshCw size={13} /> Actualiser
              </button>
            </>
          )}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, marginBottom: 18 }}>
          {/* SCORE GAUGE */}
          <VibeScrollSection delay={0.05} parallax={12}>
            <Vibe3DCard
              background="linear-gradient(135deg, rgba(255,255,255,0.04), rgba(139,92,246,0.06))"
              borderColor={T.cardBorder}
              glowColor={scoreColor}
              radius={20}
              padding={22}
              depth={6}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 8 }}>Score Global</div>
              <ScoreGauge score={data.score} color={scoreColor} />
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 24, color: scoreColor }}>{scoreLabel}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
                  {data.totalClients} clients · {data.totalContrats} contrats · {fmtEur(data.primesAnnuelles)} de primes
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Sparkline data={data.evolution} color={scoreColor} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMuted, marginTop: 4 }}>
                  {data.evolution.map(p => <span key={p.mois}>{p.mois}</span>)}
                </div>
              </div>
            </Vibe3DCard>
          </VibeScrollSection>

          {/* ALERTES KPI */}
          <VibeScrollSection delay={0.1} parallax={10}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, height: '100%' }}>
              <AlertCard
                icon={FileX}
                label="Sans renouvellement"
                value={data.sansRenouvellement}
                color={T.danger}
                onClick={() => navigate('/contrats')}
              />
              <AlertCard
                icon={Phone}
                label="Sans contact >90j"
                value={data.sansContact90j}
                color={T.warning}
                onClick={() => navigate('/relances')}
              />
              <AlertCard
                icon={TrendingDown}
                label="Risque de churn"
                value={data.churnRisk}
                color={T.danger}
                onClick={() => navigate('/clients?filter=a_risque')}
              />
              <AlertCard
                icon={Calendar}
                label="Échéances < 30j"
                value={data.echeancesProches}
                color={T.warning}
                onClick={() => navigate('/contrats')}
              />
            </div>
          </VibeScrollSection>
        </div>

        {/* REPARTITION + TOP RISQUES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          <VibeScrollSection delay={0.05} parallax={10}>
            <Vibe3DCard background={T.cardBg} borderColor={T.cardBorder} radius={16} padding={22} depth={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Activity size={14} color={T.accent} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Répartition des contrats</span>
              </div>
              <Donut data={data.repartition} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 14 }}>
                {data.repartition.map(r => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
                    <span style={{ color: T.textSecondary }}>{r.name}</span>
                    <span style={{ color: '#fff', fontWeight: 700, marginLeft: 'auto' }}>{r.value}%</span>
                  </div>
                ))}
              </div>
            </Vibe3DCard>
          </VibeScrollSection>

          <VibeScrollSection delay={0.1} parallax={10}>
            <Vibe3DCard background={T.cardBg} borderColor={T.cardBorder} radius={16} padding={22} depth={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldAlert size={14} color={T.danger} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Top signaux de risque</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.topRisques.map((r, i) => (
                  <motion.div
                    key={r.client}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.4 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.12)',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={16} color={T.danger} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.client}</div>
                      <div style={{ fontSize: 11, color: T.textSecondary }}>{r.motif}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.danger }}>{r.score}</div>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => navigate('/clients?filter=a_risque')} style={{ ...btnGhost, width: '100%', marginTop: 14, justifyContent: 'center' }}>
                Voir tous les clients à risque <ArrowRight size={13} />
              </button>
            </Vibe3DCard>
          </VibeScrollSection>
        </div>

        {/* RECOMMANDATIONS ARK */}
        <VibeScrollSection delay={0.05} parallax={10}>
          <Vibe3DCard
            background="linear-gradient(135deg, rgba(139,92,246,0.10), rgba(34,211,238,0.06))"
            borderColor="rgba(139,92,246,0.25)"
            glowColor="#8B5CF6"
            radius={16}
            padding={22}
            depth={4}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Sparkles size={16} color={T.accent} />
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.16em', color: '#A78BFA', textTransform: 'uppercase' }}>Recommandations ARK</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Reco
                icon={Phone}
                label="Lancez une campagne de réactivation"
                desc={`${data.sansContact90j} clients sont sans contact depuis plus de 90 jours.`}
                cta="Voir relances"
                onClick={() => navigate('/relances')}
              />
              <Reco
                icon={Calendar}
                label="Préparez les renouvellements"
                desc={`${data.echeancesProches} contrats arrivent à échéance dans 30j.`}
                cta="Voir contrats"
                onClick={() => navigate('/contrats')}
              />
              <Reco
                icon={Heart}
                label="Multi-équipez vos clients mono-produit"
                desc="ARK détecte plusieurs opportunités de cross-sell."
                cta="Voir opportunités"
                onClick={() => navigate('/opportunites')}
              />
            </div>
          </Vibe3DCard>
        </VibeScrollSection>
      </div>
    </div>
  )
}

// ─── Composants visuels ────────────────────────────────────────────────────

function ScoreGauge({ score, color }) {
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ position: 'relative', width: 220, height: 220, margin: '8px auto 0' }}>
      <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <motion.circle
          cx="110" cy="110" r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeLinecap="round"
          filter="url(#scoreGlow)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 60, lineHeight: 1, color: '#fff' }}>
          {score}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>/ 100</div>
      </div>
    </div>
  )
}

function Sparkline({ data, color }) {
  const w = 360
  const h = 40
  const xs = data.map((_, i) => (i / (data.length - 1)) * w)
  const ys = data.map(d => h - (d.score / 100) * h)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} preserveAspectRatio="none" style={{ width: '100%', height: 56, display: 'block' }}>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={2.5} fill={color} />
      ))}
    </svg>
  )
}

function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 70
  const cx = 110
  const cy = 110
  let acc = 0
  const segments = data.map((d, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += d.value
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + Math.cos(start) * r
    const y1 = cy + Math.sin(start) * r
    const x2 = cx + Math.cos(end) * r
    const y2 = cy + Math.sin(end) * r
    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      color: d.color,
      key: d.name,
    }
  })
  return (
    <svg viewBox="0 0 220 220" style={{ width: '100%', height: 220 }}>
      {segments.map((s, i) => (
        <motion.path
          key={s.key}
          d={s.path}
          fill={s.color}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.92, scale: 1 }}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <circle cx={cx} cy={cy} r={40} fill="#020108" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontFamily="'Fraunces', serif" fontStyle="italic" fontSize="20" fontWeight={500}>
        {total}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#9CA3AF" fontSize="9" letterSpacing="2">PRODUITS</text>
    </svg>
  )
}

function AlertCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <motion.button
      whileHover={{ rotateX: 4, rotateY: -4, y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      onClick={onClick}
      style={{
        background: T.cardBg,
        border: `1px solid ${color}30`,
        borderRadius: 14,
        padding: 16,
        textAlign: 'left',
        cursor: 'pointer',
        color: T.text,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <ArrowRight size={14} color={T.textMuted} />
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 30, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>{label}</div>
    </motion.button>
  )
}

function Reco({ icon: Icon, label, desc, cta, onClick }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={14} color="#A78BFA" />
        <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 8 }}>{desc}</div>
      <button onClick={onClick} style={{
        background: 'transparent', border: 'none', color: '#A78BFA',
        fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {cta} <ArrowRight size={11} />
      </button>
    </div>
  )
}

const btnGhost = {
  padding: '8px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
