#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv, writeCsv } = require('./_csv')
const { LEAD_HEADERS } = require('./_schema')

const inputPath = process.argv[2] || path.resolve(__dirname, '../exports/courtia_leads_scored.csv')
const outputPath = path.resolve(__dirname, '../data/leads_deduped.csv')

function keyForLead(lead = {}) {
  const email = String(lead.email || '').trim().toLowerCase()
  if (email) return `email:${email}`

  const company = String(lead.company_name || '').trim().toLowerCase()
  const city = String(lead.city || '').trim().toLowerCase()
  return `company:${company}|city:${city}`
}

function pickBestLead(current, incoming) {
  const currentScore = Number.parseInt(current.lead_score, 10) || 0
  const incomingScore = Number.parseInt(incoming.lead_score, 10) || 0
  return incomingScore > currentScore ? incoming : current
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input introuvable: ${inputPath}`)
  }

  const rows = readCsv(inputPath)
  const byKey = new Map()
  let duplicates = 0

  rows.forEach((lead) => {
    const key = keyForLead(lead)
    if (!byKey.has(key)) {
      byKey.set(key, lead)
      return
    }

    duplicates += 1
    const best = pickBestLead(byKey.get(key), lead)
    byKey.set(key, best)
  })

  const deduped = Array.from(byKey.values())
  writeCsv(outputPath, deduped, LEAD_HEADERS)

  console.log(JSON.stringify({
    inputPath,
    outputPath,
    before: rows.length,
    after: deduped.length,
    duplicatesRemoved: duplicates,
    success: true,
  }, null, 2))
}

main()
