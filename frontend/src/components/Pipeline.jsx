import { useState } from 'react'
import { Plus } from 'lucide-react'
import ProspectModal from './ProspectModal'

const STAGES = ['Prospect', 'Qualification', 'Proposition', 'Négociation', 'Gagné']

const mockProspects = [
  { id: 1, name: 'ABC Corp', stage: 0, value: '5000€', date: '2026-04-15' },
  { id: 2, name: 'XYZ SARL', stage: 1, value: '3200€', date: '2026-04-20' },
  { id: 3, name: 'Tech Innov', stage: 2, value: '8500€', date: '2026-04-10' },
  { id: 4, name: 'Green Co', stage: 3, value: '4800€', date: '2026-03-28' },
  { id: 5, name: 'Blue Ltd', stage: 0, value: '2100€', date: '2026-04-25' },
  { id: 6, name: 'Pro Assure', stage: 4, value: '6200€', date: '2026-03-26' }
]

export default function Pipeline() {
  const [prospects, setProspects] = useState(mockProspects)
  const [showModal, setShowModal] = useState(false)
  const nextId = Math.max(...prospects.map(p => p.id), 0) + 1

  const handleAddProspect = (prospectData) => {
    setProspects([...prospects, { id: nextId, ...prospectData }])
  }

  const handleDragStart = (e, prospect) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('prospectId', prospect.id)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, stageIndex) => {
    e.preventDefault()
    const prospectId = parseInt(e.dataTransfer.getData('prospectId'))
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, stage: stageIndex } : p))
    )
  }

  return (
    <div className="ml-64 p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-gradient">Pipeline prospects</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Ajouter prospect
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-6 auto-rows-max">
        {STAGES.map((stage, stageIndex) => {
          const stageProspects = prospects.filter((p) => p.stage === stageIndex)
          return (
            <div
              key={stageIndex}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stageIndex)}
              className="glass p-4 rounded-lg min-h-96"
            >
              <h3 className="font-bold text-cyan mb-4">{stage}</h3>
              <div className="space-y-3">
                {stageProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, prospect)}
                    className="glass p-3 rounded-lg cursor-move hover:border-cyan transition-all hover:shadow-lg hover:shadow-cyan/20"
                  >
                    <p className="font-bold text-slate-100">{prospect.name}</p>
                    <p className="text-sm text-cyan font-bold mt-1">{prospect.value}</p>
                    <p className="text-xs text-slate-500 mt-2">{prospect.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-6 mt-8">
        {STAGES.map((stage, idx) => {
          const stageTotal = prospects
            .filter((p) => p.stage === idx)
            .reduce((sum, p) => sum + parseInt(p.value), 0)
          return (
            <div key={idx} className="glass p-4 rounded-lg text-center">
              <p className="text-slate-400 text-sm mb-2">{stage}</p>
              <p className="text-2xl font-black text-cyan">{stageTotal}€</p>
              <p className="text-xs text-slate-500 mt-2">
                {prospects.filter((p) => p.stage === idx).length} prospect(s)
              </p>
            </div>
          )
        })}
      </div>

      {showModal && (
        <ProspectModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddProspect}
        />
      )}
    </div>
  )
}
