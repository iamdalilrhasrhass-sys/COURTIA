import { useEffect } from 'react'
import { Mail, MapPin } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'

export default function ContactPublic() {
  useEffect(() => {
    applySeo({
      title: 'Contact COURTIARK — Bêta privée courtiers',
      description: 'Contactez l\'équipe COURTIARK pour une démo, un partenariat ou une question produit.',
      canonicalPath: '/contact',
    })
  }, [])

  return (
    <MarketingShell activePath="/contact">
      <section className="mk-section">
        <span className="mk-eyebrow">Contact</span>
        <h1 className="mk-section-title">Parlons de votre portefeuille courtier</h1>
        <p className="mk-section-sub">
          L\'équipe COURTIARK accompagne les cabinets souhaitant structurer un pilotage quotidien orienté actions.
        </p>
      </section>

      <section className="mk-section">
        <div className="mk-split">
          <div className="mk-card">
            <h3 style={{ marginTop: 0 }}>Coordonnées</h3>
            <ul className="mk-plain-list">
              <li><Mail size={14} style={{ marginRight: 6 }} /> contact@courtiark.fr</li>
              <li><MapPin size={14} style={{ marginRight: 6 }} /> France et Suisse (accompagnement à distance)</li>
            </ul>
            <p className="mk-inline-note" style={{ marginTop: 12 }}>
              Aucun numéro de téléphone public n’est publié : nous ne diffusons pas de
              coordonnée non vérifiée. Réponse par e-mail sous 24 à 48h ouvrées. Pour une
              démo rapide, utilisez le formulaire.
            </p>
          </div>

          <div>
            <DemoRequestForm compact />
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
