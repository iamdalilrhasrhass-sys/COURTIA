/**
 * commissionTaux.js — Résolution des taux de commission.
 *
 * RÈGLE ABSOLUE : AUCUN TAUX ARBITRAIRE CACHÉ.
 * Un taux de commission n'est utilisé que s'il a été RÉELLEMENT configuré par
 * le cabinet (barème `commission_baremes` de son périmètre, ou règle
 * `commission_rules`). En l'absence de configuration :
 *   - `resoudreTauxCommission` renvoie null,
 *   - `calculerCommission` renvoie null (jamais 0 présenté comme un montant, ni
 *     un pourcentage fabriqué : 12 % et 15 % étaient codés en dur dans les KPI,
 *     et un catalogue de 8 « compagnies » inexistantes servait de barème).
 *
 * Le catalogue d'EXEMPLE ci-dessous peut rester affiché comme aide à la saisie :
 * il n'est JAMAIS utilisé pour un calcul présenté comme réel — il faut le
 * demander explicitement (`exemple: true`) et le résultat est alors étiqueté
 * `source: 'exemple'`.
 *
 * @module commissionTaux
 */

/** Catalogue d'EXEMPLE — compagnies et taux qui n'existent pas sur le marché. */
const BAREMES_EXEMPLE = {
  Aurora:  { Auto: 12, Habitation: 14, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 11, MRH: 13, Cyber: 20, Décennale: 15, PJ: 22 },
  Novalia: { Auto: 11, Habitation: 13, Santé: 9,  Prévoyance: 17, 'RC Pro': 15, 'Flotte Auto': 12, MRH: 14, Cyber: 19, Décennale: 14, PJ: 20 },
  Helios:  { Auto: 10, Habitation: 15, Santé: 7,  Prévoyance: 16, 'RC Pro': 14, 'Flotte Auto': 10, MRH: 12, Cyber: 18, Décennale: 13, PJ: 19 },
  Serenis: { Auto: 13, Habitation: 12, Santé: 10, Prévoyance: 19, 'RC Pro': 17, 'Flotte Auto': 13, MRH: 15, Cyber: 21, Décennale: 16, PJ: 23 },
  Atlas:   { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 17, 'RC Pro': 18, 'Flotte Auto': 12, MRH: 14, Cyber: 22, Décennale: 15, PJ: 21 },
  Oria:    { Auto: 11, Habitation: 14, Santé: 9,  Prévoyance: 16, 'RC Pro': 15, 'Flotte Auto': 11, MRH: 13, Cyber: 19, Décennale: 14, PJ: 20 },
  Nivalis: { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 12, MRH: 14, Cyber: 20, Décennale: 17, PJ: 22 },
  Solenys: { Auto: 10, Habitation: 12, Santé: 10, Prévoyance: 15, 'RC Pro': 13, 'Flotte Auto': 9,  MRH: 11, Cyber: 17, Décennale: 12, PJ: 18 },
}

/** Message produit opposé à tout refus de calcul sans barème. */
const MESSAGE_BAREME_REQUIS =
  "Aucun taux de commission n'est configuré pour ce couple compagnie / produit. "
  + 'Renseignez vos barèmes (POST /api/commissions/rules ou vos barèmes compagnie) : '
  + 'COURTIA ne calcule pas de commission à partir d\'un taux par défaut.'

/** Part récurrente appliquée à un barème récurrent (constante produit documentée). */
const FACTEUR_RECURRENT = 0.6

/** Taux d'exemple pour un couple compagnie / produit, ou null. */
function tauxExemple(compagnie, produit) {
  const ligne = BAREMES_EXEMPLE[compagnie]
  if (!ligne) return null
  const taux = ligne[produit]
  return typeof taux === 'number' ? taux : null
}

/**
 * Détermine le taux à appliquer, en n'acceptant QUE des taux configurés.
 *
 * @param {Object} options
 * @param {{rate_percent:number}} [options.baremeCabinet] barème du cabinet (commission_baremes)
 * @param {{rate_percent:number}} [options.regleCabinet]  règle du cabinet (commission_rules)
 * @param {string} options.compagnie
 * @param {string} options.produit
 * @param {boolean} [options.exempleDemande] true ⇒ autorise explicitement le catalogue d'exemple
 * @returns {{rate_percent:number, source:string, compagnie:string, produit:string}|null}
 */
function resoudreTauxCommission({ baremeCabinet, regleCabinet, compagnie, produit, exempleDemande = false } = {}) {
  const tauxBareme = Number(baremeCabinet?.rate_percent)
  if (Number.isFinite(tauxBareme) && tauxBareme > 0) {
    return { rate_percent: tauxBareme, source: 'cabinet', compagnie, produit }
  }
  const tauxRegle = Number(regleCabinet?.rate_percent)
  if (Number.isFinite(tauxRegle) && tauxRegle > 0) {
    return { rate_percent: tauxRegle, source: 'cabinet', compagnie, produit }
  }
  if (exempleDemande) {
    const taux = tauxExemple(compagnie, produit)
    if (taux !== null) {
      return { rate_percent: taux, source: 'exemple', compagnie, produit }
    }
  }
  return null
}

/**
 * Calcule un montant de commission.
 * Renvoie null si aucun taux n'est fourni : « pas de barème » ne vaut jamais
 * « 0 € » ni un pourcentage improvisé.
 *
 * @param {Object} options
 * @param {number} options.prime_annuelle
 * @param {number|null} options.rate_percent
 * @param {boolean} [options.recurrent]
 * @returns {{commission_annuelle:number, commission_mensuelle:number, rate_percent:number, effective_rate_percent:number}|null}
 */
function calculerCommission({ prime_annuelle, rate_percent, recurrent = false } = {}) {
  const taux = Number(rate_percent)
  if (!Number.isFinite(taux) || taux <= 0) return null
  const prime = Number(prime_annuelle)
  if (!Number.isFinite(prime) || prime < 0) return null

  const facteur = recurrent ? FACTEUR_RECURRENT : 1
  const commission = (prime * taux * facteur) / 100
  return {
    rate_percent: taux,
    effective_rate_percent: Number((taux * facteur).toFixed(3)),
    commission_annuelle: Number(commission.toFixed(2)),
    commission_mensuelle: Number((commission / 12).toFixed(2)),
  }
}

module.exports = {
  BAREMES_EXEMPLE,
  MESSAGE_BAREME_REQUIS,
  FACTEUR_RECURRENT,
  tauxExemple,
  resoudreTauxCommission,
  calculerCommission,
}
