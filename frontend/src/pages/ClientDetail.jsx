import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Send, Plus,
  Shield, FileText, Clock, Euro, CheckCircle, User, Sparkles,
  AlertTriangle, TrendingUp, FileSignature, FolderOpen, Activity,
  ChevronRight, Target, Bell, Zap, Heart,
} from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import { GlassPanel, ArkStatusBadge, EmptyStateAurora } from '../components/aurora/Aurora3D'

// ─── Aurora tokens ────────────────────────────────────────────
const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.08)',
  arkBorder: 'rgba(139,92,246,0.25)',
  cyan: '#22D3EE',
  blue: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ─── Demo client 360° ─────────────────────────────────────────
const DEMO_CLIENT = {
  id: 'martin-conseil',
  prenom: 'Martin',
  nom: 'Conseil',
  type: 'Professionnel',
  statut: 'actif',
  email: 'm.conseil@martinconseil.fr',
  telephone: '06 12 34 56 78',
  city: 'Lyon',
  siret: '812 345 678 00021',
  created_at: '2021-03-15T10:00:00.000Z',
  last_contact: '2026-04-29T14:30:00.000Z',
  portfolio_value: 15880,
  score: 89,
  risque: 'Faible',
}

const DEMO_CONTRACTS = [
  { id: 'c1', type: 'RC Pro',      compagnie: 'Aurora',  prime: 2800,  echeance: '01 juin 2026', alert: true,  jours: 21,  statut: 'actif' },
  { id: 'c2', type: 'Flotte Auto', compagnie: 'Novalia', prime: 12400, echeance: '01 janv 2027', alert: false, jours: 236, statut: 'actif' },
  { id: 'c3', type: 'MRH',         compagnie: 'Helios',  prime: 680,   echeance: '01 sept 2026', alert: false, jours: 113, statut: 'actif' },
]

const DEMO_DEVIS = [
  { id: 'd1', ref: '#247', produit: 'Prévoyance TNS', montant: 520, envoye: '20 avr', statut: 'en_attente' },
  { id: 'd2', ref: '#240', produit: 'PJ',             montant: 1200,envoye: '15 mars',statut: 'signe' },
]

const DEMO_DOCS = [
  { id: 1, name: 'CGV RC Pro 2026.pdf',      type: 'pdf', when: '15 mai' },
  { id: 2, name: 'Attestation Aurora.pdf',   type: 'pdf', when: '12 mai' },
  { id: 3, name: 'Devis Prévoyance #247.pdf',type: 'pdf', when: '20 avr' },
]

const DEMO_TASKS = [
  { id: 1, label: 'Vérifier renouvellement RC Pro',          due: 'Demain',     priority: 'haute' },
  { id: 2, label: 'Appel suivi devis Prévoyance #247',       due: 'Cette sem.', priority: 'moyenne' },
]

const DEMO_RELANCES = [
  { id: 1, motif: 'Devis Prévoyance #247 sans réponse',     since: '23 j',  level: 'haute' },
]

const DEMO_HISTORY = [
  { id: 1, label: 'ARK : Cross-sell PJ détecté',          date: '02 mai 2026', color: T.ark,     icon: Sparkles },
  { id: 2, label: 'Devis Prévoyance TNS envoyé',          date: '20 avr 2026', color: T.warning, icon: FileSignature },
  { id: 3, label: 'Appel commercial — RC Pro',            date: '15 avr 2026', color: T.blue,    icon: Phone },
  { id: 4, label: 'Contrat MRH souscrit (Helios)',        date: '01 sept 2025',color: T.success, icon: Shield },
  { id: 5, label: 'Contrat Flotte Auto souscrit (Novalia)',date: '01 janv 2024',color: T.success, icon: FileText },
  { id: 6, label: 'Client créé',                          date: '15 mars 2021',color: T.textMuted, icon: User },
]

const STATUS = {
  actif:      { label: 'Actif',     color: T.success },
  prospect:   { label: 'Prospect',  color: T.blue },
  a_risque:   { label: 'À risque',  color: T.danger },
  silencieux: { label: 'Silencieux',color: T.warning },
}

const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'

const statusToVariant = (s) => {
  const map = { actif: 'success', prospect: 'info', a_risque: 'danger', silencieux: 'warning', perdu: 'neutral' }
  return map[s] || 'neutral'
}

const daysAgo = (d) => {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Aurora card ────────────────────────────────────────────
function Card({ children, padding = 16, accent, onClick, style }) {
  return (
    <div onClick={onClick} style={{
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding,
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s',
      ...style,
    }}
    onMouseEnter={e => {
      if (onClick) { e.currentTarget.style.background = T.cardBgHover; e.currentTarget.style.borderColor = T.cardBorderLight }
    }}
    onMouseLeave={e => {
      if (onClick) { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.6,
        }} />
      )}
      {children}
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────
function TabButton({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '11px 16px', background: 'transparent', border: 'none',
      cursor: 'pointer', fontSize: 13, fontWeight: 600,
      color: active ? T.text : T.textMuted,
      borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
      transition: 'all 0.15s',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.text }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.textMuted }}
    >
      {label}
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6,
          background: T.arkBg, color: T.ark,
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─── Vue 360° ────────────────────────────────────────────────
function Vue360Tab({ client, contracts, devis, docs, tasks, history, navigate }) {
  const st = STATUS[client.statut] || STATUS.actif
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}
    >
      {/* Identité */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={User} title="Informations" iconColor={T.accent} />
        <InfoRow icon={Mail}     label="Email"           value={client.email} />
        <InfoRow icon={Phone}    label="Téléphone"       value={client.telephone} />
        <InfoRow icon={MapPin}   label="Ville"           value={client.city} />
        <InfoRow icon={FileText} label="SIRET"           value={client.siret} />
        <InfoRow icon={Calendar} label="Client depuis"   value={new Date(client.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
        <InfoRow icon={Clock}    label="Dernier contact" value={`il y a ${daysAgo(client.last_contact)} jours`} last />
      </GlassPanel>

      {/* Contrats actifs */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle
          icon={Shield} title={`Contrats actifs (${contracts.length})`}
          iconColor={T.blue}
          cta="Tous" onCta={() => navigate('/contrats')}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contracts.map(c => (
            <div key={c.id} style={{
              padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${T.cardBorder}`,
              borderLeft: `2px solid ${c.alert ? T.warning : T.success}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.type}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{c.compagnie}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtEur(c.prime)}</div>
                  <div style={{ fontSize: 10, color: c.alert ? T.warning : T.textMuted, fontWeight: 600 }}>
                    {c.alert ? `J-${c.jours}` : c.echeance}
                  </div>
                </div>
              </div>
              </div>
            ))}
        </div>
      </GlassPanel>

      {/* Devis en cours */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={FileSignature} title={`Devis (${devis.length})`} iconColor={T.warning} />
        {devis.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textMuted, padding: '10px 0' }}>Aucun devis en cours.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devis.map(d => (
              <div key={d.id} style={{
                padding: '10px 12px', borderRadius: 9,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${T.cardBorder}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Devis {d.ref}</div>
                    <div style={{ fontSize: 10, color: T.textMuted }}>{d.produit} • envoyé le {d.envoye}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{fmtEur(d.montant)}</div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: d.statut === 'signe' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: d.statut === 'signe' ? T.success : T.warning,
                    }}>{d.statut === 'signe' ? 'Signé' : 'En attente'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Tâches + Relances */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={Bell} title="Actions à venir" iconColor={T.danger} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Tâches ({tasks.length})
          </div>
          {tasks.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0', borderTop: `1px solid ${T.cardBorder}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: t.priority === 'haute' ? T.danger : T.warning,
              }} />
              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{t.label}</span>
              <span style={{ fontSize: 10, color: T.textMuted }}>{t.due}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Relances ({DEMO_RELANCES.length})
          </div>
          {DEMO_RELANCES.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0', borderTop: `1px solid ${T.cardBorder}`,
            }}>
              <AlertTriangle size={11} color={T.danger} />
              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{r.motif}</span>
              <span style={{ fontSize: 10, color: T.danger, fontWeight: 600 }}>{r.since}</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Documents */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={FolderOpen} title={`Documents (${docs.length})`} iconColor={T.cyan} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {docs.map((d, i) => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
              borderBottom: i < docs.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
            }}>
              <FileText size={12} color={T.textMuted} />
              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{d.name}</span>
              <span style={{ fontSize: 10, color: T.textMuted }}>{d.when}</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Activité récente */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={Activity} title="Activité récente" iconColor={T.ark} />
        <div>
          {history.slice(0, 5).map((e, i) => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0',
              borderBottom: i < 4 ? `1px solid ${T.cardBorder}` : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: `${e.color}15`, border: `1px solid ${e.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <e.icon size={10} color={e.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.3 }}>{e.label}</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{e.date}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  )
}

function SectionTitle({ icon: Icon, title, iconColor, cta, onCta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={14} color={iconColor || T.accent} />
      <h3 style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      {cta && (
        <button onClick={onCta} style={{
          marginLeft: 'auto', background: 'transparent', border: 'none',
          color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>{cta} <ChevronRight size={10} /></button>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
      borderBottom: last ? 'none' : `1px solid ${T.cardBorder}`,
    }}>
      <Icon size={12} color={T.textMuted} />
      <div style={{ fontSize: 11, color: T.textMuted, flex: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{value || '—'}</div>
    </div>
  )
}

// ─── Onglet Activité (timeline complète) ────────────────────
function ActiviteTab({ history }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'relative', maxWidth: 700 }}
    >
      {history.map((event, i) => (
        <div key={event.id} style={{
          position: 'relative', display: 'flex', gap: 14,
          paddingBottom: i < history.length - 1 ? 20 : 0,
        }}>
          {i < history.length - 1 && (
            <div style={{
              position: 'absolute', left: 14, top: 32,
              width: 2, bottom: 0, background: 'rgba(255,255,255,0.06)',
            }} />
          )}
          <div style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
            background: `${event.color}20`, border: `2px solid ${event.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
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

// ─── MAIN ───────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('vue360')

  const client = useMemo(() => DEMO_CLIENT, [id])
  const status = STATUS[client.statut] || STATUS.actif
  const totalPrime = DEMO_CONTRACTS.reduce((s, c) => s + c.prime, 0)

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '20px 24px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{
        position: 'fixed', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        top: -150, right: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* Retour */}
        <button onClick={() => navigate('/clients')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.cardBorder}`,
          color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          marginBottom: 18,
        }}>
          <ArrowLeft size={13} /> Clients
        </button>

        {/* HEADER 360° */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 20, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.ark}, ${T.accent})`,
            border: `1px solid rgba(139,92,246,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 8px 32px rgba(139,92,246,0.3), inset 0 1px 2px rgba(255,255,255,0.2)',
            position: 'relative',
          }}>
            {getInitials(client)}
            <div style={{
              position: 'absolute', top: 8, left: 16,
              width: 14, height: 8, borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)', filter: 'blur(2px)',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 28, letterSpacing: '-0.025em',
              color: T.text, margin: 0, lineHeight: 1.2,
            }}>{client.prenom} {client.nom}</h1>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <ArkStatusBadge label={status.label} variant={statusToVariant(client.statut)} />
              <span style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}><Heart size={10} /> Score {client.score}%</span>
              <span style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: 'rgba(59,130,246,0.10)', color: T.blue,
              }}>{DEMO_CONTRACTS.length} contrats • {fmtEur(totalPrime)}/an</span>
              <span style={{ fontSize: 12, color: T.textMuted }}>{client.type} • {client.city}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/devis/new?client=${client.id}`)} style={btnPrimary}>
              <Plus size={13} /> Nouveau devis
            </button>
            <button onClick={() => navigate('/taches')} style={btnGhost}>
              <CheckCircle size={13} /> Ajouter tâche
            </button>
            <button onClick={() => window.location.href = `mailto:${client.email}`} style={btnGhost}>
              <Send size={13} /> Contacter
            </button>
          </div>
        </header>

        {/* ARK Insight banner */}
        <div style={{
          marginBottom: 18,
          padding: 16,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(91,77,245,0.04))',
          border: `1px solid rgba(139,92,246,0.20)`,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.arkBg, border: `1px solid ${T.arkBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={18} color={T.ark} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.ark,
              textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
            }}>ARK Insight</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
              Renouvellement RC Pro J-21. Préparer comparatif Aurora / Novalia. Opportunité PJ détectée (potentiel 1 200€).
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/comparateur')} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Target size={12} /> Comparer
            </button>
            <button onClick={() => navigate(`/devis/new?client=${client.id}`)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: T.ark, color: '#fff', border: 'none',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Zap size={12} /> Créer devis PJ
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${T.cardBorder}`,
          marginBottom: 18, overflowX: 'auto',
        }}>
          <TabButton label="Vue 360°"  active={tab === 'vue360'}    onClick={() => setTab('vue360')} />
          <TabButton label="Contrats"  active={tab === 'contrats'}  onClick={() => setTab('contrats')}  badge={DEMO_CONTRACTS.length} />
          <TabButton label="Devis"     active={tab === 'devis'}     onClick={() => setTab('devis')}     badge={DEMO_DEVIS.length} />
          <TabButton label="Documents" active={tab === 'documents'} onClick={() => setTab('documents')} badge={DEMO_DOCS.length} />
          <TabButton label="Activité"  active={tab === 'activite'}  onClick={() => setTab('activite')} />
          <TabButton label="ARK"       active={tab === 'ark'}       onClick={() => setTab('ark')} />
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {tab === 'vue360' && (
            <Vue360Tab key="vue360" client={client}
              contracts={DEMO_CONTRACTS} devis={DEMO_DEVIS}
              docs={DEMO_DOCS} tasks={DEMO_TASKS} history={DEMO_HISTORY}
              navigate={navigate}
            />
          )}
          {tab === 'contrats' && (
            <motion.div key="ct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEMO_CONTRACTS.map(c => (
                  <GlassPanel key={c.id} hover style={{ padding: 14 }} onClick={() => navigate('/contrats')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.type}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{c.compagnie} • Échéance {c.echeance}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(c.prime)}</div>
                        <div style={{ fontSize: 11, color: c.alert ? T.warning : T.success, fontWeight: 600 }}>
                          {c.alert ? `Renouv. J-${c.jours}` : `Actif`}
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </motion.div>
          )}
          {tab === 'devis' && (
            <motion.div key="dv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEMO_DEVIS.map(d => (
                  <GlassPanel key={d.id} hover style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Devis {d.ref} — {d.produit}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Envoyé le {d.envoye}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(d.montant)}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: d.statut === 'signe' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                          color: d.statut === 'signe' ? T.success : T.warning,
                        }}>{d.statut === 'signe' ? 'Signé' : 'En attente'}</span>
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </motion.div>
          )}
          {tab === 'documents' && (
            <motion.div key="dc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassPanel style={{ padding: 14 }}>
                {DEMO_DOCS.map((d, i) => (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0',
                    borderBottom: i < DEMO_DOCS.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                  }}>
                    <FileText size={14} color={T.textMuted} />
                    <span style={{ flex: 1, fontSize: 13, color: T.text }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{d.when}</span>
                  </div>
                ))}
              </GlassPanel>
            </motion.div>
          )}
          {tab === 'activite' && <ActiviteTab key="act" history={DEMO_HISTORY} />}
          {tab === 'ark' && (
            <motion.div key="ark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassPanel style={{ padding: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(91,77,245,0.03))' }}>
                <SectionTitle icon={Sparkles} title="Recommandations ARK" iconColor={T.ark} />
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
                  <p><strong style={{ color: T.text }}>🎯 Cross-sell PJ</strong> — Profil idéal pour Protection Juridique. Potentiel <strong style={{ color: T.success }}>1 200€/an</strong>.</p>
                  <p><strong style={{ color: T.text }}>⚠️ Renouvellement RC Pro J-21</strong> — Préparer comparatif Aurora / Novalia. La prime actuelle (2 800€) est <strong style={{ color: T.warning }}>au-dessus du marché</strong>.</p>
                  <p><strong style={{ color: T.text }}>💡 Multi-équipement</strong> — 3 contrats, mais pas de Santé ni Prévoyance. Suggérer un bilan complet.</p>
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

const btnPrimary = {
  padding: '9px 14px', background: T.accent, color: '#fff', border: 'none',
  borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 4px 14px rgba(91,77,245,0.25)',
}

const btnGhost = {
  padding: '9px 14px', background: 'rgba(255,255,255,0.04)', color: T.text,
  border: `1px solid ${T.cardBorderLight}`, borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
}
