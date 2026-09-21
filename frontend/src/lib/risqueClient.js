/**
 * risqueClient.js — profil de risque d'une fiche client, construit à partir des
 * SEULES données transmises par le serveur (`GET /api/clients/:id`).
 *
 * POURQUOI CE MODULE : la fiche client affichait un « profil de risque » INVENTÉ
 * sur un client créé à l'instant, sans aucun contrat — « Malus 1.35 »,
 * « Non-paiement », « 2 sinistres », « 8 ans », « 7 CV » et « 33 sur 100 »
 * (relevé sur la production le 21/09/2026). La cause était double :
 *   1. l'écran passait la prop `factors` alors que le composant attendait
 *      `riskFactors`, qui retombait sur une constante `DEFAULT_FACTORS` codée en
 *      dur (jeu d'exemple affiché comme une mesure) ;
 *   2. le score affiché était recalculé dans le navigateur (part de facteurs
 *      « propres »), donc un chiffre sans aucune source serveur.
 *
 * RÈGLE PRODUIT (non négociable) : aucun jeu de données d'exemple, aucune valeur
 * par défaut. Un champ ABSENT ou vide n'est pas affiché ; le score de risque du
 * serveur ne s'affiche que s'il existe ET si au moins une donnée de risque du
 * dossier le soutient. Sinon : « non mesuré ».
 *
 * Les seuils de lecture du bonus-malus, des sinistres et de l'ancienneté de
 * permis sont ceux du calcul serveur (`backend/src/utils/riskCalculator.js`),
 * pour qu'un même fait ne reçoive qu'une seule lecture.
 */

import { CHAMPS_CLES } from './scoring'

export const NON_MESURE = 'non mesuré'

/** Un nombre réellement transmis, ou null. `0` reste une mesure. */
function nombreOuNull(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const n = Number(valeur)
  return Number.isFinite(n) ? n : null
}

/** Un texte réellement transmis, ou '' (jamais « undefined »). */
function texteOuVide(valeur) {
  if (valeur === null || valeur === undefined) return ''
  return String(valeur).trim()
}

function sansAccents(texte) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/* Lecture du bonus-malus — mêmes paliers que le calcul serveur. */
function niveauBonusMalus(bm) {
  if (bm <= 0.8) return 'clean'      // excellent conducteur
  if (bm <= 1) return 'clean'        // bon conducteur
  if (bm <= 1.25) return 'caution'   // neutre
  if (bm <= 1.75) return 'risk'      // mauvais
  return 'critical'                  // très mauvais
}

function libelleBonusMalus(bm) {
  const valeur = bm.toFixed(2).replace('.', ',')
  if (bm < 1) return `Bonus ${valeur}`
  if (bm === 1) return `Neutre ${valeur}`
  return `Malus ${valeur}`
}

const NIVEAU_ZONE = {
  rural: 'clean',
  periurbain: 'caution',
  urbain: 'risk',
}

/**
 * Facteurs de risque réellement mesurés pour ce client.
 * Un facteur n'existe que si le champ correspondant a été transmis.
 * @returns {Array<{id: string, label: string, value: string, level: string}>}
 */
export function facteursRisqueClient(client) {
  if (!client || typeof client !== 'object') return []
  const facteurs = []

  const bm = nombreOuNull(client.bonus_malus)
  if (bm !== null) {
    facteurs.push({
      id: 'bonus_malus',
      label: 'Bonus/Malus',
      value: libelleBonusMalus(bm),
      level: niveauBonusMalus(bm),
    })
  }

  const sinistres = nombreOuNull(client.nb_sinistres_3ans)
  if (sinistres !== null) {
    facteurs.push({
      id: 'sinistres',
      label: 'Sinistres 3 ans',
      value: sinistres <= 0
        ? 'Aucun sinistre'
        : `${sinistres} sinistre${sinistres > 1 ? 's' : ''}`,
      level: sinistres <= 0 ? 'clean' : sinistres === 1 ? 'caution' : sinistres === 2 ? 'risk' : 'critical',
    })
  }

  const anneesPermis = nombreOuNull(client.annees_permis)
  if (anneesPermis !== null && anneesPermis > 0) {
    facteurs.push({
      id: 'anciennete_permis',
      label: 'Ancienneté permis',
      value: `${anneesPermis} an${anneesPermis > 1 ? 's' : ''}`,
      level: anneesPermis >= 10 ? 'clean' : anneesPermis >= 5 ? 'caution' : 'risk',
    })
  }

  const zone = texteOuVide(client.zone_geographique)
  if (zone) {
    facteurs.push({
      id: 'zone_geographique',
      label: 'Zone géographique',
      value: zone,
      level: NIVEAU_ZONE[sansAccents(zone)] || 'inconnu',
    })
  }

  return facteurs
}

/**
 * Score de risque du client, tel que transmis par le serveur.
 * Il ne s'affiche que si le serveur l'a transmis ET si au moins une donnée de
 * risque du dossier le soutient : un score sans aucun fait mesurable n'est pas
 * publiable, même s'il existe en base.
 * @returns {number|null} 0-100, ou null (= « non mesuré »)
 */
export function scoreRisqueClient(client) {
  if (!client || typeof client !== 'object') return null
  const score = nombreOuNull(client.risk_score ?? client.score_risque)
  if (score === null) return null
  if (facteursRisqueClient(client).length === 0) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

/* Libellés d'interface des champs clés — les clés viennent de lib/scoring.js
   (CHAMPS_CLES), l'affichage est ici : aucune liste de champs dupliquée. */
const LIBELLES_CHAMPS = {
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'Email',
  telephone: 'Téléphone',
  adresse: 'Adresse',
  profession: 'Profession',
  situation_familiale: 'Situation familiale',
  bonus_malus: 'Bonus/malus',
  annees_permis: 'Années de permis',
  nb_sinistres_3ans: 'Sinistres 3 ans',
  zone_geographique: 'Zone géographique',
  segment: 'Segment',
}

/**
 * Champs clés réellement vides sur la fiche, avec leur libellé.
 * Sert de liste « à compléter » : elle ne nomme que des champs absents.
 */
export function champsManquants(client) {
  if (!client || typeof client !== 'object') return []
  return CHAMPS_CLES.filter((cle) => {
    const valeur = client[cle]
    return valeur === null || valeur === undefined || String(valeur).trim() === ''
  }).map((cle) => ({ id: cle, label: LIBELLES_CHAMPS[cle] || cle }))
}
