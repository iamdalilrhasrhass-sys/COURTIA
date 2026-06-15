const COUNTRIES = {
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currency: 'EUR',
    currencySym: '€',
    locale: 'fr-FR',
    setupFee: 299,
    monthlyFee: 199,
    closer: {
      setupPct: 0.4,
      mrrPct: 0.15,
      mrrMonths: 12,
      legalType: 'mandataire_commercial',
      legalNote: 'Contrat agent commercial — Loi Doubin. Commission soumise TVA 20%.',
    },
    plans: [
      { key: 'starter', label: 'Starter', price: 89, features: ['CRM basique', 'ARK limité', '50 clients', 'DER auto'] },
      { key: 'pro', label: 'Pro', price: 199, popular: true, features: ['CRM complet', 'ARK illimité', 'Clients illimités', 'Conformité DDA', 'WhatsApp intake', 'Rapport ACPR'] },
      { key: 'cabinet', label: 'Cabinet', price: null, priceLabel: 'Sur devis', features: ['Tout Pro', 'Multi-utilisateurs', 'API access', 'Onboarding dédié', 'SLA 99.9%'] },
    ],
    compliance: ['DDA', 'ORIAS', 'ACPR', 'RGPD'],
    supportsInsurers: false,
    churnGuardMonths: 3,
  },
  CH: {
    code: 'CH',
    name: 'Suisse',
    flag: '🇨🇭',
    currency: 'CHF',
    currencySym: 'CHF',
    locale: 'fr-CH',
    setupFee: 490,
    monthlyFee: 349,
    closer: {
      setupPct: 0.4,
      mrrPct: 0.15,
      mrrMonths: 12,
      legalType: 'agent_commercial',
      legalNote: 'Contrat agent indépendant droit suisse CO art. 418a. Pas de TVA < CHF 100k/an.',
    },
    plans: [
      { key: 'starter', label: 'Starter', price: 199, features: ['CRM basique', 'ARK limité', '50 clients', 'Conformité LSA'] },
      { key: 'pro', label: 'Pro', price: 349, popular: true, features: ['CRM complet', 'ARK illimité', 'Clients illimités', 'Conformité FINMA/LSA', 'Trilingue FR/DE/IT', 'WhatsApp intake'] },
      { key: 'cabinet', label: 'Cabinet', price: null, priceLabel: 'Sur devis', features: ['Tout Pro', 'Multi-utilisateurs', 'API access', 'Onboarding dédié', 'SLA 99.9%'] },
    ],
    compliance: ['FINMA', 'LSA', 'ARIF', 'LPD'],
    languages: ['fr', 'de', 'it'],
    supportsInsurers: false,
    churnGuardMonths: 3,
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySym: '$',
    locale: 'en-US',
    setupFee: 499,
    monthlyFee: 299,
    closer: {
      setupPct: 0.4,
      mrrPct: 0.15,
      mrrMonths: 12,
      legalType: '1099_contractor',
      legalNote: 'Independent contractor agreement. 1099-NEC issued >$600/year. No withholding.',
    },
    segments: {
      broker: {
        label: 'Independent Brokers & Agencies',
        setupFee: 499,
        monthlyFee: 299,
        plans: [
          { key: 'starter', label: 'Starter', price: 149, features: ['CRM basics', 'Limited ARK', '50 clients', 'NIPR sync'] },
          { key: 'pro', label: 'Pro', price: 299, popular: true, features: ['Full CRM', 'Unlimited ARK', 'Unlimited clients', 'NIPR auto-sync', 'E&O tracking', 'State license mgmt', 'Carrier appointments'] },
          { key: 'agency', label: 'Agency', price: null, priceLabel: 'Custom', features: ['All Pro', 'Multi-user', 'API access', 'Dedicated onboarding', '99.9% SLA'] },
        ],
      },
      insurer: {
        label: 'Carriers & Insurers',
        setupFee: 999,
        monthlyFee: 799,
        plans: [
          { key: 'growth', label: 'Growth', price: 799, features: ['Broker portal', 'Product catalog', 'Commission mgmt', 'Basic analytics'] },
          { key: 'enterprise', label: 'Enterprise', price: 1999, popular: true, features: ['All Growth', 'Underwriting API', 'Rate/form filing assist', 'Multi-state', 'ARK for underwriting', 'Custom integrations'] },
          { key: 'custom', label: 'Custom', price: null, priceLabel: 'Contact us', features: ['Full white-label', 'Dedicated infra', 'Custom SLA', 'Regulatory filing mgmt'] },
        ],
      },
    },
    compliance: ['NAIC', 'NIPR', 'E&O', 'State DOI', 'HIPAA'],
    supportsInsurers: true,
    churnGuardMonths: 3,
  },
}

function normalizeCountryCode(countryCode) {
  return String(countryCode || '').trim().toUpperCase()
}

function getCountryConfig(countryCode) {
  return COUNTRIES[normalizeCountryCode(countryCode)] || null
}

function formatPrice(amount, countryCode) {
  const country = getCountryConfig(countryCode)
  if (!country || amount === null || amount === undefined) return amount

  return new Intl.NumberFormat(country.locale, {
    style: 'currency',
    currency: country.currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

module.exports = {
  COUNTRIES,
  formatPrice,
  getCountryConfig,
  normalizeCountryCode,
}
