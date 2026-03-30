import { Download, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const monthlyData = [
  { month: 'Jan', dda: 12, rgpd: 8, acpr: 5 },
  { month: 'Fév', dda: 15, rgpd: 10, acpr: 7 },
  { month: 'Mar', dda: 18, rgpd: 14, acpr: 9 },
  { month: 'Avr', dda: 22, rgpd: 18, acpr: 11 },
  { month: 'Mai', dda: 25, rgpd: 20, acpr: 13 },
  { month: 'Juin', dda: 28, rgpd: 25, acpr: 15 }
]

export default function Reports() {
  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Rapports et Conformité</h2>

      {/* Report Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { title: 'DDA', subtitle: 'Directive sur la Distribution d\'Assurances', color: 'from-blue-500' },
          { title: 'RGPD', subtitle: 'Règlement Général de Protection des Données', color: 'from-green-500' },
          { title: 'ACPR', subtitle: 'Autorité de Contrôle Prudentiel', color: 'from-purple-500' }
        ].map((report, idx) => (
          <div key={idx} className={`glass p-6 rounded-lg gradient-blue-cyan bg-gradient-to-br ${report.color}`}>
            <p className="text-lg font-bold text-white mb-2">{report.title}</p>
            <p className="text-sm text-slate-200 mb-4">{report.subtitle}</p>
            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <Download size={16} />
              Télécharger
            </button>
          </div>
        ))}
      </div>

      {/* Compliance Chart */}
      <div className="glass p-6 rounded-lg mb-8">
        <h3 className="text-2xl font-bold text-cyan mb-6 flex items-center gap-2">
          <BarChart3 size={24} />
          Conformité globale
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip
              contentStyle={{
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
              labelStyle={{ color: '#06b6d4' }}
            />
            <Legend />
            <Bar dataKey="dda" fill="#3b82f6" name="DDA" radius={[8, 8, 0, 0]} />
            <Bar dataKey="rgpd" fill="#06b6d4" name="RGPD" radius={[8, 8, 0, 0]} />
            <Bar dataKey="acpr" fill="#10b981" name="ACPR" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Reports */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-xl font-bold text-cyan mb-4">Rapports récents</h3>
        <div className="space-y-3">
          {[
            { date: '2026-03-26', name: 'Rapport DDA Mars 2026', status: '✓ Compliant' },
            { date: '2026-03-20', name: 'Audit RGPD Trimestriel', status: '✓ Valide' },
            { date: '2026-03-15', name: 'Rapport ACPR Annuel', status: '✓ Approuvé' }
          ].map((report, idx) => (
            <div key={idx} className="bg-dark-3 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold">{report.name}</p>
                <p className="text-sm text-slate-500">{report.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 text-sm font-bold">{report.status}</span>
                <button className="text-cyan hover:opacity-80">
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
