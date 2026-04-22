import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, FileText, TrendingUp, Euro, ChevronUp, ChevronDown, ArrowRight, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../api'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import { getScoreColor, SCORE_HEX } from '../lib/scoring'

const Skeleton = ({ className }) => <div className={`bg-gray-200 rounded-md animate-pulse ${className}`} />

const KPICard = ({ icon: Icon, title, value, trend, format = 'number', index, loading }) => {
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'
  const TrendIcon = trend > 0 ? ChevronUp : ChevronDown

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white p-6 rounded-2xl border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#2563eb]" />
        </div>
      </div>
      {loading ? <Skeleton className="w-3/4 h-10 mb-2" /> : (
        <p className="text-4xl font-bold text-[#080808] mb-2">
          <AnimatedNumber value={value} format={format} />
        </p>
      )}
      {loading ? <Skeleton className="w-1/2 h-5" /> : trend != null && (
        <div className={`flex items-center text-sm font-semibold ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>{trend > 0 ? '+' : ''}{trend}% vs mois dernier</span>
        </div>
      )}
    </motion.div>
  )
}

const Avatar = ({ name }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    const initials = names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`: names[0].substring(0, 2)
    return initials.toUpperCase()
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
      {getInitials(name)}
    </div>
  )
}

const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-sm font-medium text-gray-400">N/A</span>
  const colorKey = getScoreColor(score, 'risque')
  const hex = SCORE_HEX[colorKey]
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100">
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hex }} />
      <span className="text-sm font-semibold text-[#080808]">{score}</span>
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let colorClasses = 'bg-gray-100 text-gray-700'
  let label = 'Inconnu'

  if (s === 'actif') { colorClasses = 'bg-emerald-100 text-emerald-700'; label = 'Actif' }
  else if (s === 'prospect') { colorClasses = 'bg-blue-100 text-blue-700'; label = 'Prospect' }
  else if (['résilié', 'inactif'].includes(s)) { colorClasses = 'bg-gray-100 text-gray-600'; label = 'Inactif' }

  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${colorClasses}`}>{label}</span>
}


export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ prenom: '' }) // Placeholder for user data

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/dashboard/stats', { timeout: 35000 })
      setStats(res.data)
    } catch {
      // For demo purposes, we can load mock data on error
      console.warn("Failed to load stats, using mock data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    // You could fetch user data here, e.g., api.get('/api/user/me').then(res => setUser(res.data))
    setUser({ prenom: 'Admin' })
  }, [loadStats])

  const chartData = stats?.revenus6Mois?.map(d => ({
    name: d.mois,
    revenu: parseFloat(d.revenue) || 0,
  })) || []

  const commTrend = (stats?.commissionsMois && stats?.commissionsMoisPrecedent > 0)
    ? Math.round(((stats.commissionsMois - stats.commissionsMoisPrecedent) / stats.commissionsMoisPrecedent) * 100)
    : null
  
  // Placeholder data for Pie Chart
  const clientStatusData = [
    { name: 'Actifs', value: stats?.clientsParStatut?.actif || 78 },
    { name: 'Prospects', value: stats?.clientsParStatut?.prospect || 25 },
    { name: 'Inactifs', value: stats?.clientsParStatut?.inactif || 12 },
  ]
  const PIE_COLORS = ['#2563eb', '#60a5fa', '#bfdbfe']


  return (
    <div className="min-h-screen bg-white font-sans text-[#080808]">
      <main className="p-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#080808]">Bonjour {user.prenom} 👋</h1>
            <p className="text-gray-500 mt-1">Voici un aperçu de votre portefeuille aujourd'hui.</p>
          </div>
          <button onClick={() => navigate('/clients/new')}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2.5 bg-[#080808] text-white rounded-lg text-sm font-semibold cursor-pointer transition-transform duration-200 ease-out hover:scale-105">
            <Plus size={16} />
            Nouveau client
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="Clients totaux" value={stats?.totalClients} icon={Users} loading={loading} index={0} />
          <KPICard title="Contrats actifs" value={stats?.contratsActifs} icon={FileText} loading={loading} index={1} />
          <KPICard title="Commission du mois" value={stats?.commissionsMois} format="currency" trend={commTrend} icon={TrendingUp} loading={loading} index={2} />
          <KPICard title="Prime portefeuille" value={stats?.primeTotale} format="currency" icon={Euro} loading={loading} index={3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-semibold text-[#080808] mb-4">Revenus (6 derniers mois)</h3>
            <div style={{ height: '300px' }}>
              {loading ? <Skeleton className="w-full h-full" /> : 
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, "Revenu"]} />
                    <Area type="monotone" dataKey="revenu" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              }
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-semibold text-[#080808] mb-4">Répartition des clients</h3>
            <div style={{ height: '300px' }}>
              {loading ? <Skeleton className="w-full h-full" /> : 
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clientStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                      {clientStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Clients"]} />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              }
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#080808]">Clients récents</h3>
            <button onClick={() => navigate('/clients')} className="flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:underline">
              Voir tout <ArrowRight size={14} />
            </button>
          </div>
          <div className="flow-root">
            <ul role="list" className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="py-3 sm:py-4"><div className="flex items-center space-x-4"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 min-w-0"><Skeleton className="h-4 w-3/4 mb-1.5" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-16" /></div></li>
              )) : stats?.clientsRecents?.map((client) => (
                <li key={client.id} className="py-3 sm:py-4 cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors" onClick={() => navigate(`/client/${client.id}`)}>
                  <div className="flex items-center space-x-4">
                    <Avatar name={`${client.prenom} ${client.nom}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#080808] truncate">{client.prenom} {client.nom}</p>
                      <p className="text-sm text-gray-500 truncate">{client.email}</p>
                    </div>
                    <div className="hidden sm:block"><StatusBadge status={client.statut} /></div>
                    <ScoreBadge score={client.score_risque} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
        
        <footer className="text-center mt-12">
          <p className="text-sm text-gray-500">Rhasrhass®</p>
        </footer>
      </main>
    </div>
  )
}
