import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, PlayCircle, Users, CalendarClock, BarChart3 } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'

const DEMO_STEPS_FR = [
  {
    icon: Users,
    title: '1. Tableau de bord cockpit',
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

const DEMO_STEPS_CH = [
  {
    icon: Users,
    title: '1. Portefeuille et priorités',
    text: 'Clients, contrats, échéances, tâches et relances réunis dans un cockpit adapté au cabinet suisse.',
  },
  {
    icon: CalendarClock,
    title: '2. Traçabilité du suivi',
    text: 'Démonstration du journal de conseil, des informations LSA et du suivi documentaire à valider par le courtier.',
  },
  {
    icon: BarChart3,
    title: '3. ARK et pilotage cabinet',
    text: 'Priorités du matin, signaux portefeuille et organisation multi-utilisateur, sans décision automatique à votre place.',
  },
]

export default function DemoPublic() {
  const location = useLocation()
  const market = new URLSearchParams(location.search).get('market')?.toUpperCase() === 'CH' ? 'CH' : 'FR'
  const isSwiss = market === 'CH'
  const demoSteps = isSwiss ? DEMO_STEPS_CH : DEMO_STEPS_FR

  useEffect(() => {
    applySeo({
      title: isSwiss ? 'Démo Courtiark Suisse — Cockpit courtier en CHF' : 'Démo Courtiark — Parcours courtier complet',
      description: isSwiss
        ? 'Réservez une démo Courtiark adaptée aux cabinets suisses : portefeuille, échéances, suivi LSA et priorités ARK.'
        : 'Réservez une démo Courtiark et découvrez le cockpit IA orienté courtage assurance français.',
      canonicalPath: '/demo',
    })
  }, [isSwiss])

  return (
    <MarketingShell activePath="/demo">
      <section className="mk-section">
        <span className="mk-eyebrow"><PlayCircle size={12} /> {isSwiss ? 'Démo Courtiark Suisse' : 'Démo Courtiark'}</span>
        <h1 className="mk-section-title">
          {isSwiss ? '20 minutes sur votre réalité de cabinet suisse' : 'Une démo orientée terrain courtier, pas une visite gadget'}
        </h1>
        <p className="mk-section-sub">
          {isSwiss
            ? 'Nous partons de votre organisation actuelle et montrons comment centraliser portefeuille, échéances, relances et preuves de suivi. Les points LSA, FINMA et nLPD sont cadrés sans promesse de conformité automatique.'
            : 'En 30 minutes, nous passons sur un vrai parcours : dashboard, clients, fiche 360, contrats, tâches, morning brief, admin et coûts IA.'}
        </p>
      </section>

      <section className="mk-section">
        <div className="mk-grid">
          {demoSteps.map((step) => (
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
            <p className="mk-section-sub">
              {isSwiss
                ? 'Indiquez votre contexte. Nous adaptons la démo à votre canton, votre taille d’équipe et vos outils actuels.'
                : 'Indiquez votre contexte cabinet. Nous adaptons la démo à vos priorités commerciales et opérationnelles.'}
            </p>
            <div style={{ marginTop: 14 }}>
              <DemoRequestForm market={market} source={isSwiss ? 'demo_ch' : 'demo_fr'} />
            </div>
          </div>
          <div className="mk-card">
            <h3 style={{ marginTop: 0 }}>Ce que vous obtenez après la démo</h3>
            <ul className="mk-plain-list">
              <li>{isSwiss ? 'Synthèse des irritants et workflows prioritaires.' : "Checklist d'implémentation cabinet (Semaine 1 à 3)."}</li>
              <li>{isSwiss ? 'Recommandation adaptée au marché suisse et chiffrée en CHF.' : 'Recommandation de plan (Starter / Pro / Cabinet).'}</li>
              <li>Priorités ARK adaptées à votre portefeuille.</li>
              <li>Plan d'onboarding et de migration des données.</li>
            </ul>
            <Link
              to={isSwiss ? '/fonctionnalites?market=CH' : '/fonctionnalites'}
              className="mk-button secondary"
              style={{ marginTop: 14 }}
            >
              Voir le parcours produit <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
