import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'
import { trackMarketingEvent } from '../lib/marketingEvents'
import { VibeScrollSection } from '../components/vibe'
import { formatMarketPrice, getMarketPricing } from '../market/marketContext'

const FAQ = [
  { q: 'COURTIA est-il adapté à un courtier solo ?', a: 'Oui. Le plan Starter est calibré pour les indépendants et petits cabinets.' },
  { q: 'Puis-je changer de plan plus tard ?', a: 'Oui, upgrade et downgrade possibles selon vos besoins de portefeuille.' },
  { q: 'Le prix inclut-il ARK ?', a: 'Oui. ARK est natif, avec un niveau de profondeur dépendant du plan.' },
  { q: 'Comment se passe l\'onboarding ?', a: 'Onboarding guidé + import portefeuille. Vous pouvez démarrer en quelques heures.' },
]

export default function TarifsPublic() {
  const location = useLocation()
  const market = new URLSearchParams(location.search).get('market')?.toUpperCase() === 'CH' ? 'CH' : 'FR'
  const pricing = getMarketPricing(market)
  const isSwiss = market === 'CH'

  useEffect(() => {
    applySeo({
      title: isSwiss ? 'Tarifs Courtiark Suisse — offres en CHF' : 'Tarifs Courtiark — Starter 89€ / Pro 159€ / Cabinet sur devis',
      description: isSwiss
        ? 'Offres Courtiark en CHF pour courtiers indépendants et cabinets suisses.'
        : 'Plans Courtiark pour courtiers assurance : Starter, Pro et Cabinet sur devis.',
      canonicalPath: '/tarifs',
    })
  }, [isSwiss])

  const onClickPricing = () => {
    trackMarketingEvent('click_pricing', { section: 'tarifs_page' })
  }

  return (
    <MarketingShell activePath="/tarifs">
      <section className="mk-section">
        <span className="mk-eyebrow">Tarifs Courtiark · {pricing.country}</span>
        <h1 className="mk-section-title">{isSwiss ? 'Des offres en CHF conçues pour le courtage suisse' : 'Des offres conçues pour la réalité du courtage'}</h1>
        <p className="mk-section-sub">{isSwiss ? 'Onboarding, paramétrage LSA et formation sont cadrés avant activation.' : 'Commencez en Starter, passez en Pro pour déployer pleinement ARK et le pilotage avancé.'}</p>

        <VibeScrollSection parallax={16}>
          <div className="mk-price-grid" style={{ perspective: 1400 }}>
            {pricing.plans.map((p, i) => (
              <motion.article
                key={p.code}
                className={`mk-price-card${p.highlighted ? ' featured' : ''}`}
                initial={{ opacity: 0, y: 24, rotateX: -6 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16,1,0.3,1] }}
                whileHover={{ rotateX: 4, rotateY: -4, y: -6, scale: 1.02 }}
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
              >
                <p className="mk-price-eyebrow">{p.name}{p.highlighted ? ' · recommandé' : ''}</p>
                <p className="mk-price">{formatMarketPrice(p.monthly, market)} {p.monthly && <small>HT/mois</small>}</p>
                <p className="mk-inline-note">{p.description} · {p.setupLabel}</p>
                <ul className="mk-plain-list">
                  {p.features.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </motion.article>
            ))}
          </div>
        </VibeScrollSection>
        <p className="mk-section-sub">{pricing.compliance} · {pricing.taxNote}</p>
      </section>

      <section className="mk-section">
        <div className="mk-hero-actions" style={{ marginTop: 16 }}>
          <Link to={`/demo?market=${market}`} className="mk-button primary" onClick={onClickPricing}>
            {isSwiss ? 'Réserver une démo Suisse' : 'Demander une démo'} <ArrowRight size={14} />
          </Link>
          <Link to={`/contact?market=${market}`} className="mk-button secondary" onClick={onClickPricing}>
            Parler à l'équipe
          </Link>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-card">
          <span className="mk-eyebrow"><Sparkles size={12} /> Positionnement commercial</span>
          <p className="mk-section-sub" style={{ marginTop: 10 }}>
            {isSwiss
              ? 'Courtiark présente les frais de setup et l’abonnement CHF avant toute activation.'
              : 'Courtiark présente une grille simple : Starter à 89 € HT/mois, Pro à 159 € HT/mois et Cabinet sur devis.'}
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
