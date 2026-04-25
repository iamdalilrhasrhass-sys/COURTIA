import { useState, useEffect } from 'react'
import { Check, TrendingUp } from 'lucide-react'

const testimonials = [
  {
    name: 'Pierre Leblanc',
    company: 'Courtier Assurance 77',
    avatar: '👨‍💼',
    rating: 5,
    text: 'COURTIA m\'a fait gagner 15 heures par semaine. Mes clients sont plus heureux, mes commissions ont augmenté de 23%!'
  },
  {
    name: 'Sophie Martin',
    company: 'Cabinet Martin Assurance',
    avatar: '👩‍💼',
    rating: 5,
    text: 'L\'IA ARK me suggère exactement les bons moments pour contacter mes clients. ROI en 2 mois!'
  },
  {
    name: 'Jean Dupont',
    company: 'Courtage Dupont & Co',
    avatar: '👨‍💻',
    rating: 5,
    text: 'Simple, puissant, révolutionnaire. J\'ai augmenté mon portefeuille de 40% en 6 mois.'
  }
]

const plans = [
  {
    name: 'Starter',
    price: 99,
    clients: 'Jusqu\'à 100',
    features: ['Tableau de bord', 'CRUD clients', 'Prospects basique', 'Exporter PDF', 'Email support']
  },
  {
    name: 'Pro',
    price: 299,
    clients: 'Jusqu\'à 500',
    features: ['Tout Starter', 'ARK IA', 'Notifications Telegram', 'Statistiques avancées', 'Calendrier RDV', 'API access'],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 599,
    clients: 'Illimité',
    features: ['Tout Pro', 'Intégrations customs', 'Support prioritaire 24/7', 'Formations incluses', 'Backup quotidiens', 'SLA 99.9%']
  }
]

export default function PricingPremium() {
  const [clientsCount, setClientsCount] = useState(150)
  const [discount, setDiscount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    // Compte à rebours -50% (24h)
    const endTime = new Date().getTime() + (24 * 60 * 60 * 1000)
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = endTime - now
      setTimeLeft(Math.floor(distance / (1000 * 60)))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const lostWithoutCOURTIA = clientsCount * 45 * 12 // 45€ par client/mois = 540€/an perdu
  const gainWithCOURTIA = clientsCount * 250 * 12 // 250€ potentiel supplémentaire/client/an

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 p-4 md:p-8">
      {/* Offre lancement */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg mb-8 text-center">
        <p className="font-bold">🎉 OFFRE DE LANCEMENT: -50% le premier mois!</p>
        <p className="text-sm mt-2">Compte à rebours: {Math.floor(timeLeft / 60)}h {timeLeft % 60}m</p>
      </div>

      {/* Titre */}
      <div className="text-center mb-12">
        <h1 className="text-2xl md:text-4xl font-black text-gradient mb-4">Tarification COURTIA</h1>
        <p className="text-slate-400 text-base md:text-lg">Choisissez le plan adapté à votre cabinet</p>
      </div>

      {/* Calculateur ROI */}
      <div className="max-w-2xl mx-auto glass p-5 md:p-8 rounded-lg mb-12">
        <h2 className="text-xl font-bold text-cyan mb-6">Calculateur ROI</h2>
        <div className="space-y-6">
          <div>
            <label className="text-slate-400 text-sm">Nombre de clients: <span className="text-white font-bold">{clientsCount}</span></label>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={clientsCount}
              onChange={(e) => setClientsCount(parseInt(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg">
              <p className="text-red-400 text-sm">💸 SANS COURTIA/an</p>
              <p className="text-xl md:text-2xl font-black text-red-400 mt-2">{lostWithoutCOURTIA.toLocaleString()}€</p>
              <p className="text-xs text-slate-400 mt-2">Perdu en efficacité</p>
            </div>
            <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-lg">
              <p className="text-green-400 text-sm">💰 AVEC COURTIA/an</p>
              <p className="text-xl md:text-2xl font-black text-green-400 mt-2">+{gainWithCOURTIA.toLocaleString()}€</p>
              <p className="text-xs text-slate-400 mt-2">Revenu supplémentaire</p>
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/50 p-4 rounded-lg">
            <p className="text-cyan text-sm font-bold">ROI TOTAL ANNUEL</p>
            <p className="text-2xl md:text-3xl font-black text-cyan mt-2">{(lostWithoutCOURTIA + gainWithCOURTIA).toLocaleString()}€</p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`glass p-5 md:p-8 rounded-lg relative transition transform hover:scale-105 ${
              plan.popular ? 'ring-2 ring-cyan border-cyan/50' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                PLUS POPULAIRE
              </div>
            )}

            <h3 className="text-xl md:text-2xl font-bold text-cyan mb-2">{plan.name}</h3>
            <p className="text-slate-400 text-sm mb-4">{plan.clients}</p>

            <div className="mb-6">
              <p className="text-3xl md:text-4xl font-black text-white">{plan.price}€<span className="text-lg text-slate-400">/mois</span></p>
              <p className="text-xs text-green-400 mt-2">-50% premier mois</p>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                  <Check size={16} className="text-green-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className={`w-full py-3 rounded-lg font-bold transition ${
              plan.popular
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}>
              Choisir {plan.name}
            </button>
          </div>
        ))}
      </div>

      {/* Témoignages */}
      <div className="mb-12">
        <h2 className="text-xl md:text-2xl font-black text-gradient text-center mb-8">Témoignages Courtiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((test, idx) => (
            <div key={idx} className="glass p-4 md:p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{test.avatar}</span>
                <div>
                  <p className="font-bold text-white">{test.name}</p>
                  <p className="text-xs text-slate-400">{test.company}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(test.rating)].map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
              </div>
              <p className="text-slate-300 text-sm italic">"{test.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
