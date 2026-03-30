import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const clientGrowth = [
  { month: 'Jan', clients: 95 },
  { month: 'Fév', clients: 102 },
  { month: 'Mar', clients: 115 },
  { month: 'Avr', clients: 128 },
  { month: 'Mai', clients: 135 },
  { month: 'Juin', clients: 142 },
]

const revenueByType = [
  { type: 'Auto', revenue: 45000 },
  { type: 'Habitation', revenue: 38000 },
  { type: 'Santé', revenue: 28000 },
  { type: 'RC', revenue: 15000 },
]

const conversionData = [
  { source: 'Prospects initiaux', value: 125 },
  { source: 'En discussion', value: 45 },
  { source: 'Contrats signés', value: 28 },
]

const sourcePerformance = [
  { source: 'Recommandations', conversion: 32, color: '#0891b2' },
  { source: 'Démarchage froid', conversion: 18, color: '#06b6d4' },
  { source: 'Inbound', conversion: 25, color: '#14b8a6' },
  { source: 'Rétention', conversion: 45, color: '#8b5cf6' },
]

export default function StatsAdvanced() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-black text-gradient">Statistiques Avancées</h2>

      {/* Croissance clients 12 mois */}
      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Évolution du portefeuille (6 derniers mois)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={clientGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="clients" stroke="#0891b2" strokeWidth={2} dot={{ fill: '#0891b2' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CA par type */}
      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Chiffre d'affaires par type de contrat</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="type" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Bar dataKey="revenue" fill="#0891b2" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Taux de conversion */}
      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Taux de conversion prospects → clients</h3>
        <div className="space-y-4">
          {conversionData.map((item, idx) => {
            const percent = idx === 0 ? 100 : idx === 1 ? 36 : 62
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{item.source}</span>
                  <span className="text-cyan font-bold">{item.value} ({percent}%)</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Performance par source */}
      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Performance par source d'acquisition</h3>
        <div className="grid grid-cols-4 gap-4">
          {sourcePerformance.map((item, idx) => (
            <div key={idx} className="bg-slate-700/50 p-4 rounded-lg text-center">
              <p className="text-slate-400 text-xs">{item.source}</p>
              <p className="text-2xl font-black mt-2" style={{ color: item.color }}>{item.conversion}%</p>
              <p className="text-xs text-slate-500 mt-2">Taux conversion</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
