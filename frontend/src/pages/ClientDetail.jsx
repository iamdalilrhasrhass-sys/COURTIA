import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Send,
  Shield, FileText, Clock, Euro, CheckCircle, User,
} from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import SimpleCard from '../components/SimpleCard'

const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

// ─── Demo data ────────────────────────────────────────────────────
const DEMO_CLIENT = {
  id: 'demo-martin-conseil',
  prenom: 'Martin',
  nom: 'Conseil',
  type: 'Professionnel',
  statut: 'actif',
  email: 'm.conseil@martinconseil.fr',
  telephone: '06 12 34 56 78',
  city: 'Lyon',
  created_at: '2021-03-15T10:00:00.000Z',
  last_contact: '2026-03-29T14:30:00.000Z',
  portfolio_value: 15880,
}

const DEMO_CONTRACTS = [
  { id: 'c1', type: 'RC Pro',      compagnie: 'Aurora',  prime: 2800,  echeance: '01 juin', alert: true,  jours: 21 },
  { id: 'c2', type: 'Flotte Auto', compagnie: 'Novalia', prime: 12400, echeance: '01 janv', alert: false, jours: 236 },
  { id: 'c3', type: 'MRH',         compagnie: 'MAIF',    prime: 680,   echeance: '01 sept', alert: false, jours: 113 },
]

const DEMO_HISTORY = [
  { id: 1, label: 'Devis Prévoyance TNS envoyé', date: '15 avr 2026', color: T.warning, icon: FileText },
  { id: 2, label: 'Contrat MRH souscrit',         date: '01 sept 2025', color: T.success, icon: Shield },
  { id: 3, label: 'Relance effectuée — devis PJ', date: '20 avr 2026', color: T.accent,  icon: Send },
  { id: 4, label: 'Tâche : vérifier RC Pro',      date: '01 mai 2026', color: T.accent,  icon: CheckCircle },
  { id: 5, label: 'Client créé',                  date: '15 mars 2021', date_iso: '2021', color: T.textMuted, icon: User },
]

const STATUS = {
  actif:      { label: 'Actif',     color: T.success },
  prospect:   { label: 'Prospect',  color: T.accent },
  a_risque:   { label: 'À risque',  color: T.danger },
  inactif:    { label: 'Inactif',   color: T.textMuted },
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'

const daysAgo = (d) => {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── TAB BUTTON ───────────────────────────────────────────────────
function TabButton({ label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: active ? T.text : T.textMuted,
        borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '1px 7px', borderRadius: 6,
          background: 'rgba(139,92,246,0.12)', color: T.accent,
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─── TAB CONTENT ──────────────────────────────────────────────────
function InfosTab({ client }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}
    >
      <InfoRow icon={Mail}     label="Email"     value={client.email} />
      <InfoRow icon={Phone}    label="Téléphone" value={client.telephone} />
      <InfoRow icon={MapPin}   label="Ville"     value={client.city} />
      <InfoRow icon={Calendar} label="Client depuis" value={new Date(client.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
      <InfoRow icon={Euro}     label="Portefeuille" value={fmtEur(client.portfolio_value)} highlight />
      <InfoRow icon={Clock}    label="Dernier contact" value={`il y a ${daysAgo(client.last_contact)} j`} />
    </motion.div>
  )
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(139,92,246,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} color={T.accent} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: highlight ? 15 : 13, fontWeight: highlight ? 700 : 600, color: T.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

function ContratsTab({ contracts, navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {contracts.map(c => (
        <SimpleCard key={c.id} padding={16} onClick={() => navigate(`/contrats/${c.id}`)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.type}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{c.compagnie}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{fmtEur(c.prime)}</div>
              <div style={{
                fontSize: 11,
                color: c.alert ? T.danger : T.textMuted,
                marginTop: 2,
              }}>
                {c.alert ? `Échéance J-${c.jours}` : `Échéance ${c.echeance}`}
              </div>
            </div>
          </div>
        </SimpleCard>
      ))}
    </motion.div>
  )
}

function ActiviteTab({ history }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'relative' }}
    >
      {history.map((event, i) => (
        <div key={event.id} style={{
          position: 'relative',
          display: 'flex',
          gap: 14,
          paddingBottom: i < history.length - 1 ? 18 : 0,
        }}>
          {i < history.length - 1 && (
            <div style={{
              position: 'absolute', left: 14, top: 28,
              width: 2, bottom: 0,
              background: 'rgba(255,255,255,0.06)',
            }} />
          )}
          <div style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
            background: `${event.color}20`,
            border: `2px solid ${event.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}>
            <event.icon size={13} color={event.color} />
          </div>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{event.label}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{event.date}</div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('infos')

  const client = useMemo(() => DEMO_CLIENT, [id])
  const status = STATUS[client.statut] || STATUS.actif

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '16px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />

      {/* Retour */}
      <button
        onClick={() => navigate('/clients')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.cardBorder}`,
          color: T.textSecondary,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={13} /> Clients
      </button>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>

        {/* HEADER : initiales + nom + 1 CTA principal */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #8B5CF6, #5B4DF5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            flexShrink: 0,
            boxShadow: '0 8px 24px rgba(139,92,246,0.25)',
          }}>
            {getInitials(client)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: '-0.02em',
              color: '#fff',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {client.prenom} {client.nom}
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: `${status.color}15`,
                color: status.color,
              }}>
                {status.label}
              </span>
              <span style={{ fontSize: 12, color: T.textMuted }}>
                {client.type} &middot; {client.city}
              </span>
            </div>
          </div>

          <button
            style={{
              padding: '10px 18px',
              background: T.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
            }}
          >
            <Send size={14} /> Contacter
          </button>
        </header>

        {/* TABS */}
        <div style={{
          display: 'flex',
          gap: 4,
          borderBottom: `1px solid ${T.cardBorder}`,
          marginBottom: 20,
        }}>
          <TabButton label="Infos"    active={tab === 'infos'}     onClick={() => setTab('infos')} />
          <TabButton label="Contrats" active={tab === 'contrats'}  onClick={() => setTab('contrats')} badge={DEMO_CONTRACTS.length} />
          <TabButton label="Activité" active={tab === 'activite'}  onClick={() => setTab('activite')} />
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {tab === 'infos'    && <InfosTab    key="infos"    client={client} />}
          {tab === 'contrats' && <ContratsTab key="contrats" contracts={DEMO_CONTRACTS} navigate={navigate} />}
          {tab === 'activite' && <ActiviteTab key="activite" history={DEMO_HISTORY} />}
        </AnimatePresence>
      </main>
    </div>
  )
}
