import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatMarketPrice,
  getMarketPricing,
  normalizeMarket,
  persistMarketOverride,
  resolveMarketContext,
} from './marketContext'

describe('frontend market context', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults Swiss visitors to CH unless a manual override exists', () => {
    expect(resolveMarketContext({ geoCountry: 'CH' }).market).toBe('CH')
    expect(resolveMarketContext({ geoCountry: 'CH', storedOverride: 'FR' }).market).toBe('FR')
  })

  it('defaults France and the rest of the world to FR', () => {
    expect(resolveMarketContext({ geoCountry: 'FR' }).market).toBe('FR')
    expect(resolveMarketContext({ geoCountry: 'DE' }).market).toBe('FR')
    expect(resolveMarketContext({}).market).toBe('FR')
  })

  it('uses the Swiss pricing grid with explicit setup fees', () => {
    const pricing = getMarketPricing('CH')

    expect(pricing.currency).toBe('CHF')
    expect(pricing.plans[0].name).toBe('Indépendant')
    expect(pricing.plans[0].monthly).toBe(199)
    expect(pricing.plans[0].setup).toBe(490)
    expect(pricing.plans[1].monthly).toBe(349)
    expect(pricing.plans[1].setup).toBe(990)
    expect(pricing.taxNote).toContain('TVA suisse 8,1')
  })

  it('formats Swiss francs and normalizes invalid market values', () => {
    expect(normalizeMarket('foo')).toBe('FR')
    expect(formatMarketPrice(1500, 'CH')).toBe("1'500 CHF")
    expect(formatMarketPrice(89, 'FR')).toBe('89 €')
  })

  it('persists manual overrides into the current market URL parameter', () => {
    const storage = new Map()
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: { href: 'https://courtiark.fr/pricing?market=CH&country=CH&foo=1' },
      history: { state: { page: 'pricing' }, replaceState },
    })
    vi.stubGlobal('document', { cookie: '' })

    persistMarketOverride('FR', {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    })

    expect(storage.get('courtia_market_override')).toBe('FR')
    expect(storage.get('cta_country')).toBe('FR')
    expect(replaceState).toHaveBeenCalledWith(
      { page: 'pricing' },
      '',
      'https://courtiark.fr/pricing?market=FR&foo=1'
    )
  })
})
