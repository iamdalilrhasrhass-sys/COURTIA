import { useState } from 'react'
import { GripVertical, AlertCircle, ArrowRight } from 'lucide-react'

const mockProspects = [
  { id: 1, name: 'ABC Corp', value: 2500, stage: 'initial', enteredDate: '2026-03-10', status: 'stagnant' },
  { id: 2, name: 'XYZ SARL', value: 1800, stage: 'discussion', enteredDate: '2026-03-15', status: 'active' },
  { id: 3, name: 'Tech Solutions', value: 3200, stage: 'proposal', enteredDate: '2026-03-18', status: 'active' },
  { id: 4, name: 'Green Energy', value: 4500, stage: 'negotiation', enteredDate: '2026-03-20', status: 'active' },
  { id: 5, name: 'Marie Martin', value: 750, stage: 'won', enteredDate: '2026-03-22', status: 'active' }
]

const stages = ['initial', 'discussion', 'proposal', 'negotiation', 'won']
const stageLabels = { initial: 'Initial', discussion: 'Discussion', proposal: 'Proposition', negotiation: 'Négociation', won: 'Gagné' }

export default function PipelineEnhanced() {
  const [prospects] = useState(mockProspects)
  const [selectedProspect, setSelectedProspect] = useState(null)

  const getStagnantDays = (enteredDate) => {
    const now = new Date()
    const entered = new Date(enteredDate)
    return Math.floor((now - entered) / (1000 * 60 * 60 * 24))
  }

  const isStagnant = (prospect) => getStagnantDays(prospect.enteredDate) > 15

  const handleConvertToClient = (prospect) => {
    console.log(`Convertir ${prospect.name} en client`)
    alert(`${prospect.name} converti en client!`)
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-black text-gradient mb-6">Pipeline Prospects</h2>

      <div className="grid grid-cols-5 gap-4">
        {stages.map(stage => (
          <div key={stage} className="glass rounded-lg p-4">
            <h3 className="font-bold text-cyan mb-4">{stageLabels[stage]}</h3>
            <div className="space-y-3">
              {prospects.filter(p => p.stage === stage).map(prospect => {
                const stagnantDays = getStagnantDays(prospect.enteredDate)
                const isStag = isStagnant(prospect)
                const progress = (stages.indexOf(stage) / stages.length) * 100

                return (
                  <div
                    key={prospect.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      isStag ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-700/50 border border-slate-600'
                    }`}
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    {/* Stagnation Badge */}
                    {isStag && (
                      <div className="flex items-center gap-1 mb-2 text-red-400 text-xs">
                        <AlertCircle size={14} />
                        <span>Stagnant {stagnantDays}j</span>
                      </div>
                    )}

                    {/* Prospect Info */}
                    <p className="font-semibold text-white text-sm">{prospect.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{prospect.value}€</p>

                    {/* Entry Date */}
                    <p className="text-xs text-slate-500 mt-2">Entrée: {prospect.enteredDate}</p>

                    {/* Progress Bar */}
                    <div className="mt-3 bg-slate-600 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    {/* Convert Button for Won */}
                    {stage === 'won' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConvertToClient(prospect)
                        }}
                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition"
                      >
                        <ArrowRight size={12} />
                        Convertir client
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedProspect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold text-cyan mb-4">{selectedProspect.name}</h3>
            <div className="space-y-2 text-sm">
              <p>Valeur: <span className="text-green-400 font-bold">{selectedProspect.value}€</span></p>
              <p>Stage: <span className="text-blue-400">{stageLabels[selectedProspect.stage]}</span></p>
              <p>Stagnation: <span className={getStagnantDays(selectedProspect.enteredDate) > 15 ? 'text-red-400' : 'text-green-400'}>
                {getStagnantDays(selectedProspect.enteredDate)} jours
              </span></p>
            </div>
            <button onClick={() => setSelectedProspect(null)} className="mt-6 w-full btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
