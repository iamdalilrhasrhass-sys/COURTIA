#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv, writeCsv } = require('./_csv')
const { LEAD_HEADERS } = require('./_schema')

const inputPath = process.argv[2] || path.resolve(__dirname, '../data/manual_raw.csv')
const outputCsvPath = path.resolve(__dirname, '../data/leads_normalized.csv')
const outputJsonPath = path.resolve(__dirname, '../data/leads_normalized.json')

function clean(value) {
  return String(value || '').trim()
}

function cleanBoolean(value) {
  const lowered = clean(value).toLowerCase()
  if (lowered === 'true' || lowered === '1' || lowered === 'yes') return 'true'
  if (lowered === 'false' || lowered === '0' || lowered === 'no') return 'false'
  return 'false'
}

function normalizeLead(raw = {}) {
  const lead = {}

  LEAD_HEADERS.forEach((header) => {
    lead[header] = clean(raw[header])
  })

  lead.company_name = lead.company_name || 'unknown'
  lead.contact_name = lead.contact_name || 'unknown'
  lead.role = lead.role || 'unknown'
  lead.email = lead.email.toLowerCase()
  lead.website = lead.website.toLowerCase()
  lead.source_name = lead.source_name || 'unknown'
  lead.source_date = lead.source_date || new Date().toISOString().slice(0, 10)
  lead.status = lead.status || 'a_contacter'
  lead.opt_out = cleanBoolean(lead.opt_out)
  lead.lead_score = Number.parseInt(lead.lead_score, 10) || 0
  lead.recommended_offer = lead.recommended_offer || 'Starter'

  return lead
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input introuvable: ${inputPath}`)
  }

  const rows = readCsv(inputPath)
  const normalized = rows.map(normalizeLead)

  writeCsv(outputCsvPath, normalized, LEAD_HEADERS)
  fs.writeFileSync(outputJsonPath, JSON.stringify(normalized, null, 2), 'utf8')

  console.log(JSON.stringify({
    inputPath,
    outputCsvPath,
    outputJsonPath,
    rows: normalized.length,
    success: true,
  }, null, 2))
}

main()
