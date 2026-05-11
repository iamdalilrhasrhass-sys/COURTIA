import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'
import { trackMarketingEvent } from '../lib/marketingEvents'
import { VibeScrollSection } from '../components/vibe'

const FAQ = [
  { q: 'COURTIA est-il adapté à un courtier solo ?', a: 'Oui. Le plan Starter est calibré pour les indépendants et petits cabinets.' },
  { q: 'Puis-je changer de plan plus tard ?', a: 'Oui, upgrade et downgrade possibles selon vos besoins de portefeuille.' },
  { q: 'Le prix inclut-il ARK ?', a: 'Oui. ARK est natif, avec un niveau de profondeur dépendant du plan.' },
  { q: 'Comment se passe l\'onboarding ?', a: 'Onboarding guidé + import portefeuille. Vous pouvez démarrer en quelques heures.' },
]

export default function TarifsPublic() {
  useEffect(() => {
    applySeo({
      title: 'Tarifs COURTIA — Starter 89€ / Pro 159€ / Cabinet sur devis',
      description: 'Plans COURTIA pour courtiers assurance: Starter, Pro (offre principale), Cabinet et Premium sur devis.',
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

        <VibeScrollSection parallax={16}>
          <div className="mk-price-grid" style={{ perspective: 1400 }}>
            {[
              { key: 'starter', eyebrow: 'Starter', price: '89€', sub: 'HT/mois', items: ['Dashboard portefeuille', 'Clients, contrats, tâches', 'Rapports essentiels', 'Pour 1 à 5 collaborateurs'], featured: false },
              { key: 'pro', eyebrow: 'Pro · recommandé', price: '159€', sub: 'HT/mois', items: ['Morning Brief complet', 'Clients à risque & relances intelligentes', 'Rapports avancés + admin costs', 'Pour cabinets en croissance'], featured: true },
              { key: 'cabinet', eyebrow: 'Cabinet', price: 'Sur devis', sub: '', items: ['Multi-utilisateurs avancé', 'Commissions et reporting cabinet', 'Intégrations étendues', 'Support renforcé'], featured: false },
            ].map((p, i) => (
              <motion.article
                key={p.key}
                className={`mk-price-card${p.featured ? ' featured' : ''}`}
                initial={{ opacity: 0, y: 24, rotateX: -6 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16,1,0.3,1] }}
                whileHover={{ rotateX: 4, rotateY: -4, y: -6, scale: 1.02 }}
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
              >
                <p className="mk-price-eyebrow">{p.eyebrow}</p>
                <p className="mk-price">{p.price} {p.sub && <small>{p.sub}</small>}</p>
                <ul className="mk-plain-list">
                  {p.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </motion.article>
            ))}
          </div>
        </VibeScrollSection>
        <p className="mk-section-sub">Le plan Pro est le plus choisi par les courtiers indépendants.</p>
      </section>

      <section className="mk-section">
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
            COURTIA est prêt pour une bêta commerciale sérieuse à 89€ HT/mois et défendable à 159€ HT/mois avec ARK, intégrations et documents métier.
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
