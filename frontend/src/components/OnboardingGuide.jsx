import { useState } from 'react'
import { CheckCircle2, Circle, Users, FileText, Briefcase, MessageSquare, Settings } from 'lucide-react'

const steps = [
  { id: 1, title: 'Créer votre premier client', desc: 'Ajouter un client et ses infos', icon: Users },
  { id: 2, title: 'Ajouter un contrat', desc: 'Enregistrer une assurance auto/habitation', icon: FileText },
  { id: 3, title: 'Créer un prospect', desc: 'Ajouter un prospect et le qualifier', icon: Briefcase },
  { id: 4, title: 'Parler à ARK', desc: 'Demander une recommandation à l\'IA', icon: MessageSquare },
  { id: 5, title: 'Configurer les paramètres', desc: 'Paramétrer notifications et préférences', icon: Settings }
]

export default function OnboardingGuide({ isNewUser }) {
  const [completed, setCompleted] = useState([])

  const toggleStep = (id) => {
    if (completed.includes(id)) {
      setCompleted(completed.filter(x => x !== id))
    } else {
      setCompleted([...completed, id])
    }
  }

  if (!isNewUser && completed.length === 0) return null

  const progress = (completed.length / steps.length) * 100

  return (
    <div className="fixed bottom-4 right-4 glass rounded-lg p-6 max-w-sm shadow-2xl z-40">
      <h3 className="text-lg font-bold text-cyan mb-4">Bienvenue sur COURTIA! 👋</h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="bg-slate-700 rounded-full h-2 overflow-hidden mb-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-400">{completed.length} / {steps.length} étapes complétées</p>
      </div>

      {/* Steps */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {steps.map(step => {
          const Step = step.icon
          const isCompleted = completed.includes(step.id)
          return (
            <div
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`p-3 rounded-lg cursor-pointer transition ${
                isCompleted
                  ? 'bg-green-500/20 border border-green-500/50'
                  : 'bg-slate-700/50 border border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-green-400" />
                  ) : (
                    <Circle size={20} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-400">{step.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion badge */}
      {completed.length === steps.length && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
          <p className="text-green-400 font-bold text-sm">🎉 Bienvenue sur COURTIA!</p>
          <p className="text-xs text-slate-400 mt-1">Vous êtes prêt à commencer</p>
        </div>
      )}
    </div>
  )
}
