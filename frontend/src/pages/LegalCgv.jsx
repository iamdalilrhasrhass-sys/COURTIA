import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalCgv() {
  useEffect(() => {
    applySeo({
      title: 'CGV — COURTIA',
      description: 'Conditions générales de vente COURTIA.',
      canonicalPath: '/legal/cgv',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Conditions générales de vente</h1>
        <div className="mk-card">
          <p>Dernière mise à jour: 10 mai 2026. Modèle opérationnel à faire valider juridiquement.</p>
          <p>COURTIA est fourni sous forme d’abonnement SaaS B2B pour cabinets et courtiers en assurance.</p>
          <p>Les prix, essais, renouvellements, résiliations et factures sont gérés via Stripe lorsque la configuration est active. Aucune donnée carte n’est stockée dans COURTIA.</p>
          <p>Les intégrations optionnelles (Google, Meta WhatsApp, Yousign, email transactionnel, SMS) nécessitent une configuration dédiée et peuvent rester en “Configuration requise”.</p>
          <p>Le courtier reste responsable de l’exactitude des informations saisies, de la validation des documents remis aux clients et de ses obligations réglementaires.</p>
          <p>La responsabilité de COURTIA est limitée aux sommes effectivement payées sur la période contractuelle concernée, sauf règle légale impérative contraire.</p>
          <p>Support: support@courtia.fr. Contact commercial et résiliation: contact@courtia.fr.</p>
        </div>
      </section>
    </MarketingShell>
  )
}
