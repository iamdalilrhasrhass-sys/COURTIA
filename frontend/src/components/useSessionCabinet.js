/* ============================================================================
   useSessionCabinet — le MARCHÉ du cabinet et les DROITS D'ÉCRITURE de la
   session, avec re-rendu dès qu'ils deviennent connus
   ----------------------------------------------------------------------------
   POURQUOI CE HOOK (défauts P3 mesurés en production le 20/09/2026, QA n° 2)

   • « /clients/new » en ACCÈS DIRECT affichait pendant au moins 9 s le bloc
     d'adresse FRANÇAIS (« Suggestions : Base Adresse Nationale française »,
     libellé « Code Postal », placeholder « N°, rue ») à un cabinet suisse,
     alors que le même écran atteint via le Cockpit affichait le bloc suisse.
     Cause : `ClientNew.jsx:137` lisait `contexteCourant().pays` AU PREMIER
     RENDU. Le profil de connexion ne porte pas `pays` ; la réponse de
     `GET /api/auth/me` arrive plus tard, et RIEN ne re-rendait la page.

   • Le rôle en lecture seule n'était pas connu non plus, faute de re-rendu.

   Ce que fait le hook :
     1. il rend le marché (`pays`) ET l'état des droits d'écriture, et re-rend
        l'écran quand ils changent ;
     2. il s'abonne à `profileUpdated` (émis par `api/sessionUser.js` dès que le
        profil réel est persisté) et à `storage` (autre onglet) ;
     3. si le profil stocké est INCOMPLET (pas de `pays`/`cabinet_role` : profil
        de connexion), il demande lui-même le profil réel — une seule fois par
        chargement de page. Sans cela, l'écran resterait « français » et
        « écriture autorisée » par défaut, c'est-à-dire sur une supposition.

   Tant que le marché n'est pas connu, `connu` vaut `false` : les écrans ne
   proposent alors AUCUNE source ni libellé national (ni français, ni suisse),
   et aucun formulaire d'écriture n'est présenté sur une supposition.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { contexteCourant, paysSuisse, paysFrance } from '../lib/monnaie'
import { getSessionUser } from '../api/sessionUser'
import {
  lireProfilSession, droitsEcriture, roleEcriture,
  DROITS_INCONNU, DROITS_LECTURE,
} from '../lib/roleSession'

// Une seule demande de profil réel par chargement de page : les écrans montés
// ensuite reçoivent le profil déjà persisté, sans nouvelle requête réseau.
let profilDemande = false

function enDemonstration() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')
}

function etatCourant() {
  const demonstration = enDemonstration()
  const profil = lireProfilSession()
  const pays = contexteCourant().pays || null
  return {
    pays,
    suisse: paysSuisse(pays),
    france: paysFrance(pays),
    droits: droitsEcriture(profil, { demonstration }),
    role: roleEcriture(profil),
    demonstration,
    profilComplet: Boolean(profil && (('cabinet_role' in profil) || ('marche' in profil))),
  }
}

function memeEtat(a, b) {
  return a.pays === b.pays && a.droits === b.droits && a.role === b.role && a.profilComplet === b.profilComplet
}

export default function useSessionCabinet() {
  const [etat, setEtat] = useState(etatCourant)

  useEffect(() => {
    let monte = true

    const rafraichir = () => {
      if (!monte) return
      const suivant = etatCourant()
      // Même état : React ne re-rend pas (aucun rendu inutile).
      setEtat((precedent) => (memeEtat(precedent, suivant) ? precedent : suivant))
    }

    window.addEventListener('profileUpdated', rafraichir)
    window.addEventListener('storage', rafraichir)

    // Profil de connexion incomplet : le marché et le rôle de cabinet n'y sont
    // pas. On demande le profil réel, puis on re-rend via `profileUpdated`.
    if (!etatCourant().profilComplet && !profilDemande) {
      profilDemande = true
      getSessionUser()
        .then(rafraichir)
        .catch(() => { /* API indisponible : on reste en « inconnu », aucun droit inventé */ })
    }

    return () => {
      monte = false
      window.removeEventListener('profileUpdated', rafraichir)
      window.removeEventListener('storage', rafraichir)
    }
  }, [])

  return {
    pays: etat.pays,
    /** Marché résolu : « CH », « FR », ou `false` tant qu'il est inconnu. */
    connu: Boolean(etat.pays),
    suisse: etat.suisse,
    france: etat.france,
    /** 'lecture' | 'ecriture' | 'inconnu' */
    droits: etat.droits,
    lectureSeule: etat.droits === DROITS_LECTURE,
    droitsInconnus: etat.droits === DROITS_INCONNU,
    /** Rôle de cabinet réel, ou `null` s'il n'est pas connu. */
    role: etat.role,
  }
}
