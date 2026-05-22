import React from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Sparkles,
  FileText, Users, Euro, Target, Shield, BarChart3, Calendar,
  ChevronRight, PieChart, Activity, ArrowUp, ArrowDown, Clock,
  CheckCircle2, XCircle, Lightbulb, Layers
} from 'lucide-react'
import CommissionForecastBar from '../components/widgets/CommissionForecastBar'

// ─── Aurora Dark Theme Tokens ──────────────────────────────────────────────
const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  accentBg: 'rgba(91,77,245,0.08)',
  accentBorder: 'rgba(91,77,245,0.20)',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E',
  successBg: 'rgba(34,197,94,0.06)',
  successBorder: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.06)',
  warningBorder: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.06)',
  dangerBorder: 'rgba(239,68,68,0.15)',
}

const fmtEur = function(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
}
const fmtNum = function(v) {
  return Number(v || 0).toLocaleString('fr-FR')
}
const fmtPct = function(v) {
  return Number(v || 0).toFixed(1) + ' %'
}

// ─── Fictional Data ─────────────────────────────────────────────────────────
const KPI_DATA = {
  clientsActifs: 124,
  contratsActifs: 312,
  primesSuivies: 312400,
  devisEnCours: 42,
  tauxTransformation: 20,
  relancesEnRetard: 18,
  opportunites: 12,
  portefeuilleARisque: 9,
}

const PORTFOLIO_HEALTH = {
  scoreGlobal: 72,
  distribution: [
    { niveau: 'Excellente santé', pct: 48, count: 152, couleur: T.success },
    { niveau: 'Surveillance', pct: 31, count: 97, couleur: T.warning },
    { niveau: 'À risque', pct: 12, count: 38, couleur: T.danger },
    { niveau: 'Critique', pct: 9, count: 25, couleur: '#F97316' },
  ],
  interpretation: 'Votre portefeuille affiche une santé globale satisfaisante avec un score de 72/100. ARK a identifié 9 clients en situation de risque nécessitant une attention prioritaire. La concentration sur les produits Auto (38 %) expose votre cabinet à la volatilité du marché automobile.',
}

const PERF_MENSUELLE = [
  { mois: 'Jan', devis: 38, contrats: 18, taux: 47 },
  { mois: 'Fév', devis: 42, contrats: 22, taux: 52 },
  { mois: 'Mar', devis: 35, contrats: 16, taux: 46 },
  { mois: 'Avr', devis: 48, contrats: 28, taux: 58 },
  { mois: 'Mai', devis: 40, contrats: 15, taux: 38 },
]
const PERF_EVOLUTION = { devisVar: -16.7, contratsVar: -46.4, tauxVar: -34.5 }

const REPARTITION_PRODUITS = [
  { produit: 'Auto Multirisque', compagnie: 'Aurora Assurances', contrats: 118, prime: 142600, pct: 38 },
  { produit: 'MRH Confort', compagnie: 'Helios Protection', contrats: 72, prime: 58600, pct: 23 },
  { produit: 'Santé Premium', compagnie: 'Novalia Courtage', contrats: 48, prime: 67300, pct: 15 },
  { produit: 'Prévoyance Cadre', compagnie: 'Atlas Assurances', contrats: 31, prime: 22300, pct: 10 },
  { produit: 'RC Professionnelle', compagnie: 'Serenis Risk', contrats: 24, prime: 18400, pct: 8 },
  { produit: 'Protection Juridique', compagnie: 'Oria Garanties', contrats: 12, prime: 3200, pct: 4 },
  { produit: 'Flotte Auto', compagnie: 'Nivalis Pro', contrats: 7, prime: 12400, pct: 2 },
]

const CLIENTS_A_RISQUE = [
  { client: 'Leroy Marie', compagnie: 'Aurora Assurances', produit: 'Habitation Confort', scoreRisque: 85, prime: 680, raison: 'Aucune interaction depuis 52 jours. Contrat à échéance dans 38 jours sans devis de renouvellement.' },
  { client: 'Karim Benali', compagnie: 'Helios Protection', produit: 'Auto Multirisque', scoreRisque: 78, prime: 1100, raison: 'Sinistre déclaré en mars, mécontentement latent. Score NPS en baisse.' },
  { client: 'Moreau Éric', compagnie: 'Serenis Risk', produit: 'RC Professionnelle', scoreRisque: 74, prime: 2400, raison: 'Échéance à J-21, pas de réponse aux 2 relances envoyées.' },
  { client: 'Petit Philippe', compagnie: 'Atlas Assurances', produit: 'Prévoyance Cadre', scoreRisque: 71, prime: 890, raison: 'Réclamation en cours sur indemnisation. Risque de résiliation.' },
  { client: 'Dubois SCP', compagnie: 'Nivalis Pro', produit: 'Flotte Auto', scoreRisque: 68, prime: 3500, raison: 'Baisse de sinistralité mais concurrence agressive sur le segment.' },
]

const OPPORTUNITES_ARK = [
  { client: 'Dupont SAS', potentiel: 12400, description: 'Flotte Auto + RC Pro + Protection juridique. Client mono-produit avec fort potentiel multi-équipement.', probabilite: 72 },
  { client: 'Martin Sophie', potentiel: 5200, description: 'Non équipée Prévoyance — 2 contrats actifs. Profil cadre supérieur avec besoins identifiés.', probabilite: 68 },
  { client: 'Garcia Anne', potentiel: 3400, description: 'Multi-équipement Santé + MRH. Client mono-produit Santé, éligible MRH.', probabilite: 65 },
  { client: 'Bernard Luc', potentiel: 2800, description: 'Devis Auto #312 sans réponse depuis deux semaines. Fort potentiel de conversion.', probabilite: 55 },
  { client: 'Roux Camille', potentiel: 1800, description: 'Extension garanties Habitation. Contrat de base depuis 3 ans, marge de progression.', probabilite: 48 },
]

const EVOLUTION_DEVIS_CONTRATS = [
  { mois: 'Déc', devis: 36, contrats: 20 },
  { mois: 'Jan', devis: 38, contrats: 18 },
  { mois: 'Fév', devis: 42, contrats: 22 },
  { mois: 'Mar', devis: 35, contrats: 16 },
  { mois: 'Avr', devis: 48, contrats: 28 },
  { mois: 'Mai', devis: 40, contrats: 15 },
]

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard(_a) {
  var icon = _a.icon
  var title = _a.title
  var value = _a.value
  var accent = _a.accent
  var subtitle = _a.subtitle
  var trend = _a.trend
  var Icon = icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: T.cardBg, border: '1px solid ' + T.cardBorder,
        borderRadius: 12, padding: '16px 18px', flex: 1, minWidth: 155,
        transition: 'all 0.2s',
      }}
      onMouseEnter={function(e) { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
      onMouseLeave={function(e) { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{value}</div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 600, color: trend > 0 ? T.success : T.danger, display: 'flex', alignItems: 'center', gap: 2 }}>
            {trend > 0 ? React.createElement(ArrowUp, { size: 10 }) : React.createElement(ArrowDown, { size: 10 })}
            {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>{subtitle}</span>}
      </div>
    </motion.div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader(_a) {
  var icon = _a.icon
  var title = _a.title
  var badge = _a.badge
  var Icon = icon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.arkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={T.ark} />
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {badge && (
        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: T.arkBg, color: T.ark }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Simple Bar (horizontal progress bar) ───────────────────────────────────
function HorizontalBar(_a) {
  var label = _a.label
  var pct = _a.pct
  var count = _a.count
  var couleur = _a.couleur
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
          {count} <span style={{ color: T.textMuted, fontWeight: 400 }}>({pct} %)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: pct + '%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 3, background: couleur }}
        />
      </div>
    </div>
  )
}

// ─── Simple Vertical Bar Chart ──────────────────────────────────────────────
function BarChartSimple(_a) {
  var data = _a.data
  var height = _a.height
  var maxVal = 0
  data.forEach(function(d) {
    if (d.devis > maxVal) maxVal = d.devis
    if (d.contrats > maxVal) maxVal = d.contrats
  })
  var chartHeight = height || 180
  return (
    <div style={{
      width: '100%', height: chartHeight,
      background: 'rgba(255,255,255,0.015)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.03)',
      padding: '12px 8px 4px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid lines subtiles */}
      {[0.25, 0.5, 0.75, 1].map(function(pct) {
        return <div key={pct} style={{
          position: 'absolute', left: 0, right: 0,
          bottom: 20 + (chartHeight - 28) * pct,
          height: 1, background: 'rgba(255,255,255,0.03)',
        }} />
      })}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: chartHeight - 24, paddingBottom: 20 }}>
        {data.map(function(d, i) {
          var devisH = (d.devis / maxVal) * (chartHeight - 36)
          var contratsH = (d.contrats / maxVal) * (chartHeight - 36)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: chartHeight - 36 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: devisH }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                  style={{ width: 14, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg, rgba(139,92,246,0.7) 0%, rgba(139,92,246,0.35) 100%)', boxShadow: '0 0 8px rgba(139,92,246,0.15)' }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: contratsH }}
                  transition={{ duration: 0.6, delay: i * 0.06 + 0.1 }}
                  style={{ width: 14, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg, rgba(34,197,94,0.7) 0%, rgba(34,197,94,0.35) 100%)', boxShadow: '0 0 8px rgba(34,197,94,0.12)' }}
                />
              </div>
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{d.mois}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vertical Bar Single ────────────────────────────────────────────────────
function BarChartVertical(_a) {
  var data = _a.data
  var height = _a.height
  var maxVal = 0
  data.forEach(function(d) {
    if (d.valeur > maxVal) maxVal = d.valeur
  })
  var chartHeight = height || 200
  return (
    <div style={{
      width: '100%', height: chartHeight,
      background: 'rgba(255,255,255,0.015)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.03)',
      padding: '12px 8px 4px', position: 'relative', overflow: 'hidden',
    }}>
      {[0.25, 0.5, 0.75, 1].map(function(pct) {
        return <div key={pct} style={{
          position: 'absolute', left: 0, right: 0,
          bottom: 24 + (chartHeight - 32) * pct,
          height: 1, background: 'rgba(255,255,255,0.03)',
        }} />
      })}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: chartHeight - 24, paddingBottom: 24 }}>
        {data.map(function(d, i) {
          var barH = (d.valeur / maxVal) * (chartHeight - 40)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.textSecondary }}>{fmtEur(d.valeur)}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                style={{
                  width: '100%', maxWidth: 48, borderRadius: '6px 6px 0 0', minHeight: 4,
                  background: 'linear-gradient(180deg, rgba(139,92,246,0.8) 0%, rgba(91,77,245,0.4) 100%)',
                  boxShadow: '0 0 12px rgba(139,92,246,0.15)',
                }}
              />
              <span style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', lineHeight: 1.2, fontWeight: 600 }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mini Line Trend ────────────────────────────────────────────────────────
function MiniTrend(_a) {
  var data = _a.data
  var accessor = _a.accessor
  var color = _a.color
  var height = _a.height || 40
  var vals = data.map(function(d) { return accessor(d) })
  var maxV = Math.max.apply(null, vals)
  var minV = Math.min.apply(null, vals)
  var range = maxV - minV || 1
  var w = 100
  var h = height
  var points = vals.map(function(v, i) {
    var x = (i / (vals.length - 1)) * w
    var y = h - ((v - minV) / range) * (h - 4) - 2
    return x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color || T.ark}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// ─── ARK Insight Banner ─────────────────────────────────────────────────────
function ArkInsightBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, ' + T.arkBg + ' 0%, rgba(91,77,245,0.04) 100%)',
      border: '1px solid ' + T.arkBorder,
      borderRadius: 14, padding: '18px 22px', marginBottom: 24,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Sparkles size={20} color={T.ark} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ark, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Analyse ARK du mois
        </div>
        <p style={{ fontSize: 13, color: T.textSecondary, margin: '0 0 6px', lineHeight: 1.6 }}>
          Votre taux de transformation devis baisse ce mois-ci (38 % contre 58 % en avril). ARK recommande de prioriser les 5 devis sans réponse. Par ailleurs, 9 clients présentent un score de risque élevé — une action préventive pourrait sauvegarder jusqu'à 8 570 € de primes annuelles.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: T.danger, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={11} /> 5 devis sans réponse
          </span>
          <span style={{ fontSize: 11, color: T.warning, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> 9 clients à risque
          </span>
          <span style={{ fontSize: 11, color: T.success, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Target size={11} /> 12 opportunités détectées
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Score Gauge Circle ─────────────────────────────────────────────────────
function ScoreGauge(_a) {
  var score = _a.score
  var size = _a.size || 100
  var strokeW = (size / 100) * 6
  var r = (size / 2) - strokeW
  var circ = 2 * Math.PI * r
  var offset = circ - (score / 100) * circ
  var scoreColor = score >= 80 ? T.success : score >= 50 ? T.warning : T.danger
  var statusLabel = score >= 80 ? 'Sain' : score >= 50 ? 'Surveillé' : 'Fragile'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={'0 0 ' + size + ' ' + size} style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={scoreColor} strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: T.text, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.11, fontWeight: 600, color: scoreColor, marginTop: 2 }}>{statusLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Rapports Component ────────────────────────────────────────────────
export default function Rapports() {
  return (
    <div style={{ minHeight: '100vh', color: T.text, position: 'relative', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HALO EFFECTS */}
      <div style={{ position: 'fixed', width: 700, height: 700, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', top: -250, left: -200, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(91,77,245,0.04) 0%, transparent 70%)', bottom: -150, right: -150, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <BarChart3 size={16} color={T.ark} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rapports</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 4px', color: T.text, letterSpacing: '-0.02em' }}>Rapports</h1>
          <p style={{ fontSize: 14, color: T.textMuted, margin: 0 }}>Pilotez la performance de votre cabinet avec les analyses ARK.</p>
        </div>

        {/* ── ARK INSIGHT BANNER ── */}
        <ArkInsightBanner />

        {/* ── KPI GRID ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <KpiCard icon={Users} title="Clients actifs" value={fmtNum(KPI_DATA.clientsActifs)} accent="#7C3AED" subtitle="portefeuille" />
          <KpiCard icon={FileText} title="Contrats actifs" value={fmtNum(KPI_DATA.contratsActifs)} accent="#8B5CF6" subtitle="en cours" />
          <KpiCard icon={Euro} title="Primes suivies" value={fmtEur(KPI_DATA.primesSuivies)} accent="#22C55E" subtitle="total annuel" />
          <KpiCard icon={Target} title="Devis en cours" value={fmtNum(KPI_DATA.devisEnCours)} accent="#3B82F6" subtitle="à convertir" />
          <KpiCard icon={TrendingUp} title="Taux transformation" value={fmtPct(KPI_DATA.tauxTransformation)} accent="#F59E0B" trend={PERF_EVOLUTION.tauxVar} />
          <KpiCard icon={Clock} title="Relances en retard" value={fmtNum(KPI_DATA.relancesEnRetard)} accent="#EF4444" subtitle="actions requises" />
          <KpiCard icon={Lightbulb} title="Opportunités" value={fmtNum(KPI_DATA.opportunites)} accent={T.ark} subtitle="détectées ARK" />
          <KpiCard icon={AlertTriangle} title="Portefeuille à risque" value={fmtNum(KPI_DATA.portefeuilleARisque)} accent="#F97316" subtitle="clients" />
        </div>

        {/* ── ROW 1: Santé du portefeuille + Performance commerciale ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Santé du portefeuille */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={Shield} title="Santé du portefeuille" badge={'Score ' + PORTFOLIO_HEALTH.scoreGlobal + '/100'} />
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20 }}>
              <ScoreGauge score={PORTFOLIO_HEALTH.scoreGlobal} size={110} />
              <div style={{ flex: 1 }}>
                {PORTFOLIO_HEALTH.distribution.map(function(d) {
                  return React.createElement(HorizontalBar, { key: d.niveau, label: d.niveau, pct: d.pct, count: d.count, couleur: d.couleur })
                })}
              </div>
            </div>
            <div style={{
              background: T.arkBg, border: '1px solid ' + T.arkBorder,
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Zap size={14} color={T.ark} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {PORTFOLIO_HEALTH.interpretation}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Performance commerciale */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={TrendingUp} title="Performance commerciale" badge="Mensuelle" />
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{
                background: T.successBg, border: '1px solid ' + T.successBorder,
                borderRadius: 10, padding: '12px 16px', flex: 1,
              }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Devis émis</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.success }}>{PERF_MENSUELLE[4].devis}</div>
                <div style={{ fontSize: 11, color: T.success, display: 'flex', alignItems: 'center', gap: 2 }}>
                  Devis
                </div>
              </div>
              <div style={{
                background: T.warningBg, border: '1px solid ' + T.warningBorder,
                borderRadius: 10, padding: '12px 16px', flex: 1,
              }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contrats signés</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.warning }}>{PERF_MENSUELLE[4].contrats}</div>
                <div style={{ fontSize: 11, color: T.warning, display: 'flex', alignItems: 'center', gap: 2 }}>
                  Contrats
                </div>
              </div>
              <div style={{
                background: T.arkBg, border: '1px solid ' + T.arkBorder,
                borderRadius: 10, padding: '12px 16px', flex: 1,
              }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Taux de transf.</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.ark }}>{PERF_MENSUELLE[4].taux}%</div>
                <div style={{ fontSize: 11, color: PERF_EVOLUTION.tauxVar < 0 ? T.danger : T.success, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {PERF_EVOLUTION.tauxVar < 0 ? React.createElement(ArrowDown, { size: 10 }) : React.createElement(ArrowUp, { size: 10 })}
                  {Math.abs(PERF_EVOLUTION.tauxVar)}% vs mois précédent
                </div>
              </div>
            </div>
            {/* Mini bar chart for monthly performance */}
            <BarChartSimple data={PERF_MENSUELLE} height={140} />
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(139,92,246,0.5)' }} />
                <span style={{ fontSize: 11, color: T.textMuted }}>Devis</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.success }} />
                <span style={{ fontSize: 11, color: T.textMuted }}>Contrats</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── ROW 2: Répartition contrats + Évolution ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Répartition contrats par produit */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={PieChart} title="Répartition contrats par produit" badge={REPARTITION_PRODUITS.length + ' produits'} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {REPARTITION_PRODUITS.map(function(p, i) {
                return (
                  <motion.div
                    key={p.produit}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                      borderBottom: i < REPARTITION_PRODUITS.length - 1 ? '1px solid ' + T.cardBorder : 'none',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ['#8B5CF6', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'][i],
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.produit}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{p.compagnie} · {p.contrats} contrats</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{fmtEur(p.prime)}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.ark }}>{p.pct}%</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Évolution devis / contrats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={Activity} title="Évolution devis / contrats" badge="6 mois" />
            <BarChartSimple data={EVOLUTION_DEVIS_CONTRATS} height={160} />
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(139,92,246,0.5)' }} />
                <span style={{ fontSize: 11, color: T.textMuted }}>Devis</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.success }} />
                <span style={{ fontSize: 11, color: T.textMuted }}>Contrats</span>
              </div>
            </div>
            <div style={{
              background: T.arkBg, border: '1px solid ' + T.arkBorder,
              borderRadius: 10, padding: '12px 16px', marginTop: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Zap size={14} color={T.ark} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: T.danger }}>Baisse de 46 %</strong> des contrats signés en mai par rapport à avril. Le taux de transformation chute à 38 %. ARK suggère d'analyser les devis sans réponse et d'intensifier les relances ciblées.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── ROW 3: Clients à risque + Opportunités ARK ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Clients à risque */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={AlertTriangle} title="Clients à risque" badge={'Top ' + CLIENTS_A_RISQUE.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CLIENTS_A_RISQUE.map(function(c, i) {
                var riskColor = c.scoreRisque >= 80 ? T.danger : c.scoreRisque >= 70 ? T.warning : '#F97316'
                return (
                  <motion.div
                    key={c.client}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    style={{
                      background: 'rgba(239,68,68,0.03)',
                      border: '1px solid ' + T.dangerBorder,
                      borderLeft: '3px solid ' + riskColor,
                      borderRadius: 10, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.client}</span>
                        <span style={{
                          padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: riskColor + '18', color: riskColor,
                        }}>
                          Score {c.scoreRisque}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>{fmtEur(c.prime)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>
                      {c.compagnie} · {c.produit}
                    </div>
                    <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>
                      {c.raison}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Opportunités ARK */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{
              background: T.cardBg, border: '1px solid ' + T.cardBorder,
              borderRadius: 16, padding: '18px 20px',
            }}
          >
            <SectionHeader icon={Lightbulb} title="Opportunités ARK détectées" badge={OPPORTUNITES_ARK.length + ' pistes'} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OPPORTUNITES_ARK.map(function(o, i) {
                return (
                  <motion.div
                    key={o.client}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                    style={{
                      background: 'rgba(34,197,94,0.03)',
                      border: '1px solid ' + T.successBorder,
                      borderLeft: '3px solid ' + T.success,
                      borderRadius: 10, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{o.client}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.success }}>+{fmtEur(o.potentiel)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5, marginBottom: 6 }}>
                      {o.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: o.probabilite + '%', background: 'linear-gradient(90deg, ' + T.success + ', ' + T.ark + ')' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted }}>{o.probabilite}% probabilité</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Recommandations stratégiques ARK ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          style={{
            background: 'linear-gradient(135deg, ' + T.arkBg + ' 0%, rgba(91,77,245,0.04) 100%)',
            border: '1px solid ' + T.arkBorder,
            borderRadius: 16, padding: '24px 28px', marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color={T.ark} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Recommandations stratégiques ARK</h2>
              <p style={{ fontSize: 12, color: T.textMuted, margin: '2px 0 0' }}>Analyse exécutive du portefeuille — Mai 2026</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* En hausse */}
            <div style={{
              background: T.successBg, border: '1px solid ' + T.successBorder,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} color={T.success} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: '0.04em' }}>En hausse</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Primes suivies :</strong> progression du portefeuille grâce aux nouveaux contrats Helios Protection et Aurora Assurances.
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Multi-équipement :</strong> 3 opportunités à fort potentiel détectées chez Dupont SAS, Martin Sophie et Garcia Anne.
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Fidélisation :</strong> les clients Novalia Courtage affichent un taux de rétention de 94 % sur 12 mois.
                </li>
              </ul>
            </div>

            {/* En baisse */}
            <div style={{
              background: T.dangerBg, border: '1px solid ' + T.dangerBorder,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={14} color={T.danger} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.danger, textTransform: 'uppercase', letterSpacing: '0.04em' }}>En baisse</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Taux de transformation :</strong> chute de 34,5 % ce mois-ci. 5 devis sans réponse identifiés.
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Contrats signés :</strong> baisse de 46 % en mai (15 contrats contre 28 en avril).
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Relances en retard :</strong> 18 relances non traitées, exposant le cabinet à un risque de perte de primes.
                </li>
              </ul>
            </div>

            {/* À risque */}
            <div style={{
              background: T.warningBg, border: '1px solid ' + T.warningBorder,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color={T.warning} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.warning, textTransform: 'uppercase', letterSpacing: '0.04em' }}>À risque</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>9 clients critiques :</strong> Leroy Marie, Karim Benali et Moreau Éric nécessitent une intervention immédiate.
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Concentration Auto :</strong> 38 % du portefeuille exposé au marché automobile. Diversification recommandée vers Santé et Prévoyance.
                </li>
                <li style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: T.text }}>Échéances imminentes :</strong> 3 contrats à moins de 30 jours sans devis de renouvellement — risque de perte de 8 700 €.
                </li>
              </ul>
            </div>
          </div>

          {/* ARK Action Plan */}
          <div style={{
            marginTop: 20, padding: '16px 20px',
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid ' + T.arkBorder,
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Zap size={15} color={T.ark} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan d'action prioritaire ARK</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: T.danger + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: T.danger,
                }}>1</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>Relancer les 5 devis sans réponse</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Potentiel de conversion estimé à 4 200 €. Délai recommandé : 48h.</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: T.warning + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: T.warning,
                }}>2</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>Contacter les 3 clients à échéance imminente</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Moreau Éric, Martin Conseil, Dubois SCP. Sauvegarde potentielle : 8 700 €.</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: T.success + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: T.success,
                }}>3</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>Proposer multi-équipement aux 3 meilleures cibles</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Dupont SAS, Martin Sophie, Garcia Anne. Potentiel additionnel : 21 000 €.</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Commission Forecast */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '18px 20px', marginBottom: 24 }}>
          <SectionHeader icon={Euro} title="Prévisions commissions" badge="12 mois" />
          <CommissionForecastBar onBarClick={({ month, amount }) => console.log('Month:', month, amount)} />
        </motion.div>

        {/* ── Footer note ── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>
            Données mises à jour en temps réel · Analyses générées par ARK · Courtia
          </p>
        </div>

      </div>
    </div>
  )
}
