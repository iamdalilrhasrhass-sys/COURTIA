export const MARKET_CODES = ['FR', 'CH']
export const DEFAULT_MARKET = 'FR'

export const MARKET_OPTIONS = [
  { code: 'FR', flag: '🇫🇷', label: 'France', shortLabel: 'FR' },
  { code: 'CH', flag: '🇨🇭', label: 'Suisse', shortLabel: 'CH' },
]

export const MARKET_PRICING = {
  FR: {
    market: 'FR',
    country: 'France',
    locale: 'fr-FR',
    currency: 'EUR',
    currencySymbol: '€',
    compliance: 'DDA · ORIAS · RGPD',
    taxNote: 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.',
    cta: 'Démarrer maintenant',
    plans: [
      { code: 'starter', name: 'Starter', monthly: 89, setup: 0, setupLabel: 'Aucun frais d’inscription', description: 'Pour courtier indépendant', features: ['Cockpit de base', 'ARK limité', 'Relances essentielles', 'DDA / ORIAS conservés'] },
      { code: 'pro', name: 'Pro', monthly: 159, setup: 0, setupLabel: 'Aucun frais d’inscription', highlighted: true, description: 'Pour cabinet en croissance', features: ['Cockpit complet', 'ARK quotidien', 'Opportunités portefeuille', 'Conformité DDA / RGPD'] },
      { code: 'premium', name: 'Cabinet', monthly: null, setup: 0, setupLabel: 'Sur devis', description: 'Pour équipe structurée', features: ['Tout Pro', 'Multi-utilisateurs', 'Déploiement accompagné', 'Support prioritaire'] },
    ],
  },
  CH: {
    market: 'CH',
    country: 'Suisse',
    locale: 'fr-CH',
    currency: 'CHF',
    currencySymbol: 'CHF',
    compliance: 'LSA · FINMA · nLPD',
    taxNote: 'Prix HT. TVA suisse 8,1 % en sus.',
    cta: 'Réserver une démo',
    plans: [
      { code: 'starter', name: 'Indépendant', monthly: 199, setup: 490, setupLabel: '490 CHF setup', description: 'Courtier indépendant suisse', features: ['Onboarding suisse', 'Paramétrage conformité LSA', 'Langues FR-CH / DE-CH / IT-CH', 'Caisse-maladie, LAA, LCA/LAMal'] },
      { code: 'pro', name: 'Cabinet', monthly: 349, setup: 990, setupLabel: '990 CHF setup', highlighted: true, description: 'Cabinet avec 3 accès inclus', features: ['3 accès inclus', 'Journal de conseil LSA', 'Préparation document précontractuel', '+49 CHF / mois / user supp.'] },
      { code: 'premium', name: 'Sur-Mesure / Fiduciaire', monthly: null, setup: 1500, setupPrefix: 'dès', setupLabel: "dès 1'500 CHF setup", description: 'Cabinets avancés et fiduciaires', features: ['Module Fiduciaire', 'TVA suisse et échéanciers cantonaux', 'GED avec hash', 'Déploiement sur devis'] },
    ],
  },
}

export function normalizeMarket(value) {
  const market = String(value || '').trim().toUpperCase()
  return MARKET_CODES.includes(market) ? market : DEFAULT_MARKET
}

export function isValidMarket(value) {
  return MARKET_CODES.includes(String(value || '').trim().toUpperCase())
}

export function getMarketPricing(value = DEFAULT_MARKET) {
  return MARKET_PRICING[normalizeMarket(value)]
}

export function getDetectedGeoCountry() {
  if (typeof window === 'undefined') return null
  const htmlCountry = document.documentElement?.dataset?.country
  if (htmlCountry) return htmlCountry.toUpperCase()

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  if (timeZone.includes('Zurich') || timeZone.includes('Geneva')) return 'CH'
  if (timeZone.includes('Paris')) return 'FR'
  return null
}

export function readStoredMarketOverride(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem?.('courtia_market_override') || storage?.getItem?.('cta_country')
    return isValidMarket(value) ? normalizeMarket(value) : null
  } catch {
    return null
  }
}

export function persistMarketOverride(market, storage = globalThis.localStorage) {
  const normalized = normalizeMarket(market)
  try {
    storage?.setItem?.('courtia_market_override', normalized)
    storage?.setItem?.('cta_country', normalized)
  } catch {
    // Storage can be unavailable in private mode; cookie below is enough.
  }
  if (typeof document !== 'undefined') {
    document.cookie = `courtia_market_override=${normalized};max-age=${365 * 24 * 3600};path=/;samesite=lax`
    document.cookie = `cta_country=${normalized};max-age=${365 * 24 * 3600};path=/;samesite=lax`
  }
  if (typeof window !== 'undefined' && window.location && window.history?.replaceState) {
    const url = new URL(window.location.href)
    url.searchParams.set('market', normalized)
    url.searchParams.delete('country')
    window.history.replaceState(window.history.state, '', url.toString())
  }
  return normalized
}

export function clearMarketOverride(storage = globalThis.localStorage) {
  try {
    storage?.removeItem?.('courtia_market_override')
    storage?.removeItem?.('cta_country')
  } catch {
    // Ignore storage failures.
  }
  if (typeof document !== 'undefined') {
    document.cookie = 'courtia_market_override=;max-age=0;path=/;samesite=lax'
    document.cookie = 'cta_country=;max-age=0;path=/;samesite=lax'
  }
}

export function resolveMarketContext({
  geoCountry = null,
  accountMarket = null,
  accountOverride = null,
  storedOverride = null,
  queryMarket = null,
} = {}) {
  const explicit = [queryMarket, accountOverride, storedOverride].find(isValidMarket)
  if (explicit) {
    const market = normalizeMarket(explicit)
    const config = getMarketPricing(market)
    return { market, source: 'override', locale: config.locale, currency: config.currency, geoCountry }
  }

  if (isValidMarket(accountMarket)) {
    const market = normalizeMarket(accountMarket)
    const config = getMarketPricing(market)
    return { market, source: 'account', locale: config.locale, currency: config.currency, geoCountry }
  }

  const country = String(geoCountry || '').toUpperCase()
  const market = country === 'CH' ? 'CH' : 'FR'
  const config = getMarketPricing(market)
  return { market, source: country ? 'geo' : 'default', locale: config.locale, currency: config.currency, geoCountry: country || null }
}

export function parseMarketFromSearch(search = '') {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  return params.get('market') || params.get('country') || null
}

export function formatMarketPrice(amount, market = DEFAULT_MARKET) {
  if (amount === null || amount === undefined) return 'Sur devis'
  const normalized = normalizeMarket(market)
  const rounded = Math.round(Number(amount))
  const formatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return normalized === 'CH' ? `${formatted} CHF` : `${formatted} €`
}
