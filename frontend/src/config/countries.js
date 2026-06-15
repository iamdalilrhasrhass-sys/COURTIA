export const COUNTRIES = {
  FR: {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    currency: 'EUR',
    currencySym: '€',
    setupFee: 299,
    monthlyFee: 199,
    badge: 'ORIAS · DDA · ACPR',
    supportsInsurers: false,
    plans: [
      { key: 'starter', label: 'Starter', price: 89, features: ['CRM basique', 'ARK limité', '50 clients max', 'DER auto-généré', 'Support email'] },
      { key: 'pro', label: 'Pro', price: 199, popular: true, features: ['CRM complet', 'ARK illimité', 'Clients illimités', 'Conformité DDA complète', 'WhatsApp intake', 'Rapport ACPR auto', 'Support prioritaire'] },
      { key: 'cabinet', label: 'Cabinet', price: null, priceLabel: 'Sur devis', features: ['Tout Pro', 'Multi-utilisateurs', 'API access', 'Onboarding dédié', 'SLA 99.9%'] },
    ],
  },
  CH: {
    code: 'CH',
    flag: '🇨🇭',
    name: 'Suisse',
    currency: 'CHF',
    currencySym: 'CHF',
    setupFee: 490,
    monthlyFee: 349,
    badge: 'FINMA · LSA · ARIF · LPD',
    supportsInsurers: false,
    plans: [
      { key: 'starter', label: 'Starter', price: 199, features: ['CRM basique', 'ARK limité', '50 clients max', 'Conformité LSA de base', 'Support FR/DE/IT'] },
      { key: 'pro', label: 'Pro', price: 349, popular: true, features: ['CRM complet', 'ARK illimité', 'Clients illimités', 'Conformité FINMA/LSA', 'Interface trilingue', 'WhatsApp intake', 'Support prioritaire'] },
      { key: 'cabinet', label: 'Cabinet', price: null, priceLabel: 'Sur devis', features: ['Tout Pro', 'Multi-utilisateurs', 'API access', 'Onboarding dédié', 'SLA 99.9%'] },
    ],
  },
  US: {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    currency: 'USD',
    currencySym: '$',
    supportsInsurers: true,
    segments: {
      broker: {
        label: 'Independent Brokers & Agencies',
        setupFee: 499,
        monthlyFee: 299,
        badge: 'NIPR · E&O · State DOI · NAIC',
        plans: [
          { key: 'starter', label: 'Starter', price: 149, features: ['Basic CRM', 'Limited ARK', '50 clients', 'NIPR sync', 'State license tracking'] },
          { key: 'pro', label: 'Pro', price: 299, popular: true, features: ['Full CRM', 'Unlimited ARK', 'Unlimited clients', 'NIPR auto-sync', 'E&O tracking', 'State license mgmt', 'Carrier appointments'] },
          { key: 'agency', label: 'Agency', price: null, priceLabel: 'Custom', features: ['All Pro', 'Multi-user', 'API access', 'Dedicated onboarding', '99.9% SLA'] },
        ],
      },
      insurer: {
        label: 'Carriers & Insurance Companies',
        setupFee: 999,
        monthlyFee: 799,
        badge: 'NAIC · NIPR · HIPAA · Surplus Lines',
        plans: [
          { key: 'growth', label: 'Growth', price: 799, features: ['Broker portal', 'Product catalog mgmt', 'Commission schedules', 'Basic analytics', 'NAIC reporting'] },
          { key: 'enterprise', label: 'Enterprise', price: 1999, popular: true, features: ['All Growth', 'Underwriting API', 'Rate/form filing assist', 'Multi-state management', 'ARK for underwriting', 'Custom integrations'] },
          { key: 'custom', label: 'Custom', price: null, priceLabel: 'Contact us', features: ['Full white-label', 'Dedicated infra', 'Custom SLA', 'Regulatory filing mgmt'] },
        ],
      },
    },
  },
}

export function formatCountryPrice(amount, countryCode) {
  const country = COUNTRIES[countryCode]
  if (!country || amount === null || amount === undefined) return null
  if (country.currencySym === '$') return `$${amount}`
  return `${amount} ${country.currencySym}`
}

export function countryOptions() {
  return Object.values(COUNTRIES).map((country) => ({
    code: country.code,
    label: `${country.flag} ${country.name}`,
    hasSegment: country.supportsInsurers,
  }))
}
