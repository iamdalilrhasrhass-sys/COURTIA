export default function Academy() {
  const tutorials = [
    { id: 1, title: 'Débuter avec COURTIA', duration: '5 min', completed: true },
    { id: 2, title: 'Utiliser ARK efficacement', duration: '8 min', completed: true },
    { id: 3, title: 'Gérer ses clients', duration: '6 min', completed: false },
    { id: 4, title: 'Maximiser ses revenus', duration: '10 min', completed: false },
    { id: 5, title: 'Suivi sinistres avancé', duration: '7 min', completed: false }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Académie COURTIA</h2>
      <div className="space-y-3">
        {tutorials.map(t => (
          <div key={t.id} className="glass p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-bold">{t.title}</p>
              <p className="text-xs text-slate-400">{t.duration}</p>
            </div>
            {t.completed ? <span className="text-green-400">✅</span> : <button className="btn-primary text-sm">Regarder</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
