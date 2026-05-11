import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Building, AlertTriangle,
  Calendar, Sparkles, Shield, FileText, Clock, Target, TrendingUp,
  Euro, Activity, Star, ChevronDown, ChevronUp,
  Send, Eye, CheckCircle, XCircle, Clock3, Zap, BarChart2, Layers
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// AURORA DARK THEME TOKENS
// ═══════════════════════════════════════════════════════════════════════════
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
  successBg: 'rgba(34,197,94,0.08)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.08)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA — Martin Conseil
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_CLIENT = {
  id: 'demo-martin-conseil',
  prenom: 'Martin',
  nom: 'Conseil',
  type: 'Professionnel',
  statut: 'actif',
  email: 'm.conseil@martinconseil.fr',
  telephone: '06 12 34 56 78',
  adresse: '12 rue de la République',
  postal_code: '69002',
  city: 'Lyon',
  profession: 'Courtier en assurances',
  segment: 'Professionnel',
  created_at: '2021-03-15T10:00:00.000Z',
  last_contact: '2026-03-29T14:30:00.000Z',
  days_since_contact: 42,
  risk_score: 72,
  loyalty_score: 81,
  opportunity_score: 68,
  retention_score: 75,
  global_score: 74,
  portfolio_value: 15880,
}

const DEMO_CONTRACTS = [
  {
    id: 'c1',
    type_contrat: 'RC Pro',
    compagnie: 'Aurora Assurances',
    prime_annuelle: 2800,
    date_debut: '2025-06-01',
    date_echeance: '2026-06-01',
    statut: 'actif',
    days_to_expiry: 21,
    alert: true,
  },
  {
    id: 'c2',
    type_contrat: 'Flotte Auto',
    compagnie: 'Novalia Courtage',
    prime_annuelle: 12400,
    date_debut: '2026-01-01',
    date_echeance: '2027-01-01',
    statut: 'actif',
    days_to_expiry: 236,
    alert: false,
  },
  {
    id: 'c3',
    type_contrat: 'MRH',
    compagnie: 'MAIF',
    prime_annuelle: 680,
    date_debut: '2025-09-01',
    date_echeance: '2026-09-01',
    statut: 'actif',
    days_to_expiry: 113,
    alert: false,
  },
]

const DEMO_QUOTES = [
  {
    id: 'q1',
    produit: 'Prévoyance TNS',
    compagnie: 'Novalia Courtage',
    montant: 3200,
    statut: 'envoyé',
    date_envoi: '2026-04-15T09:00:00.000Z',
    validite: '2026-06-15',
  },
  {
    id: 'q2',
    produit: 'Protection Juridique Pro',
    compagnie: 'Aurora Assurances',
    montant: 450,
    statut: 'relancé',
    date_envoi: '2026-03-20T11:00:00.000Z',
    validite: '2026-05-20',
  },
]

const DEMO_HISTORY = [
  { id: 'h1', type: 'creation', label: 'Client créé', date: '2021-03-15', icon: User, color: T.accent },
  { id: 'h2', type: 'contrat', label: 'Contrat RC Pro souscrit', date: '2021-03-20', icon: Shield, color: T.success },
  { id: 'h3', type: 'contrat', label: 'Contrat Flotte Auto souscrit', date: '2023-06-01', icon: Shield, color: T.success },
  { id: 'h4', type: 'devis', label: 'Devis Prévoyance TNS envoyé', date: '2026-04-15', icon: FileText, color: T.warning },
  { id: 'h5', type: 'tache', label: 'Tâche : vérifier échéance RC Pro', date: '2026-05-01', icon: CheckCircle, color: T.accent },
  { id: 'h6', type: 'contrat', label: 'Contrat MRH souscrit', date: '2025-09-01', icon: Shield, color: T.success },
  { id: 'h7', type: 'relance', label: 'Relance effectuée — devis PJ Pro', date: '2026-04-20', icon: Send, color: T.ark },
  { id: 'h8', type: 'devis', label: 'Devis Protection Juridique envoyé', date: '2026-03-20', icon: FileText, color: T.warning },
]

const DEMO_ARK_ANALYSIS = {
  summary: [
    'Client professionnel avec 3 contrats actifs pour un portefeuille total de 15 880 €/an.',
    'Ancienneté de 5 ans, dernière interaction il y a 42 jours — besoin de réengagement.',
    'Score de risque 72/100 : vigilance modérée. Client stable mais exposé à la concurrence.',
  ],
  riskNiveau: 72,
  riskReason: 'Échéance RC Pro imminente (J-21). Client pro à fort potentiel, cible attractive pour la concurrence.',
  opportunity: 'Prévoyance TNS non souscrite',
  opportunityDetail: 'Le client est éligible à une Prévoyance TNS. Devis déjà envoyé le 15 avril, sans réponse à ce jour. Potentiel de +3 200 €/an.',
  recommendedAction: 'Relancer le client pour le devis Prévoyance TNS et l\'échéance RC Pro',
  actionWhy: 'Double opportunité : renouvellement RC Pro (2 800 €) et souscription Prévoyance (3 200 €). Impact combiné de 6 000 €. Le silence de 42 jours suggère une ouverture à la concurrence.',
  impactPotentiel: 6000,
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const fmtShortDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'
const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'
const daysAgo = (d) => {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const STATUS_CONFIG = {
  actif: { label: 'Actif', color: T.success },
  prospect: { label: 'Prospect', color: T.accent },
  inactif: { label: 'Inactif', color: T.textMuted },
  a_risque: { label: 'À risque', color: T.danger },
  opportunite: { label: 'Opportunité', color: T.warning },
  'résilié': { label: 'Résilié', color: T.danger },
  resilié: { label: 'Résilié', color: T.danger },
  perdu: { label: 'Perdu', color: T.danger },
}

const DEVIS_STATUS = {
  envoyé: { label: 'Envoyé', color: T.textSecondary },
  relancé: { label: 'Relancé', color: T.warning },
  accepté: { label: 'Accepté', color: T.success },
  refusé: { label: 'Refusé', color: T.danger },
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCULAR GAUGE
// ═══════════════════════════════════════════════════════════════════════════
function CircularGauge({ value, size = 64, strokeWidth = 5, color, label, subtitle }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: size > 60 ? 18 : 14, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</span>
          {subtitle && <span style={{ fontSize: 10, fontWeight: 500, color: T.textMuted, marginTop: 1 }}>{subtitle}</span>}
        </div>
      </div>
      {label && <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════
function Badge({ children, color, bg, style: extraStyle }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700,
      color: color || T.textSecondary,
      background: bg || 'rgba(255,255,255,0.06)',
      ...extraStyle,
    }}>
      {children}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD (reusable dark glass card)
// ═══════════════════════════════════════════════════════════════════════════
function Section({ title, icon: Icon, children, accent, style: extraStyle, noPadding, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      overflow: 'hidden',
      ...extraStyle,
    }}>
      {title && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: `1px solid ${T.cardBorder}`,
            cursor: collapsible ? 'pointer' : 'default',
          }}
          onClick={() => collapsible && setOpen(!open)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {Icon && (
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${accent || T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={accent || T.accent} />
              </div>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
          </div>
          {collapsible && (open ? <ChevronUp size={14} color={T.textMuted} /> : <ChevronDown size={14} color={T.textMuted} />)}
        </div>
      )}
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: noPadding ? 0 : '12px 14px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════
function TabButton({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        flex: 1, minWidth: 0,
        padding: '10px 8px',
        background: active ? T.cardHover : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 600,
        color: active ? T.text : T.textMuted,
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
        outline: 'none',
      }}
    >
      {Icon && <Icon size={13} />}
      <span>{label}</span>
      {badge != null && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 9999, background: T.accentBg, color: T.accent, marginLeft: 2 }}>{badge}</span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LEFT COLUMN — IDENTITY PANEL
// ═══════════════════════════════════════════════════════════════════════════
function IdentityPanel({ client, navigate }) {
  const statusCfg = STATUS_CONFIG[client.statut?.toLowerCase()] || { label: 'Inconnu', color: T.textMuted }
  const contractDaysAgo = daysAgo(client.last_contact)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Photo + Name */}
      <Section noPadding>
        <div style={{ padding: '18px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #5B4DF5, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: T.text,
            boxShadow: '0 0 30px rgba(91,77,245,0.25)', border: '2px solid rgba(139,92,246,0.25)',
          }}>
            {getInitials(client)}
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, textAlign: 'center' }}>{client.prenom} {client.nom}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Badge color={T.textSecondary} bg="rgba(255,255,255,0.05)">
              <Building size={10} /> {client.type || client.segment}
            </Badge>
            <Badge color={statusCfg.color} bg={`${statusCfg.color}15`}>
              {statusCfg.label}
            </Badge>
          </div>
        </div>
      </Section>

      {/* Contact Info */}
      <Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <InfoLine icon={Mail} value={client.email} />
          <InfoLine icon={Phone} value={client.telephone} />
          <InfoLine icon={MapPin} value={client.city} />
          <InfoLine icon={Calendar} value={`Client depuis ${fmtDate(client.created_at)}`} />
        </div>
      </Section>

      {/* Risk Score */}
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <CircularGauge value={client.risk_score} size={72} strokeWidth={5} color={T.danger} label="Risque" subtitle="/100" />
          <CircularGauge value={client.loyalty_score} size={72} strokeWidth={5} color={T.accent} label="Fidélité" subtitle="/100" />
        </div>
      </Section>

      {/* Portfolio & Metrics */}
      <Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MetricLine icon={Euro} label="Portefeuille" value={fmtEur(client.portfolio_value)} highlight />
          <MetricLine icon={Clock3} label="Dernier contact" value={contractDaysAgo != null ? `il y a ${contractDaysAgo} jours` : '—'} warn={contractDaysAgo > 30} />
          <MetricLine icon={Layers} label="Contrats actifs" value={DEMO_CONTRACTS.length} />
          <MetricLine icon={Star} label="Score Global" value={`${client.global_score}/100`} accent />
        </div>
      </Section>

      {/* Quick Badges */}
      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Badge color={T.danger} bg={T.dangerBg}>
            <AlertTriangle size={10} /> Échéance proche
          </Badge>
          <Badge color={T.warning} bg={T.warningBg}>
            <Target size={10} /> Opportunité
          </Badge>
          <Badge color={T.textSecondary} bg="rgba(255,255,255,0.04)">
            <Clock3 size={10} /> Silencieux
          </Badge>
        </div>
      </Section>

      {/* Edit Button */}
      <button
        onClick={() => navigate(`/clients/${client.id}/edit`)}
        style={{
          width: '100%', padding: '8px 0',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.cardBorder}`,
          borderRadius: 10, cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: T.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = T.cardBorder }}
      >
        <User size={13} /> Modifier la fiche
      </button>
    </div>
  )
}

function InfoLine({ icon: Icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={12} color={T.textMuted} />
      </div>
      <div style={{ minWidth: 0 }}>
        {label && <div style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>}
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '—'}</div>
      </div>
    </div>
  )
}

function MetricLine({ icon: Icon, label, value, highlight, warn, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={warn ? T.warning : accent ? T.accent : T.textMuted} />
        <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>{label}</span>
      </div>
      <span style={{
        fontSize: highlight ? 14 : 12,
        fontWeight: highlight ? 800 : 600,
        color: warn ? T.warning : accent ? T.accent : T.text,
      }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CENTER COLUMN — DOSSIER CLIENT WITH TABS
// ═══════════════════════════════════════════════════════════════════════════
function DossierClient({ client, navigate }) {
  const [tab, setTab] = useState('resume')

  const TABS = [
    { id: 'resume', label: 'Résumé', icon: Activity },
    { id: 'contrats', label: 'Contrats', icon: Shield, badge: DEMO_CONTRACTS.length },
    { id: 'devis', label: 'Devis', icon: FileText, badge: DEMO_QUOTES.length },
    { id: 'historique', label: 'Historique', icon: Clock },
  ]

  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 500,
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.cardBorder}`, overflowX: 'auto' }}>
        {TABS.map(t => (
          <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {tab === 'resume' && <ResumeTab key="resume" client={client} />}
          {tab === 'contrats' && <ContratsTabContent key="contrats" navigate={navigate} />}
          {tab === 'devis' && <DevisTabContent key="devis" navigate={navigate} />}
          {tab === 'historique' && <HistoriqueTabContent key="historique" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── RÉSUMÉ TAB ─────────────────────────────────────────────────────────────
function ResumeTab({ client }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Profile paragraph */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={14} color={T.accent} /> Profil
        </h3>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 400, color: T.textSecondary, lineHeight: 1.6 }}>
          {client.prenom} {client.nom} est un courtier en assurances indépendant basé à {client.city}. Client professionnel depuis {new Date(client.created_at).getFullYear()}, il gère un portefeuille de {DEMO_CONTRACTS.length} contrats actifs pour une prime annuelle totale de {fmtEur(client.portfolio_value)}.
        </p>
      </div>

      {/* Key metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
        {[
          { label: 'Contrats', value: DEMO_CONTRACTS.length, icon: Shield, color: T.accent },
          { label: 'Portefeuille', value: fmtEur(client.portfolio_value), icon: Euro, color: T.success },
          { label: 'Ancienneté', value: `${new Date().getFullYear() - 2021} ans`, icon: Star, color: T.ark },
          { label: 'Score', value: `${client.global_score}/100`, icon: BarChart2, color: T.warning },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.cardBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <m.icon size={12} color={m.color} />
              <span style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ARK Alert summary */}
      <div style={{
        background: T.arkBg, border: `1px solid ${T.arkBorder}`, borderRadius: 10,
        padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <Sparkles size={16} color={T.ark} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: T.ark }}>Alerte ARK</h4>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: T.textSecondary, lineHeight: 1.5 }}>
            <strong style={{ color: T.warning }}>RC Pro — échéance dans 21 jours.</strong> Devis Prévoyance TNS envoyé le 15 avril sans réponse. Risque de mise en concurrence. Impact potentiel : {fmtEur(6000)}.
          </p>
        </div>
      </div>

      {/* Current situation */}
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color={T.success} /> Situation actuelle
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <StatusRow status="ok" text="3 contrats actifs — tous à jour" />
          <StatusRow status="warn" text="Échéance RC Pro dans 21 jours (Aurora Assurances)" />
          <StatusRow status="warn" text="2 devis en attente de réponse" />
          <StatusRow status="info" text="Dernier contact il y a 42 jours" />
        </div>
      </div>
    </motion.div>
  )
}

function StatusRow({ status, text }) {
  const colors = { ok: T.success, warn: T.warning, info: T.textMuted, error: T.danger }
  const icons = { ok: CheckCircle, warn: AlertTriangle, info: Clock3, error: XCircle }
  const Icon = icons[status] || Clock3
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <Icon size={12} color={colors[status] || T.textMuted} />
      <span style={{ fontSize: 11, fontWeight: 500, color: T.textSecondary }}>{text}</span>
    </div>
  )
}

// ── CONTRATS TAB ────────────────────────────────────────────────────────────
function ContratsTabContent({ navigate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {DEMO_CONTRACTS.map(contrat => {
        const isUrgent = contrat.days_to_expiry <= 30
        return (
          <div key={contrat.id} style={{
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${isUrgent ? T.dangerBg : T.cardBorder}`,
            borderRadius: 10, padding: '12px', transition: 'all 0.15s', cursor: 'pointer',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onClick={() => navigate(`/contrats/${contrat.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{contrat.type_contrat}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, marginTop: 2 }}>{contrat.compagnie}</div>
              </div>
              <Badge color={isUrgent ? T.danger : T.success} bg={isUrgent ? T.dangerBg : T.successBg}>
                {isUrgent ? `J-${contrat.days_to_expiry}` : 'Actif'}
              </Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textSecondary }}>
              <span>Prime : <strong style={{ color: T.text }}>{fmtEur(contrat.prime_annuelle)}/an</strong></span>
              <span>Début : <strong style={{ color: T.text }}>{fmtShortDate(contrat.date_debut)}</strong></span>
              <span>Échéance : <strong style={{ color: isUrgent ? T.danger : T.text }}>{fmtShortDate(contrat.date_echeance)}</strong></span>
            </div>
            {isUrgent && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button style={actionBtnStyle(T.accent)} onClick={e => { e.stopPropagation() }}><RefreshCwIcon size={11} /> Renouveler</button>
                <button style={actionBtnStyle(T.ark)} onClick={e => { e.stopPropagation() }}><Eye size={11} /> Voir</button>
              </div>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}

const actionBtnStyle = (color) => ({
  padding: '5px 10px', borderRadius: 6,
  background: `${color}15`, border: `1px solid ${color}30`,
  color, fontSize: 10, fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
  transition: 'all 0.15s',
})

// ── DEVIS TAB ───────────────────────────────────────────────────────────────
function DevisTabContent({ navigate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {DEMO_QUOTES.map(devis => {
        const st = DEVIS_STATUS[devis.statut] || DEVIS_STATUS['envoyé']
        return (
          <div key={devis.id} style={{
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.cardBorder}`,
            borderRadius: 10, padding: '12px', transition: 'all 0.15s', cursor: 'pointer',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onClick={() => navigate(`/devis/${devis.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{devis.produit}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, marginTop: 2 }}>{devis.compagnie}</div>
              </div>
              <Badge color={st.color} bg={`${st.color}15`}>{st.label}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textSecondary }}>
              <span>Montant : <strong style={{ color: T.text }}>{fmtEur(devis.montant)}/an</strong></span>
              <span>Envoyé : <strong style={{ color: T.text }}>{fmtShortDate(devis.date_envoi)}</strong></span>
              <span>Valide jusqu'au : <strong style={{ color: T.text }}>{fmtShortDate(devis.validite)}</strong></span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <button style={actionBtnStyle(T.accent)} onClick={e => { e.stopPropagation() }}><Send size={11} /> Relancer</button>
              <button style={actionBtnStyle(T.success)} onClick={e => { e.stopPropagation() }}><CheckCircle size={11} /> Accepter</button>
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}

// ── HISTORIQUE TAB ──────────────────────────────────────────────────────────
function HistoriqueTabContent() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      style={{ padding: '12px 12px 12px 20px', display: 'flex', flexDirection: 'column' }}>
      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 0 }}>
        {DEMO_HISTORY.map((event, i) => (
          <div key={event.id} style={{ position: 'relative', display: 'flex', gap: 12, paddingBottom: i < DEMO_HISTORY.length - 1 ? 16 : 0 }}>
            {/* Line */}
            {i < DEMO_HISTORY.length - 1 && (
              <div style={{
                position: 'absolute', left: 11, top: 24, width: 2, bottom: 0,
                background: 'rgba(255,255,255,0.06)',
              }} />
            )}
            {/* Dot */}
            <div style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
              background: `${event.color}20`, border: `2px solid ${event.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
            }}>
              <event.icon size={11} color={event.color} />
            </div>
            {/* Content */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{event.label}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: T.textMuted, marginTop: 2 }}>{fmtShortDate(event.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// RIGHT COLUMN — ARK PANEL
// ═══════════════════════════════════════════════════════════════════════════
function ARKPanel({ client }) {
  const analysis = DEMO_ARK_ANALYSIS
  const riskColor = analysis.riskNiveau >= 70 ? T.danger : analysis.riskNiveau >= 50 ? T.warning : T.success

  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.arkBorder}`,
      borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${T.arkBorder}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.arkBg,
      }}>
        <Sparkles size={16} color={T.ark} />
        <span style={{ fontSize: 13, fontWeight: 800, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analyse ARK</span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {/* Client Summary */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.cardBorder}` }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Synthèse client</h4>
          {analysis.summary.map((line, i) => (
            <p key={i} style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 400, color: T.textSecondary, lineHeight: 1.5 }}>
              {line}
            </p>
          ))}
        </div>

        {/* Risk Niveau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.cardBorder}` }}>
          <CircularGauge value={analysis.riskNiveau} size={56} strokeWidth={4} color={riskColor} />
          <div>
            <h4 style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Niveau de risque</h4>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: T.textSecondary, lineHeight: 1.4 }}>{analysis.riskReason}</p>
          </div>
        </div>

        {/* Opportunity Detected */}
        <div style={{ background: `${T.success}08`, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.success}20` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Target size={13} color={T.success} />
            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Opportunité détectée</h4>
          </div>
          <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: T.text }}>{analysis.opportunity}</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 400, color: T.textSecondary, lineHeight: 1.4 }}>{analysis.opportunityDetail}</p>
        </div>

        {/* Recommended Action */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Zap size={13} color={T.accent} />
            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action recommandée</h4>
          </div>
          <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: T.text }}>{analysis.recommendedAction}</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 400, color: T.textSecondary, lineHeight: 1.4 }}>{analysis.actionWhy}</p>
        </div>

        {/* Impact */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(91,77,245,0.06))',
          borderRadius: 8, padding: '12px', border: `1px solid ${T.arkBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color={T.success} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary }}>Impact potentiel</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.success }}>{fmtEur(analysis.impactPotentiel)}</span>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ARKActionButton icon={Send} label="Préparer relance" primary />
          <ARKActionButton icon={FileText} label="Créer devis" />
          <ARKActionButton icon={Shield} label="Voir contrats" />
          <ARKActionButton icon={Sparkles} label="Expliquer avec ARK" ark />
        </div>
      </div>
    </div>
  )
}

function ARKActionButton({ icon: Icon, label, primary, ark }) {
  return (
    <button style={{
      width: '100%', padding: '9px 12px',
      background: primary ? T.accent : ark ? T.arkBg : 'rgba(255,255,255,0.03)',
      border: primary ? `1px solid ${T.accent}` : ark ? `1px solid ${T.arkBorder}` : `1px solid ${T.cardBorder}`,
      borderRadius: 8, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 700,
      color: primary ? T.text : ark ? T.ark : T.textSecondary,
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => {
        if (!primary && !ark) e.currentTarget.style.background = T.cardHover
        if (ark) e.currentTarget.style.background = 'rgba(139,92,246,0.10)'
        if (primary) e.currentTarget.style.opacity = '0.9'
      }}
      onMouseLeave={e => {
        if (!primary && !ark) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        if (ark) e.currentTarget.style.background = T.arkBg
        if (primary) e.currentTarget.style.opacity = '1'
      }}
    >
      <Icon size={13} color={primary ? T.text : ark ? T.ark : T.accent} />
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE ARK DRAWER
// ═══════════════════════════════════════════════════════════════════════════
function MobileARKDrawer({ client, open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
              maxHeight: '85vh', overflow: 'auto',
              background: '#08081a', borderTop: `1px solid ${T.arkBorder}`,
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              paddingBottom: 24,
            }}
          >
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.cardBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color={T.ark} />
                <span style={{ fontSize: 14, fontWeight: 800, color: T.ark }}>Analyse ARK</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 }}>
                <ChevronDown size={20} />
              </button>
            </div>
            <div style={{ padding: '4px 0' }}>
              <ARKPanel client={client} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [arkDrawerOpen, setArkDrawerOpen] = useState(false)

  // Use demo data — in production, this would fetch from API with `id`
  const client = useMemo(() => DEMO_CLIENT, [id])

  const handleARKOpen = () => setArkDrawerOpen(true)
  const handleARKClose = () => setArkDrawerOpen(false)

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.cardBorder}`,
        background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.cardBorder}`,
            color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B4DF5, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: T.text,
            }}>
              {getInitials(client)}
            </div>
            {client.prenom} {client.nom}
          </span>
        </div>
      </header>

      {/* ── 3-Column Layout ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, padding: '12px 16px',
        maxWidth: 1400, margin: '0 auto',
        flexDirection: 'column', // mobile first
      }}
        className="client-detail-layout"
      >
        {/* Desktop row layout via CSS-in-JS media query alternative: we use a wrapper */}
        <style>{`
          @media (min-width: 1024px) {
            .client-detail-layout {
              flex-direction: row !important;
              align-items: flex-start;
            }
            .client-detail-left { width: 260px; flex-shrink: 0; }
            .client-detail-center { flex: 1; min-width: 0; }
            .client-detail-right { width: 340px; flex-shrink: 0; }
          }
          @media (max-width: 1023px) {
            .client-detail-right-desktop { display: none; }
            .client-detail-ark-trigger { display: flex; }
          }
          @media (min-width: 1024px) {
            .client-detail-ark-trigger { display: none; }
          }
        `}</style>

        {/* LEFT — Identity */}
        <div className="client-detail-left">
          <IdentityPanel client={client} navigate={navigate} />
        </div>

        {/* CENTER — Dossier */}
        <div className="client-detail-center">
          <DossierClient client={client} navigate={navigate} />
        </div>

        {/* RIGHT — ARK Panel (desktop) */}
        <div className="client-detail-right client-detail-right-desktop" style={{ position: 'sticky', top: 76 }}>
          <ARKPanel client={client} />
        </div>
      </div>

      {/* ── Mobile ARK Trigger ────────────────────────────────────────── */}
      <div className="client-detail-ark-trigger" style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 90,
      }}>
        <button
          onClick={handleARKOpen}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #5B4DF5, #8B5CF6)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(139,92,246,0.40)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Sparkles size={20} color="#fff" />
        </button>
      </div>

      {/* Mobile ARK Drawer */}
      <MobileARKDrawer client={client} open={arkDrawerOpen} onClose={handleARKClose} />
    </div>
  )
}

// Inline RefreshCw icon (not in lucide-react)
function RefreshCwIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
