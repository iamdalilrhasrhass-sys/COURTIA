import { Link } from 'react-router-dom'
import '../../pages/marketing.css'

/**
 * Pied de page unique des pages publiques (marketing).
 *
 * Une seule liste de liens : elle était recopiée dans `MarketingShell`, donc
 * `/tarifs` — qui n'avait AUCUN pied de page — laissait les mentions légales,
 * la confidentialité et les conditions inatteignables depuis la page des prix
 * (relevé en production le 21/09/2026). Toute page publique qui monte ce
 * composant offre exactement les mêmes accès légaux.
 */
export default function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div>COURTIA · Cockpit IA des courtiers en assurance — France (DDA · ORIAS · RGPD) et Suisse (LSA · FINMA · nLPD)</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/legal/mentions-legales">Mentions légales</Link>
        <Link to="/legal/confidentialite">Confidentialité</Link>
        <Link to="/securite">Sécurité</Link>
        <Link to="/rgpd">RGPD</Link>
        <Link to="/status">Status</Link>
        <Link to="/aide">Aide</Link>
        <Link to="/legal/cookies">Cookies</Link>
        <Link to="/legal/conditions-utilisation">Conditions</Link>
        {/* /ch est une page statique servie hors du routeur SPA : lien natif
            obligatoire (<Link> tomberait sur le 404 applicatif). */}
        <a href="/ch">Suisse (LSA · FINMA · CHF)</a>
        <Link to="/login">Se connecter</Link>
      </div>
    </footer>
  )
}
