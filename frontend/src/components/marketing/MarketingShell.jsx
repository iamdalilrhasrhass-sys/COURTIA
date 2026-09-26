import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import CourtiaMiniLogo from '../brand/CourtiaMiniLogo'
import MarketingFooter from './MarketingFooter'
import '../../pages/marketing.css'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil' },
  { to: '/fonctionnalites', label: 'Fonctionnalités' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/demo-public', label: 'Démo' },
  { to: '/contact', label: 'Contact' },
]

export default function MarketingShell({ activePath = '/', children }) {
  return (
    <div className="mk-page">
      <div className="mk-grid-overlay" aria-hidden="true" />
      <div className="courtia-bubble-orb courtia-bubble-orb--pearl mk-ambient-orb mk-ambient-orb--one" aria-hidden="true" />
      <div className="courtia-bubble-orb courtia-bubble-orb--cyan mk-ambient-orb mk-ambient-orb--two" aria-hidden="true" />
      <div className="mk-shell courtia-depth-stage">
        <div className="mk-nav-wrap">
          <header className="mk-nav">
            <Link to="/" className="mk-brand" aria-label="COURTIARK Home">
              <CourtiaMiniLogo size={26} />
            </Link>
            <nav className="mk-links" aria-label="Navigation marketing COURTIARK">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mk-link ${activePath === item.to ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/demo-public" className="mk-cta-inline">
                Demander une démo <ArrowRight size={13} />
              </Link>
            </nav>
          </header>
        </div>

        {children}

        <MarketingFooter />
      </div>
    </div>
  )
}
