import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalDpa() {
  useEffect(() => {
    applySeo({
      title: 'DPA — COURTIA',
      description: 'Accord de traitement des données COURTIA.',
      canonicalPath: '/legal/dpa',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Data Processing Agreement</h1>
        <div className="mk-card">
          <p>Base opérationnelle à faire valider juridiquement.</p>
          <p>Le cabinet utilisateur agit en responsable de traitement pour ses données clients. COURTIA agit comme sous-traitant pour l’hébergement, le traitement applicatif, la sécurité, les sauvegardes et le support.</p>
          <p>Les finalités couvrent CRM courtier, contrats, tâches, documents DDA, invitations, notifications, intégrations choisies et assistance ARK.</p>
          <p>ARK fournit une aide à la priorisation et à la rédaction. Il ne constitue pas une décision automatique produisant un effet juridique sans validation humaine du courtier.</p>
          <p>Les demandes d’accès, rectification, suppression, portabilité ou limitation sont traitées avec le cabinet selon le périmètre contractuel et les contraintes légales applicables.</p>
          <p>Sauvegardes, restauration, rotation de secrets, incidents et sous-traitants sont documentés dans les runbooks internes.</p>
          <p>DPO/contact données: dpo@courtiark.fr.</p>
        </div>
      </section>
    </MarketingShell>
  )
}
