import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, FileText, Activity, Euro, ArrowUpRight, Zap, ExternalLink } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../api'
import AnimatedNumber from '../components/ui/AnimatedNumber'

const Skeleton = ({ className }) => <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />

const KPICard = ({ icon: Icon, title, value, trend, format = 'number', loading, iconBg, iconColor, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
  >
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
    {loading ? <Skeleton className="w-3/4 h-10 mb-2" /> : (
      <p className="text-4xl font-black text-gray-900 tracking-tight">
        <AnimatedNumber value={value} format={format} />
        {format === 'score' && <span className="text-2xl text-gray-400">/100</span>}
      </p>
    )}
    {loading ? <Skeleton className="w-1/2 h-5" /> : trend != null && trend > 0 && (
      <div className="flex items-center text-sm font-semibold text-emerald-500 mt-1">
        <ArrowUpRight className="w-4 h-4 mr-1" />
        <span>+{trend}%</span>
      </div>
    )}
  </motion.div>
)

const Avatar = ({ name }) => {
  const getHash = (str) => { let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return hash }
  const getHSL = (str) => `hsl(${getHash(str) % 360}, 60%, 80%)`
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return (
    <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${getHSL(name || '')} 0%, hsl(${(getHash(name || '') + 60) % 360}, 70%, 65%) 100%)` }}>
      {getInitials(name)}
    </div>
  )
}

const ScoreBar = ({ score }) => {
    const s = Math.min(100, Math.max(0, Number(score) || 0))
    let color = '#10b981' // green
    if (s > 70) color = '#ef4444' // red
    else if (s >= 40) color = '#f59e0b' // orange
    return (
      <div className="flex items-center gap-2 w-[100px]">
        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${s}%`, backgroundColor: color }}></div></div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{s}</span>
      </div>
    )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let config = { label: 'Inconnu', classes: 'bg-gray-100 text-gray-500' }
  if (s === 'actif') config = { label: 'Actif', classes: 'bg-green-100 text-green-700' }
  else if (s === 'prospect') config = { label: 'Prospect', classes: 'bg-blue-100 text-blue-700' }
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full inline-block ${config.classes}`}>{config.label}</span>
}


export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ prenom: 'Chargement...' })

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, userRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/auth/me').catch(() => ({ data: { prenom: 'Admin' } }))
      ])
      console.log('Dashboard stats API response:', statsRes.data)
      setStats(statsRes.data)
      setUser(userRes.data)
    } catch (err) { console.error("Erreur de chargement du dashboard:", err) } 
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  const chartData = useMemo(() => {
    if (stats?.revenus6Mois) {
      return stats.revenus6Mois.map(d => ({ name: d.mois, Primes: parseFloat(d.revenue) || 0 }))
    }
    // Mock data
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return Array.from({length: 12}, (_, i) => ({ name: months[i], Primes: Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500 }))
  }, [stats])
  
  const clientStatusData = useMemo(() => {
    if (!stats?.clientsParStatut || typeof stats.clientsParStatut !== 'object') return []
    const counts = Object.entries(stats.clientsParStatut).reduce((acc, [key, value]) => {
      acc[key.toLowerCase()] = value
      return acc
    }, {})
    return [
      { name: 'Prospects', value: counts.prospect || 0 },
      { name: 'Actifs', value: counts.actif || 0 },
      { name: 'Inactifs', value: (counts.inactif || 0) + (counts.résilié || 0) + (counts.resilié || 0) + (counts.perdu || 0) },
    ].filter(item => item.value > 0);
  }, [stats])
  const PIE_COLORS = ['#2563eb', '#10b981', '#9ca3af']
  
  const clientsASurveiller = (stats?.clientsRecents || []).sort((a,b) => (b.score_risque || 0) - (a.score_risque || 0)).slice(0, 5)
  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
        <header className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bonjour {user.prenom} 👋</h1>
            <p className="text-sm text-gray-400 mt-1">{currentDate}</p>
          </div>
          <button onClick={() => navigate('/morning-brief')}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-white text-sm font-semibold text-gray-700 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-blue-200">
            <Zap size={16} className="text-[#2563eb]" />
            Morning Brief
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          <KPICard title="Clients totaux" value={stats?.totalClients || 0} trend={2} icon={Users} loading={loading} index={0} iconBg="bg-blue-50" iconColor="text-[#2563eb]" />
          <KPICard title="Contrats actifs" value={stats?.contratsActifs || 0} trend={5} icon={FileText} loading={loading} index={1} iconBg="bg-emerald-50" iconColor="text-[#10b981]" />
          <KPICard title="Score moyen portefeuille" value={stats?.scoreRisqueMoyen || 0} format="score" icon={Activity} loading={loading} index={2} iconBg="bg-purple-50" iconColor="text-[#7c3aed]" />
          <KPICard title="Primes totales" value={stats?.primeTotale || 0} format="currency" trend={12} icon={Euro} loading={loading} index={3} iconBg="bg-amber-50" iconColor="text-[#f59e0b]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-8 gap-5 mt-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Évolution du portefeuille</h3>
            <div style={{ height: '220px' }}>
              {loading ? <Skeleton className="w-full h-full" /> : 
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000)}k€`} />
                    <Tooltip contentStyle={{ background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', border: 'none', padding: '8px 12px' }} formatter={(value) => [`${value.toLocaleString('fr-FR')}€`, null]} />
                    <Area type="monotone" dataKey="Primes" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              }
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Répartition clients</h3>
            <div style={{ height: '220px' }}>
              {loading ? <Skeleton className="w-full h-full" /> : 
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={clientStatusData} cx="50%" cy="50%" labelLine={false} innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={5}>{clientStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />)}</Pie><Tooltip formatter={(value, name) => [`${value} (${((value / (stats.totalClients || 1)) * 100).toFixed(0)}%)`, name]} /><Legend iconSize={8} iconType="circle" wrapperStyle={{fontSize: "12px"}} /></PieChart>
                </ResponsiveContainer>
              }
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800">Clients à surveiller</h3>
              {!loading && <span className="px-2 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded-full">{clientsASurveiller.length}</span>}
            </div>
            <button onClick={() => navigate('/clients')} className="text-sm font-semibold text-blue-600 hover:underline">Voir tous</button>
          </div>
          <div>
            <table className="w-full text-sm">
                <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}><td colSpan="4" className="py-3"><div className="flex items-center space-x-4"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 min-w-0"><Skeleton className="h-4 w-3/4 mb-1.5" /><Skeleton className="h-3 w-1/2" /></div></div></td></tr>
                )) : clientsASurveiller.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4"><div className="flex items-center space-x-4"><Avatar name={`${client.prenom} ${client.nom}`} /><div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 truncate">{client.prenom} {client.nom}</p><p className="text-gray-400 truncate">{client.email}</p></div></div></td>
                        <td className="py-3 px-4"><StatusBadge status={client.statut} /></td>
                        <td className="py-3 px-4"><ScoreBar score={client.score_risque} /></td>
                        <td className="py-3 pl-4 text-right"><button onClick={() => navigate(`/client/${client.id}`)} className="p-2 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-800 transition-colors"><ExternalLink size={16} /></button></td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </motion.div>
        <footer className="text-center mt-12">
            <p className="text-xs text-gray-300">COURTIA®</p>
        </footer>
    </>
  )
}
