import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Calendar, Heart, ArrowRight, FileX, TrendingDown } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
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
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

function ScoreGauge({ score, color }) {
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <div style={{ position: 'relative', width: 240, height: 240, margin: '0 auto' }}>
      <svg viewBox="0 0 240 240" style={{ width: '100%', height: '100%' }}>
        <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <motion.circle
          cx="120" cy="120" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 120 120)"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 76,
          lineHeight: 1,
          color: '#fff',
        }}>{score}</div>
        <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
          / 100
        </div>
      </div>
    </div>
  )
}

function Insight({ icon: Icon, label, value, accent, onClick }) {
  return (
    <SimpleCard onClick={onClick} padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={accent} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>{label}</div>
          </div>
        </div>
        <ArrowRight size={14} color={T.textMuted} />
      </div>
    </SimpleCard>
  )
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

  const scoreColor = data.score >= 75 ? T.success : data.score >= 50 ? T.warning : T.danger
  const scoreLabel = data.score >= 80 ? 'Excellent' : data.score >= 65 ? 'Sain' : data.score >= 45 ? 'À surveiller' : 'Critique'

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>

        <PageHeader
          title="Santé"
          subtitle="Diagnostic global de votre portefeuille."
        />

        {/* Score géant */}
        <SimpleCard padding={36} style={{
          textAlign: 'center',
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(255,255,255,0.02))',
        }}>
          <ScoreGauge score={data.score} color={scoreColor} />
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 24,
            color: scoreColor,
            marginTop: 14,
          }}>{scoreLabel}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>
            {data.totalClients} clients &middot; {data.totalContrats} contrats &middot; {fmtEur(data.primesAnnuelles)} de primes
          </div>
        </SimpleCard>

        {/* 4 insights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}>
          <Insight
            icon={FileX}
            label="Sans renouvellement"
            value={data.sansRenouvellement}
            accent={T.danger}
            onClick={() => navigate('/contrats')}
          />
          <Insight
            icon={Phone}
            label="Sans contact > 90 jours"
            value={data.sansContact90j}
            accent={T.warning}
            onClick={() => navigate('/relances')}
          />
          <Insight
            icon={TrendingDown}
            label="Risque de churn"
            value={data.churnRisk}
            accent={T.danger}
            onClick={() => navigate('/clients?filter=a_risque')}
          />
          <Insight
            icon={Calendar}
            label="Échéances < 30 jours"
            value={data.echeancesProches}
            accent={T.warning}
            onClick={() => navigate('/contrats')}
          />
        </div>
      </main>
    </div>
  )
}
