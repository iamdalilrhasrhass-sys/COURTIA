/* ============================================================================
   DeviseIcone — icône de MONTANT cohérente avec la devise du cabinet
   ----------------------------------------------------------------------------
   POURQUOI CE FICHIER : les écrans affichant des montants passaient
   `icon={Euro}` en dur (icône « € » de lucide). Sur un cabinet suisse, la carte
   « PRIMES ANNUELLES € » affichait donc un symbole euro au-dessus d'une valeur
   en francs suisses (relevé sur un cabinet d'audit suisse). Le libellé et la
   valeur étaient justes, l'icône ne l'était pas.

   Règle : l'icône suit la devise courante du cabinet (`deviseCourante()`),
   elle-même dérivée de `pays` par `frontend/src/lib/monnaie.js`.
   - France  → icône « € »
   - Suisse  → icône billet (aucun symbole monétaire étranger)

   Composant volontairement minuscule : il accepte exactement les mêmes props
   qu'une icône lucide (size, color, style, className…), ce qui permet de
   remplacer `icon={Euro}` par `icon={DeviseIcone}` sans toucher au reste.
   ========================================================================== */

import { Euro, Banknote } from 'lucide-react'
import { deviseCourante } from '../lib/monnaie'

export default function DeviseIcone(props) {
  return deviseCourante() === 'CHF' ? <Banknote {...props} /> : <Euro {...props} />
}
