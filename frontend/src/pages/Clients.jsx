import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { VibeBackdrop, VibeHeader, VibeScrollSection } from '../components/vibe'
import {
  Plus,
  Search,
  Upload,
  TrendingUp,
  Phone,
  Users,
  UserCheck,
  UserPlus,
  AlertTriangle,
  UserX,
  LayoutGrid,
  List,
  Eye,
  Send,
  FileText,
  MapPin,
  Shield,
  Clock,
  Heart,
  Zap,
  ChevronRight,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react'

// ═══════════════════════════════════════════
// AURORA DARK THEME TOKENS
// ═══════════════════════════════════════════
const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
}

// ═══════════════════════════════════════════
// DEMO CLIENTS DATA (16+ fictional French insurance clients)
// ═══════════════════════════════════════════
const DEMO_CLIENTS = [
  {
    id: 1,
    name: 'Sophie Moreau',
    type: 'Particulier',
    status: 'actif',
    city: 'Lyon',
    email: 'sophie.moreau@email.fr',
    phone: '06 12 34 56 78',
    contracts: ['Auto', 'Habitation', 'Santé'],
    contractCount: 3,
    prime: 2480,
    riskScore: 18,
    loyaltyScore: 87,
    lastContact: '2026-05-08',
    arkAlerts: [],
    urgency: 'low',
    products: 'Auto, Habitation, Santé',
  },
  {
    id: 2,
    name: 'Thomas Bernard',
    type: 'Professionnel',
    status: 'actif',
    city: 'Paris',
    email: 't.bernard@cabinetsophia.fr',
    phone: '06 23 45 67 89',
    contracts: ['RC Pro', 'Prévoyance', 'Auto'],
    contractCount: 3,
    prime: 6150,
    riskScore: 42,
    loyaltyScore: 72,
    lastContact: '2026-04-22',
    arkAlerts: [{ label: 'Opportunité Décennale', priority: 'high' }],
    urgency: 'medium',
    products: 'RC Pro, Prévoyance, Auto',
  },
  {
    id: 3,
    name: 'Amélie Dubois',
    type: 'Particulier',
    status: 'prospect',
    city: 'Bordeaux',
    email: 'amelie.dubois@email.fr',
    phone: '06 34 56 78 90',
    contracts: ['Auto'],
    contractCount: 1,
    prime: 890,
    riskScore: 8,
    loyaltyScore: 45,
    lastContact: '2026-05-09',
    arkAlerts: [{ label: 'Multi-équipement MRH', priority: 'medium' }],
    urgency: 'low',
    products: 'Auto',
  },
  {
    id: 4,
    name: 'Laurent Petit',
    type: 'Particulier',
    status: 'a_risque',
    city: 'Marseille',
    email: 'laurent.petit@email.fr',
    phone: '06 45 67 89 01',
    contracts: ['Auto'],
    contractCount: 1,
    prime: 1340,
    riskScore: 86,
    loyaltyScore: 28,
    lastContact: '2025-11-15',
    arkAlerts: [
      { label: 'Risque résiliation', priority: 'critical' },
      { label: 'Offre concurrente détectée', priority: 'high' },
    ],
    urgency: 'high',
    products: 'Auto',
  },
  {
    id: 5,
    name: 'Claire Martin',
    type: 'Professionnel',
    status: 'actif',
    city: 'Nantes',
    email: 'c.martin@agencemartin.fr',
    phone: '06 56 78 90 12',
    contracts: ['RC Pro', 'Flotte Auto', 'Prévoyance', 'Décennale'],
    contractCount: 4,
    prime: 12800,
    riskScore: 24,
    loyaltyScore: 91,
    lastContact: '2026-05-07',
    arkAlerts: [],
    urgency: 'low',
    products: 'RC Pro, Flotte Auto, Prévoyance, Décennale',
  },
  {
    id: 6,
    name: 'Jean Dupont',
    type: 'Particulier',
    status: 'silencieux',
    city: 'Toulouse',
    email: 'jean.dupont@email.fr',
    phone: '06 67 89 01 23',
    contracts: ['Habitation', 'Auto'],
    contractCount: 2,
    prime: 1760,
    riskScore: 55,
    loyaltyScore: 60,
    lastContact: '2025-09-03',
    arkAlerts: [{ label: 'Relance recommandée', priority: 'high' }],
    urgency: 'high',
    products: 'Habitation, Auto',
  },
  {
    id: 7,
    name: 'Marie Lefebvre',
    type: 'Particulier',
    status: 'actif',
    city: 'Lille',
    email: 'marie.lefebvre@email.fr',
    phone: '06 78 90 12 34',
    contracts: ['Santé', 'Prévoyance', 'Habitation'],
    contractCount: 3,
    prime: 3200,
    riskScore: 12,
    loyaltyScore: 94,
    lastContact: '2026-05-10',
    arkAlerts: [],
    urgency: 'low',
    products: 'Santé, Prévoyance, Habitation',
  },
  {
    id: 8,
    name: 'Nicolas Roux',
    type: 'Professionnel',
    status: 'prospect',
    city: 'Strasbourg',
    email: 'n.roux@bureauroux.fr',
    phone: '06 89 01 23 45',
    contracts: [],
    contractCount: 0,
    prime: 0,
    riskScore: 6,
    loyaltyScore: 0,
    lastContact: '2026-05-06',
    arkAlerts: [{ label: 'Devis RC Pro en attente', priority: 'medium' }],
    urgency: 'medium',
    products: '—',
  },
  {
    id: 9,
    name: 'Isabelle Garnier',
    type: 'Particulier',
    status: 'actif',
    city: 'Nice',
    email: 'isabelle.garnier@email.fr',
    phone: '06 90 12 34 56',
    contracts: ['Auto', 'Habitation', 'Santé', 'PJ'],
    contractCount: 4,
    prime: 4100,
    riskScore: 15,
    loyaltyScore: 96,
    lastContact: '2026-04-30',
    arkAlerts: [],
    urgency: 'low',
    products: 'Auto, Habitation, Santé, PJ',
  },
  {
    id: 10,
    name: 'Philippe Chevalier',
    type: 'Particulier',
    status: 'perdu',
    city: 'Rennes',
    email: 'philippe.chevalier@email.fr',
    phone: '06 01 23 45 67',
    contracts: ['Auto'],
    contractCount: 1,
    prime: 960,
    riskScore: 72,
    loyaltyScore: 15,
    lastContact: '2025-06-20',
    arkAlerts: [{ label: 'Perdu - À reconquérir', priority: 'low' }],
    urgency: 'low',
    products: 'Auto',
  },
  {
    id: 11,
    name: 'Céline Fournier',
    type: 'Professionnel',
    status: 'actif',
    city: 'Montpellier',
    email: 'c.fournier@cliniquefournier.fr',
    phone: '06 12 45 67 89',
    contracts: ['RC Pro', 'Prévoyance', 'MRH'],
    contractCount: 3,
    prime: 7850,
    riskScore: 31,
    loyaltyScore: 78,
    lastContact: '2026-05-03',
    arkAlerts: [{ label: 'Échéance proche - Flotte', priority: 'medium' }],
    urgency: 'medium',
    products: 'RC Pro, Prévoyance, MRH',
  },
  {
    id: 12,
    name: 'David Lambert',
    type: 'Particulier',
    status: 'silencieux',
    city: 'Grenoble',
    email: 'david.lambert@email.fr',
    phone: '06 23 56 78 90',
    contracts: ['Habitation'],
    contractCount: 1,
    prime: 620,
    riskScore: 48,
    loyaltyScore: 52,
    lastContact: '2025-10-11',
    arkAlerts: [
      { label: 'Silence radio 7+ mois', priority: 'high' },
      { label: 'Auto non couverte', priority: 'medium' },
    ],
    urgency: 'high',
    products: 'Habitation',
  },
  {
    id: 13,
    name: 'Anne Rousseau',
    type: 'Particulier',
    status: 'actif',
    city: 'Dijon',
    email: 'anne.rousseau@email.fr',
    phone: '06 34 67 89 01',
    contracts: ['Auto', 'Santé'],
    contractCount: 2,
    prime: 1950,
    riskScore: 22,
    loyaltyScore: 83,
    lastContact: '2026-05-05',
    arkAlerts: [],
    urgency: 'low',
    products: 'Auto, Santé',
  },
  {
    id: 14,
    name: 'Julien Mercier',
    type: 'Professionnel',
    status: 'a_risque',
    city: 'Toulon',
    email: 'j.mercier@btpmercier.fr',
    phone: '06 45 78 90 12',
    contracts: ['Décennale', 'RC Pro'],
    contractCount: 2,
    prime: 9400,
    riskScore: 79,
    loyaltyScore: 35,
    lastContact: '2025-12-01',
    arkAlerts: [
      { label: 'Risque résiliation élevé', priority: 'critical' },
      { label: 'Contrat concurrent en vue', priority: 'high' },
    ],
    urgency: 'critical',
    products: 'Décennale, RC Pro',
  },
  {
    id: 15,
    name: 'Camille Blanc',
    type: 'Particulier',
    status: 'prospect',
    city: 'Angers',
    email: 'camille.blanc@email.fr',
    phone: '06 56 89 01 23',
    contracts: [],
    contractCount: 0,
    prime: 0,
    riskScore: 4,
    loyaltyScore: 0,
    lastContact: '2026-05-09',
    arkAlerts: [{ label: 'Devis MRH demandé', priority: 'medium' }],
    urgency: 'medium',
    products: '—',
  },
  {
    id: 16,
    name: 'Romain Gauthier',
    type: 'Particulier',
    status: 'actif',
    city: 'Reims',
    email: 'romain.gauthier@email.fr',
    phone: '06 67 90 12 34',
    contracts: ['Auto', 'Habitation', 'PJ'],
    contractCount: 3,
    prime: 2870,
    riskScore: 19,
    loyaltyScore: 89,
    lastContact: '2026-05-08',
    arkAlerts: [],
    urgency: 'low',
    products: 'Auto, Habitation, PJ',
  },
  {
    id: 17,
    name: 'Nathalie Durand',
    type: 'Professionnel',
    status: 'actif',
    city: 'Le Havre',
    email: 'n.durand@agencedurand.fr',
    phone: '06 78 01 23 45',
    contracts: ['RC Pro', 'Flotte Auto', 'MRH'],
    contractCount: 3,
    prime: 10500,
    riskScore: 36,
    loyaltyScore: 66,
    lastContact: '2026-04-18',
    arkAlerts: [{ label: 'Baisse fidélité détectée', priority: 'high' }],
    urgency: 'medium',
    products: 'RC Pro, Flotte Auto, MRH',
  },
  {
    id: 18,
    name: 'Pauline Girard',
    type: 'Particulier',
    status: 'actif',
    city: 'Clermont-Ferrand',
    email: 'pauline.girard@email.fr',
    phone: '06 89 12 34 56',
    contracts: ['Santé', 'Prévoyance'],
    contractCount: 2,
    prime: 1680,
    riskScore: 11,
    loyaltyScore: 90,
    lastContact: '2026-05-04',
    arkAlerts: [],
    urgency: 'low',
    products: 'Santé, Prévoyance',
  },
]

// ═══════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════
const FILTERS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'perdu', label: 'Perdus' },
  { key: 'silencieux', label: 'Silencieux' },
  { key: 'particulier', label: 'Particuliers' },
  { key: 'professionnel', label: 'Professionnels' },
  { key: 'a_risque', label: 'Risque élevé' },
  { key: 'echeance', label: 'Échéance proche' },
  { key: 'ark', label: 'Opportunité ARK' },
]

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const riskColor = (score) => {
  if (score >= 70) return T.danger
  if (score >= 40) return T.warning
  return T.success
}

const riskLabel = (score) => {
  if (score >= 70) return 'Élevé'
  if (score >= 40) return 'Modéré'
  return 'Faible'
}

const loyaltyColor = (score) => {
  if (score >= 80) return T.success
  if (score >= 50) return T.warning
  return T.danger
}

const statusConfig = (status) => {
  const map = {
    actif: { label: 'Actif', color: T.success, icon: UserCheck },
    prospect: { label: 'Prospect', color: T.info, icon: UserPlus },
    a_risque: { label: 'À risque', color: T.danger, icon: AlertTriangle },
    silencieux: { label: 'Silencieux', color: T.warning, icon: UserX },
    perdu: { label: 'Perdu', color: T.textMuted, icon: UserX },
  }
  return map[status] || { label: status, color: T.textMuted, icon: Users }
}

const urgencyConfig = (urgency) => {
  const map = {
    critical: { color: T.danger, label: 'Critique', glow: 'rgba(239,68,68,0.3)' },
    high: { color: T.warning, label: 'Urgent', glow: 'rgba(245,158,11,0.3)' },
    medium: { color: T.info, label: 'Modéré', glow: 'rgba(59,130,246,0.2)' },
    low: { color: T.success, label: 'Normal', glow: 'rgba(34,197,94,0.15)' },
  }
  return map[urgency] || map.low
}

const timeAgo = (dateString) => {
  if (!dateString) return 'Jamais'
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000)
  if (seconds < 86400) return "Aujourd'hui"
  const days = Math.floor(seconds / 86400)
  if (days < 30) return `il y a ${days} j`
  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`
  const years = Math.floor(months / 12)
  return `il y a ${years} an${years > 1 ? 's' : ''}`
}

// ═══════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════
function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all 0.25s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.cardHover
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.cardBg
        e.currentTarget.style.borderColor = T.cardBorder
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1, margin: 0 }}>{value}</p>
        <p style={{ fontSize: 12, color: T.textSecondary, margin: '2px 0 0' }}>{label}</p>
        {subtitle && <p style={{ fontSize: 11, color: T.textMuted, margin: '1px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// QUICK ACTION BUTTON
// ═══════════════════════════════════════════
function QuickAction({ icon: Icon, label, onClick, accent = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 12,
        border: accent ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
        background: hovered
          ? accent
            ? `${T.accent}18`
            : T.cardHover
          : accent
            ? `${T.accent}08`
            : T.cardBg,
        color: accent ? T.accent : T.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════
// CLIENT BUBBLE CARD
// ═══════════════════════════════════════════
function ClientBubbleCard({ client, onClick }) {
  const [hovered, setHovered] = useState(false)
  const st = statusConfig(client.status)
  const urg = urgencyConfig(client.urgency)

  const hasArkAlerts = client.arkAlerts.length > 0
  const criticalAlerts = client.arkAlerts.filter((a) => a.priority === 'critical').length
  const highAlerts = client.arkAlerts.filter((a) => a.priority === 'high').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ rotateX: 4, rotateY: -4, y: -3, scale: 1.015 }}
      onClick={() => onClick(client.id)}
      style={{
        background: T.cardBg,
        border: hovered ? `1px solid ${urg.glow}` : `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: hovered ? `0 0 30px ${urg.glow}, 0 8px 32px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${urg.glow}, transparent 70%)`,
          opacity: hovered ? 0.5 : 0.15,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>{client.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: `${st.color}15`,
                color: st.color,
                border: `1px solid ${st.color}25`,
              }}
            >
              <st.icon size={11} />
              {st.label}
            </span>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {client.type}
            </span>
            <span style={{ fontSize: 11, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}>
              <MapPin size={10} />
              {client.city}
            </span>
          </div>
        </div>

        {/* ARK alert badge */}
        {hasArkAlerts && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 8,
              background: criticalAlerts > 0 ? `${T.danger}18` : `${T.ark}18`,
              border: `1px solid ${criticalAlerts > 0 ? T.danger : T.ark}30`,
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} style={{ color: criticalAlerts > 0 ? T.danger : T.ark }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: criticalAlerts > 0 ? T.danger : T.ark }}>
              ARK {client.arkAlerts.length}
            </span>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 14px',
          marginBottom: hasArkAlerts ? 12 : 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <MetricItem label="Contrats" value={client.contractCount} color={T.text} />
        <MetricItem
          label="Prime annuelle"
          value={client.prime > 0 ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(client.prime)}` : '—'}
          color={T.text}
        />
        <MetricItem
          label="Score risque"
          value={client.riskScore + '/100'}
          color={riskColor(client.riskScore)}
          sub={riskLabel(client.riskScore)}
        />
        <MetricItem
          label="Fidélité"
          value={client.loyaltyScore + '/100'}
          color={loyaltyColor(client.loyaltyScore)}
        />
        <MetricItem
          label="Dernier contact"
          value={timeAgo(client.lastContact)}
          color={T.textSecondary}
          icon={<Clock size={11} />}
        />
        <MetricItem label="Produits" value={client.products} color={T.textSecondary} small />
      </div>

      {/* ARK Alerts */}
      {hasArkAlerts && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {client.arkAlerts.map((alert, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                marginTop: i === 0 ? 0 : 4,
                borderRadius: 8,
                background:
                  alert.priority === 'critical'
                    ? `${T.danger}12`
                    : alert.priority === 'high'
                      ? `${T.warning}12`
                      : `${T.ark}10`,
                border: `1px solid ${
                  alert.priority === 'critical'
                    ? `${T.danger}20`
                    : alert.priority === 'high'
                      ? `${T.warning}20`
                      : `${T.ark}15`
                }`,
                fontSize: 11,
                fontWeight: 600,
                color:
                  alert.priority === 'critical'
                    ? T.danger
                    : alert.priority === 'high'
                      ? T.warning
                      : T.ark,
              }}
            >
              <Zap size={11} />
              {alert.label}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function MetricItem({ label, value, color, sub, icon, small }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, fontWeight: 600 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: small ? 11 : 13,
          fontWeight: 700,
          color,
          margin: '2px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          lineHeight: 1.3,
        }}
      >
        {icon}
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: T.textMuted, margin: '1px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════
// TABLE ROW
// ═══════════════════════════════════════════
function TableRow({ client, onClick }) {
  const st = statusConfig(client.status)

  return (
    <tr
      onClick={() => onClick(client.id)}
      style={{
        borderBottom: `1px solid ${T.cardBorder}`,
        transition: 'background 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '12px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{client.name}</p>
        <p style={{ fontSize: 11, color: T.textMuted, margin: '1px 0 0' }}>{client.city}</p>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: `${st.color}15`,
            color: st.color,
            border: `1px solid ${st.color}25`,
          }}
        >
          <st.icon size={10} />
          {st.label}
        </span>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: T.textSecondary }}>{client.type}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: T.text }}>{client.contractCount}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: T.text }}>
        {client.prime > 0
          ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(client.prime)
          : '—'}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: riskColor(client.riskScore),
              boxShadow: `0 0 6px ${riskColor(client.riskScore)}60`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: riskColor(client.riskScore) }}>
            {client.riskScore}
          </span>
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Heart size={12} style={{ color: loyaltyColor(client.loyaltyScore) }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: loyaltyColor(client.loyaltyScore) }}>
            {client.loyaltyScore}
          </span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: T.textSecondary }}>{timeAgo(client.lastContact)}</td>
      <td style={{ padding: '12px 16px' }}>
        {client.arkAlerts.length > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: `${T.ark}15`,
              color: T.ark,
              border: `1px solid ${T.ark}25`,
            }}
          >
            <Sparkles size={10} />
            {client.arkAlerts.length}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: T.textMuted }}>—</span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <button
            title="Voir"
            onClick={() => onClick(client.id)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${T.cardBorder}`,
              background: 'transparent',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${T.accent}18`
              e.currentTarget.style.color = T.accent
              e.currentTarget.style.borderColor = `${T.accent}30`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = T.textSecondary
              e.currentTarget.style.borderColor = T.cardBorder
            }}
          >
            <Eye size={14} />
          </button>
          <button
            title="Relancer"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${T.cardBorder}`,
              background: 'transparent',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${T.ark}18`
              e.currentTarget.style.color = T.ark
              e.currentTarget.style.borderColor = `${T.ark}30`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = T.textSecondary
              e.currentTarget.style.borderColor = T.cardBorder
            }}
          >
            <Send size={14} />
          </button>
          <button
            title="Devis"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${T.cardBorder}`,
              background: 'transparent',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${T.success}18`
              e.currentTarget.style.color = T.success
              e.currentTarget.style.borderColor = `${T.success}30`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = T.textSecondary
              e.currentTarget.style.borderColor = T.cardBorder
            }}
          >
            <FileText size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════
// MAIN CLIENTS PAGE
// ═══════════════════════════════════════════
export default function Clients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('tous')
  const [viewMode, setViewMode] = useState('bubble') // 'bubble' | 'table'

  // Computed stats
  const stats = useMemo(() => {
    const total = DEMO_CLIENTS.length
    const actifs = DEMO_CLIENTS.filter((c) => c.status === 'actif').length
    const prospects = DEMO_CLIENTS.filter((c) => c.status === 'prospect').length
    const atRisk = DEMO_CLIENTS.filter((c) => c.status === 'a_risque').length
    const silencieux = DEMO_CLIENTS.filter((c) => c.status === 'silencieux').length
    return { total, actifs, prospects, atRisk, silencieux }
  }, [])

  // Filtered & searched clients
  const filteredClients = useMemo(() => {
    let list = [...DEMO_CLIENTS]

    // Search
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.city.toLowerCase().includes(s)
      )
    }

    // Status/type filter
    switch (activeFilter) {
      case 'tous':
        break
      case 'actif':
        list = list.filter((c) => c.status === 'actif')
        break
      case 'prospect':
        list = list.filter((c) => c.status === 'prospect')
        break
      case 'perdu':
        list = list.filter((c) => c.status === 'perdu')
        break
      case 'silencieux':
        list = list.filter((c) => c.status === 'silencieux')
        break
      case 'a_risque':
        list = list.filter((c) => c.status === 'a_risque')
        break
      case 'particulier':
        list = list.filter((c) => c.type === 'Particulier')
        break
      case 'professionnel':
        list = list.filter((c) => c.type === 'Professionnel')
        break
      case 'echeance':
        list = list.filter((c) => {
          if (!c.lastContact) return false
          const days = Math.floor((new Date() - new Date(c.lastContact)) / 86400000)
          return days > 180
        })
        break
      case 'ark':
        list = list.filter((c) => c.arkAlerts.length > 0)
        break
      default:
        break
    }

    // Sort: urgency first
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    list.sort((a, b) => (urgencyOrder[a.urgency] || 99) - (urgencyOrder[b.urgency] || 99))

    return list
  }, [search, activeFilter])

  const handleNavigate = (id) => {
    navigate(`/clients/${id}`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'transparent',
        color: T.text,
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        perspective: 1400,
      }}
    >
      <VibeBackdrop intensity={0.85} />
      {/* Ambient background glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 20% 0%, rgba(91,77,245,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 70% 30% at 50% 100%, rgba(34,197,94,0.03) 0%, transparent 60%)
          `,
        }}
      />

      <main style={{ position: 'relative', zIndex: 1, padding: '24px 24px 48px', maxWidth: 1440, margin: '0 auto' }}>
        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: `linear-gradient(135deg, ${T.text} 0%, ${T.ark} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Clients
              </h1>
              <p style={{ fontSize: 14, color: T.textSecondary, margin: '6px 0 0', maxWidth: 500 }}>
                Pilotez votre portefeuille client avec les recommandations ARK.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <QuickAction icon={Plus} label="Ajouter" onClick={() => navigate('/clients/new')} accent />
              <QuickAction icon={Upload} label="Importer" onClick={() => navigate('/clients/import')} />
              <QuickAction icon={Sparkles} label="Analyse ARK" onClick={() => {}} />
              <QuickAction icon={Phone} label="Relance" onClick={() => navigate('/relances')} />
            </div>
          </div>
        </motion.div>

        {/* ── STATS BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard icon={Users} label="Total clients" value={`${stats.total} / 124`} color={T.accent} />
          <StatCard icon={UserCheck} label="Actifs" value={stats.actifs} color={T.success} />
          <StatCard icon={UserPlus} label="Prospects" value={stats.prospects} color={T.info} />
          <StatCard icon={AlertTriangle} label="À risque" value={stats.atRisk} color={T.danger} subtitle="Action requise" />
          <StatCard icon={UserX} label="Silencieux" value={stats.silencieux} color={T.warning} subtitle="+180j sans contact" />
        </motion.div>

        {/* ── FILTER BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 16,
            background: T.cardBg,
            border: `1px solid ${T.cardBorder}`,
          }}
        >
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, maxWidth: 400 }}>
            <Search size={16} style={{ color: T.textMuted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Rechercher nom, email, téléphone, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: T.text,
                fontSize: 13,
                fontWeight: 500,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.textMuted,
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {FILTERS.slice(0, 5).map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(activeFilter === f.key ? 'tous' : f.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: activeFilter === f.key ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
                  background: activeFilter === f.key ? `${T.accent}15` : 'transparent',
                  color: activeFilter === f.key ? T.accent : T.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              borderRadius: 10,
              border: `1px solid ${T.cardBorder}`,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setViewMode('bubble')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                border: 'none',
                background: viewMode === 'bubble' ? `${T.accent}18` : 'transparent',
                color: viewMode === 'bubble' ? T.accent : T.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <LayoutGrid size={14} />
              Bulles
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                border: 'none',
                background: viewMode === 'table' ? `${T.accent}18` : 'transparent',
                color: viewMode === 'table' ? T.accent : T.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <List size={14} />
              Tableau
            </button>
          </div>
        </motion.div>

        {/* ── EXTENDED FILTERS ROW ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}
        >
          {FILTERS.slice(5).map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(activeFilter === f.key ? 'tous' : f.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: activeFilter === f.key ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
                background: activeFilter === f.key ? `${T.accent}15` : T.cardBg,
                color: activeFilter === f.key ? T.accent : T.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
          <span
            style={{
              fontSize: 12,
              color: T.textMuted,
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 'auto',
            }}
          >
            <SlidersHorizontal size={12} />
            {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}
          </span>
        </motion.div>

        {/* ── BUBBLE VIEW ── */}
        {viewMode === 'bubble' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="bubble-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {filteredClients.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: T.cardBg,
                    borderRadius: 16,
                    border: `1px solid ${T.cardBorder}`,
                  }}
                >
                  <Search size={40} style={{ color: T.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 16, fontWeight: 600, color: T.textSecondary, margin: 0 }}>Aucun client trouvé</p>
                  <p style={{ fontSize: 13, color: T.textMuted, margin: '4px 0 0' }}>Essayez de modifier vos filtres ou votre recherche.</p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <ClientBubbleCard key={client.id} client={client} onClick={handleNavigate} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── TABLE VIEW ── */}
        {viewMode === 'table' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="table-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                borderRadius: 16,
                border: `1px solid ${T.cardBorder}`,
                overflow: 'hidden',
                background: T.cardBg,
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                      {['Client', 'Statut', 'Type', 'Contrats', 'Prime', 'Risque', 'Fidélité', 'Dernier contact', 'ARK', 'Actions'].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.textMuted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center' }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary, margin: 0 }}>Aucun client trouvé</p>
                          <p style={{ fontSize: 12, color: T.textMuted, margin: '4px 0 0' }}>Essayez de modifier vos filtres.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <TableRow key={client.id} client={client} onClick={handleNavigate} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
