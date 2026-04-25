import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, User, Shield, Activity, FileText, CheckSquare, Clock, Archive, Bot } from 'lucide-react'
import api from '../api'
import { computeScores, getScoreColor, SCORE_HEX } from '../lib/scoring'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleBackground from '../components/BubbleBackground'
import ARKChatTab from '../components/ARKChatTab'
import '../styles/design-system.css'

// ─── HELPERS ──────────────────────────────────────────────────────────────
const fmt = (v) => (v === null || v === undefined || v === '') ? '—' : String(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'

// ─── STATUS CONFIG ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  actif: { label: 'Actif', color: '#10b981' },
  prospect: { label: 'Prospect', color: '#3b82f6' },
  inactif: { label: 'Inactif', color: '#9ca3af' },
  a_risque: { label: 'À risque', color: '#ef4444' },
  opportunite: { label: 'Opportunité', color: '#f59e0b' },
  résilié: { label: 'Résilié', color: '#dc2626' },
  resilié: { label: 'Résilié', color: '#dc2626' },
  perdu: { label: 'Perdu', color: '#dc2626' },
}

// ─── TABS ─────────────────────────────────────────────────────────────────
const TABS_CONFIG = [
  { id: 'activite', label: 'Activité', icon: Activity },
  { id: 'contrats', label: 'Contrats', icon: Shield },
  { id: 'taches', label: 'Tâches', icon: CheckSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'historique', label: 'Historique', icon: Clock },
]

function PlaceholderTab({ title, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>
      <Icon size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm mt-1">Contenu à venir</p>
    </motion.div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
        <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{fmt(value)}</p>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [contrats, setContrats] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('activite')

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true); setError(null)
        const [clientRes, contratsRes, tachesRes] = await Promise.all([
          api.get(`/api/clients/${id}`), 
          api.get(`/api/clients/${id}/contrats`),
          api.get(`/api/taches?clientId=${id}`).catch(() => ({ data: [] }))
        ])
        setClient(clientRes.data)
        setContrats(Array.isArray(contratsRes.data) ? contratsRes.data : [])
        setTaches(Array.isArray(tachesRes.data) ? tachesRes.data : [])
      } catch (err) { setError('Client introuvable.'); toast.error('Client introuvable.') }
      finally { setLoading(false) }
    }
    loadAll()
  }, [id])

  const statut = (client?.statut || '').toLowerCase()
  const statusCfg = STATUS_CONFIG[statut] || { label: 'Inconnu', color: '#6b7280' }

  if (loading) return (
    <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-cream)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (error) return (
    <div className="p-8 text-center h-screen flex flex-col justify-center items-center" style={{ background: 'var(--bg-cream)', color: '#ef4444' }}>
      <p className="font-semibold">{error}</p>
      <button onClick={() => navigate('/clients')} className="mt-4 px-4 py-2 rounded-lg text-white" style={{ background: '#ef4444', border: '0.5px solid rgba(255,255,255,0.1)' }}>Retour</button>
    </div>
  )
  if (!client) return null

  const renderTabContent = () => {
    const tabData = {
      activite: { title: 'Activité', icon: Activity },
      contrats: { title: 'Contrats', icon: Shield },
      taches: { title: 'Tâches', icon: CheckSquare },
      documents: { title: 'Documents', icon: FileText },
      historique: { title: 'Historique', icon: Clock },
    }
    const t = tabData[activeTab] || tabData.activite
    return <PlaceholderTab title={t.title} icon={t.icon} />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-cream)', fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="normal" />
      <div className="relative" style={{ zIndex: 1 }}>

        {/* Header bar */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: 'var(--border-fine)' }}>
          <button onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(20px)',
              borderRadius: 'var(--r-md)',
              border: 'var(--border-fine)',
              boxShadow: 'var(--shadow-bubble)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/clients/${id}/edit`)}
              style={{
                padding: '8px 18px',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'var(--r-md)',
                border: 'var(--border-fine)',
                boxShadow: 'var(--shadow-bubble)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble)' }}
            >Modifier</button>
            <button onClick={() => navigate(`/contrats/new?clientId=${id}`)}
              style={{
                padding: '8px 18px',
                background: '#0a0a0a',
                borderRadius: 'var(--r-md)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                boxShadow: 'var(--shadow-bubble)',
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >Nouveau contrat</button>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 p-6">

          {/* LEFT: Client info card (33%) */}
          <div className="lg:w-[33%] flex-shrink-0">
            <BubbleCard hover={false} padding={24}>
              {/* Avatar + Name + Status */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 text-2xl rounded-full text-white flex items-center justify-center font-black mx-auto select-none"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
                  {getInitials(client)}
                </div>
                <h2 className="text-xl font-black text-gray-900 mt-4" style={{ fontFamily: 'Arial' }}>{client.prenom} {client.nom}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{client.profession || 'Profession non renseignée'}</p>
                <div className="mt-3 inline-flex">
                  <BubbleBadge color={statusCfg.color} size="md" pulse={statut === 'a_risque'}>{statusCfg.label}</BubbleBadge>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: 'var(--border-fine)', marginBottom: 16 }} />

              {/* Info rows */}
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Téléphone" value={client.telephone} />
              <InfoRow icon={MapPin} label="Adresse" value={client.adresse ? `${client.adresse}, ${client.postal_code || ''} ${client.city || ''}`.replace(/, $/, '') : '—'} />
              <InfoRow icon={Building} label="Profession" value={client.profession} />
              <InfoRow icon={User} label="Segment" value={client.segment} />
              <InfoRow icon={Calendar} label="Client depuis" value={fmtDate(client.created_at)} />

              {/* Risk score badge */}
              <div className="mt-6 pt-4" style={{ borderTop: 'var(--border-fine)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Score Risque</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full rounded-full h-2" style={{ background: 'rgba(0,0,0,0.06)' }}>
                      <div className="h-2 rounded-full" style={{
                        width: `${Math.min(100, Math.max(0, Number(client.score_risque) || 0))}%`,
                        background: Number(client.score_risque) >= 70 ? '#ef4444' : Number(client.score_risque) >= 40 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                  <span className="text-lg font-black text-gray-900">{Number(client.score_risque) || 0}</span>
                </div>
              </div>
            </BubbleCard>
          </div>

          {/* CENTER: Tabs (40%) */}
          <div className="flex-1 lg:w-[40%] min-w-0">
            <BubbleCard hover={false} padding={0}>
              {/* Tab navigation */}
              <div className="flex" style={{ borderBottom: 'var(--border-fine)' }}>
                {TABS_CONFIG.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{
                        position: 'relative',
                        flex: 1,
                        padding: '14px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        transition: 'color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}>
                      <Icon size={14} />
                      {tab.label}
                      {isActive && (
                        <motion.div layoutId="tab-underline"
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: '10%',
                            right: '10%',
                            height: 2,
                            background: '#0a0a0a',
                            borderRadius: 1,
                          }} />
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Tab content */}
              <div className="p-6 min-h-[300px]">
                <AnimatePresence mode="wait">
                  {renderTabContent()}
                </AnimatePresence>
              </div>
            </BubbleCard>
          </div>

          {/* RIGHT: ArkChat (27%) */}
          <div className="lg:w-[27%] flex-shrink-0">
            <div style={{ position: 'sticky', top: 24 }}>
              <BubbleCard hover={false} padding={16}>
                <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: 'var(--border-fine)' }}>
                  <Bot size={16} style={{ color: 'var(--accent-violet)' }} />
                  <span className="text-sm font-bold text-gray-900">ARK Chat</span>
                </div>
                <ARKChatTab clientId={client.id} client={client} />
              </BubbleCard>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
