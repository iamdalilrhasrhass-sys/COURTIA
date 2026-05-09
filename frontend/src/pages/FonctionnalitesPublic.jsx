import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, CalendarClock, Radar, ShieldAlert, ListChecks, BookOpenCheck, BarChart3, Cog } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

const FEATURES = [
  { icon: Radar, title: 'Cockpit quotidien', detail: 'KPIs portefeuille, alertes et priorités opérationnelles en une vue.' },
  { icon: ShieldAlert, title: 'Clients à risque', detail: 'Détection précoce des signaux de churn, avec plan de rétention.' },
  { icon: CalendarClock, title: 'Échéances maîtrisées', detail: 'Contrats filtrables et échéanciers 30/60/90 jours.' },
  { icon: ListChecks, title: 'Tâches exploitables', detail: 'Filtrage urgence, retard, statut et lien direct vers client.' },
  { icon: BookOpenCheck, title: 'Morning Brief actionnable', detail: 'Plan de journée avec raisons, impact et action recommandée.' },
  { icon: BrainCircuit, title: 'ARK métier natif', detail: 'Recommandations attachées aux pages métier, pas hors contexte.' },
  { icon: BarChart3, title: 'Rapports cabinet', detail: 'Vision pilotage clients, primes, risques, retard et activité.' },
  { icon: Cog, title: 'Admin sécurisé', detail: 'Rôles API, coûts IA, exports CSV et contrôle super_admin.' },
]

export default function FonctionnalitesPublic() {
  useEffect(() => {
    applySeo({
      title: 'Fonctionnalités COURTIA — Cockpit IA courtier',
      description: 'Découvrez les fonctionnalités COURTIA pour piloter portefeuille, échéances, risques, tâches et ARK métier.',
      canonicalPath: '/fonctionnalites',
    })
  }, [])

  return (
    <MarketingShell activePath="/fonctionnalites">
      <section className="mk-section">
        <span className="mk-eyebrow">Fonctionnalités</span>
        <h1 className="mk-section-title">Tout le cockpit COURTIA, orienté action courtier</h1>
        <p className="mk-section-sub">
          COURTIA organise vos données de cabinet pour répondre à une seule question: que faut-il faire aujourd\'hui pour protéger et développer le portefeuille.
        </p>
        <div className="mk-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="mk-card">
              <feature.icon size={18} color="#9cecff" />
              <h3>{feature.title}</h3>
              <p>{feature.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-card">
          <h2 className="mk-section-title" style={{ marginTop: 0 }}>Envie de voir COURTIA sur un vrai parcours métier ?</h2>
          <p className="mk-section-sub">Nous vous montrons dashboard, fiche client 360, contrats, tâches, morning brief et admin costs en conditions réelles.</p>
          <div className="mk-hero-actions">
            <Link to="/demo" className="mk-button primary">Demander une démo <ArrowRight size={14} /></Link>
            <Link to="/tarifs" className="mk-button secondary">Voir les offres</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
