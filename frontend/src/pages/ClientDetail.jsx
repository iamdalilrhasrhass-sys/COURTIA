import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { FileText, Shield, CheckSquare, Bot, ArrowLeft, Mail, Phone, MapPin, Building, Star, AlertTriangle, Calendar, User, Sparkles, Activity, Heart, Target, TrendingUp, ChevronDown, Clock, ArrowRight } from 'lucide-react'
import api from '../api'
import { computeScores, getScoreColor, SCORE_HEX } from '../lib/scoring'
import ContratsTab from '../components/ContratsTab'

// ─── HELPERS & SMALL COMPONENTS ──────────────────────────────────────────────
const fmt = (v) => (v === null || v === undefined || v === '') ? '—' : String(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'

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

// ─── STYLED UI COMPONENTS ──────────────────────────────────────────────────
const Card = ({ title, children, className, ...props }) => (
  <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`} {...props}>
    <h3 className="text-base font-bold text-gray-800 p-6 border-b border-slate-100">{title}</h3>
    <div className="p-6">{children}</div>
  </div>
)

const DataItem = ({ icon: Icon, label, value }) => (
  <div>
    <dt className="text-xs text-gray-400 uppercase tracking-wider">{label}</dt>
    <dd className="mt-1 flex items-center gap-2 text-sm text-gray-700 font-medium"><Icon size={14} className="text-gray-500" /> {fmt(value)}</dd>
  </div>
)

// ─── BUBBLE & SCORE COMPONENTS ────────────────────────────────────────────────
const BubbleCriterion = ({ label, value, max, color }) => {
  const percentage = (value / max) * 100
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
      <motion.div initial={{ scale: 0.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(32px) saturate(220%)', border: '2px solid rgba(147,51,234,0.45)', boxShadow: '0 0 80px rgba(147,51,234,0.4), 0 0 40px rgba(59,130,246,0.3), inset 0 0 60px rgba(255,255,255,0.25)', borderRadius: '60% 40% 55% 45% / 45% 55% 45% 55%', animation: 'bubbleFloat 6s ease-in-out infinite', width: 'min(560px, 90vw)', padding: '48px 52px' }} className="relative text-slate-900">
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
    <aside className="w-[320px] flex-shrink-0 bg-white/70 backdrop-blur-sm border-l border-gray-100 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2"><div className="w-5 h-5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-md flex items-center justify-center text-white"><Sparkles size={12} /></div><h2 className="text-lg font-bold text-gray-900">ARK Score™</h2></div>
      <div className="text-center my-6 cursor-pointer" onMouseEnter={() => onBubbleEnter('global')} onMouseLeave={onBubbleLeave}><p className="text-sm font-semibold text-gray-500">Score Global</p><p className="text-7xl font-black text-gray-900 tracking-tight my-1"><AnimatedNumber value={globalScore} /></p><div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: globalScoreConfig.color, color: 'white' }}>{globalScoreConfig.label}</div><p className="mt-3 text-xs text-gray-500 leading-relaxed px-4">{globalScoreConfig.description}</p></div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-4"><ScoreGauge score={scores.risque} label="Risque" color="#ef4444" onHover={() => onBubbleEnter('risque')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.fidelite} label="Fidélité" color="#3b82f6" onHover={() => onBubbleEnter('fidelite')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.opportunite} label="Opportunité" color="#22c55e" onHover={() => onBubbleEnter('opportunite')} onLeave={onBubbleLeave} /><ScoreGauge score={scores.retention} label="Rétention" color="#f59e0b" onHover={() => onBubbleEnter('retention')} onLeave={onBubbleLeave} /></div>
      <ScoreLegend /><footer className="text-center mt-8"><p className="text-xs text-gray-300">COURTIA®</p></footer>
    </aside>
  )
}

// ─── TAB CONTENT COMPONENTS ──────────────────────────────────────────────────
function InfosTab({ client }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Identité"><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"><DataItem icon={User} label="Nom Complet" value={`${client.prenom} ${client.nom}`} /><DataItem icon={Mail} label="Email" value={client.email} /><DataItem icon={Phone} label="Téléphone" value={client.telephone} /><DataItem icon={MapPin} label="Adresse" value={client.adresse ? `${client.adresse}, ${client.postal_code || ''} ${client.city || ''}`.replace(/, $/, '') : '—'} /><DataItem icon={Building} label="Profession" value={client.profession} /><DataItem icon={User} label="Segment" value={client.segment} /></dl></Card>
      <Card title="Profil d'assurance"><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"><DataItem icon={Star} label="Bonus-Malus" value={client.bonus_malus} /><DataItem icon={Shield} label="Années permis" value={client.annees_permis ? `${client.annees_permis} ans` : null} /><DataItem icon={AlertTriangle} label="Sinistres (3 ans)" value={client.nb_sinistres_3ans} /><DataItem icon={Calendar} label="Client depuis" value={fmtDate(client.created_at)} /><DataItem icon={MapPin} label="Zone" value={client.zone_geographique} /><DataItem icon={User} label="Situation" value={client.situation_familiale} /></dl></Card>
    </motion.div>
  )
}

// ... Placeholder for other tabs ...
const PlaceholderTab = ({ title }) => <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center py-20 text-gray-400 bg-white border border-slate-100 rounded-2xl shadow-sm">Coming soon: {title}</motion.div>

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

  const handleBubbleEnter = (type) => { clearTimeout(bubbleTimeoutRef.current); setActiveBubble(type) }
  const handleBubbleLeave = () => { bubbleTimeoutRef.current = setTimeout(() => setActiveBubble(null), 300) }
  const handleBubbleMouseEnter = () => { clearTimeout(bubbleTimeoutRef.current) }
  const handleBubbleMouseLeave = () => { bubbleTimeoutRef.current = setTimeout(() => setActiveBubble(null), 300) }

  const scores = !loading && client ? {
    ...computeScores(client, contrats),
    get globalScore() { return Math.round((100 - this.risque) * 0.40 + this.fidelite * 0.25 + this.opportunite * 0.20 + this.retention * 0.15) }
  } : null

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" /></div>
  if (error) return <div className="p-8 text-center text-red-500 bg-gray-50 h-screen flex flex-col justify-center items-center">{error}<button onClick={() => navigate('/clients')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retour</button></div>
  if (!client) return null
  
  const TABS = [ { id: 'infos', label: 'Informations', icon: FileText, component: <InfosTab client={client}/> }, { id: 'contrats', label: 'Contrats', icon: Shield, component: <ContratsTab contrats={contrats} clientId={client.id} navigate={navigate} /> }, { id: 'taches', label: 'Tâches', icon: CheckSquare, component: <PlaceholderTab title="Tâches"/> }, { id: 'ark', label: 'ARK Chat', icon: Bot, component: <PlaceholderTab title="ARK Chat"/> }]

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-800">
      <AnimatePresence>{activeBubble && <BubbleTooltip type={activeBubble} client={client} scores={scores} onMouseEnter={() => handleBubbleEnter(activeBubble)} onMouseLeave={handleBubbleLeave} />}</AnimatePresence>
      <div className="flex">
        <main className="flex-1">
          <header className="p-8 bg-white border-b border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6"><button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} />Retour</button><div className="flex items-center gap-3"><button onClick={() => navigate(`/clients/${id}/edit`)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Modifier</button><button onClick={() => navigate(`/contrats/new?clientId=${id}`)} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.02]">Nouveau contrat</button></div></div>
            <div className="flex items-center gap-6">
              <div className="relative"><div className="w-24 h-24 text-3xl rounded-full text-white flex items-center justify-center font-black flex-shrink-0 select-none bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30">{getInitials(client)}</div></div>
              <div><h1 className="text-4xl font-black text-gray-900 tracking-tight">{client.prenom} {client.nom}</h1><p className="text-gray-500 mt-1">{client.profession || 'Profession non renseignée'}</p></div>
            </div>
            <div className="mt-8 -mb-8 -mx-8 px-8 border-b border-slate-200"><nav className="flex space-x-6">{TABS.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative py-4 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>{tab.label}{activeTab === tab.id && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" layoutId="underline" />}</button>)}</nav></div>
          </header>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {TABS.find(t => t.id === activeTab)?.component}
            </AnimatePresence>
          </div>
        </main>
        <ScoreSidebar scores={scores} client={client} contrats={contrats} onBubbleEnter={handleBubbleEnter} onBubbleLeave={handleBubbleLeave} />
      </div>
    </div>
  )
}
