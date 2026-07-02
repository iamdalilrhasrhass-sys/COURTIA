import { useEffect, useState } from 'react'
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
import DossierOrbitalRings from '../components/widgets/DossierOrbitalRings'
import DealTimelineScrubber from '../components/widgets/DealTimelineScrubber'
import RiskDnaHelix from '../components/widgets/RiskDnaHelix'
import api from '../api'
import {
  buildClientHistory,
  normalizeClientDetail,
  normalizeContract,
  normalizeTask,
} from '../lib/clientViewModel'

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

const STATUS = {
  actif:      { label: 'Actif',     color: T.success },
  prospect:   { label: 'Prospect',  color: T.blue },
  a_risque:   { label: 'À risque',  color: T.danger },
  silencieux: { label: 'Silencieux',color: T.warning },
  inactif:    { label: 'Inactif',   color: T.textMuted },
  resilié:    { label: 'Résilié',   color: T.textMuted },
  résilié:    { label: 'Résilié',   color: T.textMuted },
  perdu:      { label: 'Perdu',     color: T.textMuted },
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
function Vue360Tab({ client, contracts, devis, docs, tasks, relances, history, navigate }) {
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
          {tasks.length === 0 && (
            <div style={{ fontSize: 12, color: T.textMuted, padding: '7px 0', borderTop: `1px solid ${T.cardBorder}` }}>
              Aucune tâche planifiée.
            </div>
          )}
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
            Relances ({relances.length})
          </div>
          {relances.length === 0 && (
            <div style={{ fontSize: 12, color: T.textMuted, padding: '7px 0', borderTop: `1px solid ${T.cardBorder}` }}>
              Aucune relance active.
            </div>
          )}
          {relances.map(r => (
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

      {/* Complétude dossier — Orbital Rings */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <DossierOrbitalRings
          docsScore={docs.length >= 3 ? 85 : 40}
          fieldsScore={75}
          missingDocs={docs.length < 3 ? [{ id: 'ri', label: "Relevé d'information", action: 'whatsapp' }] : []}
          missingFields={[{ id: 'bonus_malus', label: 'Bonus/malus' }]}
          clientName={client?.name || 'Client'}
          onAction={({ type, item }) => console.log('Orbital action:', type, item)}
          size={200}
        />
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

      {/* Timeline dossier */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={Clock} title="Historique du dossier" iconColor={T.ark} />
        <DealTimelineScrubber
          events={history.slice(0, 8).map((e, i) => ({
            id: String(e.id), label: e.label, date: e.date,
            type: i === 0 ? 'current' : 'past', icon: e.icon?.name || 'file'
          }))}
        />
      </GlassPanel>

      {/* Risque dossier — DNA Helix */}
      <GlassPanel glow={false} style={{ padding: 16 }}>
        <SectionTitle icon={AlertTriangle} title="Profil de risque" iconColor={T.warning} />
        <RiskDnaHelix
          factors={[
            { id: 'sinistres', label: 'Sinistralité', value: 45, weight: 0.3 },
            { id: 'impayes', label: 'Impayés', value: 20, weight: 0.25 },
            { id: 'anciennete', label: 'Ancienneté', value: 85, weight: 0.2 },
            { id: 'diversification', label: 'Diversification', value: 60, weight: 0.15 },
            { id: 'engagement', label: 'Engagement', value: 70, weight: 0.1 },
          ]}
        />
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
  if (history.length === 0) {
    return (
      <GlassPanel style={{ padding: 18 }}>
        <div style={{ fontSize: 13, color: T.textMuted }}>Aucune activité enregistrée.</div>
      </GlassPanel>
    )
  }

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
  const [client, setClient] = useState(null)
  const [contracts, setContracts] = useState([])
  const [devis, setDevis] = useState([])
  const [docs, setDocs] = useState([])
  const [tasks, setTasks] = useState([])
  const [relances, setRelances] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadClient() {
    setLoading(true)
    setError('')
    try {
      const [clientRes, contractsRes, tasksRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/contrats?client_id=${id}`).catch(() => ({ data: [] })),
        api.get(`/taches?clientId=${id}`).catch(() => ({ data: [] })),
      ])

      const nextClient = normalizeClientDetail(clientRes.data)
      const nextContracts = (Array.isArray(contractsRes.data) ? contractsRes.data : []).map(normalizeContract)
      const nextTasks = (Array.isArray(tasksRes.data) ? tasksRes.data : []).map(normalizeTask)
      const nextHistory = buildClientHistory(nextClient, nextContracts, nextTasks).map((event) => ({
        ...event,
        icon: event.id.startsWith('task') ? CheckCircle : event.id.startsWith('contract') ? Shield : User,
      }))

      setClient(nextClient)
      setContracts(nextContracts)
      setTasks(nextTasks)
      setHistory(nextHistory)
      setDevis([])
      setDocs([])
      setRelances([])
    } catch (_err) {
      setClient(null)
      setContracts([])
      setTasks([])
      setHistory([])
      setError('Client introuvable ou inaccessible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClient()
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', color: T.text, padding: '20px 24px 48px', display: 'grid', placeItems: 'center' }}>
        <VibeBackdrop intensity={0.7} />
        <div style={{ position: 'relative', zIndex: 1, color: T.textSecondary }}>Chargement du dossier client...</div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ minHeight: '100vh', color: T.text, padding: '20px 24px 48px', display: 'grid', placeItems: 'center' }}>
        <VibeBackdrop intensity={0.7} />
        <GlassPanel style={{ padding: 24, maxWidth: 520, textAlign: 'center' }}>
          <AlertTriangle size={34} color={T.danger} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>{error || 'Client introuvable.'}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/clients')} style={btnGhost}>Retour clients</button>
            <button onClick={loadClient} style={btnPrimary}>Réessayer</button>
          </div>
        </GlassPanel>
      </div>
    )
  }

  const status = STATUS[client.statut] || STATUS.actif
  const totalPrime = contracts.reduce((s, c) => s + c.prime, 0)
  const arkInsight = contracts.length > 0
    ? `${contracts.length} contrat${contracts.length > 1 ? 's' : ''} chargé${contracts.length > 1 ? 's' : ''}. Prime annuelle suivie : ${fmtEur(totalPrime)}.`
    : 'Aucun contrat rattaché à ce client pour le moment.'

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
            }}>{client.name}</h1>
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
              }}>{contracts.length} contrat{contracts.length !== 1 ? 's' : ''} • {fmtEur(totalPrime)}/an</span>
              <span style={{ fontSize: 12, color: T.textMuted }}>{client.type} • {client.city}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/contrats/new?clientId=${client.id}`)} style={btnPrimary}>
              <Plus size={13} /> Nouveau contrat
            </button>
            <button onClick={() => navigate(`/taches?clientId=${client.id}`)} style={btnGhost}>
              <CheckCircle size={13} /> Ajouter tâche
            </button>
            <button onClick={() => { if (client.email !== '—') window.location.href = `mailto:${client.email}` }} style={btnGhost}>
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
              {arkInsight}
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
            <button onClick={() => navigate(`/contrats/new?clientId=${client.id}`)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: T.ark, color: '#fff', border: 'none',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Zap size={12} /> Nouveau contrat
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${T.cardBorder}`,
          marginBottom: 18, overflowX: 'auto',
        }}>
          <TabButton label="Vue 360°"  active={tab === 'vue360'}    onClick={() => setTab('vue360')} />
          <TabButton label="Contrats"  active={tab === 'contrats'}  onClick={() => setTab('contrats')}  badge={contracts.length} />
          <TabButton label="Devis"     active={tab === 'devis'}     onClick={() => setTab('devis')}     badge={devis.length} />
          <TabButton label="Documents" active={tab === 'documents'} onClick={() => setTab('documents')} badge={docs.length} />
          <TabButton label="Activité"  active={tab === 'activite'}  onClick={() => setTab('activite')} />
          <TabButton label="ARK"       active={tab === 'ark'}       onClick={() => setTab('ark')} />
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          {tab === 'vue360' && (
            <Vue360Tab key="vue360" client={client}
              contracts={contracts} devis={devis}
              docs={docs} tasks={tasks} relances={relances} history={history}
              navigate={navigate}
            />
          )}
          {tab === 'contrats' && (
            <motion.div key="ct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contracts.length === 0 && (
                  <GlassPanel style={{ padding: 14 }}>
                    <div style={{ fontSize: 13, color: T.textMuted }}>Aucun contrat rattaché à ce client.</div>
                  </GlassPanel>
                )}
                {contracts.map(c => (
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
                {devis.length === 0 && (
                  <GlassPanel style={{ padding: 14 }}>
                    <div style={{ fontSize: 13, color: T.textMuted }}>Aucun devis rattaché à ce client.</div>
                  </GlassPanel>
                )}
                {devis.map(d => (
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
                {docs.length === 0 && (
                  <div style={{ fontSize: 13, color: T.textMuted }}>Aucun document rattaché à ce client.</div>
                )}
                {docs.map((d, i) => (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0',
                    borderBottom: i < docs.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
                  }}>
                    <FileText size={14} color={T.textMuted} />
                    <span style={{ flex: 1, fontSize: 13, color: T.text }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{d.when}</span>
                  </div>
                ))}
              </GlassPanel>
            </motion.div>
          )}
          {tab === 'activite' && <ActiviteTab key="act" history={history} />}
          {tab === 'ark' && (
            <motion.div key="ark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassPanel style={{ padding: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(91,77,245,0.03))' }}>
                <SectionTitle icon={Sparkles} title="Recommandations ARK" iconColor={T.ark} />
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
                  <p><strong style={{ color: T.text }}>Dossier réel chargé</strong> — {client.name} est synchronisé avec le portefeuille du cabinet.</p>
                  <p><strong style={{ color: T.text }}>Contrats</strong> — {contracts.length} contrat{contracts.length !== 1 ? 's' : ''} associé{contracts.length !== 1 ? 's' : ''}, {fmtEur(totalPrime)}/an suivi.</p>
                  <p><strong style={{ color: T.text }}>Suivi</strong> — {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} planifiée{tasks.length !== 1 ? 's' : ''}.</p>
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
