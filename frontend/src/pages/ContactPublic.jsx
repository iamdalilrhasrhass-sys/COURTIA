import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, CalendarClock, MapPin } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'

export default function ContactPublic() {
  const location = useLocation()
  const market = new URLSearchParams(location.search).get('market')?.toUpperCase() === 'CH' ? 'CH' : 'FR'
  const isSwiss = market === 'CH'

  useEffect(() => {
    applySeo({
      title: isSwiss ? 'Contact Courtiark Suisse' : 'Contact Courtiark — Démo courtiers',
      description: isSwiss
        ? 'Contactez Courtiark pour une démo adaptée aux cabinets de courtage suisses.'
        : 'Contactez l\'équipe Courtiark pour une démo, un partenariat ou une question produit.',
      canonicalPath: '/contact',
    })
  }, [isSwiss])

  return (
    <MarketingShell activePath="/contact">
      <section className="mk-section">
        <span className="mk-eyebrow">Contact</span>
        <h1 className="mk-section-title">{isSwiss ? 'Parlons de votre cabinet en Suisse romande' : 'Parlons de votre portefeuille courtier'}</h1>
        <p className="mk-section-sub">
          L\'équipe COURTIA accompagne les cabinets souhaitant structurer un pilotage quotidien orienté actions.
        </p>
      </section>

      <section className="mk-section">
        <div className="mk-split">
          <div className="mk-card">
            <h3 style={{ marginTop: 0 }}>Coordonnées</h3>
            <ul className="mk-plain-list">
              <li><Mail size={14} style={{ marginRight: 6 }} /> <a href="mailto:arkcourtia@gmail.com">arkcourtia@gmail.com</a></li>
              <li><CalendarClock size={14} style={{ marginRight: 6 }} /> Démonstration sur rendez-vous</li>
              <li><MapPin size={14} style={{ marginRight: 6 }} /> {isSwiss ? 'Suisse romande · rendez-vous en visio' : 'France · rendez-vous en visio'}</li>
            </ul>
            <p className="mk-inline-note" style={{ marginTop: 12 }}>
              Réponse sous 24 à 48h ouvrées. Pour une démo rapide, utilisez le formulaire.
            </p>
          </div>

          <div>
            <DemoRequestForm compact market={market} source={isSwiss ? 'contact_ch' : 'contact_fr'} />
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
