import { useEffect, useState } from 'react'
import { TrendingUp, Users, Briefcase, DollarSign, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useClientStore } from '../stores/clientStore'
import { useAuthStore } from '../stores/authStore'
import { formatNomClient } from '../utils/format'

const API_URL = 'https://courtia.onrender.com'

const mockChartData = [
  { month: 'Jan', revenue: 4000, clients: 24 },
  { month: 'Fév', revenue: 5200, clients: 32 },
  { month: 'Mar', revenue: 6800, clients: 42 },
  { month: 'Avr', revenue: 7500, clients: 51 },
  { month: 'Mai', revenue: 8900, clients: 65 },
  { month: 'Juin', revenue: 10200, clients: 78 }
]

export default function Dashboard() {
  const token = useAuthStore((state) => state.token)
  const clients = useClientStore((state) => state.clients)
  const fetchClients = useClientStore((state) => state.fetchClients)
  const [dashboardStats, setDashboardStats] = useState({
    totalClients: 0,
    activeContracts: 0,
    monthlyCommissions: 0,
    conversionRate: 0,
    recentClients: []
  })

  useEffect(() => {
    if (token) {
      fetchClients(token)
      
      // Fetch dashboard stats
      fetch(`${API_URL}/api/dashboard/stats`)
        .then(res => res.json())
        .then(data => {
          console.log('Dashboard stats:', data)
          setDashboardStats(data)
        })
        .catch(err => console.error('Stats error:', err))
    }
  }, [token, fetchClients])

  const stats = [
    {
      label: 'Total clients',
      value: dashboardStats.totalClients || clients.length || '0',
      icon: Users,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      label: 'Contrats actifs',
      value: dashboardStats.activeContracts || '0',
      icon: Briefcase,
      color: 'from-purple-500 to-pink-500'
    },
    {
      label: 'Commissions mois',
      value: `${dashboardStats.monthlyCommissions || 0}€`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500'
    },
    {
      label: 'Taux conversion',
      value: `${dashboardStats.tauxConversion || 0}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500'
    },
    {
      label: 'Prime portefeuille/an',
      value: `${(dashboardStats.portfolioPremium || 0).toLocaleString('fr-FR')}€`,
      icon: DollarSign,
      color: 'from-indigo-500 to-blue-500'
    },
    {
      label: 'Contrats urgents (< 30j)',
      value: dashboardStats.urgentContracts || '0',
      icon: AlertCircle,
      color: dashboardStats.urgentContracts > 0 ? 'from-red-500 to-pink-500' : 'from-green-500 to-emerald-500'
    }
  ]

  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Tableau de bord</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className={`glass p-6 rounded-lg gradient-blue-cyan bg-gradient-to-br ${stat.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-black text-white">{stat.value}</p>
                </div>
                <Icon size={32} className="text-white opacity-30" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Revenue Chart */}
      <div className="glass p-6 rounded-lg mb-8">
        <h3 className="text-xl font-bold text-cyan mb-4">Revenus 6 derniers mois</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip
              contentStyle={{
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#06b6d4' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass p-6 rounded-lg">
          <h3 className="text-lg font-bold text-cyan mb-4">Clients récents</h3>
          <div className="space-y-2">
            {dashboardStats.clientsRecents && dashboardStats.clientsRecents.length > 0 ? dashboardStats.clientsRecents.map((client, idx) => (
              <div key={idx} onClick={() => window.location.href = `/client/${client.id}`} className="flex justify-between items-center p-2 bg-dark-3 rounded cursor-pointer hover:bg-dark-4 transition-colors">
                <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                  <span style={{fontSize:'13px',fontWeight:500,color:'#fff'}}>{formatNomClient(client)}</span>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.5)'}}>{client.risk_score ? `Score: ${client.risk_score}` : 'Score: N/A'}</span>
                </div>
                <span style={{fontSize:'11px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:client.status==='actif'?'#d1fae5':'#fee2e2',color:client.status==='actif'?'#065f46':'#dc2626'}}>{client.status === 'actif' ? 'Actif' : client.status}</span>
              </div>
            )) : (
              <div style={{fontSize:'12px',color:'#666',padding:'8px'}}>Aucun client.</div>
            )}
          </div>
        </div>
        <div className="glass p-6 rounded-lg">
          <h3 className="text-lg font-bold text-cyan mb-4">Alertes importantes</h3>
          <div className="space-y-2">
            {dashboardStats.alertes && dashboardStats.alertes.length > 0 ? dashboardStats.alertes.map((alerte, idx) => (
              <div key={idx} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-sm">
                ⚠️ {alerte.first_name} {alerte.last_name} - {alerte.type_contrat} expire dans {alerte.jours_restants}j
              </div>
            )) : (
              <div className="text-xs text-slate-500">Aucune alerte.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
