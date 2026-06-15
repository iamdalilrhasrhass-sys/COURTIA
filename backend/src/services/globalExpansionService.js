const crypto = require('crypto')
const { COUNTRIES, getCountryConfig, normalizeCountryCode } = require('../config/countries')

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

function assertCountry(countryCode) {
  const country = getCountryConfig(countryCode)
  if (!country) {
    throw new Error(`Pays inconnu: ${countryCode}`)
  }
  return country
}

function normalizeClientType(countryCode, clientType = 'broker') {
  const code = normalizeCountryCode(countryCode)
  if (code !== 'US') return 'broker'
  return clientType === 'insurer' ? 'insurer' : 'broker'
}

function getPricingSnapshot(countryCode, clientType = 'broker') {
  const code = normalizeCountryCode(countryCode)
  const country = assertCountry(code)
  const normalizedType = normalizeClientType(code, clientType)
  const segment = code === 'US' ? country.segments[normalizedType] : null

  return {
    countryCode: code,
    clientType: normalizedType,
    setupFee: segment?.setupFee ?? country.setupFee,
    monthlyFee: segment?.monthlyFee ?? country.monthlyFee,
    currency: country.currency,
    currencySym: country.currencySym,
    churnGuardMonths: country.churnGuardMonths || 3,
  }
}

function calculateCloserCommission(countryCode, pricing = null) {
  const country = assertCountry(countryCode)
  const snapshot = pricing || getPricingSnapshot(country.code)
  const setupCommission = roundMoney(snapshot.setupFee * country.closer.setupPct)
  const mrrCommission = roundMoney(snapshot.monthlyFee * country.closer.mrrPct)
  const mrrMonths = country.closer.mrrMonths

  return {
    setupCommission,
    mrrCommission,
    mrrMonths,
    totalPotential: roundMoney(setupCommission + mrrCommission * mrrMonths),
    currency: country.currency,
    currencySym: country.currencySym,
  }
}

function addMonthsToFirstDay(date, offset) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1))
  return next.toISOString().slice(0, 10)
}

function buildCommissionSchedule({ closerId, dealId, countryCode, clientType = 'broker', signedAt = new Date() }) {
  const snapshot = getPricingSnapshot(countryCode, clientType)
  const commission = calculateCloserCommission(countryCode, snapshot)
  const start = new Date(signedAt)

  const rows = [{
    closer_id: closerId,
    deal_id: dealId,
    commission_type: 'setup',
    amount: commission.setupCommission,
    currency: snapshot.currency,
    period_month: null,
    status: 'pending',
  }]

  for (let index = 1; index <= commission.mrrMonths; index += 1) {
    rows.push({
      closer_id: closerId,
      deal_id: dealId,
      commission_type: 'mrr',
      amount: commission.mrrCommission,
      currency: snapshot.currency,
      period_month: addMonthsToFirstDay(start, index),
      status: 'pending',
    })
  }

  return rows
}

function shouldClawBackSetup({ signedAt, churnedAt = new Date(), guardMonths = 3 }) {
  const signed = new Date(signedAt)
  const churned = new Date(churnedAt)
  const guardEnd = new Date(signed)
  guardEnd.setUTCMonth(guardEnd.getUTCMonth() + Number(guardMonths || 3))
  return churned < guardEnd
}

function buildCommissionPreview(countryCode, clientType = 'broker') {
  const country = assertCountry(countryCode)
  const snapshot = getPricingSnapshot(country.code, clientType)
  const commission = calculateCloserCommission(country.code, snapshot)

  return {
    country: country.name,
    countryCode: country.code,
    clientType: snapshot.clientType,
    setupFee: snapshot.setupFee,
    monthlyFee: snapshot.monthlyFee,
    currency: snapshot.currency,
    currencySym: snapshot.currencySym,
    ...commission,
    example: {
      deals5: { total: roundMoney(commission.totalPotential * 5), label: '5 clients signés' },
      deals10: { total: roundMoney(commission.totalPotential * 10), label: '10 clients signés' },
      deals20: { total: roundMoney(commission.totalPotential * 20), label: '20 clients signés' },
    },
  }
}

function generateReferralCode(fullName, randomBytes = crypto.randomBytes) {
  const base = String(fullName || 'closer')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8) || 'closer'
  const suffix = randomBytes(3).toString('hex').toUpperCase()
  return `${base}-${suffix}`
}

module.exports = {
  COUNTRIES,
  buildCommissionPreview,
  buildCommissionSchedule,
  calculateCloserCommission,
  generateReferralCode,
  getPricingSnapshot,
  normalizeClientType,
  roundMoney,
  shouldClawBackSetup,
}
