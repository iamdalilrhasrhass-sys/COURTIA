import { useState } from 'react'

export default function AdminPanel() {
  const [courtiers] = useState([
    { id: 1, email: 'courtier1@test.com', clients: 45, revenue: 8500, subscription: 'Pro', joinDate: '2026-01-15' },
    { id: 2, email: 'courtier2@test.com', clients: 32, revenue: 6200, subscription: 'Starter', joinDate: '2026-02-01' },
    { id: 3, email: 'courtier3@test.com', clients: 67, revenue: 12800, subscription: 'Enterprise', joinDate: '2025-12-10' }
  ])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Admin Panel</h2>

      <div className="glass p-6 rounded-lg">
        <h3 className="font-bold text-white mb-4">Courtiers Actifs</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Clients</th>
              <th className="text-left p-2">Revenus</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Date Join</th>
            </tr>
          </thead>
          <tbody>
            {courtiers.map(c => (
              <tr key={c.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.clients}</td>
                <td className="p-2 text-green-400">{c.revenue}€</td>
                <td className="p-2"><span className="bg-cyan/20 px-2 py-1 rounded text-xs">{c.subscription}</span></td>
                <td className="p-2 text-slate-400">{c.joinDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Total Courtiers</p>
          <p className="text-3xl font-bold text-cyan">3</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Revenus Mensuels</p>
          <p className="text-3xl font-bold text-green-400">27.5k€</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Total Clients</p>
          <p className="text-3xl font-bold text-blue-400">144</p>
        </div>
      </div>
    </div>
  )
}
