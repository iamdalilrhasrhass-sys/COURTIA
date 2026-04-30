import { X, Check } from 'lucide-react'

export default function BeforeAfterPanel({ dark = false }) {
  const bgClass = dark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-white/20'
  const beforeClass = dark ? 'text-white/30' : 'text-gray-400'
  const afterClass = dark ? 'text-white' : 'text-gray-900'
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Avant */}
      <div className={`rounded-2xl p-8 border ${bgClass} backdrop-blur-xl`}>
        <h3 className={`font-black text-lg mb-6 flex items-center gap-2 ${beforeClass}`}>
          <X size={18} className="text-red-400" /> Avant COURTIA
        </h3>
        <ul className="space-y-3">
          {[
            'Fichiers Excel dispersés',
            'Relances manuelles oubliées',
            'Aucune vision du portefeuille',
            'Perte d\'opportunités',
            'Pas d\'assistant métier',
            'Administratif chronophage',
          ].map((item, i) => (
            <li key={i} className={`flex items-start gap-3 text-sm ${beforeClass}`}>
              <X size={14} className="mt-0.5 shrink-0 text-red-300" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {/* Après */}
      <div className={`rounded-2xl p-8 border ${bgClass} backdrop-blur-xl ${dark ? 'border-purple-500/20' : 'border-purple-200/50'}`}>
        <h3 className={`font-black text-lg mb-6 flex items-center gap-2 ${afterClass}`}>
          <Check size={18} className="text-green-500" /> Avec COURTIA
        </h3>
        <ul className="space-y-3">
          {[
            'Cockpit centralisé en temps réel',
            'Relances automatiques préparées par ARK',
            'Portefeuille vivant et priorisé',
            'Opportunités détectées par l\'IA',
            'Assistant qui travaille avec vous',
            '60% de temps administratif économisé',
          ].map((item, i) => (
            <li key={i} className={`flex items-start gap-3 text-sm ${afterClass}`}>
              <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
