/* ============================================================================
   plansReference.js — référentiel UNIQUE des offres PUBLIQUES COURTIARK (FR/CH)
   ----------------------------------------------------------------------------
   SOURCE DE VÉRITÉ EN APPLICATION : `GET /api/billing/plans`
   (backend/src/services/planService.js). Ce module sert aux pages PUBLIQUES
   (/tarifs, landing, JSON-LD) et à l'affichage dérivé. Il ne doit JAMAIS servir
   à calculer un prix envoyé au serveur (Checkout, onboarding, API) : ce que le
   serveur facture vient du serveur, jamais d'une constante frontend.

   POURQUOI ce module (défaut mesuré le 22/09/2026) : les mêmes montants étaient
   recopiés à la main dans market/marketContext.js, pages/Tarifs.jsx (titres et
   descriptions SEO en toutes lettres) et pages/LandingPublic.jsx, et la grille
   suisse y utilisait des codes INVENTÉS côté frontend ('starter'/'pro'/'premium')
   alors que le backend sert 'independant'/'cabinet_ch'/'cabinet_ch_sur_devis'.
   Résultat : un cabinet suisse abonné était affiché sous une offre qui n'existe
   pas pour lui. Ici, les codes sont EXACTEMENT les codes backend.

   CODES BACKEND :
     France : starter · pro · cabinet (alias historique « premium » = cabinet)
     Suisse : independant · cabinet_ch · cabinet_ch_sur_devis

   FRAIS D'INSTALLATION SUISSE (setup) : 490 CHF (Indépendant), 990 CHF
   (Cabinet), dès 1'500 CHF (sur mesure). Ils sont annoncés publiquement mais
   n'existent PAS dans le backend : ils restent donc une INFORMATION D'AFFICHAGE
   publiée ici, jamais un montant envoyé à l'API.
   ============================================================================ */

/** Libellé unique d'une offre qui n'est pas vendue en self-serve. */
export const SUR_DEVIS_LABEL = 'Sur devis'

/** Taux de TVA publiés par marché (information d'affichage). */
export const VAT_LABEL = { FR: '20 %', CH: '8,1 %' }

/* ---------------------------------------------------------------------------
   Métadonnées de marché (affichage public).
   `currencyCode` (et non `currency`) : la devise de facturation du marché est
   portée par market/marketContext.js, seule source lue par les écrans privés.
   ------------------------------------------------------------------------- */
export const MARKET_META = {
  FR: {
    market: 'FR',
    country: 'France',
    locale: 'fr-FR',
    currencyCode: 'EUR',
    currencySymbol: '€',
    compliance: 'DDA · ORIAS · RGPD',
    taxNote: 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.',
    cta: 'Démarrer maintenant',
  },
  CH: {
    market: 'CH',
    country: 'Suisse',
    locale: 'fr-CH',
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    compliance: 'LSA · FINMA · nLPD',
    taxNote: 'Prix HT. TVA suisse 8,1 % en sus.',
    cta: 'Réserver une démo',
  },
}

/** Grille FRANCE — codes backend : starter · pro · cabinet. */
export const PLANS_FR = [
  {
    code: 'starter',
    name: 'Starter',
    seoName: 'Starter',
    monthly: 89,
    currencyCode: 'EUR',
    currencySymbol: '€',
    interval: '/mois',
    setup: 0,
    setupLabel: 'Aucun frais d’inscription',
    surDevis: false,
    highlighted: false,
    badge: 'Débutant',
    description: 'Pour courtier indépendant',
    features: ['Cockpit de base', 'ARK limité', 'Relances essentielles', 'DDA / ORIAS conservés'],
  },
  {
    code: 'pro',
    name: 'Pro',
    seoName: 'Pro',
    monthly: 159,
    currencyCode: 'EUR',
    currencySymbol: '€',
    interval: '/mois',
    setup: 0,
    setupLabel: 'Aucun frais d’inscription',
    surDevis: false,
    highlighted: true,
    badge: 'Recommandé',
    description: 'Pour cabinet en croissance',
    features: ['Cockpit complet', 'ARK quotidien', 'Opportunités portefeuille', 'Conformité DDA / RGPD'],
  },
  {
    code: 'cabinet',
    name: 'Cabinet',
    seoName: 'Cabinet',
    monthly: null,
    currencyCode: 'EUR',
    currencySymbol: '€',
    interval: '/mois',
    setup: 0,
    setupLabel: SUR_DEVIS_LABEL,
    surDevis: true,
    highlighted: false,
    badge: 'Sur devis',
    description: 'Pour équipe structurée',
    features: ['Tout Pro', 'Multi-utilisateurs', 'Déploiement accompagné', 'Support prioritaire'],
  },
]

/** Grille SUISSE — codes backend : independant · cabinet_ch · cabinet_ch_sur_devis. */
export const PLANS_CH = [
  {
    code: 'independant',
    name: 'Indépendant',
    seoName: 'Indépendant',
    monthly: 199,
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    interval: '/mois',
    setup: 490,
    setupLabel: '490 CHF setup',
    surDevis: false,
    highlighted: false,
    badge: 'Indépendant',
    description: 'Courtier indépendant suisse',
    features: [
      'Onboarding suisse',
      'Paramétrage conformité LSA',
      'Langues FR-CH / DE-CH / IT-CH',
      'Caisse-maladie, LAA, LCA/LAMal',
    ],
  },
  {
    code: 'cabinet_ch',
    name: 'Cabinet',
    seoName: 'Cabinet',
    monthly: 349,
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    interval: '/mois',
    setup: 990,
    setupLabel: '990 CHF setup',
    extraUserMonthly: 49,
    surDevis: false,
    highlighted: true,
    badge: 'Recommandé',
    description: 'Cabinet avec 3 accès inclus',
    features: [
      '3 accès inclus',
      'Journal de conseil LSA',
      'Préparation document précontractuel',
      '+49 CHF / mois / user supp.',
    ],
  },
  {
    code: 'cabinet_ch_sur_devis',
    name: 'Sur-Mesure / Fiduciaire',
    seoName: 'Sur-Mesure',
    monthly: null,
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    interval: '/mois',
    setup: 1500,
    setupPrefix: 'dès',
    setupLabel: "dès 1'500 CHF setup",
    surDevis: true,
    highlighted: false,
    badge: SUR_DEVIS_LABEL,
    description: 'Cabinets avancés et fiduciaires',
    features: ['Module Fiduciaire', 'TVA suisse et échéanciers cantonaux', 'GED avec hash', 'Déploiement sur devis'],
  },
]

export const PLANS_BY_MARKET = { FR: PLANS_FR, CH: PLANS_CH }

/** Codes d'offres publiques connus (FR + CH), tels que servis par le backend. */
export const PUBLIC_PLAN_CODES = [...PLANS_FR, ...PLANS_CH].map((plan) => plan.code)

/**
 * Codes d'offres SUR DEVIS : le serveur refuse un Checkout sur ces plans
 * (409 `cabinet_contact_required`). Aucun écran ne doit donc ouvrir Stripe pour
 * eux — le parcours produit est la demande de contact.
 * 'premium' est l'alias historique français de 'cabinet' ;
 * 'cabinet_sur_devis' est accepté par sécurité s'il est un jour servi.
 */
export const QUOTE_ONLY_PLAN_CODES = ['cabinet', 'premium', 'cabinet_sur_devis', 'cabinet_ch_sur_devis']

/** Parcours CONTACT existant du produit pour une offre sur devis. */
export const QUOTE_CONTACT_PATH = '/contact?type=premium'

/** Libellé du bouton d'une offre, aligné sur ce que fait réellement le serveur. */
export const PLAN_CTA_LABEL = { checkout: 'Choisir ce plan', quote: 'Demander une offre' }

/** Offres connues du référentiel public, par code backend. */
const PAR_CODE = [...PLANS_FR, ...PLANS_CH].reduce((acc, plan) => {
  acc[plan.code] = plan
  return acc
}, {})

export function getMarketPlans(market) {
  return PLANS_BY_MARKET[market] || PLANS_FR
}

/** Référence complète d'un marché : métadonnées + grille. */
export function getMarketReference(market) {
  const meta = MARKET_META[market] || MARKET_META.FR
  return { ...meta, plans: getMarketPlans(market) }
}

/** Une offre publique par marché et code backend. `null` si inconnue. */
export function getPublicPlan(market, code) {
  return getMarketPlans(market).find((plan) => plan.code === code) || null
}

/** Une offre publique par code, tous marchés confondus (FR d'abord). */
export function findPublicPlanByCode(code) {
  const key = normalizePlanCode(code)
  return key ? PAR_CODE[key] || null : null
}

/** Code d'offre normalisé (minuscules, sans espaces). '' si absent. */
export function normalizePlanCode(code) {
  return String(code ?? '').trim().toLowerCase()
}

/** `true` si l'offre ne peut PAS être achetée en self-serve (sur devis). */
export function isQuoteOnlyPlan(code) {
  return QUOTE_ONLY_PLAN_CODES.includes(normalizePlanCode(code))
}

/** Libellé de bouton cohérent avec le comportement réel : devis → contact. */
export function planActionLabel(code) {
  return isQuoteOnlyPlan(code) ? PLAN_CTA_LABEL.quote : PLAN_CTA_LABEL.checkout
}

/**
 * Montant nu formaté ('89 €', '199 CHF', « 1'500 CHF »). Un montant absent
 * n'est PAS zéro : c'est une offre sur devis.
 */
export function formatAmountHt(amount, currencySymbol = '€') {
  if (amount === null || amount === undefined) return SUR_DEVIS_LABEL
  const rounded = Math.round(Number(amount))
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return currencySymbol === 'CHF' ? `${grouped} CHF` : `${grouped} €`
}

/** Prix d'une offre de la grille : montant publié, ou « Sur devis ». */
export function formatPlanPrice(plan) {
  if (!plan || plan.surDevis || plan.monthly === null || plan.monthly === undefined) return SUR_DEVIS_LABEL
  return formatAmountHt(plan.monthly, plan.currencySymbol)
}

/** Prix TTC français dérivé du HT (TVA 20 % publiée), même format que l'existant. */
export function formatTtcFrance(monthly) {
  const ttc = Math.round(Number(monthly) * (1 + 0.2) * 100) / 100
  return `${ttc.toFixed(2).replace('.', ',')} €`
}

/** Nom court utilisé par les métadonnées SEO (reprend le nom publié si absent). */
function seoName(plan) {
  return plan.seoName || plan.name
}

/**
 * Titre SEO de /tarifs dérivé de la grille publiée (plus aucun montant recopié
 * à la main dans la page).
 */
export function plansSeoTitle(market) {
  const [entree, principal, haut] = getMarketPlans(market)
  if (market === 'CH') {
    const symbol = MARKET_META.CH.currencySymbol
    return `Tarifs COURTIARK Suisse — ${symbol} ${entree.monthly} ${seoName(entree)} / ${principal.monthly} ${seoName(principal)} (TVA ${VAT_LABEL.CH} en sus)`
  }
  return `Tarifs COURTIARK — ${seoName(entree)} ${formatPlanPrice(entree)} / ${seoName(principal)} ${formatPlanPrice(principal)} / ${seoName(haut)} ${SUR_DEVIS_LABEL.toLowerCase()}`
}

/** Description SEO de /tarifs, dérivée de la grille publiée. */
export function plansSeoDescription(market) {
  const [entree, principal, haut] = getMarketPlans(market)
  if (market === 'CH') {
    return `Grille tarifaire COURTIARK en francs suisses pour courtiers d’assurance en Suisse : ${seoName(entree)} ${entree.monthly} CHF/mois, ${seoName(principal)} ${principal.monthly} CHF/mois, ${seoName(haut)} ${SUR_DEVIS_LABEL.toLowerCase()}. Setup et TVA ${VAT_LABEL.CH} indiqués.`
  }
  return `Grille tarifaire COURTIARK pour courtiers d’assurance : ${seoName(entree)} ${formatPlanPrice(entree)} HT/mois, ${seoName(principal)} ${formatPlanPrice(principal)} HT/mois, ${seoName(haut)} ${SUR_DEVIS_LABEL.toLowerCase()}. Sans frais cachés ni engagement.`
}

/**
 * Offres du JSON-LD de la landing (FR + CH), dérivées de la grille : les
 * montants ne sont plus recopiés dans le script SEO.
 */
export function structuredDataOffers() {
  const [starter] = PLANS_FR
  const [, proFr] = PLANS_FR
  const [independant, cabinetCh] = PLANS_CH
  return [
    { '@type': 'Offer', name: seoName(starter), price: String(starter.monthly), priceCurrency: starter.currencyCode },
    { '@type': 'Offer', name: seoName(proFr), price: String(proFr.monthly), priceCurrency: proFr.currencyCode },
    { '@type': 'Offer', name: `${independant.name} (Suisse)`, price: String(independant.monthly), priceCurrency: independant.currencyCode },
    { '@type': 'Offer', name: `${cabinetCh.name} (Suisse)`, price: String(cabinetCh.monthly), priceCurrency: cabinetCh.currencyCode },
  ]
}
