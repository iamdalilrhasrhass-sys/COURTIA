/* ============================================================================
   COURTIARK — Marché réellement servi (FR / CH) : un seul point de vérité
   ----------------------------------------------------------------------------
   POURQUOI ce module : plusieurs écrans affichaient des faits du marché
   FRANÇAIS à des cabinets SUISSES — autorité de supervision (ACPR), registre
   (ORIAS), identifiant d'entreprise (SIRET), indicatif +33, fuseau
   Europe/Paris, adresses d'exemple en @email.fr, et un repli « ACPR » en dur
   quand une API tardait. Aucun de ces faits n'est neutre ni vrai hors de
   France : l'ACPR n'a aucune compétence en Suisse, un courtier suisse n'a pas
   de numéro ORIAS.

   RÈGLE appliquée par tous les écrans : une valeur qui dépend d'un marché
   vient du marché du cabinet (profil réel) ou d'une détection explicite pour
   les écrans publics — jamais d'un littéral français posé en repli.

   Ce module n'invente RIEN sur le régime suisse : il ne nomme aucune autorité
   suisse et ne crée pas de fait réglementaire. Pour la Suisse il réutilise
   uniquement les libellés déjà en place dans le produit (registre FINMA, IDE /
   UID — cf. les écrans de paramètres réellement servis et market/marketContext.js,
   où le marché CH est déclaré « LSA · FINMA · nLPD »).

   Détermination du marché :
   - profil cabinet connu (`broker_profiles.pays`, cf. lib/monnaie.js) : source
     de vérité pour tous les écrans privés ;
   - profil inconnu (écran public, visiteur déconnecté) : override stocké,
     paramètre ?market=, puis fuseau horaire détecté (market/marketContext.js).
   ============================================================================ */

import {
  DEFAULT_MARKET,
  getDetectedGeoCountry,
  parseMarketFromSearch,
  readStoredMarketOverride,
  resolveMarketContext,
} from '../market/marketContext'
import { contexteCourant, paysSuisse } from './monnaie'

/** Marché du CABINET connecté (profil réel). `null` si le profil est inconnu. */
export function marcheCabinet() {
  const { pays } = contexteCourant()
  if (!pays) return null
  return paysSuisse(pays) ? 'CH' : 'FR'
}

/** Marché d'un ÉCRAN PUBLIC : override stocké, ?market=, puis fuseau détecté. */
export function marchePublic(search) {
  const recherche = search === undefined && typeof window !== 'undefined'
    ? window.location?.search
    : search
  return resolveMarketContext({
    geoCountry: getDetectedGeoCountry(),
    storedOverride: readStoredMarketOverride(),
    queryMarket: parseMarketFromSearch(recherche || ''),
  }).market || DEFAULT_MARKET
}

/**
 * Marché à utiliser par un écran : le cabinet s'il est connu, sinon la
 * détection publique. Renvoie toujours 'FR' ou 'CH'.
 */
export function marcheCourante(search) {
  return marcheCabinet() || marchePublic(search)
}

/**
 * Libellés qui changent selon le marché. La colonne FR est le comportement
 * historique, inchangée ; la colonne CH ne fait que reprendre les libellés
 * suisses déjà utilisés ailleurs dans l'application.
 *
 * `villesExemple` (UX-026) : exemple de saisie affiché dans les écrans de
 * recherche. Il appartient au marché du cabinet — un cabinet suisse ne doit pas
 * lire « Sens, Paris, Lyon… ». Les villes citées sont des villes réelles du
 * pays du marché ; ce tableau est le SEUL endroit où elles sont écrites, aucun
 * écran ne code un nom de ville en dur.
 */
export const LIBELLES_MARCHE = {
  FR: {
    pays: 'France',
    villesExemple: 'Paris, Lyon, Marseille…',
    identifiantEntreprise: 'SIRET',
    registre: 'Numéro ORIAS',
    email: 'votre@email.fr',
    emailPro: 'nom@cabinet.fr',
    emailCollaborateur: 'collaborateur@cabinet.fr',
    indicatif: '+33',
    fuseauHoraire: 'Europe/Paris',
    courtiers: 'Courtiers ORIAS',
  },
  CH: {
    pays: 'Suisse',
    villesExemple: 'Genève, Lausanne, Zurich…',
    identifiantEntreprise: 'IDE / UID',
    registre: "N° d'enregistrement FINMA",
    email: 'votre@email.ch',
    emailPro: 'nom@cabinet.ch',
    emailCollaborateur: 'collaborateur@cabinet.ch',
    indicatif: '+41',
    fuseauHoraire: 'Europe/Zurich',
    courtiers: 'Courtiers assurance',
  },
}

/** Libellés du marché demandé (tout ce qui n'est pas 'CH' reste FR). */
export function libellesMarche(marche) {
  return LIBELLES_MARCHE[marche === 'CH' ? 'CH' : 'FR']
}
