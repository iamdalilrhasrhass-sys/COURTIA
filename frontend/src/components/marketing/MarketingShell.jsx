import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import CourtiaMiniLogo from '../brand/CourtiaMiniLogo'
import '../../pages/marketing.css'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil' },
  { to: '/fonctionnalites', label: 'Fonctionnalités' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/demo', label: 'Démo' },
  { to: '/contact', label: 'Contact' },
]

export default function MarketingShell({ activePath = '/', children }) {
  return (
    <div className="mk-page">
      <div className="mk-grid-overlay" aria-hidden="true" />
      <div className="mk-shell">
        <div className="mk-nav-wrap">
          <header className="mk-nav">
            <Link to="/" className="mk-brand" aria-label="COURTIA Home">
              <CourtiaMiniLogo size={26} />
            </Link>
            <nav className="mk-links" aria-label="Navigation marketing COURTIA">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mk-link ${activePath === item.to ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/demo" className="mk-cta-inline">
                Demander une démo <ArrowRight size={13} />
              </Link>
            </nav>
          </header>
        </div>

        {children}

        <footer className="mk-footer">
          <div>COURTIA · Cockpit IA des courtiers en assurance français</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/legal/mentions-legales">Mentions légales</Link>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <Link to="/legal/cookies">Cookies</Link>
            <Link to="/legal/conditions-utilisation">Conditions</Link>
            <Link to="/login">Se connecter</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
