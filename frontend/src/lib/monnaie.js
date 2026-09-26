/* ============================================================================
   COURTIARK — Devise unique du frontend
   ----------------------------------------------------------------------------
   Un cabinet suisse (pays = 'CH') raisonne en francs suisses : les écrans
   privés doivent afficher « 1'234.50 CHF », jamais « 1 235 € ». La règle vit
   ici, à un seul endroit, pour qu'aucune page ne réinvente son propre
   formatage.

   - `configurerContexte({ pays, langue })` : appelé dès que le profil réel
     (`GET /api/auth/me`) est connu (voir `api/sessionUser.js`).
   - Avant toute configuration explicite, le contexte est relu depuis le profil
     persisté (`localStorage.courtia_user` / `localStorage.user`) : le premier
     rendu après un rechargement est donc déjà dans la bonne devise.
   - Profil inconnu : EUR / fr-FR — le comportement historique, jamais cassé
     pour un cabinet français.
   - Valeur absente ou non numérique : '—'. On n'invente jamais 0, jamais NaN.

   Le module ne touche qu'au FORMATAGE des montants : aucune couleur, aucun
   espacement, aucun composant.
   ========================================================================== */

const CLES_PROFIL_STOCKE = ['courtia_user', 'user']

// « CH » est le code ISO attendu (broker_profiles.pays). Les libellés longs
// sont acceptés par tolérance : un profil reste un profil.
const PAYS_SUISSES = new Set(['CH', 'CHE', 'SUISSE', 'SWITZERLAND', 'SCHWEIZ', 'SVIZZERA', 'SVIZRA'])

// Même tolérance côté France. POURQUOI une détection distincte de « non suisse » :
// l'auto-complétion d'adresse de /clients/new doit interroger la Base Adresse
// Nationale FRANÇAISE uniquement pour un cabinet français (QA adverse n° 2 :
// un cabinet suisse recevait « Suggestions : Base Adresse Nationale française »
// et des adresses françaises). Un marché tiers n'est donc PAS traité comme la
// France : l'écran ne propose alors aucune source nationale.
const PAYS_FRANCAIS = new Set(['FR', 'FRA', 'FRANCE'])

const DEVISE_SUISSE = 'CHF'
const LOCALE_SUISSE = 'fr-CH'
const DEVISE_DEFAUT = 'EUR'
const LOCALE_DEFAUT = 'fr-FR'

export const VALEUR_ABSENTE = '—'

/** Contexte actif. `null` = pas encore configuré (lecture paresseuse). */
let contexte = null
const cacheFormats = new Map()

function normaliserPays(pays) {
  return String(pays ?? '').trim().toUpperCase()
}

/** Vrai pour un pays/canton suisse reconnu (`'CH'`, `'Suisse'`, …). */
export function paysSuisse(pays) {
  return PAYS_SUISSES.has(normaliserPays(pays))
}

/**
 * Vrai pour la France (`'FR'`, `'France'`). Distinct de « non suisse » : la
 * Base Adresse Nationale française n'est proposée qu'à un cabinet français.
 */
export function paysFrance(pays) {
  return PAYS_FRANCAIS.has(normaliserPays(pays))
}

function contextePour(pays, langue) {
  const paysNormalise = normaliserPays(pays) || null
  const langueNormalisee = langue ? String(langue) : null
  if (paysSuisse(pays)) {
    return { pays: paysNormalise, langue: langueNormalisee, devise: DEVISE_SUISSE, locale: LOCALE_SUISSE }
  }
  return { pays: paysNormalise, langue: langueNormalisee, devise: DEVISE_DEFAUT, locale: LOCALE_DEFAUT }
}

function profilStocke() {
  if (typeof localStorage === 'undefined') return null
  for (const cle of CLES_PROFIL_STOCKE) {
    try {
      const brut = localStorage.getItem(cle)
      if (!brut) continue
      const profil = JSON.parse(brut)
      if (profil && typeof profil === 'object' && profil.pays) return profil
    } catch {
      // Profil illisible : on garde la devise par défaut, sans casser l'écran.
    }
  }
  return null
}

function contexteEffectif() {
  if (!contexte) {
    const profil = profilStocke()
    contexte = profil ? contextePour(profil.pays, profil.langue) : contextePour(null, null)
  }
  return contexte
}

/**
 * Fixe le contexte de devise du cabinet connecté.
 * @param {{ pays?: string|null, langue?: string|null }} profil
 * @returns {{ pays: string|null, langue: string|null, devise: string, locale: string }}
 */
export function configurerContexte({ pays, langue } = {}) {
  contexte = contextePour(pays, langue)
  return contexte
}

/** Devise affichée par les écrans privés : 'CHF' ou 'EUR'. */
export function deviseCourante() {
  return contexteEffectif().devise
}

/**
 * Symbole de la devise courante tel qu'il doit apparaître à côté d'un nombre
 * DÉJÀ formaté par ailleurs : « CHF » ou « € ».
 *
 * POURQUOI cette fonction en plus de `fmtMontant` : le journal d'activité ARK
 * affiche des coûts à trois décimales (« 0.315 ») avec son propre arrondi. Il
 * lui faut le symbole du cabinet, pas le formatage complet. Sans elle, chaque
 * composant réécrivait « € » en dur — ce qui affichait un euro dans un cabinet
 * suisse (relevé : « Coût session : 0.000 € »).
 */
export function symboleCourant() {
  return contexteEffectif().devise === DEVISE_SUISSE ? 'CHF' : '€'
}

/** Locale de formatage correspondante : 'fr-CH' ou 'fr-FR'. */
export function localeCourante() {
  return contexteEffectif().locale
}

/** Contexte complet (lecture seule) — utile aux tests et aux diagnostics. */
export function contexteCourant() {
  return { ...contexteEffectif() }
}

function nombreOuNull(valeur) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null
  // Un montant est un nombre ou une chaîne numérique. Objet, tableau, booléen
  // ou valeur vide ne sont pas des montants : ils valent '—', jamais 0.
  if (typeof valeur !== 'string') return null
  const brut = valeur.trim()
  if (brut === '') return null
  const nombre = Number(brut)
  return Number.isFinite(nombre) ? nombre : null
}

function formateur(locale, options) {
  const cle = `${locale}|${JSON.stringify(options)}`
  let instance = cacheFormats.get(cle)
  if (!instance) {
    instance = new Intl.NumberFormat(locale, options)
    cacheFormats.set(cle, instance)
  }
  return instance
}

/**
 * Montant en devise du cabinet. Absent/non numérique → '—'.
 * @param {number|string|null|undefined} valeur
 * @param {Intl.NumberFormatOptions & { devise?: string, locale?: string }} [options]
 *   Par défaut : décimales selon l'Intl de la locale. Les écrans qui affichent
 *   des montants ronds passent `{ maximumFractionDigits: 0 }`.
 */
export function fmtMontant(valeur, options = {}) {
  const nombre = nombreOuNull(valeur)
  if (nombre === null) return VALEUR_ABSENTE
  const { devise, locale } = contexteEffectif()
  const { devise: deviseForcee, locale: localeForcee, ...reste } = options || {}
  return formateur(localeForcee || locale, {
    style: 'currency',
    currency: deviseForcee || devise,
    ...reste,
  }).format(nombre)
}

/** Montant abrégé pour les graphiques : « 12,4 k € » / « 12.4 k CHF ». */
export function fmtMontantCourt(valeur) {
  const nombre = nombreOuNull(valeur)
  if (nombre === null) return VALEUR_ABSENTE
  const { devise, locale } = contexteEffectif()
  return formateur(locale, {
    style: 'currency',
    currency: devise,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(nombre)
}

/** Nombre nu (comptages, volumes) selon la locale du cabinet. Absent → '—'. */
export function fmtNombre(valeur) {
  const nombre = nombreOuNull(valeur)
  if (nombre === null) return VALEUR_ABSENTE
  return formateur(contexteEffectif().locale, {}).format(nombre)
}

/* ─── Dates ─────────────────────────────────────────────────────────────────
   POURQUOI ici : le frontend formatait ses dates en `toLocaleDateString('fr-FR')`
   un peu partout (~40 fichiers). Pour un cabinet suisse, « 12/03/2026 » pouvait
   passer, mais les formats longs (« mercredi 12 mars 2026 », heures, mois) sont
   ceux du marché du cabinet : un courtier suisse lit « 12 mars 2026 » dans les
   conventions de fr-CH. La locale vient donc du MÊME contexte que la devise
   (`lib/monnaie.js`), configuré depuis le profil réel (`GET /api/auth/me`).
   Profil inconnu → fr-FR : le comportement historique est conservé.

   Une date absente ou invalide vaut '—' : on n'affiche jamais la date du jour
   ni une date inventée à la place d'une date manquante.
   ─────────────────────────────────────────────────────────────────────────── */

const cacheDates = new Map()

function dateOuNull(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const d = valeur instanceof Date ? valeur : new Date(valeur)
  return Number.isNaN(d.getTime()) ? null : d
}

function formateurDate(options) {
  const locale = contexteEffectif().locale
  const cle = `${locale}|${JSON.stringify(options || {})}`
  let instance = cacheDates.get(cle)
  if (!instance) {
    instance = new Intl.DateTimeFormat(locale, options)
    cacheDates.set(cle, instance)
  }
  return instance
}

/**
 * Date courte au format du marché du cabinet (fr-CH en Suisse, fr-FR sinon).
 * @param {string|number|Date|null|undefined} valeur
 * @param {Intl.DateTimeFormatOptions} [options] remplace le format par défaut
 */
export function fmtDate(valeur, options) {
  const date = dateOuNull(valeur)
  if (!date) return VALEUR_ABSENTE
  return formateurDate(options || { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

/** Date longue (« mercredi 12 mars 2026 ») selon la locale du cabinet. */
export function fmtDateLongue(valeur, options) {
  const date = dateOuNull(valeur)
  if (!date) return VALEUR_ABSENTE
  return formateurDate(options || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/** Heure (HH:MM) selon la locale du cabinet. */
export function fmtHeure(valeur) {
  const date = dateOuNull(valeur)
  if (!date) return VALEUR_ABSENTE
  return formateurDate({ hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Date + heure selon la locale du cabinet. */
export function fmtDateHeure(valeur) {
  const date = dateOuNull(valeur)
  if (!date) return VALEUR_ABSENTE
  return formateurDate({ dateStyle: 'short', timeStyle: 'short' }).format(date)
}

