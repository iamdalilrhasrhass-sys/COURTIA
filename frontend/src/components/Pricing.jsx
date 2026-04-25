import { useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [demoData, setDemoData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    plan: ''
  })

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 99,
      period: '/mois',
      description: 'Pour débuter avec COURTIA',
      features: [
        'Jusqu\'à 50 clients',
        'Gestion basique des contrats',
        'Tableau de bord simple',
        'Support email',
        'Calendrier RDV',
        'Exporter CSV'
      ],
      color: 'from-blue-500 to-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 299,
      period: '/mois',
      description: 'Pour les courtiers confirmés',
      features: [
        'Jusqu\'à 500 clients',
        'Gestion avancée des contrats',
        'Pipeline prospects kanban',
        'Notifications Telegram',
        'Briefs RDV automatiques',
        'Exporter Excel & PDF',
        'API intégrations',
        'Historique ARK',
        'Support prioritaire'
      ],
      color: 'from-cyan-500 to-blue-500',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 599,
      period: '/mois',
      description: 'Solution complète + support dédié',
      features: [
        'Clients illimités',
        'Tous les outils Pro',
        'ARK IA avancée',
        'Automations custom',
        'Multi-utilisateurs',
        'Rapports DDA/RGPD/ACPR',
        'Analyses avancées',
        'Webhooks & API complète',
        'Support 24/7 dédié',
        'Formation complète',
        'Intégrations email'
      ],
      color: 'from-purple-500 to-pink-500',
      button: 'bg-purple-600 hover:bg-purple-700'
    }
  ]

  const handleDemoRequest = async () => {
    if (!demoData.name || !demoData.email) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      // Send to backend (via message for now)
      const message = `📋 Nouvelle demande de démo COURTIA\n\n` +
        `Nom: ${demoData.name}\n` +
        `Email: ${demoData.email}\n` +
        `Téléphone: ${demoData.phone || 'N/A'}\n` +
        `Entreprise: ${demoData.company || 'N/A'}\n` +
        `Formule intéressée: ${demoData.plan || 'N/A'}`
      
      console.log('Demo request:', message)
      alert('Merci! Nous vous contacterons bientôt.')
      setShowDemoForm(false)
      setDemoData({ name: '', email: '', phone: '', company: '', plan: '' })
    } catch (error) {
      console.error('Error sending demo request:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3">
      {/* Header */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gradient mb-6">
            Tarification COURTIA
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto">
            Trois formules pour transformer votre activité de courtier en assurance. 
            Sans engagement, annulable à tout moment.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition transform hover:scale-105 ${
                plan.popular
                  ? 'glass border-2 border-cyan ring-2 ring-cyan/30 scale-105 md:scale-110'
                  : 'glass border border-slate-700'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 rounded-full text-sm font-bold text-white">
                    ⭐ POPULAIRE
                  </div>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-2xl font-black text-gradient mb-2">{plan.name}</h3>
              <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-8">
                <span className="text-5xl font-black text-white">{plan.price}€</span>
                <span className="text-slate-400 ml-2">{plan.period}</span>
                <p className="text-sm text-slate-500 mt-2">TVA comprise</p>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => {
                  setSelectedPlan(plan.id)
                  setDemoData({ ...demoData, plan: plan.name })
                  setShowDemoForm(true)
                }}
                className={`w-full py-3 rounded-lg font-bold mb-8 flex items-center justify-center gap-2 transition text-white ${plan.button}`}
              >
                Demander une démo
                <ArrowRight size={20} />
              </button>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={20} className="text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black text-gradient mb-12 text-center">
          Questions fréquentes
        </h2>
        <div className="space-y-6">
          <div className="glass p-6 rounded-lg">
            <h3 className="text-xl font-bold text-cyan mb-3">Puis-je tester gratuitement?</h3>
            <p className="text-slate-400">
              Oui! Demandez une démo et nous vous offrirons 14 jours d'accès complet à COURTIA.
            </p>
          </div>
          <div className="glass p-6 rounded-lg">
            <h3 className="text-xl font-bold text-cyan mb-3">Peut-on résilier à tout moment?</h3>
            <p className="text-slate-400">
              Bien sûr. Sans engagement, vous pouvez résilier quand vous le souhaitez.
            </p>
          </div>
          <div className="glass p-6 rounded-lg">
            <h3 className="text-xl font-bold text-cyan mb-3">Et l'intégration Telegram?</h3>
            <p className="text-slate-400">
              Incluse dans tous les plans. Vous recevrez les notifications, briefs et rappels directement sur Telegram.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Request Modal */}
      {showDemoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-cyan mb-6">Demander une démo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Nom complet *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder="Jean Dupont"
                  value={demoData.name}
                  onChange={(e) => setDemoData({ ...demoData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Email *</label>
                <input
                  type="email"
                  className="input-field w-full"
                  placeholder="jean@example.com"
                  value={demoData.email}
                  onChange={(e) => setDemoData({ ...demoData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Téléphone</label>
                <input
                  type="tel"
                  className="input-field w-full"
                  placeholder="06 12 34 56 78"
                  value={demoData.phone}
                  onChange={(e) => setDemoData({ ...demoData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Entreprise</label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder="Votre cabinet de courtage"
                  value={demoData.company}
                  onChange={(e) => setDemoData({ ...demoData, company: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowDemoForm(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDemoRequest}
                  className="btn-primary flex-1"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
