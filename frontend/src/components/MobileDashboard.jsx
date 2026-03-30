export default function MobileDashboard() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-cyan/20 p-4 rounded-lg">
        <p className="text-2xl font-bold">127 Clients</p>
      </div>
      <div className="bg-green-500/20 p-4 rounded-lg">
        <p className="text-2xl font-bold">12.8k€ CA</p>
      </div>
      <div className="bg-blue-500/20 p-4 rounded-lg">
        <p className="text-2xl font-bold">8 Alertes</p>
      </div>
      <div className="bg-purple-500/20 p-4 rounded-lg">
        <p className="text-2xl font-bold">45 Prospects</p>
      </div>
      <button className="w-full bg-cyan/30 py-3 rounded font-bold">Appeler prioritaires</button>
    </div>
  )
}
