import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalMentionsLegales() {
  useEffect(() => {
    applySeo({
      title: 'Mentions légales — COURTIARK',
      description: 'Mentions légales du site COURTIARK.',
      canonicalPath: '/legal/mentions-legales',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Mentions légales</h1>
        <div className="mk-card">
          <p>Éditeur: COURTIARK (projet SaaS B2B dédié aux courtiers en assurance français).</p>
          <p>Contact: contact@courtiark.fr</p>
          <p>Hébergement applicatif: Vercel (frontend) et infrastructure API dédiée.</p>
          <p>Responsable de publication: équipe fondatrice COURTIARK.</p>
          <p>
            Les informations présentes sur ce site sont fournies à titre informatif et peuvent évoluer en fonction des itérations produit.
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
