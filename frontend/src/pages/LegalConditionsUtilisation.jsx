import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

export default function LegalConditionsUtilisation() {
  useEffect(() => {
    applySeo({
      title: "Conditions d'utilisation — COURTIA",
      description: "Conditions d'utilisation de la plateforme COURTIA.",
      canonicalPath: '/legal/conditions-utilisation',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Conditions d&apos;utilisation</h1>
        <div className="mk-card">
          <p>Dernière mise à jour: 9 mai 2026.</p>
          <p>
            COURTIA est un logiciel SaaS B2B destiné aux courtiers en assurance français.
            L&apos;accès est réservé aux usages professionnels autorisés par le cabinet utilisateur.
          </p>
          <p>
            ARK est un assistant d&apos;aide à la décision. Les recommandations sont indicatives:
            le courtier reste seul responsable de ses décisions commerciales, techniques et réglementaires.
          </p>
          <p>
            COURTIA vise à structurer, tracer et prioriser les actions métier. Il ne garantit pas à lui seul
            la conformité réglementaire complète (DDA, devoir de conseil, obligations contractuelles).
          </p>
          <p>
            Cette page constitue une base opérationnelle destinée aux premiers clients et doit être validée juridiquement
            avant contractualisation définitive.
          </p>
          <p>
            Les intégrations (Google Agenda, WhatsApp Business, Gmail/Outlook) nécessitent une configuration explicite
            par l&apos;utilisateur et peuvent être déconnectées à tout moment depuis l&apos;espace paramètres.
          </p>
          <p>
            Toute utilisation abusive (spam, scraping illégal, tentative d&apos;accès non autorisé, contournement de sécurité)
            peut entraîner une suspension d&apos;accès.
          </p>
          <p>
            Contact juridique et support: contact@courtia.fr
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
