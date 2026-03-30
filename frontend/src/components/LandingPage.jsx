export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3">
      <div className="p-12 text-center">
        <h1 className="text-5xl font-black text-gradient mb-4">COURTIA</h1>
        <p className="text-2xl text-slate-300 mb-8">Plateforme CRM révolutionnaire pour courtiers en assurance</p>
        
        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="glass p-6 rounded-lg">
            <p className="text-4xl mb-2">⚡</p>
            <p className="font-bold">Efficacité</p>
            <p className="text-sm text-slate-400">Gagnez 15h par semaine</p>
          </div>
          <div className="glass p-6 rounded-lg">
            <p className="text-4xl mb-2">🤖</p>
            <p className="font-bold">ARK IA</p>
            <p className="text-sm text-slate-400">Recommandations intelligentes</p>
          </div>
          <div className="glass p-6 rounded-lg">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-bold">Analytics</p>
            <p className="text-sm text-slate-400">Insights en temps réel</p>
          </div>
        </div>

        <button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 px-8 rounded-lg">
          Demander une démo
        </button>
      </div>
    </div>
  )
}
