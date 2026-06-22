const VALID_MARKETS = new Set(['FR', 'CH'])
const DEFAULT_MARKET = 'FR'

const MARKET_CONFIG = {
  FR: {
    market: 'FR',
    country: 'FR',
    label: 'France',
    locale: 'fr-FR',
    currency: 'EUR',
    currencySymbol: '€',
    compliance: ['DDA', 'ORIAS', 'ACPR', 'RGPD'],
    taxLabel: 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.',
    pricing: {
      starter: {
        code: 'starter',
        displayName: 'Starter',
        monthlyAmountCents: 8900,
        setupAmountCents: 0,
        currency: 'EUR',
        highlighted: false,
      },
      pro: {
        code: 'pro',
        displayName: 'Pro',
        monthlyAmountCents: 15900,
        setupAmountCents: 0,
        currency: 'EUR',
        highlighted: true,
      },
      premium: {
        code: 'premium',
        displayName: 'Cabinet',
        monthlyAmountCents: null,
        setupAmountCents: 0,
        currency: 'EUR',
        highlighted: false,
      },
    },
  },
  CH: {
    market: 'CH',
    country: 'CH',
    label: 'Suisse',
    locale: 'fr-CH',
    currency: 'CHF',
    currencySymbol: 'CHF',
    compliance: ['LSA', 'FINMA', 'nLPD'],
    taxLabel: 'Prix HT. TVA suisse 8,1 % en sus.',
    pricing: {
      starter: {
        code: 'starter',
        displayName: 'Indépendant',
        monthlyAmountCents: 19900,
        setupAmountCents: 49000,
        setupLabel: 'Frais d’inscription Indépendant',
        currency: 'CHF',
        highlighted: false,
      },
      pro: {
        code: 'pro',
        displayName: 'Cabinet',
        monthlyAmountCents: 34900,
        setupAmountCents: 99000,
        setupLabel: 'Frais d’inscription Cabinet',
        currency: 'CHF',
        highlighted: true,
      },
      premium: {
        code: 'premium',
        displayName: 'Sur-Mesure / Fiduciaire',
        monthlyAmountCents: null,
        setupAmountCents: 150000,
        setupLabel: 'Frais d’inscription Sur-Mesure / Fiduciaire',
        currency: 'CHF',
        highlighted: false,
      },
    },
  },
}

function normalizeMarket(value) {
  const market = String(value || '').trim().toUpperCase()
  return VALID_MARKETS.has(market) ? market : DEFAULT_MARKET
}

function isExplicitMarket(value) {
  const market = String(value || '').trim().toUpperCase()
  return VALID_MARKETS.has(market)
}

function getMarketConfig(value = DEFAULT_MARKET) {
  return MARKET_CONFIG[normalizeMarket(value)]
}

function getHeader(headers = {}, name) {
  const target = String(name).toLowerCase()
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === target) return Array.isArray(value) ? value[0] : value
  }
  return null
}

function detectCountryFromHeaders(headers = {}) {
  const country = (
    getHeader(headers, 'cf-ipcountry') ||
    getHeader(headers, 'x-vercel-ip-country') ||
    getHeader(headers, 'cloudfront-viewer-country') ||
    ''
  ).trim().toUpperCase()

  return /^[A-Z]{2}$/.test(country) ? country : null
}

function parseCookieHeader(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const index = item.indexOf('=')
      if (index === -1) return acc
      const key = item.slice(0, index)
      const value = decodeURIComponent(item.slice(index + 1))
      acc[key] = value
      return acc
    }, {})
}

function readMarketOverrideFromCookie(cookieHeader = '') {
  const cookies = parseCookieHeader(cookieHeader)
  return cookies.market_override || cookies.cta_country || cookies.courtia_market_override || null
}

function resolveMarketContext({
  headers = {},
  accountMarket = null,
  marketOverride = null,
  cookieMarketOverride = null,
  queryMarket = null,
} = {}) {
  const headerCountry = detectCountryFromHeaders(headers)
  const cookieOverride = cookieMarketOverride || readMarketOverrideFromCookie(getHeader(headers, 'cookie') || '')
  const explicit = [queryMarket, marketOverride, cookieOverride].find(isExplicitMarket)

  if (explicit) {
    const market = normalizeMarket(explicit)
    const config = getMarketConfig(market)
    return {
      market,
      country: headerCountry || config.country,
      locale: config.locale,
      currency: config.currency,
      source: 'override',
      geoCountry: headerCountry,
    }
  }

  if (isExplicitMarket(accountMarket)) {
    const market = normalizeMarket(accountMarket)
    const config = getMarketConfig(market)
    return {
      market,
      country: headerCountry || config.country,
      locale: config.locale,
      currency: config.currency,
      source: 'account',
      geoCountry: headerCountry,
    }
  }

  const market = headerCountry === 'CH' ? 'CH' : 'FR'
  const config = getMarketConfig(market)
  return {
    market,
    country: headerCountry || config.country,
    locale: config.locale,
    currency: config.currency,
    source: headerCountry ? 'geo' : 'default',
    geoCountry: headerCountry,
  }
}

function centsToMajor(amountCents) {
  if (amountCents === null || amountCents === undefined) return null
  return Math.round(Number(amountCents)) / 100
}

module.exports = {
  DEFAULT_MARKET,
  MARKET_CONFIG,
  VALID_MARKETS,
  centsToMajor,
  detectCountryFromHeaders,
  getMarketConfig,
  normalizeMarket,
  parseCookieHeader,
  readMarketOverrideFromCookie,
  resolveMarketContext,
}
