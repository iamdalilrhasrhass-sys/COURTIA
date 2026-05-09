import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'
import { trackMarketingEvent } from '../lib/marketingEvents'

const FAQ = [
  { q: 'COURTIA est-il adapté à un courtier solo ?', a: 'Oui. Le plan Starter est calibré pour les indépendants et petits cabinets.' },
  { q: 'Puis-je changer de plan plus tard ?', a: 'Oui, upgrade et downgrade possibles selon vos besoins de portefeuille.' },
  { q: 'Le prix inclut-il ARK ?', a: 'Oui. ARK est natif, avec un niveau de profondeur dépendant du plan.' },
  { q: 'Comment se passe l\'onboarding ?', a: 'Onboarding guidé + import portefeuille. Vous pouvez démarrer en quelques heures.' },
]

export default function TarifsPublic() {
  useEffect(() => {
    applySeo({
      title: 'Tarifs COURTIA — Starter 89€ / Pro 159€',
      description: 'Plans COURTIA pour courtiers assurance: Starter, Pro (offre principale) et Cabinet/Premium.',
      canonicalPath: '/tarifs',
    })
  }, [])

  const onClickPricing = () => {
    trackMarketingEvent('click_pricing', { section: 'tarifs_page' })
  }

  return (
    <MarketingShell activePath="/tarifs">
      <section className="mk-section">
        <span className="mk-eyebrow">Tarifs COURTIA</span>
        <h1 className="mk-section-title">Des offres conçues pour la réalité du courtage</h1>
        <p className="mk-section-sub">Commencez en Starter, passez en Pro pour déployer pleinement ARK et le pilotage avancé.</p>

        <div className="mk-price-grid">
          <article className="mk-price-card">
            <p className="mk-price-eyebrow">Starter</p>
            <p className="mk-price">89€ <small>HT/mois</small></p>
            <ul className="mk-plain-list">
              <li>Dashboard portefeuille</li>
              <li>Clients, contrats, tâches</li>
              <li>Rapports essentiels</li>
              <li>Pour 1 à 5 collaborateurs</li>
            </ul>
          </article>

          <article className="mk-price-card featured">
            <p className="mk-price-eyebrow">Pro · recommandé</p>
            <p className="mk-price">159€ <small>HT/mois</small></p>
            <ul className="mk-plain-list">
              <li>Morning Brief complet</li>
              <li>Clients à risque & relances intelligentes</li>
              <li>Rapports avancés + admin costs</li>
              <li>Pour cabinets en croissance</li>
            </ul>
          </article>

          <article className="mk-price-card">
            <p className="mk-price-eyebrow">Cabinet / Premium</p>
            <p className="mk-price">Sur devis</p>
            <ul className="mk-plain-list">
              <li>Multi-utilisateurs avancé</li>
              <li>Accompagnement opérationnel</li>
              <li>Intégrations sur mesure</li>
              <li>Support renforcé</li>
            </ul>
          </article>
        </div>

        <div className="mk-hero-actions" style={{ marginTop: 16 }}>
          <Link to="/demo" className="mk-button primary" onClick={onClickPricing}>
            Demander une démo <ArrowRight size={14} />
          </Link>
          <Link to="/contact" className="mk-button secondary" onClick={onClickPricing}>
            Parler à l'équipe
          </Link>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-card">
          <span className="mk-eyebrow"><Sparkles size={12} /> Positionnement commercial</span>
          <p className="mk-section-sub" style={{ marginTop: 10 }}>
            COURTIA est prêt pour une bêta commerciale sérieuse à 89€ HT/mois et défendable à 159€ HT/mois pour les early adopters exigeants.
          </p>
        </div>
      </section>

      <section className="mk-section">
        <h2 className="mk-section-title">FAQ Tarifs</h2>
        <div className="mk-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </MarketingShell>
  )
}
