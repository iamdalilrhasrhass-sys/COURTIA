/**
 * @file scoring.js — Source unique de vérité pour les scores client COURTIA.
 * Fonctions pures. Zéro React, zéro fetch, zéro localStorage.
 */

const PRO_KEYWORDS = [
  'médecin', 'dentiste', 'avocat', 'notaire', 'architecte',
  'chef', 'directeur', 'gérant', 'pharmacien', 'ingénieur'
]

const CHAMPS_CLES = [
  'nom', 'prenom', 'email', 'telephone', 'adresse', 'profession',
  'situation_familiale', 'bonus_malus', 'annees_permis',
  'nb_sinistres_3ans', 'zone_geographique', 'segment'
]

export const SCORE_HEX = {
  red:     '#dc2626',
  orange:  '#d97706',
  green:   '#16a34a',
  neutral: '#9ca3af',
}

export const SCORE_BG_HEX = {
  red:     '#fef2f2',
  orange:  '#fffbeb',
  green:   '#dcfce7',
  neutral: '#f3f4f6',
}

/**
 * Calcule tous les scores pour un client.
 * @param {Object} client — Objet client (champs DB courtia)
 * @param {Array}  contrats — Contrats du client
 * @param {Array}  [taches=[]] — Tâches liées (optionnel, pour signaux futurs)
 * @returns {{ risque, fidelite, opportunite, retention, completude, valeur_eur,
 *             priorite, signaux, raisons,
 *             nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns } | null}
 */
export function computeScores(client, contrats, taches = []) {
  if (!client) return null

  const c = Array.isArray(contrats) ? contrats : []
  const sins    = Number(client.nb_sinistres_3ans) || 0
  const bm      = Number(client.bonus_malus) || 1
  const annees  = Number(client.annees_permis) || 0
  const zone     = (client.zone_geographique || '').toLowerCase()
  const statut   = (client.statut || '').toLowerCase()
  const segment  = (client.segment || '').toLowerCase()
  const profession = (client.profession || '').toLowerCase()
  const situation  = (client.situation_familiale || '').toLowerCase()

  const activeContrats = c.filter(x => (x.statut || x.status || '').toLowerCase() === 'actif')
  const nbActifs   = activeContrats.length
  const primeTotal = activeContrats.reduce((sum, x) => sum + (Number(x.prime_annuelle) || 0), 0)

  const createdAt     = client.created_at ? new Date(client.created_at) : null
  const ancienneteMs  = createdAt ? Date.now() - createdAt.getTime() : 0
  const ancienneteAns = ancienneteMs / (365.25 * 24 * 3600 * 1000)

  // Prochaine échéance (jours)
  let prochaineEcheanceDays = null
  c.forEach(x => {
    if (!x.date_echeance) return
    const d = Math.ceil((new Date(x.date_echeance) - new Date()) / 86400000)
    if (d > 0 && (prochaineEcheanceDays === null || d < prochaineEcheanceDays)) {
      prochaineEcheanceDays = d
    }
  })

  // ── RISQUE (0-100) — élevé = dangereux ──
  // Base 20 + sinistres (×18, max 45) + BM + zone + jeune permis + sans contrat
  let risque = 20
  risque += Math.min(45, sins * 18)
  if (bm > 2.5)      risque += 30
  else if (bm > 1.5) risque += 20
  else if (bm > 1.1) risque += 10
  if (zone === 'urbain')       risque += 12
  else if (zone === 'périurbain') risque += 6
  if (annees < 3 && annees > 0) risque += 15
  else if (annees < 5 && annees >= 3) risque += 8
  if (nbActifs === 0) risque += 10
  risque = clamp(risque)

  // ── FIDÉLITÉ (0-100) — élevé = bon ──
  // Base 20 + ancienneté + multi-contrat + statut actif + zéro sinistre
  let fidelite = 20
  if (ancienneteAns > 5)       fidelite += 30
  else if (ancienneteAns > 3)  fidelite += 20
  else if (ancienneteAns > 1)  fidelite += 12
  else if (ancienneteAns > 0.5) fidelite += 6
  if (nbActifs > 2)      fidelite += 20
  else if (nbActifs > 1) fidelite += 12
  else if (nbActifs === 1) fidelite += 6
  if (statut === 'actif')    fidelite += 15
  if (sins === 0)            fidelite += 15
  if (statut === 'résilié')  fidelite = Math.max(0, fidelite - 30)
  fidelite = clamp(fidelite)

  // ── OPPORTUNITÉ (0-100) ──
  // Base 25 + mono/zéro contrat + profession pro + segment pro + couple + prime élevée
  let opportunite = 25
  if (nbActifs === 1)       opportunite += 20
  else if (nbActifs === 0)  opportunite += 10
  if (PRO_KEYWORDS.some(kw => profession.includes(kw))) opportunite += 18
  if (['professionnel', 'tpe', 'pme', 'entreprise'].includes(segment)) opportunite += 15
  if (['marié', 'pacsé'].includes(situation)) opportunite += 10
  if (statut === 'actif')  opportunite += 8
  if (primeTotal > 2000)   opportunite += 10
  else if (primeTotal > 1000) opportunite += 5
  opportunite = clamp(opportunite)

  // ── RÉTENTION (0-100) ──
  // Base 40, 0 si résilié/perdu; ancienneté +, sinistres/BM/échéance proche -
  let retention = 40
  if (statut === 'résilié' || statut === 'perdu') {
    retention = 0
  } else {
    if (ancienneteAns > 3)      retention += 20
    else if (ancienneteAns > 1) retention += 10
    if (nbActifs > 2)      retention += 15
    else if (nbActifs > 1) retention += 8
    if (sins > 2)      retention -= 20
    else if (sins > 1) retention -= 10
    if (bm > 2) retention -= 15
    if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) retention -= 20
    else if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 60) retention -= 10
    if (statut === 'actif') retention += 8
  }
  retention = clamp(retention)

  // ── COMPLÉTUDE (0-100) — ratio champs remplis sur 12 champs clés ──
  const filled = CHAMPS_CLES.filter(
    k => client[k] !== null && client[k] !== undefined && String(client[k]).trim() !== ''
  ).length
  const completude = Math.round(filled / CHAMPS_CLES.length * 100)

  // ── VALEUR (€) — prime annuelle totale ou lifetime_value ──
  const valeur_eur = primeTotal > 0 ? primeTotal : (Number(client.lifetime_value) || 0)

  // ── PRIORITÉ GLOBALE ──
  let priorite = 'faible'
  if (
    (retention < 45 && valeur_eur > 500) ||
    (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) ||
    (opportunite > 75 && nbActifs <= 1)
  ) {
    priorite = 'haute'
  } else if (
    retention < 60 ||
    opportunite > 65 ||
    (sins > 1 && nbActifs > 0)
  ) {
    priorite = 'moyenne'
  }

  // ── SIGNAUX ──
  const signaux = []
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30)
    signaux.push({ label: `Échéance J-${prochaineEcheanceDays}`, color: '#dc2626', bg: '#fef2f2' })
  if (completude < 70)
    signaux.push({ label: 'Dossier incomplet', color: '#d97706', bg: '#fffbeb' })
  if (retention < 45 && nbActifs > 0)
    signaux.push({ label: 'À relancer', color: '#dc2626', bg: '#fef2f2' })
  if (sins > 1)
    signaux.push({ label: 'Historique instable', color: '#92400e', bg: '#fef3c7' })
  if (risque > 70)
    signaux.push({ label: 'Profil à risque', color: '#dc2626', bg: '#fef2f2' })
  if (opportunite > 75)
    signaux.push({ label: 'Potentiel élevé', color: '#16a34a', bg: '#dcfce7' })
  if (nbActifs === 1)
    signaux.push({ label: 'Multi-équipement possible', color: '#2563eb', bg: '#eff6ff' })
  if (fidelite > 75)
    signaux.push({ label: 'Client fidèle', color: '#16a34a', bg: '#dcfce7' })

  const scores = { risque, fidelite, opportunite, retention, completude, valeur_eur, nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns }
  const raisons = getScoreReasons(client, c, taches, scores)

  return { risque, fidelite, opportunite, retention, completude,
    valeur_eur, valeur: valeur_eur, // alias de compatibilité
    priorite, signaux, raisons,
    nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns }
}
  if (!client) return null

  const c = Array.isArray(contrats) ? contrats : []
  const sins    = Number(client.nb_sinistres_3ans) || 0
  const bm      = Number(client.bonus_malus) || 1
  const annees  = Number(client.annees_permis) || 0
  const zone     = (client.zone_geographique || '').toLowerCase()
  const statut   = (client.statut || '').toLowerCase()
  const segment  = (client.segment || '').toLowerCase()
  const profession = (client.profession || '').toLowerCase()
  const situation  = (client.situation_familiale || '').toLowerCase()

  const activeContrats = c.filter(x => (x.statut || x.status || '').toLowerCase() === 'actif')
  const nbActifs   = activeContrats.length
  const primeTotal = activeContrats.reduce((sum, x) => sum + (Number(x.prime_annuelle) || 0), 0)

  const createdAt     = client.created_at ? new Date(client.created_at) : null
  const ancienneteMs  = createdAt ? Date.now() - createdAt.getTime() : 0
  const ancienneteAns = ancienneteMs / (365.25 * 24 * 3600 * 1000)

  // Prochaine échéance (jours)
  let prochaineEcheanceDays = null
  c.forEach(x => {
    if (!x.date_echeance) return
    const d = Math.ceil((new Date(x.date_echeance) - new Date()) / 86400000)
    if (d > 0 && (prochaineEcheanceDays === null || d < prochaineEcheanceDays)) {
      prochaineEcheanceDays = d
    }
  })

  // ── RISQUE (0-100) — élevé = dangereux ──
  // Base 20 + sinistres (×18, max 45) + BM + zone + jeune permis + sans contrat
  let risque = 20
  risque += Math.min(45, sins * 18)
  if (bm > 2.5)      risque += 30
  else if (bm > 1.5) risque += 20
  else if (bm > 1.1) risque += 10
  if (zone === 'urbain')       risque += 12
  else if (zone === 'périurbain') risque += 6
  if (annees < 3 && annees > 0) risque += 15
  else if (annees < 5 && annees >= 3) risque += 8
  if (nbActifs === 0) risque += 10
  risque = clamp(risque)

  // ── FIDÉLITÉ (0-100) — élevé = bon ──
  // Base 20 + ancienneté + multi-contrat + statut actif + zéro sinistre
  let fidelite = 20
  if (ancienneteAns > 5)       fidelite += 30
  else if (ancienneteAns > 3)  fidelite += 20
  else if (ancienneteAns > 1)  fidelite += 12
  else if (ancienneteAns > 0.5) fidelite += 6
  if (nbActifs > 2)      fidelite += 20
  else if (nbActifs > 1) fidelite += 12
  else if (nbActifs === 1) fidelite += 6
  if (statut === 'actif')    fidelite += 15
  if (sins === 0)            fidelite += 15
  if (statut === 'résilié')  fidelite = Math.max(0, fidelite - 30)
  fidelite = clamp(fidelite)

  // ── OPPORTUNITÉ (0-100) ──
  // Base 25 + mono/zéro contrat + profession pro + segment pro + couple + prime élevée
  let opportunite = 25
  if (nbActifs === 1)       opportunite += 20
  else if (nbActifs === 0)  opportunite += 10
  if (PRO_KEYWORDS.some(kw => profession.includes(kw))) opportunite += 18
  if (['professionnel', 'tpe', 'pme', 'entreprise'].includes(segment)) opportunite += 15
  if (['marié', 'pacsé'].includes(situation)) opportunite += 10
  if (statut === 'actif')  opportunite += 8
  if (primeTotal > 2000)   opportunite += 10
  else if (primeTotal > 1000) opportunite += 5
  opportunite = clamp(opportunite)

  // ── RÉTENTION (0-100) ──
  // Base 40, 0 si résilié/perdu; ancienneté +, sinistres/BM/échéance proche -
  let retention = 40
  if (statut === 'résilié' || statut === 'perdu') {
    retention = 0
  } else {
    if (ancienneteAns > 3)      retention += 20
    else if (ancienneteAns > 1) retention += 10
    if (nbActifs > 2)      retention += 15
    else if (nbActifs > 1) retention += 8
    if (sins > 2)      retention -= 20
    else if (sins > 1) retention -= 10
    if (bm > 2) retention -= 15
    if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) retention -= 20
    else if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 60) retention -= 10
    if (statut === 'actif') retention += 8
  }
  retention = clamp(retention)

  // ── COMPLÉTUDE (0-100) — ratio champs remplis sur 12 champs clés ──
  const filled = CHAMPS_CLES.filter(
    k => client[k] !== null && client[k] !== undefined && String(client[k]).trim() !== ''
  ).length
  const completude = Math.round(filled / CHAMPS_CLES.length * 100)

  // ── VALEUR (€) — prime annuelle totale ou lifetime_value ──
  const valeur_eur = primeTotal > 0 ? primeTotal : (Number(client.lifetime_value) || 0)

  // ── PRIORITÉ GLOBALE ──
  let priorite = 'faible'
  if (
    (retention < 45 && valeur_eur > 500) ||
    (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) ||
    (opportunite > 75 && nbActifs <= 1)
  ) {
    priorite = 'haute'
  } else if (
    retention < 60 ||
    opportunite > 65 ||
    (sins > 1 && nbActifs > 0)
  ) {
    priorite = 'moyenne'
  }

  // ── SIGNAUX ──
  const signaux = []
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30)
    signaux.push({ label: `Échéance J-${prochaineEcheanceDays}`, color: '#dc2626', bg: '#fef2f2' })
  if (completude < 70)
    signaux.push({ label: 'Dossier incomplet', color: '#d97706', bg: '#fffbeb' })
  if (retention < 45 && nbActifs > 0)
    signaux.push({ label: 'À relancer', color: '#dc2626', bg: '#fef2f2' })
  if (sins > 1)
    signaux.push({ label: 'Historique instable', color: '#92400e', bg: '#fef3c7' })
  if (risque > 70)
    signaux.push({ label: 'Profil à risque', color: '#dc2626', bg: '#fef2f2' })
  if (opportunite > 75)
    signaux.push({ label: 'Potentiel élevé', color: '#16a34a', bg: '#dcfce7' })
  if (nbActifs === 1)
    signaux.push({ label: 'Multi-équipement possible', color: '#2563eb', bg: '#eff6ff' })
  if (fidelite > 75)
    signaux.push({ label: 'Client fidèle', color: '#16a34a', bg: '#dcfce7' })

  const scores = { risque, fidelite, opportunite, retention, completude, valeur_eur, nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns }
  const raisons = getScoreReasons(client, c, taches, scores)

  return { risque, fidelite, opportunite, retention, completude,
    valeur_eur, valeur: valeur_eur, // alias de compatibilité
    priorite, signaux, raisons,
    nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns }
}

/**
 * Retourne la couleur sémantique d'un score.
 * NULL/undefined → toujours 'neutral', jamais 'green'.
 * Seuils risque : ≥70 red, ≥40 orange, <40 green (élevé = dangereux).
 * Seuils autres : ≥70 green, ≥40 orange, <40 red (élevé = bon).
 * @param {number|null|undefined} score
 * @param {'risque'|'fidelite'|'opportunite'|'retention'|'completude'} type
 * @returns {'red'|'orange'|'green'|'neutral'}
 */
export function getScoreColor(score, type) {
  if (score === null || score === undefined) return 'neutral'
  const s = Number(score)
  if (isNaN(s)) return 'neutral'

  if (type === 'risque') {
    if (s >= 70) return 'red'
    if (s >= 40) return 'orange'
    return 'green'
  }

  // fidelite, opportunite, retention, completude
  if (s >= 70) return 'green'
  if (s >= 40) return 'orange'
  return 'red'
}

/**
 * Génère 3 à 8 raisons métier concrètes expliquant les scores.
 * @param {Object} client
 * @param {Array}  contrats
 * @param {Array}  taches
 * @param {Object} scores — Scores déjà calculés (évite recalcul)
 * @returns {string[]}
 */
export function getScoreReasons(client, contrats, taches, scores) {
  const {
    sins = 0, bm = 1, ancienneteAns = 0,
    nbActifs = 0, prochaineEcheanceDays = null, completude = 0
  } = scores || {}

  const zone      = (client?.zone_geographique || '').toLowerCase()
  const profession = (client?.profession || '').toLowerCase()
  const situation  = (client?.situation_familiale || '').toLowerCase()
  const ancAns     = Math.round(ancienneteAns)

  const raisons = []

  if (sins > 1)       raisons.push(`${sins} sinistres sur 3 ans — profil instable`)
  else if (sins === 1) raisons.push('1 sinistre sur 3 ans')

  if (bm > 1.5)       raisons.push(`Bonus-malus dégradé (${bm}) — majoration de prime`)
  else if (bm > 1.2)  raisons.push(`Bonus-malus à surveiller (${bm})`)

  if (ancienneteAns >= 5) raisons.push(`Client fidèle depuis ${ancAns} ans`)
  else if (ancAns > 0)    raisons.push(`Client depuis ${ancAns} an(s)`)

  if (nbActifs > 2)       raisons.push(`${nbActifs} contrats actifs — portefeuille multi-équipé`)
  else if (nbActifs === 1) raisons.push('1 seul contrat — potentiel multi-équipement non exploité')
  else if (nbActifs === 0) raisons.push('Aucun contrat actif — risque de départ')

  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30)
    raisons.push(`Échéance dans ${prochaineEcheanceDays} jours — à traiter en priorité`)
  else if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 90)
    raisons.push(`Prochaine échéance dans ${prochaineEcheanceDays} jours`)

  if (completude < 60)       raisons.push(`Dossier incomplet (${completude}%) — données clés manquantes`)
  else if (completude < 80)  raisons.push(`Dossier à ${completude}% — enrichissement possible`)

  if (zone === 'urbain')
    raisons.push('Zone urbaine — facteur de risque aggravant')

  if (PRO_KEYWORDS.some(kw => profession.includes(kw)))
    raisons.push(`Profession à fort potentiel (${client?.profession})`)

  if (['marié', 'pacsé'].includes(situation))
    raisons.push('En couple — opportunité prévoyance / habitation')

  return raisons.slice(0, 8)
}

/** @private */
function clamp(v) { return Math.min(100, Math.max(0, Math.round(v))) }
