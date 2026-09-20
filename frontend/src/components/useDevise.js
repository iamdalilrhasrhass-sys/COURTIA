/* ============================================================================
   useDevise — un écran qui affiche des montants connaît la devise du cabinet
   ----------------------------------------------------------------------------
   POURQUOI CE HOOK (défaut constaté au navigateur le 20/09/2026) :
   `lib/monnaie.js` déduit la devise du champ `pays` du profil du cabinet. Ce
   profil vient de `GET /api/auth/me`. Or, après une connexion, la réponse de
   `/api/auth/login` ne contient PAS `pays` : la clé `courtia_user` écrite par la
   page de connexion ne porte donc que l'identité du titulaire. Sur les écrans
   qui ne demandaient jamais le profil complet (pipeline, relances…), le
   contexte monétaire restait au défaut EUR : un cabinet suisse lisait
   « Potentiel total 0 € ». Seuls le cockpit et le brief du matin déclenchaient
   la lecture du profil, ce qui expliquait des écrans incohérents entre eux.

   Ce que fait le hook :
     1. il expose la devise courante et re-rend l'écran quand elle change ;
     2. il s'abonne à `profileUpdated` (émis par `api/sessionUser.js` dès que le
        profil réel est persisté) ;
     3. si la devise est ENCORE INCONNUE (`pays` absent du contexte), il demande
        lui-même le profil réel — sans quoi le pipeline resterait en euros pour
        toujours. `getSessionUser()` a son propre cache et son propre délai de
        récupération : l'appel n'est pas refait à chaque rendu.

   Usage : `useDevise()` en haut d'un écran qui affiche des montants.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { contexteCourant, deviseCourante } from '../lib/monnaie'
import { getSessionUser } from '../api/sessionUser'

export default function useDevise() {
  const [devise, setDevise] = useState(() => deviseCourante())

  useEffect(() => {
    let monte = true

    const rafraichir = () => {
      if (!monte) return
      const actuelle = deviseCourante()
      // setState avec la même valeur : React ne re-rend pas (aucun rendu inutile).
      setDevise((precedente) => (precedente === actuelle ? precedente : actuelle))
    }

    // `profileUpdated` : profil réel persisté. `storage` : autre onglet.
    window.addEventListener('profileUpdated', rafraichir)
    window.addEventListener('storage', rafraichir)

    // Pays inconnu (profil partiel de connexion, stockage vidé) : on demande le
    // profil réel. Sans cet appel, la devise resterait celle par défaut.
    if (!contexteCourant().pays) {
      getSessionUser().then(rafraichir).catch(() => { /* hors ligne : on garde le défaut */ })
    }

    return () => {
      monte = false
      window.removeEventListener('profileUpdated', rafraichir)
      window.removeEventListener('storage', rafraichir)
    }
  }, [])

  return devise
}
