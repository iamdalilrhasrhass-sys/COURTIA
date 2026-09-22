import { MARKET_META, PLANS_BY_MARKET, formatAmountHt, getMarketReference } from './plansReference'

export const MARKET_CODES = ['FR', 'CH']
export const DEFAULT_MARKET = 'FR'

export const MARKET_OPTIONS = [
  { code: 'FR', flag: '🇫🇷', label: 'France', shortLabel: 'FR' },
  { code: 'CH', flag: '🇨🇭', label: 'Suisse', shortLabel: 'CH' },
]

/**
 * Grille publique par marché. Les MONTANTS et les CODES viennent tous de
 * market/plansReference.js (référentiel unique des offres publiques, aux codes
 * du backend) : cet objet n'ajoute que la devise de facturation du marché, seule
 * lecture utilisée par les écrans privés.
 */
export const MARKET_PRICING = {
  FR: { ...MARKET_META.FR, currency: 'EUR', plans: PLANS_BY_MARKET.FR },
  CH: { ...MARKET_META.CH, currency: 'CHF', plans: PLANS_BY_MARKET.CH },
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
  // Un montant absent n'est PAS zéro : c'est une offre sur devis (libellé unique
  // du référentiel public). Le formatage lui-même vient aussi de ce référentiel,
  // pour qu'aucune règle de devise ne soit recopiée ici.
  return formatAmountHt(amount, getMarketReference(normalizeMarket(market)).currencySymbol)
}
