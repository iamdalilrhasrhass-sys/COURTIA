import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const mockData = {
  contractsByType: [
    { name: 'Auto', value: 35, fill: '#0891b2' },
    { name: 'Habitation', value: 28, fill: '#06b6d4' },
    { name: 'Santé', value: 22, fill: '#14b8a6' },
    { name: 'RC', value: 15, fill: '#8b5cf6' }
  ],
  revenue3m: [
    { month: 'Jan', revenu: 8500 },
    { month: 'Fév', revenu: 9200 },
    { month: 'Mar', revenu: 9800 }
  ],
  topActions: [
    { action: 'Relancer ABC Corp (prospect)', urgency: 'haute', deadline: 'Aujourd\'hui' },
    { action: 'Appeler Jean Dupont (cross-sell)', urgency: 'moyenne', deadline: 'Cette semaine' },
    { action: 'Renouveler contrat SARL Dupont', urgency: 'haute', deadline: 'Dans 5 jours' }
  ]
}

export default function DashboardEnhanced() {
  const [stats] = useState({
    totalClients: 127,
    activeContracts: 312,
    pendingProspects: 45,
    monthlyRevenue: 9800
  })

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Clients</p>
          <p className="text-3xl font-black text-cyan">{stats.totalClients}</p>
          <p className="text-xs text-green-400 mt-2">+8 ce mois</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Contrats</p>
          <p className="text-3xl font-black text-blue-400">{stats.activeContracts}</p>
          <p className="text-xs text-green-400 mt-2">+25 ce mois</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Prospects</p>
          <p className="text-3xl font-black text-purple-400">{stats.pendingProspects}</p>
          <p className="text-xs text-yellow-400 mt-2">12 en cours</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">CA/Mois</p>
          <p className="text-3xl font-black text-green-400">9.8k€</p>
          <p className="text-xs text-green-400 mt-2">+6% vs mois dernier</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-2 gap-4">
        {/* Contrats par type */}
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold text-white mb-4">Contrats par type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={mockData.contractsByType} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                {mockData.contractsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* CA Prévisionnel 3 mois */}
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold text-white mb-4">CA Prévisionnel 3 mois</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockData.revenue3m}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="revenu" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 3 Actions */}
      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Top 3 Actions - Semaine (par ARK)</h3>
        <div className="space-y-3">
          {mockData.topActions.map((item, idx) => (
            <div key={idx} className={`p-3 rounded-lg border-l-4 ${
              item.urgency === 'haute' ? 'bg-red-500/10 border-red-500' : 'bg-yellow-500/10 border-yellow-500'
            }`}>
              <p className="text-white font-semibold text-sm">{item.action}</p>
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs font-bold ${item.urgency === 'haute' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {item.urgency.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">{item.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
