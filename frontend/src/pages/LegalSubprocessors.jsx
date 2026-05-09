import { useEffect } from 'react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

const rows = [
  ['Vercel', 'Frontend et déploiement web', 'UE/États-Unis selon configuration fournisseur'],
  ['Render/VPS', 'API backend et exploitation', 'Europe selon infrastructure configurée'],
  ['PostgreSQL', 'Base de données applicative', 'Infrastructure COURTIA'],
  ['Stripe', 'Paiement, factures et portail billing', 'Stripe'],
  ['Resend', 'Email transactionnel si configuré', 'Resend'],
  ['Google/Microsoft', 'OAuth calendrier/email si connecté', 'Google/Microsoft'],
  ['Meta WhatsApp', 'WhatsApp Business si configuré', 'Meta'],
  ['Yousign', 'Signature électronique si configurée', 'Yousign'],
  ['Sentry/PostHog', 'Observabilité et analytics si configurés', 'Fournisseurs respectifs'],
]

export default function LegalSubprocessors() {
  useEffect(() => {
    applySeo({
      title: 'Sous-traitants — COURTIA',
      description: 'Liste indicative des sous-traitants techniques COURTIA.',
      canonicalPath: '/legal/sous-traitants',
    })
  }, [])

  return (
    <MarketingShell>
      <section className="mk-section">
        <h1 className="mk-section-title">Sous-traitants</h1>
        <p className="mk-section-sub">Liste indicative des services pouvant intervenir selon les modules activés.</p>
        <div className="mk-table-wrap">
          <table className="mk-table">
            <thead><tr><th>Service</th><th>Rôle</th><th>Localisation</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </MarketingShell>
  )
}
