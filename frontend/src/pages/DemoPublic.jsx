import { useEffect } from 'react'
import { ArrowRight, PlayCircle, Users, CalendarClock, BarChart3 } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'
import { trackMarketingEvent } from '../lib/marketingEvents'

const DEMO_STEPS = [
  {
    icon: Users,
    title: '1. Dashboard cockpit',
    text: 'Vue des clients actifs, prospects, tâches urgentes et signaux ARK du jour.',
  },
  {
    icon: CalendarClock,
    title: '2. Fiche client 360',
    text: 'Contrats, tâches liées, risque, fidélité, opportunités et actions recommandées.',
  },
  {
    icon: BarChart3,
    title: '3. Pilotage cabinet',
    text: 'Rapports, Morning Brief, admin costs IA et plan de suivi opérationnel.',
  },
]

export default function DemoPublic() {
  useEffect(() => {
    applySeo({
      title: 'Démo COURTIA — Parcours courtier complet',
      description: 'Réservez une démo COURTIA et découvrez le cockpit IA orienté courtage assurance français.',
      canonicalPath: '/demo',
    })
  }, [])

  return (
    <MarketingShell activePath="/demo">
      <section className="mk-section">
        <span className="mk-eyebrow"><PlayCircle size={12} /> Démo COURTIA</span>
        <h1 className="mk-section-title">Une démo orientée terrain courtier, pas une visite gadget</h1>
        <p className="mk-section-sub">
          En 30 minutes, nous passons sur un vrai parcours: dashboard, clients, fiche 360, contrats, tâches, morning brief, admin et coûts IA.
        </p>
      </section>

      <section className="mk-section">
        <div className="mk-grid">
          {DEMO_STEPS.map((step) => (
            <article key={step.title} className="mk-card">
              <step.icon size={18} color="#9cecff" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-split">
          <div className="mk-card">
            <h2 className="mk-section-title" style={{ marginTop: 0 }}>Réserver ma démo</h2>
            <p className="mk-section-sub">Indiquez votre contexte cabinet. Nous adaptons la démo à vos priorités commerciales et opérationnelles.</p>
            <div style={{ marginTop: 14 }}>
              <DemoRequestForm />
            </div>
          </div>
          <div className="mk-card">
            <h3 style={{ marginTop: 0 }}>Ce que vous obtenez après la démo</h3>
            <ul className="mk-plain-list">
              <li>Checklist d'implémentation cabinet (Semaine 1 à 3).</li>
              <li>Recommandation de plan (Starter / Pro / Premium).</li>
              <li>Priorités ARK adaptées à votre portefeuille.</li>
              <li>Plan d'onboarding et de migration des données.</li>
            </ul>
            <button
              type="button"
              className="mk-button secondary"
              style={{ marginTop: 14 }}
              onClick={() => trackMarketingEvent('open_video', { section: 'demo_page' })}
            >
              Ouvrir la présentation vidéo <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
