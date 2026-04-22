import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText, Shield, CheckSquare, Bot, Clock, ArrowLeft, Mail, Phone, MapPin, Building, Star, AlertTriangle, Calendar, User } from 'lucide-react'
import api from '../api'
import { computeScores } from '../lib/scoring'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getHash = (str) => {
  let hash = 0
  if (!str) return hash
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return hash
}
const getHSL = (str) => `hsl(${getHash(str) % 360}, 70%, 55%)`
const getGradient = (str) => `linear-gradient(135deg, ${getHSL(str)} 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

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

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  const config = {
    actif: { label: 'Actif', classes: 'bg-emerald-100 text-emerald-700' },
    prospect: { label: 'Prospect', classes: 'bg-blue-100 text-blue-700' },
  }[s] || { label: 'Inactif', classes: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${config.classes}`}>
      {config.label}
    </span>
  )
}

function ScoreGauge({ score = 0, label, color = '#2563eb' }) {
  const size = 80
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function ScoreSidebar({ scores }) {
  if (!scores) return null
  return (
    <aside className="w-[280px] border-l border-gray-200 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Score Global</h3>
        <p className="text-5xl font-black text-[#2563eb] my-2">{Math.round((scores.fidelite + scores.opportunite + scores.retention) / 3)}</p>
        <p className="text-xs text-gray-400">Basé sur 4 indicateurs clés</p>
      </div>
      <div className="grid grid-cols-2 gap-6 mt-6">
        <ScoreGauge score={scores.risque} label="Risque" color={scores.risque >= 70 ? '#ef4444' : scores.risque >= 40 ? '#f59e0b' : '#22c55e'} />
        <ScoreGauge score={scores.fidelite} label="Fidélité" color="#2563eb" />
        <ScoreGauge score={scores.opportunite} label="Opportunité" color="#8b5cf6" />
        <ScoreGauge score={scores.retention} label="Rétention" color="#14b8a6" />
      </div>
    </aside>
  )
}

function TabsNav({ activeTab, setActiveTab }) {
  const tabsRef = useRef([])
  const [underlineStyle, setUnderlineStyle] = useState({})

  useEffect(() => {
    const activeIndex = TABS.findIndex(t => t.id === activeTab)
    const activeTabNode = tabsRef.current[activeIndex]
    if (activeTabNode) {
      setUnderlineStyle({ left: activeTabNode.offsetLeft, width: activeTabNode.offsetWidth })
    }
  }, [activeTab])

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative px-8">
            <nav className="flex gap-8">
                {TABS.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={el => tabsRef.current[index] = el}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-3 text-sm transition-colors duration-200 ${activeTab === tab.id ? 'text-[#2563eb] font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
            <div className="absolute bottom-[-1px] h-0.5 bg-[#2563eb] transition-all duration-300 ease-out" style={underlineStyle} />
        </div>
    </div>
  )
}

// ─── TAB CONTENT COMPONENTS ──────────────────────────────────────────────────

function InfosTab({ client }) {
  const DataItem = ({ icon: Icon, label, value }) => (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 text-sm text-gray-800 font-medium"><Icon size={14} className="text-gray-400" /> {fmt(value)}</dd>
    </div>
  )
  const InfoCard = ({ title, children }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-6">
      <h3 className="text-base font-bold text-gray-900 mb-5">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</dl>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDuration: '300ms' }}>
      <InfoCard title="Identité">
        <DataItem icon={User} label="Nom Complet" value={`${client.prenom} ${client.nom}`} />
        <DataItem icon={Mail} label="Email" value={client.email} />
        <DataItem icon={Phone} label="Téléphone" value={client.telephone} />
        <DataItem icon={MapPin} label="Adresse" value={`${client.adresse}, ${client.code_postal} ${client.ville}`} />
        <DataItem icon={Building} label="Profession" value={client.profession} />
        <DataItem icon={User} label="Segment" value={client.segment} />
      </InfoCard>
      <InfoCard title="Profil d'assurance">
        <DataItem icon={Star} label="Bonus-Malus" value={client.bonus_malus} />
        <DataItem icon={Shield} label="Années permis" value={client.annees_permis ? `${client.annees_permis} ans` : null} />
        <DataItem icon={AlertTriangle} label="Sinistres (3 ans)" value={client.nb_sinistres_3ans} />
        <DataItem icon={Calendar} label="Client depuis" value={fmtDate(client.created_at)} />
        <DataItem icon={MapPin} label="Zone" value={client.zone_geographique} />
      </InfoCard>
    </div>
  )
}

function ContratsTab({ contrats }) {
  if (contrats.length === 0) return <div className="text-center py-12 text-gray-500">Aucun contrat pour ce client.</div>
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-fade-in" style={{ animationDuration: '300ms' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compagnie</th>
            <th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Prime Annuelle</th>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Échéance</th>
            <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
          </tr>
        </thead>
        <tbody>
          {contrats.map(c => (
            <tr key={c.id} className="border-b border-gray-100 last:border-0">
              <td className="p-4 text-sm font-bold text-gray-800">{fmt(c.type_contrat)}</td>
              <td className="p-4 text-sm text-gray-600">{fmt(c.compagnie)}</td>
              <td className="p-4 text-sm text-gray-800 font-semibold text-right">{fmtEur(c.prime_annuelle)}</td>
              <td className="p-4 text-sm text-gray-600">{fmtDate(c.date_echeance)}</td>
              <td className="p-4 text-center"><StatusBadge status={c.statut} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlaceholderTab({ title, message }) {
  return (
    <div className="text-center py-20 bg-white border border-gray-100 rounded-xl animate-fade-in" style={{ animationDuration: '300ms' }}>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  )
}

function ArkChatTab({ client }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(msg) {
    if (!msg?.trim()) return
    const text = msg.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput(''); setLoading(true)
    try {
      const res = await api.post(`/api/ark/chat`, { message: text, clientData: client, conversationHistory: messages.slice(-10) })
      const reply = res.data?.reply || 'Désolé, je ne peux pas répondre pour le moment.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      toast.error('ARK est temporairement indisponible.')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue.' }])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="bg-white border border-gray-100 rounded-xl h-[65vh] flex flex-col animate-fade-in" style={{ animationDuration: '300ms' }}>
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md p-3 rounded-lg ${m.role === 'user' ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{m.content}</p>
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">ARK réfléchit...</div>}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={e => { e.preventDefault(); send(input) }} className="relative">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Discuter avec ARK..." className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all" />
          <button type="submit" disabled={loading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#2563eb] text-white rounded-md disabled:bg-gray-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="m22 2-11 11"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('infos')

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true); setError(null)
        const [clientRes, contratsRes] = await Promise.all([
          api.get(`/api/clients/${id}`),
          api.get(`/api/clients/${id}/contrats`)
        ])
        setClient(clientRes.data?.data || clientRes.data)
        setContrats(Array.isArray(contratsRes.data) ? contratsRes.data : [])
      } catch (err) {
        console.error("Erreur de chargement du client:", err.response?.data || err.message)
        setError('Client introuvable ou erreur de chargement des données.')
        toast.error('Client introuvable.')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [id])

  const scores = !loading && client ? computeScores(client, contrats) : null
  const getInitials = (c) => {
    const first = (c?.prenom || '').charAt(0)
    const last = (c?.nom || '').charAt(0)
    return (first + last).toUpperCase() || '?'
  }

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>
  if (error) return <div className="p-8 text-center"><p className="text-red-600">{error}</p><button onClick={() => navigate('/clients')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retour</button></div>
  if (!client) return null

  const riskScore = scores?.risque || 0
  let riskConfig = { label: 'Faible', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  if (riskScore >= 70) riskConfig = { label: 'Élevé', classes: 'bg-red-100 text-red-700 border-red-200' }
  else if (riskScore >= 40) riskConfig = { label: 'Modéré', classes: 'bg-amber-100 text-amber-700 border-amber-200' }

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      <div className="flex">
        <main className="flex-1">
            <header className="bg-white border-b border-gray-100 shadow-sm px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"><ArrowLeft size={16} />Retour</button>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/clients/${id}/edit`)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Modifier</button>
                        <button onClick={() => navigate('/contrats/new')} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] rounded-lg shadow-sm hover:opacity-90 transition-opacity">Nouveau contrat</button>
                        <button onClick={() => setActiveTab('ark')} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] rounded-lg shadow-sm hover:opacity-90 transition-opacity">Contacter ARK</button>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 text-2xl rounded-full text-white flex items-center justify-center font-black flex-shrink-0 select-none" style={{ background: getGradient(`${client.prenom} ${client.nom}`) }}>
                        {getInitials(client)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{client.prenom} {client.nom}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5"><Mail size={14} /> {client.email}</span>
                            <span className="flex items-center gap-1.5"><Phone size={14} /> {client.telephone}</span>
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {client.adresse}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start">
                        <StatusBadge status={client.statut} />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${riskConfig.classes}`}>Risque: {riskScore} ({riskConfig.label})</span>
                    </div>
                </div>
            </header>

          <TabsNav activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <div className="p-8">
            {activeTab === 'infos' && <InfosTab client={client} />}
            {activeTab === 'contrats' && <ContratsTab contrats={contrats} />}
            {activeTab === 'taches' && <PlaceholderTab title="Gestion des tâches" message="Bientôt disponible pour suivre vos actions." />}
            {activeTab === 'ark' && <ArkChatTab client={client} />}
            {activeTab === 'timeline' && <PlaceholderTab title="Timeline du client" message="Un historique complet des interactions sera affiché ici." />}
          </div>
        </main>

        <ScoreSidebar scores={scores} />
      </div>
    </div>
  )
}
