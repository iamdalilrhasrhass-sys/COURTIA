import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { FileText, Shield, CheckSquare, Bot, ArrowLeft, Mail, Phone, MapPin, Building, Star, AlertTriangle, Calendar, User, Sparkles, Activity, Heart, Target, TrendingUp, ChevronDown, Clock, MessageSquare, Send, RefreshCw } from 'lucide-react'
import api from '../api'
import { computeScores, getScoreColor, SCORE_HEX } from '../lib/scoring'
import ContratsTab from '../components/ContratsTab'
import TachesTab from '../components/TachesTab'
import ARKChatTab from '../components/ARKChatTab'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'
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

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────
function AnimatedNumber({ value }) {
    const motionValue = useMotionValue(0)
    const transform = useTransform(motionValue, v => Math.round(v))
    const [displayValue, setDisplayValue] = useState('0')

    useEffect(() => {
        const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
        const unsubscribe = transform.onChange(setDisplayValue)
        return () => { controls.stop(); unsubscribe() }
    }, [value, motionValue, transform])

    return <span suppressHydrationWarning>{displayValue}</span>
}

// ─── INFO ROW (Bubble style) ──────────────────────────────────────────────
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

// ─── OLD-STYLE CARD & DATA ITEM (for InfosTab) ────────────────────────────
const Card = ({ title, children, className, ...props }) => (
  <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`} {...props}>
    <h3 className="font-bold text-gray-800 px-4 py-3 border-b border-slate-100" style={{ fontSize: 14 }}>{title}</h3>
    <div style={{ padding: '0.75rem' }}>{children}</div>
  </div>
)

const DataItem = ({ icon: Icon, label, value }) => (
  <div>
    <dt className="text-xs text-gray-400 uppercase tracking-wider">{label}</dt>
    <dd className="mt-1 flex items-center gap-2 text-sm text-gray-700 font-medium"><Icon size={12} className="text-gray-500" /> {fmt(value)}</dd>
  </div>
)

// ─── BUBBLE & SCORE COMPONENTS ────────────────────────────────────────────
const BubbleCriterion = ({ label, value, max, color }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="text-xs">
      <div className="flex justify-between items-center mb-1"><span className="font-semibold text-slate-700">{label}</span><span className="font-bold" style={{ color }}>{value}</span></div>
      <div className="w-full bg-slate-200 rounded-full h-1.5"><motion.div className="h-1.5 rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}/></div>
    </div>
  )
}

function BubbleTooltip({ type, client, scores, onMouseEnter, onMouseLeave }) {
  const contentMap = {
    global: { title: "Score Global", Icon: Activity, score: scores.globalScore, content: (
      <><p className="text-sm text-slate-700 mt-2 leading-relaxed">Ce score synthétise le profil complet du client. Un score élevé indique un client sain, fidèle et à fort potentiel.</p><div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2"><h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Signaux Clés</h4>{scores.signaux.slice(0, 3).map(s => <div key={s.label} className="text-xs font-semibold px-2 py-1 rounded-full inline-block mr-2" style={{ color: s.color, background: s.bg }}>{s.label}</div>)}</div><button onClick={() => alert("Détails à venir")} className="mt-4 w-full text-center text-sm font-semibold text-blue-600 hover:underline">Voir les détails</button></>
    )},
    risque: { title: "Risque", Icon: AlertTriangle, score: scores.risque, coeff: "x4", content: (
      <><div className="space-y-3 mt-4"><BubbleCriterion label="Bonus-Malus" value={client.bonus_malus || 1} max={3.5} color={SCORE_HEX[getScoreColor(100 - (((client.bonus_malus || 1) - 0.5) / 3 * 100), 'fidelite')]} /><BubbleCriterion label="Sinistres (3 ans)" value={client.nb_sinistres_3ans || 0} max={5} color={SCORE_HEX[getScoreColor(100 - ((client.nb_sinistres_3ans || 0) * 20), 'fidelite')]} /><BubbleCriterion label="Jeune conducteur" value={(client.annees_permis || 10) < 5 ? 1 : 0} max={1} color={(client.annees_permis || 10) < 5 ? SCORE_HEX.red : SCORE_HEX.green} /></div><div className="mt-4 pt-4 border-t border-slate-200/80"><h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"><Sparkles size={14} className="text-purple-500" /> Conseil ARK</h4><p className="text-xs text-slate-700 bg-purple-50 p-2 rounded-lg">Proposer un stage de conduite ou une franchise modulable peut améliorer ce score.</p></div></>
    )},
    fidelite: { title: "Fidélité", Icon: Heart, score: scores.fidelite, coeff: "x2.5", content: (
      <><div className="space-y-3 mt-4"><BubbleCriterion label="Ancienneté" value={Math.round(scores.ancienneteAns)} max={10} color={SCORE_HEX[getScoreColor(scores.ancienneteAns * 10, 'fidelite')]} /><BubbleCriterion label="Contrats actifs" value={scores.nbActifs} max={5} color={SCORE_HEX[getScoreColor(scores.nbActifs * 20, 'fidelite')]} /></div><div className="mt-4 pt-4 border-t border-slate-200/80"><h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"><Sparkles size={14} className="text-purple-500" /> Conseil ARK</h4><p className="text-xs text-slate-700 bg-purple-50 p-2 rounded-lg">Un client fidèle est votre meilleur ambassadeur. Pensez à une offre de parrainage.</p></div></>
    )},
    opportunite: { title: "Opportunité", Icon: Target, score: scores.opportunite, coeff: "x2", content: (
      <><div className="space-y-3 mt-4"><BubbleCriterion label="Mono-contrat" value={scores.nbActifs === 1 ? 1 : 0} max={1} color={scores.nbActifs === 1 ? SCORE_HEX.green : SCORE_HEX.neutral} /><BubbleCriterion label="Profil Pro" value={(client.segment || '').toLowerCase().includes('pro') ? 1 : 0} max={1} color={(client.segment || '').toLowerCase().includes('pro') ? SCORE_HEX.green : SCORE_HEX.neutral} /><BubbleCriterion label="En couple" value={(client.situation_familiale || '').toLowerCase() === 'marié' ? 1 : 0} max={1} color={(client.situation_familiale || '').toLowerCase() === 'marié' ? SCORE_HEX.green : SCORE_HEX.neutral} /></div><div className="mt-4 pt-4 border-t border-slate-200/80"><h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"><Sparkles size={14} className="text-purple-500" /> Conseil ARK</h4><p className="text-xs text-slate-700 bg-purple-50 p-2 rounded-lg">Ce client est idéal pour une proposition de contrat Prévoyance ou MRH.</p></div></>
    )},
    retention: { title: "Rétention", Icon: TrendingUp, score: scores.retention, coeff: "x1.5", content: (
      <><div className="space-y-3 mt-4"><BubbleCriterion label="Échéance proche" value={scores.prochaineEcheanceDays !== null && scores.prochaineEcheanceDays < 90 ? 90 - scores.prochaineEcheanceDays : 0} max={90} color={scores.prochaineEcheanceDays !== null && scores.prochaineEcheanceDays < 90 ? SCORE_HEX.red : SCORE_HEX.green} /><BubbleCriterion label="Ancienneté" value={Math.round(scores.ancienneteAns)} max={10} color={SCORE_HEX[getScoreColor(scores.ancienneteAns * 10, 'fidelite')]} /></div><div className="mt-4 pt-4 border-t border-slate-200/80"><h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"><Sparkles size={14} className="text-purple-500" /> Conseil ARK</h4><p className="text-xs text-slate-700 bg-purple-50 p-2 rounded-lg">Contrat arrivant à échéance. Contactez-le avec une offre de renouvellement.</p></div></>
    )},
  }
  const item = contentMap[type]

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          pointerEvents: 'auto',
          background: `
            radial-gradient(circle at 30% 20%, rgba(147,51,234,0.18) 0%, transparent 55%),
            radial-gradient(circle at 70% 80%, rgba(59,130,246,0.15) 0%, transparent 55%),
            conic-gradient(from 0deg at 50% 50%, rgba(147,51,234,0.08), rgba(59,130,246,0.08), rgba(147,51,234,0.08), rgba(236,72,153,0.06), rgba(147,51,234,0.08)),
            rgba(255,255,255,0.18)
          `,
          backdropFilter: 'blur(32px) saturate(220%)',
          border: '2px solid rgba(147,51,234,0.45)',
          boxShadow: '0 0 80px rgba(147,51,234,0.4), 0 0 40px rgba(59,130,246,0.3), inset 0 0 60px rgba(255,255,255,0.25)',
          borderRadius: '60% 40% 55% 45% / 45% 55% 45% 55%',
          animation: 'bubbleFloat 6s ease-in-out infinite',
          width: 'min(560px, 90vw)',
          padding: '48px 52px',
        }}
        className="relative text-slate-900"
      >
        <div className="flex justify-between items-start"><div className="flex items-center gap-3"><item.Icon size={24} /><h3 className="text-2xl font-black">{item.title}</h3></div>{item.coeff && <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">Coeff. {item.coeff}</span>}</div>
        <div className="text-5xl font-black my-3">{item.score} <span className="text-3xl text-slate-500">/100</span></div>{item.content}
      </motion.div>
    </div>
  )
}

function ScoreGauge({ score, label, color, onHover, onLeave }) {
  const size = 70, strokeWidth = 7, radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2 text-center relative cursor-pointer group" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="relative rounded-full"><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" /><motion.circle initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: 'easeOut' }} cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeLinecap="round" /></svg>
        <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold text-gray-800">{score}</span></div>
      </div><span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

const ScoreLegend = () => {
  const [isOpen, setIsOpen] = useState(false)
  const legendItems = [{ title: "Risque", desc: "Probabilité de sinistre (bonus-malus, historique, zone...)" },{ title: "Fidélité", desc: "Attachement au cabinet (ancienneté, multi-équipement...)" },{ title: "Opportunité", desc: "Potentiel de ventes additionnelles (profil, contrats...)" },{ title: "Rétention", desc: "Risque de départ (échéances, satisfaction...)" }]
  return (
    <div className="mt-8 border-t border-slate-200 pt-6 text-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center font-semibold text-gray-700 hover:text-gray-900">Comment sont calculés les scores ?<ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /></button>
      <AnimatePresence>{isOpen && (<motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '16px' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden"><ul className="space-y-3 text-xs text-gray-500">{legendItems.map(item => (<li key={item.title}><strong className="text-gray-600">{item.title}:</strong> {item.desc}</li>))}</ul></motion.div>)}</AnimatePresence>
    </div>
  )
}

function ScoreSidebar({ scores, onBubbleEnter, onBubbleLeave }) {
  if (!scores) return null
  const { globalScore } = scores

  const getGlobalScoreConfig = (s) => {
    if (s >= 85) return { label: 'Excellent', color: '#22c55e', description: 'Profil client optimal, stable et à fort potentiel.' }
    if (s >= 70) return { label: 'Bon', color: '#3b82f6', description: 'Client fiable avec quelques axes d\'amélioration.' }
    if (s >= 50) return { label: 'À surveiller', color: '#f59e0b', description: 'Nécessite une attention pour prévenir les risques.' }
    return { label: 'Critique', color: '#ef4444', description: 'Action prioritaire requise pour rétention.' }
  }
  const globalScoreConfig = getGlobalScoreConfig(globalScore)

  return (
    <aside className="w-full lg:w-[260px] flex-shrink-0 bg-white/70 backdrop-blur-sm lg:border-r border-gray-100 p-4 lg:sticky lg:top-0 h-auto lg:h-screen overflow-y-auto">
      <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-md flex items-center justify-center text-white"><Sparkles size={10} /></div><h2 className="font-bold text-gray-900" style={{ fontSize: 14 }}>ARK Score™</h2></div>
      <div className="text-center my-6 cursor-pointer" onMouseEnter={() => onBubbleEnter('global')} onMouseLeave={onBubbleLeave}><p className="text-sm font-semibold text-gray-500">Score Global</p><p className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tight my-1"><AnimatedNumber value={globalScore} /></p><div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: globalScoreConfig.color, color: 'white' }}>{globalScoreConfig.label}</div><p className="mt-3 text-xs text-gray-500 leading-relaxed px-4">{globalScoreConfig.description}</p></div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-4"><ScoreGauge score={scores.risque} label="Risque" color="#ef4444" onHover={() => onBubbleEnter('risque')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.fidelite} label="Fidélité" color="#3b82f6" onHover={() => onBubbleEnter('fidelite')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.opportunite} label="Opportunité" color="#22c55e" onHover={() => onBubbleEnter('opportunite')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.retention} label="Rétention" color="#f59e0b" onHover={() => onBubbleEnter('retention')} onLeave={onBubbleLeave} /></div>
      <ScoreLegend /><footer className="text-center mt-8"><p className="text-xs text-gray-300">COURTIA®</p></footer>
    </aside>
  )
}

// ─── INFOS TAB ─────────────────────────────────────────────────────────────
function InfosTab({ client }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Card title="Identité"><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"><DataItem icon={User} label="Nom Complet" value={`${client.prenom} ${client.nom}`} /><DataItem icon={Mail} label="Email" value={client.email} /><DataItem icon={Phone} label="Téléphone" value={client.telephone} /><DataItem icon={MapPin} label="Adresse" value={client.adresse ? `${client.adresse}, ${client.postal_code || ''} ${client.city || ''}`.replace(/, $/, '') : '—'} /><DataItem icon={Building} label="Profession" value={client.profession} /><DataItem icon={User} label="Segment" value={client.segment} /></dl></Card>
      <Card title="Profil d'assurance"><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"><DataItem icon={Star} label="Bonus-Malus" value={client.bonus_malus} /><DataItem icon={Shield} label="Années permis" value={client.annees_permis ? `${client.annees_permis} ans` : null} /><DataItem icon={AlertTriangle} label="Sinistres (3 ans)" value={client.nb_sinistres_3ans} /><DataItem icon={Calendar} label="Client depuis" value={fmtDate(client.created_at)} /><DataItem icon={MapPin} label="Zone" value={client.zone_geographique} /><DataItem icon={User} label="Situation" value={client.situation_familiale} /></dl></Card>
    </motion.div>
  )
}

// ─── MESSAGES MOCK DATA ────────────────────────────────────────────────────
const DOSSIER_STATUS = {
  brouillon: { label: 'Brouillon', color: '#9ca3af' },
  en_cours: { label: 'En cours', color: '#3b82f6' },
  relance: { label: 'Relancé', color: '#f59e0b' },
  reponse_recue: { label: 'Réponse reçue', color: '#10b981' },
  valide: { label: 'Validé', color: '#8b5cf6' },
  refuse: { label: 'Refusé', color: '#ef4444' },
}

const CANAL_ICON = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
}

const CANAL_LABEL = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
}

const DIRECTION_STYLE = {
  envoye: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Envoyé' },
  recu: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Reçu' },
}

const MESSAGE_STATUS = {
  envoye: { label: 'Envoyé', color: '#9ca3af' },
  livre: { label: 'Livré', color: '#3b82f6' },
  lu: { label: 'Lu', color: '#10b981' },
  echoue: { label: 'Échoué', color: '#ef4444' },
}

const mockMessages = [
  {
    id: 1,
    canal: 'email',
    direction: 'envoye',
    date: new Date('2026-04-24T10:30:00'),
    contenu: 'Bonjour, votre contrat Auto arrive à échéance le 15 mai. Souhaitez-vous un rendez-vous pour en discuter ?',
    statut: 'lu',
    dossier_statut: 'en_cours',
  },
  {
    id: 2,
    canal: 'sms',
    direction: 'recu',
    date: new Date('2026-04-24T11:45:00'),
    contenu: 'Oui je suis disponible jeudi prochain à 14h pour faire le point sur mon contrat.',
    statut: 'lu',
    dossier_statut: 'en_cours',
  },
  {
    id: 3,
    canal: 'whatsapp',
    direction: 'envoye',
    date: new Date('2026-04-23T09:15:00'),
    contenu: '📋 Votre devis MRH est prêt ! Prime à 18,50€/mois. Je vous l\'envoie ?',
    statut: 'livre',
    dossier_statut: 'relance',
  },
  {
    id: 4,
    canal: 'email',
    direction: 'recu',
    date: new Date('2026-04-22T16:20:00'),
    contenu: 'Merci pour le devis. Pouvez-vous m\'envoyer les garanties détaillées avant que je signe ?',
    statut: 'lu',
    dossier_statut: 'reponse_recue',
  },
]

// ─── MESSAGES TAB ──────────────────────────────────────────────────────────
function MessagesTab({ clientId }) {
  const [messages, setMessages] = useState(mockMessages)
  const [sendingARK, setSendingARK] = useState(false)
  const [triggeringRelance, setTriggeringRelance] = useState(false)
  const [dossierStatut, setDossierStatut] = useState('en_cours')

  const dossierCfg = DOSSIER_STATUS[dossierStatut] || DOSSIER_STATUS.brouillon

  const fmtMessageDate = (d) => {
    const date = new Date(d)
    const jour = String(date.getDate()).padStart(2, '0')
    const mois = String(date.getMonth() + 1).padStart(2, '0')
    const heures = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${jour}/${mois} ${heures}:${minutes}`
  }

  const handleEnvoyerARK = async () => {
    setSendingARK(true)
    try {
      // await api.post('/api/messaging/send', { clientId })
      await new Promise(r => setTimeout(r, 800))
      toast.success('Message envoyé via ARK')
    } catch {
      toast.error('Échec de l\'envoi')
    } finally {
      setSendingARK(false)
    }
  }

  const handleRelancer = async () => {
    setTriggeringRelance(true)
    try {
      // await api.post('/api/messaging/relance/trigger', { clientId })
      await new Promise(r => setTimeout(r, 800))
      setDossierStatut('relance')
      toast.success('Relance déclenchée')
    } catch {
      toast.error('Échec de la relance')
    } finally {
      setTriggeringRelance(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {/* Barre d'actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <BubbleButton
            variant="primary"
            size="sm"
            onClick={handleEnvoyerARK}
            disabled={sendingARK}
          >
            <Send size={12} />
            {sendingARK ? 'Envoi...' : 'Envoyer via ARK'}
          </BubbleButton>
          <BubbleButton
            variant="secondary"
            size="sm"
            onClick={handleRelancer}
            disabled={triggeringRelance}
          >
            <RefreshCw size={12} style={triggeringRelance ? { animation: 'spin 1s linear infinite' } : {}} />
            {triggeringRelance ? 'Relance...' : 'Relancer maintenant'}
          </BubbleButton>
        </div>
        {/* Badge statut dossier */}
        <BubbleBadge color={dossierCfg.color} size="sm">
          Dossier : {dossierCfg.label}
        </BubbleBadge>
      </div>

      {/* Liste des messages */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 360,
        overflowY: 'auto',
      }}>
        {messages.length === 0 ? (
          <p style={{
            color: 'var(--text-tertiary)',
            fontSize: 12,
            textAlign: 'center',
            padding: '24px 0',
          }}>
            Aucun message pour ce client
          </p>
        ) : (
          messages.map(msg => {
            const Icon = CANAL_ICON[msg.canal] || MessageSquare
            const dirStyle = DIRECTION_STYLE[msg.direction] || DIRECTION_STYLE.envoye
            const statusCfg = MESSAGE_STATUS[msg.statut] || MESSAGE_STATUS.envoye
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 10,
                  background: dirStyle.bg,
                  borderRadius: 'var(--r-md, 12px)',
                  border: '0.5px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Icône canal */}
                <div style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '0.5px solid rgba(0,0,0,0.08)',
                }}>
                  <Icon size={13} style={{ color: dirStyle.color }} />
                </div>
                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: dirStyle.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {dirStyle.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {CANAL_LABEL[msg.canal]}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {fmtMessageDate(msg.date)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {msg.contenu}
                  </p>
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: statusCfg.color,
                      background: `${statusCfg.color}15`,
                      padding: '1px 6px',
                      borderRadius: 9999,
                    }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────
const TABS_CONFIG = [
  { id: 'activite', label: 'Activité', icon: Activity },
  { id: 'contrats', label: 'Contrats', icon: Shield },
  { id: 'taches', label: 'Tâches', icon: CheckSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'historique', label: 'Historique', icon: Clock },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
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
  const [activeBubble, setActiveBubble] = useState(null)
  const bubbleTimeoutRef = useRef(null)

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

  const handleBubbleEnter = (type) => { clearTimeout(bubbleTimeoutRef.current); setActiveBubble(type) }
  const handleBubbleLeave = () => { bubbleTimeoutRef.current = setTimeout(() => setActiveBubble(null), 300) }
  const handleBubbleMouseEnter = () => { clearTimeout(bubbleTimeoutRef.current) }
  const handleBubbleMouseLeave = () => { bubbleTimeoutRef.current = setTimeout(() => setActiveBubble(null), 300) }

  const scores = !loading && client ? {
    ...computeScores(client, contrats),
    get globalScore() { return Math.round((100 - this.risque) * 0.40 + this.fidelite * 0.25 + this.opportunite * 0.20 + this.retention * 0.15) }
  } : null

  const statut = (client?.statut || '').toLowerCase()
  const statusCfg = STATUS_CONFIG[statut] || { label: 'Inconnu', color: '#6b7280' }

  // ─── LOADING STATE ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-cream)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
    </div>
  )

  // ─── ERROR STATE ────────────────────────────────────────────────────────
  if (error) return (
    <div className="p-8 text-center h-screen flex flex-col justify-center items-center" style={{ background: 'var(--bg-cream)', color: '#ef4444' }}>
      <p className="font-semibold">{error}</p>
      <button onClick={() => navigate('/clients')} className="mt-4 px-4 py-2 rounded-lg text-white" style={{ background: '#ef4444', border: '0.5px solid rgba(255,255,255,0.1)' }}>Retour</button>
    </div>
  )

  if (!client) return null

  // ─── TAB CONTENT RENDERER ───────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'contrats':
        return <ContratsTab contrats={contrats} clientId={client.id} navigate={navigate} />
      case 'taches':
        return <TachesTab taches={taches} clientId={client.id} navigate={navigate} />
      case 'activite':
        return <PlaceholderTab title="Activité" icon={Activity} />
      case 'documents':
        return <PlaceholderTab title="Documents" icon={FileText} />
      case 'historique':
        return <PlaceholderTab title="Historique" icon={Clock} />
      case 'messages':
        return <MessagesTab clientId={client.id} />
      default:
        return <PlaceholderTab title="Activité" icon={Activity} />
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-cream)', fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="normal" />

      {/* Violet Iridescent Score Bubble Tooltip */}
      <AnimatePresence>
        {activeBubble && (
          <BubbleTooltip
            type={activeBubble}
            client={client}
            scores={scores}
            onMouseEnter={() => handleBubbleEnter(activeBubble)}
            onMouseLeave={handleBubbleLeave}
          />
        )}
      </AnimatePresence>

      <div className="relative" style={{ zIndex: 1 }}>

        {/* Header bar — Bubble style */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: 'var(--border-fine)' }}>
          <button onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
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
            <ArrowLeft size={14} /> Retour
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/clients/${id}/edit`)}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'var(--r-md)',
                border: 'var(--border-fine)',
                boxShadow: 'var(--shadow-bubble)',
                fontSize: 12,
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
                padding: '6px 14px',
                background: '#0a0a0a',
                borderRadius: 'var(--r-md)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                boxShadow: 'var(--shadow-bubble)',
                fontSize: 12,
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

        {/* Avatar + Name row */}
        <div className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: 'var(--border-fine)' }}>
          <div className="w-12 h-12 text-lg rounded-full text-white flex items-center justify-center font-black flex-shrink-0 select-none"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
            {getInitials(client)}
          </div>
          <div>
            <h1 className="font-black text-gray-900 tracking-tight" style={{ fontSize: 16 }}>{client.prenom} {client.nom}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop: 4 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'rgba(0,0,0,0.6)', fontSize:13 }}>
                <svg width="14" height="14" viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="bubbleC-mini" cx="32%" cy="22%" r="85%">
                      <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                      <stop offset="28%" stopColor="rgba(232,247,255,0.75)" />
                      <stop offset="68%" stopColor="rgba(196,181,253,0.55)" />
                      <stop offset="100%" stopColor="rgba(124,58,237,0.65)" />
                    </radialGradient>
                  </defs>
                  <path d="M 56 22 A 22 22 0 1 0 56 46" fill="none" stroke="url(#bubbleC-mini)" strokeWidth="14" strokeLinecap="round" />
                  <ellipse cx="34" cy="11" rx="3" ry="1.8" fill="rgba(255,255,255,0.85)" transform="rotate(-12 34 11)" />
                  <circle cx="68" cy="20" r="6.5" fill="rgba(186,230,253,0.55)" stroke="rgba(96,165,250,0.45)" strokeWidth="0.6" />
                </svg>
                {client.telephone || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{client.profession || 'Profession non renseignée'}</p>
              <BubbleBadge color={statusCfg.color} size="sm" pulse={statut === 'a_risque'}>{statusCfg.label}</BubbleBadge>
            </div>
          </div>
        </div>

        {/* 4-part layout: ScoreSidebar + 3 columns */}
        <div className="flex flex-col lg:flex-row">
          {/* LEFT: ScoreSidebar */}
          <ScoreSidebar
            scores={scores}
            onBubbleEnter={handleBubbleEnter}
            onBubbleLeave={handleBubbleLeave}
          />

          {/* MAIN CONTENT: 4 columns with responsive wrap */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-w-0 xl:flex-nowrap lg:flex-wrap">

            {/* Column 1: InfosTab (Identité + Profil d'assurance) */}
            <div className="xl:w-[26%] lg:w-[48%] flex-shrink-0">
              <InfosTab client={client} />
            </div>

            {/* Column 2: Tabs (Activité / Contrats / Tâches / Documents / Historique) */}
            <div className="flex-1 xl:w-[32%] lg:w-[48%] min-w-0">
              <BubbleCard hover={false} padding={0}>
                {/* Tab navigation */}
                <div className="flex overflow-x-auto" style={{ borderBottom: 'var(--border-fine)' }}>
                  {TABS_CONFIG.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{
                          position: 'relative',
                          flex: 1,
                          padding: '10px 8px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                          color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          transition: 'color 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}>
                        <Icon size={12} />
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
                <div style={{ padding: '0.75rem', minHeight: 280 }}>
                  <AnimatePresence mode="wait">
                    {renderTabContent()}
                  </AnimatePresence>
                </div>
              </BubbleCard>
            </div>

            {/* Column 3: Contracts (vertical mini cards) */}
            <div className="xl:w-[22%] lg:w-full lg:order-last xl:order-none flex-shrink-0">
              <BubbleCard hover={false} padding={12}>
                <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: 'var(--border-fine)' }}>
                  <Shield size={14} style={{ color: 'var(--accent-violet)' }} />
                  <span className="font-bold text-gray-900" style={{ fontSize: 13 }}>Contrats</span>
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {(!contrats || contrats.length === 0) ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      Aucun contrat
                    </p>
                  ) : (
                    contrats.map(contrat => {
                      const echeance = contrat.date_echeance
                        ? new Date(contrat.date_echeance).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
                        : 'N/A'
                      return (
                        <div
                          key={contrat.id}
                          onClick={() => navigate(`/contrats/${contrat.id}`)}
                          style={{
                            background: 'rgba(255,255,255,0.6)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: 'var(--r-md, 12px)',
                            border: '0.5px solid rgba(0,0,0,0.06)',
                            padding: 10,
                            marginBottom: 8,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: 12,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          <div style={{ fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>
                            {contrat.type_contrat || 'Auto'} - {contrat.compagnie || 'N/A'}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                            Prime : {contrat.prime_annuelle ? `${contrat.prime_annuelle}€/an` : 'N/A'}
                          </div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                            Échéance : {echeance}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </BubbleCard>
            </div>

            {/* Column 4: ARK Chat (INTACT — DO NOT TOUCH) */}
            <div className="xl:w-[20%] lg:w-full flex-shrink-0">
              <div style={{ position: 'sticky', top: 24 }}>
                <BubbleCard hover={false} padding={12}>
                  <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: 'var(--border-fine)' }}>
                    <Bot size={14} style={{ color: 'var(--accent-violet)' }} />
                    <span className="font-bold text-gray-900" style={{ fontSize: 13 }}>ARK Chat</span>
                  </div>
                  <ARKChatTab clientId={client.id} client={client} />
                </BubbleCard>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
