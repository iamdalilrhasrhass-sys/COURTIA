#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv, writeCsv } = require('./_csv')
const { LEAD_HEADERS } = require('./_schema')

const inputPath = process.argv[2] || path.resolve(__dirname, '../data/leads_normalized.csv')
const outputCsvPath = path.resolve(__dirname, '../exports/courtia_leads_scored.csv')
const outputJsonPath = path.resolve(__dirname, '../data/leads_scored.json')

const FREE_DOMAINS = ['gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.com', 'outlook.com', 'orange.fr', 'free.fr']
const PRIORITY_REGIONS = ['ile-de-france', 'auvergne-rhone-alpes', 'provence-alpes-cote d\'azur', 'hauts-de-france', 'nouvelle-aquitaine', 'occitanie']
const SPECIALTY_KEYWORDS = ['iard', 'sante', 'prevoyance', 'auto', 'pro', 'entreprise', 'rc', 'flotte']

function clean(value) {
  return String(value || '').trim()
}

function hasProfessionalEmail(email = '') {
  const normalized = clean(email).toLowerCase()
  if (!normalized.includes('@')) return false
  const domain = normalized.split('@')[1] || ''
  return domain && !FREE_DOMAINS.includes(domain)
}

function parseTeamSize(value = '') {
  const normalized = clean(value)
  if (!normalized) return 0
  if (normalized.includes('+')) return Number.parseInt(normalized, 10) || 20
  if (normalized.includes('-')) {
    const [a, b] = normalized.split('-').map((part) => Number.parseInt(part, 10) || 0)
    return Math.max(a, b)
  }
  return Number.parseInt(normalized, 10) || 0
}

function scoreLead(lead = {}) {
  const reasons = []
  let score = 0

  const companyName = clean(lead.company_name).toLowerCase()
  const role = clean(lead.role).toLowerCase()
  const specialties = clean(lead.specialties).toLowerCase()
  const region = clean(lead.region).toLowerCase()
  const teamSize = parseTeamSize(lead.company_size_estimate)
  const hasWebsite = clean(lead.website) && clean(lead.website) !== 'unknown'

  if (companyName.includes('courtage') || companyName.includes('cabinet') || ['dirigeant', 'gerant', 'gérant', 'associe', 'associé', 'fondateur'].some((word) => role.includes(word))) {
    score += 20
    reasons.push('Cabinet courtage identifié')
  }

  if (hasWebsite) {
    score += 15
    reasons.push('Site web professionnel disponible')
  }

  if (hasProfessionalEmail(lead.email)) {
    score += 15
    reasons.push('Email professionnel public')
  }

  if (SPECIALTY_KEYWORDS.some((keyword) => specialties.includes(keyword))) {
    score += 10
    reasons.push('Spécialité assurance alignée')
  }

  if (teamSize >= 2) {
    score += 10
    reasons.push('Cabinet structuré (2+ collaborateurs estimés)')
  }

  if (hasWebsite && clean(lead.source_url)) {
    score += 10
    reasons.push('Présence digitale active visible')
  }

  if (teamSize >= 6 || SPECIALTY_KEYWORDS.some((keyword) => specialties.includes(keyword))) {
    score += 10
    reasons.push('Potentiel portefeuille significatif')
  }

  if (PRIORITY_REGIONS.includes(region)) {
    score += 10
    reasons.push('Région prioritaire dense')
  }

  if (score > 100) score = 100

  let priority = 'C'
  if (score >= 80) priority = 'A'
  else if (score >= 60) priority = 'B'

  let recommendedOffer = 'Starter'
  if (score >= 60) recommendedOffer = 'Pro'
  if (teamSize >= 20) recommendedOffer = 'Cabinet/Premium'

  return {
    score,
    priority,
    reasons,
    recommendedOffer,
  }
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input introuvable: ${inputPath}`)
  }

  const rows = readCsv(inputPath)
  const scoredRows = rows.map((lead) => {
    const scored = scoreLead(lead)

    return {
      ...lead,
      lead_score: scored.score,
      fit_reason: scored.reasons.join(' | ') || 'Signal faible',
      recommended_offer: scored.recommendedOffer,
      notes: [clean(lead.notes), `priority=${scored.priority}`].filter(Boolean).join(' ; '),
    }
  })

  writeCsv(outputCsvPath, scoredRows, LEAD_HEADERS)
  fs.writeFileSync(outputJsonPath, JSON.stringify(scoredRows, null, 2), 'utf8')

  const distribution = scoredRows.reduce((acc, row) => {
    const score = Number.parseInt(row.lead_score, 10) || 0
    if (score >= 80) acc.A += 1
    else if (score >= 60) acc.B += 1
    else if (score >= 40) acc.C += 1
    else acc.low += 1
    return acc
  }, { A: 0, B: 0, C: 0, low: 0 })

  console.log(JSON.stringify({
    inputPath,
    outputCsvPath,
    outputJsonPath,
    rows: scoredRows.length,
    distribution,
    success: true,
  }, null, 2))
}

main()
