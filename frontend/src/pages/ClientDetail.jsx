import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Shield, CheckSquare, Bot, Clock, ArrowLeft, Mail, Phone, MapPin, Building, Star, AlertTriangle, Calendar, User, Sparkles, Activity, Heart, Target, TrendingUp } from 'lucide-react'
import api from '../api'
import { computeScores } from '../lib/scoring'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getHash = (str) => { let hash = 0; if (str) { for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash) } return hash }
const getGradient = (str) => `linear-gradient(135deg, hsl(${getHash(str) % 360}, 70%, 55%) 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`
const fmt = (v) => (v === null || v === undefined || v === '') ? '—' : String(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const fmtEur = (v) => (!v && v !== 0) ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))

const TABS = [
  { id: 'infos', label: 'Informations', icon: FileText },
  { id: 'contrats', label: 'Contrats', icon: Shield },
  { id: 'taches', label: 'Tâches', icon: CheckSquare },
  { id: 'ark', label: 'ARK Chat', icon: Bot },
  { id: 'timeline', label: 'Timeline', icon: Clock },
]

// ─── SCORE & BUBBLE COMPONENTS ────────────────────────────────────────────────

const BubbleTooltip = ({ type, client, contrats, scores, onClose }) => {
  const contentMap = {
    global: { title: "🌍 Score Global", Icon: Activity, content: (
      <>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">Ce score synthétise le profil complet du client. Un score élevé indique un client sain, fidèle et à fort potentiel pour votre cabinet.</p>
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          {scores.signaux.slice(0,3).map(s => <div key={s.label} className="text-xs px-2 py-1 rounded-full inline-block mr-2" style={{color: s.color, background: s.bg}}>{s.label}</div>)}
        </div>
      </>
    )},
    risque: { title: "🔴 Risque", Icon: AlertTriangle, coeff: "x4", content: (
      <>
        <div className="mt-2 text-sm text-gray-300">Évalue la probabilité de sinistralité. Basé sur le bonus-malus, l'historique de sinistres, la zone géographique et l'expérience de conduite.</div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conseil ARK</h4>
          <p className="text-sm text-cyan-200 bg-cyan-900/40 p-2 rounded-md">Proposer un stage de conduite ou une franchise modulable peut améliorer ce score et réduire les primes futures.</p>
        </div>
      </>
    )},
    fidelite: { title: "💙 Fidélité", Icon: Heart, coeff: "x2.5", content: (
      <>
        <div className="mt-2 text-sm text-gray-300">Mesure l'attachement du client à votre cabinet. Basé sur l'ancienneté, le multi-équipement et la régularité des interactions.</div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conseil ARK</h4>
          <p className="text-sm text-cyan-200 bg-cyan-900/40 p-2 rounded-md">Un client fidèle est votre meilleur ambassadeur. Pensez à une offre de parrainage pour le récompenser.</p>
        </div>
      </>
    )},
    opportunite: { title: "🟢 Opportunité", Icon: Target, coeff: "x2", content: (
      <>
        <div className="mt-2 text-sm text-gray-300">Détecte le potentiel de ventes additionnelles (cross-sell). Analyse la situation familiale, la profession et les contrats déjà détenus.</div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conseil ARK</h4>
          <p className="text-sm text-cyan-200 bg-cyan-900/40 p-2 rounded-md">Ce client est idéal pour une proposition de contrat Prévoyance ou MRH. Préparez une offre personnalisée.</p>
        </div>
      </>
    )},
    retention: { title: "🟡 Rétention", Icon: TrendingUp, coeff: "x1.5", content: (
      <>
        <div className="mt-2 text-sm text-gray-300">Anticipe le risque de départ. Surveille les dates d'échéance, la compétitivité des tarifs et les signaux de mécontentement.</div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conseil ARK</h4>
          <p className="text-sm text-cyan-200 bg-cyan-900/40 p-2 rounded-md">Le contrat Auto arrive à échéance. Contactez-le proactivement avec une offre de renouvellement compétitive pour le fidéliser.</p>
        </div>
      </>
    )},
  }
  const { title, Icon, coeff, content } = contentMap[type]
  const score = type === 'global' ? scores.globalScore : scores[type]

  const pop = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
    exit: { scale: 1.2, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2 } }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div variants={pop} initial="initial" animate="animate" exit="exit" className="bubble-body relative w-[360px] p-6 text-white overflow-hidden">
        <div className="bubble-reflection" />
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Icon size={24} />
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          {coeff && <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded">Coeff. {coeff}</span>}
        </div>
        <div className="text-5xl font-black my-3">{score} <span className="text-3xl text-gray-400">/100</span></div>
        {content}
      </motion.div>
    </div>
  )
}

function ScoreGauge({ score, label, color, onHover }) {
  const size = 70, strokeWidth = 7, radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2 text-center relative cursor-pointer group" onMouseEnter={onHover} >
      <div className="relative rounded-full group-hover:halo-effect" style={{ width: size, height: size, '--halo-color': color }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
          <motion.circle initial={{strokeDashoffset: circumference}} animate={{strokeDashoffset: offset}} transition={{duration:1.2, ease:'easeOut'}} cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function ScoreSidebar({ scores, client, contrats, setBubbleType }) {
  if (!scores) return null;
  const { globalScore } = scores;

  const getGlobalScoreConfig = (s) => {
      if (s >= 85) return { label: 'Excellent', color: '#22c55e', description: 'Profil client optimal, stable et à fort potentiel.' };
      if (s >= 70) return { label: 'Bon', color: '#3b82f6', description: 'Client fiable avec quelques axes d\'amélioration.' };
      if (s >= 50) return { label: 'À surveiller', color: '#f59e0b', description: 'Nécessite une attention pour prévenir les risques.' };
      return { label: 'Critique', color: '#ef4444', description: 'Action prioritaire requise pour rétention.' };
  };
  const globalScoreConfig = getGlobalScoreConfig(globalScore);

  return (
    <aside className="w-[300px] rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2">
        <div className="ark-logo-pulse"><Sparkles size={16} /></div>
        <h2 className="text-lg font-bold">ARK Score™</h2>
      </div>
      
      <div className="text-center my-6 cursor-pointer" onMouseEnter={() => setBubbleType('global')}>
        <div className="relative inline-block">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            <defs>
              <linearGradient id="globalScoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
            <motion.circle cx="60" cy="60" r="54" stroke="url(#globalScoreGradient)" strokeWidth="12" fill="none" strokeDasharray={339.29} initial={{strokeDashoffset: 339.29}} animate={{strokeDashoffset: 339.29 - (globalScore/100 * 339.29)}} transition={{duration: 1.2, ease: 'easeOut'}} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-5xl font-black">{globalScore}</span>
        </div>
        <p className="mt-2 text-sm text-gray-400">Score Global</p>
        <div className="mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: globalScoreConfig.color, color: 'white' }}>{globalScoreConfig.label}</div>
        <p className="mt-2 text-xs text-gray-300 px-2">{globalScoreConfig.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-y-8 gap-x-4">
        <ScoreGauge score={scores.risque} label="Risque" color="#ef4444" onHover={() => setBubbleType('risque')} />
        <ScoreGauge score={scores.fidelite} label="Fidélité" color="#3b82f6" onHover={() => setBubbleType('fidelite')} />
        <ScoreGauge score={scores.opportunite} label="Opportunité" color="#22c55e" onHover={() => setBubbleType('opportunite')} />
        <ScoreGauge score={scores.retention} label="Rétention" color="#f59e0b" onHover={() => setBubbleType('retention')} />
      </div>

      <footer className="text-center mt-12"><p className="text-xs text-gray-600">Rhasrhass®</p></footer>
    </aside>
  )
}

// ─── STYLED UI COMPONENTS ──────────────────────────────────────────────────
const GlassCard = ({ title, children, className }) => (
  <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
    <h3 className="text-base font-bold text-white mb-5">{title}</h3>
    {children}
  </div>
)

const DataItem = ({ icon: Icon, label, value }) => (
  <div>
    <dt className="text-xs text-gray-400 uppercase tracking-wider">{label}</dt>
    <dd className="mt-1 flex items-center gap-2 text-sm text-gray-200 font-medium"><Icon size={14} className="text-gray-500" /> {fmt(value)}</dd>
  </div>
)

// ─── TAB CONTENT COMPONENTS ──────────────────────────────────────────────────
function InfosTab({ client }) {
  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard title="Identité">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <DataItem icon={User} label="Nom Complet" value={`${client.prenom} ${client.nom}`} />
          <DataItem icon={Mail} label="Email" value={client.email} />
          <DataItem icon={Phone} label="Téléphone" value={client.telephone} />
          <DataItem icon={MapPin} label="Adresse" value={client.adresse ? `${client.adresse}, ${client.postal_code || ''} ${client.city || ''}`.replace(/, $/, '') : '—'} />
          <DataItem icon={Building} label="Profession" value={client.profession} />
          <DataItem icon={User} label="Segment" value={client.segment} />
        </dl>
      </GlassCard>
      <GlassCard title="Profil d'assurance">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <DataItem icon={Star} label="Bonus-Malus" value={client.bonus_malus} />
          <DataItem icon={Shield} label="Années permis" value={client.annees_permis ? `${client.annees_permis} ans` : null} />
          <DataItem icon={AlertTriangle} label="Sinistres (3 ans)" value={client.nb_sinistres_3ans} />
          <DataItem icon={Calendar} label="Client depuis" value={fmtDate(client.created_at)} />
          <DataItem icon={MapPin} label="Zone" value={client.zone_geographique} />
          <DataItem icon={User} label="Situation" value={client.situation_familiale} />
        </dl>
      </GlassCard>
    </motion.div>
  )
}

// ... Autres tabs ... (le reste du fichier reste similaire mais avec les nouveaux styles)

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('infos')
  const [activeBubble, setActiveBubble] = useState(null)
  const bubbleTimeoutRef = useRef(null)

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true); setError(null)
        const [clientRes, contratsRes] = await Promise.all([api.get(`/api/clients/${id}`), api.get(`/api/clients/${id}/contrats`)])
        setClient(clientRes.data)
        setContrats(Array.isArray(contratsRes.data) ? contratsRes.data : [])
      } catch (err) { setError('Client introuvable.'); toast.error('Client introuvable.') } 
      finally { setLoading(false) }
    }
    loadAll()
  }, [id])

  const handleBubbleHover = (type) => {
    clearTimeout(bubbleTimeoutRef.current)
    setActiveBubble(type)
  }

  const handleBubbleLeave = () => {
    bubbleTimeoutRef.current = setTimeout(() => setActiveBubble(null), 200)
  }

  const scores = !loading && client ? {
    ...computeScores(client, contrats),
    get globalScore() {
      return Math.round((100 - this.risque) * 0.40 + this.fidelite * 0.25 + this.opportunite * 0.20 + this.retention * 0.15)
    }
  } : null

  const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'
  
  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-900"><div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" /></div>
  if (error) return <div className="p-8 text-center text-red-400 bg-slate-900 h-screen flex flex-col justify-center items-center">{error}<button onClick={() => navigate('/clients')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retour</button></div>
  if (!client) return null

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-gray-200">
      <style>{`
        @keyframes hue-rotate { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
        @keyframes bubble-morph { 0%, 100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; } 25% { border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; } 50% { border-radius: 70% 30% 60% 40% / 50% 70% 30% 50%; } 75% { border-radius: 50% 50% 40% 60% / 40% 50% 50% 60%; } }
        @keyframes ark-logo-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
        .ark-logo-pulse { animation: ark-logo-pulse 2s infinite ease-in-out; }
        .bubble-body { background: rgba(20, 25, 40, 0.4); backdrop-filter: blur(20px); box-shadow: inset 0 0 30px rgba(147, 51, 234, 0.2), 0 0 60px rgba(59, 130, 246, 0.3); animation: bubble-morph 8s ease-in-out infinite alternate; position: relative; border: 2px solid transparent; background-clip: padding-box; }
        .bubble-body::before { content: ''; position: absolute; inset: -2px; z-index: -1; border-radius: inherit; background: conic-gradient(from 180deg at 50% 50%, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #22c55e, #3b82f6); animation: hue-rotate 3s linear infinite; }
        .bubble-reflection { position: absolute; top: 12px; left: 12px; width: 40%; height: 20%; background: linear-gradient(to bottom, rgba(255,255,255,0.4), transparent); border-radius: 50% / 80%; filter: blur(8px); transform: rotate(-25deg); }
        .halo-effect { animation: halo-pulse 1.5s infinite; }
        @keyframes halo-pulse { 0% { box-shadow: 0 0 0 0px var(--halo-color, #3b82f6)44; } 100% { box-shadow: 0 0 0 12px var(--halo-color, #3b82f6)00; } }
      `}</style>

      <AnimatePresence>
        {activeBubble && <BubbleTooltip type={activeBubble} client={client} contrats={contrats} scores={scores} onClose={() => setActiveBubble(null)} />}
      </AnimatePresence>

      <div className="flex" onMouseLeave={handleBubbleLeave}>
        <main className="flex-1">
          {/* Header */}
          <header className="p-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} />Retour</button>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`/clients/${id}/edit`)} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">Modifier</button>
                <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg shadow-blue-500/20 hover:opacity-90 transition-opacity">Nouveau contrat</button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 text-3xl rounded-full text-white flex items-center justify-center font-black flex-shrink-0 select-none" style={{ background: getGradient(`${client.prenom} ${client.nom}`), boxShadow: '0 0 40px rgba(37,99,235,0.5)' }} >
                  {getInitials(client)}
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">{client.prenom} {client.nom}</h1>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="p-8">
            <InfosTab client={client} />
          </div>
        </main>

        <ScoreSidebar scores={scores} client={client} contrats={contrats} setBubbleType={handleBubbleHover} />
      </div>
    </div>
  )
}
