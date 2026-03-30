export default function TreasuryDashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Gestion Trésorerie</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Commissions Attendues</p>
          <p className="text-3xl font-bold text-yellow-400">12,450€</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Commissions Reçues</p>
          <p className="text-3xl font-bold text-green-400">10,200€</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400">Écart</p>
          <p className="text-3xl font-bold text-red-400">2,250€</p>
        </div>
      </div>
    </div>
  )
}
