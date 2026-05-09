import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalConfidentialite() {
  useEffect(() => {
    applySeo({
      title: 'Politique de confidentialité — COURTIA',
      description: 'Politique de confidentialité de COURTIA.',
      canonicalPath: '/legal/confidentialite',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Politique de confidentialité</h1>
        <div className="mk-card">
          <p>Dernière mise à jour: 9 mai 2026.</p>
          <p>
            COURTIA collecte les données strictement nécessaires au fonctionnement de la plateforme et aux demandes de démo B2B.
          </p>
          <p>
            Finalités principales: gestion de la relation client cabinet, suivi des tâches, pilotage portefeuille, assistance ARK et support utilisateur.
          </p>
          <p>
            Base légale principale pour les contacts commerciaux: intérêt légitime B2B, avec possibilité d\'opposition (opt-out) à tout moment.
          </p>
          <p>
            Données collectées sur formulaire démo: identité professionnelle, coordonnées professionnelles, informations cabinet, message libre.
          </p>
          <p>
            Les données ne sont pas revendues à des tiers. Elles sont conservées pour le suivi commercial et la relation contractuelle, dans une durée proportionnée.
          </p>
          <p>
            Intégrations (Google Agenda, WhatsApp Business, Gmail/Outlook): activées uniquement sur action explicite du cabinet. Les tokens restent côté backend.
          </p>
          <p>
            Sous-traitants techniques: hébergement web/app et services d&apos;infrastructure nécessaires à l&apos;exploitation de COURTIA.
          </p>
          <p>
            Les durées de conservation dépendent de la relation contractuelle, des obligations légales du cabinet et des demandes
            d&apos;effacement recevables. Les sauvegardes techniques sont restaurées selon le runbook incident.
          </p>
          <p>
            Vous pouvez demander export, rectification, limitation ou suppression de vos données selon les cas applicables.
          </p>
          <p>
            Toute demande d\'accès, correction ou suppression peut être adressée à contact@courtia.fr.
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
