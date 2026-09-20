/* ============================================================================
   COURTIA — /abonnement : redirection vers l'écran de facturation
   ----------------------------------------------------------------------------
   POURQUOI : cette page était un SECOND écran de tarifs, concurrent de /billing.
   Elle portait en dur une grille « Starter 89 / Pro 159 » qui ne correspondait
   pas à celle servie par l'API (GET /api/billing/plans, display_price_ht —
   199/349 en CHF) et pas davantage à la devise du cabinet. Deux écrans, deux
   grilles, dont une inventée : le courtier lisait un prix qui n'était pas le
   sien, et le lien « Abonnement » du menu l'y conduisait.

   Il n'y a désormais qu'UN écran d'abonnement, alimenté par l'API
   (`pages/Billing.jsx` → GET /api/billing/plans + /api/billing/status, avec la
   grille du marché du cabinet et sa mention fiscale). /abonnement y redirige
   pour que les liens existants (menu latéral, menu mobile, vidéo de
   présentation) continuent de mener au bon endroit.
   ========================================================================== */

import { Navigate } from 'react-router-dom'

export default function Abonnement() {
  // `replace` : la redirection ne pollue pas l'historique du navigateur, le
  // bouton « retour » ramène à l'écran précédent réel.
  return <Navigate to="/billing" replace />
}
