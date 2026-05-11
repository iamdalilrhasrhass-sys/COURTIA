import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalCookies() {
  useEffect(() => {
    applySeo({
      title: 'Politique cookies — COURTIA',
      description: 'Politique de gestion des cookies sur COURTIA.',
      canonicalPath: '/legal/cookies',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Politique cookies</h1>
        <div className="mk-card">
          <p>COURTIA utilise principalement des cookies techniques nécessaires à la session et à la sécurité.</p>
          <p>
            Les mesures marketing internes sont limitées à des événements essentiels (clic démo, envoi formulaire, clic tarifs, ouverture vidéo) et ne reposent pas sur des trackers tiers agressifs.
          </p>
          <p>
            Aucun cookie de publicité comportementale tiers n\'est installé par défaut dans cette version.
          </p>
          <p>
            Vous pouvez demander l\'arrêt des sollicitations commerciales via opt-out à contact@courtiark.fr.
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
