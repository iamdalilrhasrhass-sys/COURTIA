#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv } = require('./_csv')

const inputPath = process.argv[2] || path.resolve(__dirname, '../exports/courtia_leads_scored.csv')

function isBooleanString(value = '') {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'true' || normalized === 'false'
}

function looksPersonalEmail(email = '') {
  const value = String(email || '').toLowerCase()
  return value.includes('@gmail.') || value.includes('@yahoo.') || value.includes('@hotmail.') || value.includes('@outlook.')
}

function validateRow(row = {}, index = 0) {
  const issues = []

  if (!row.source_url) issues.push('source_url manquant')
  if (!row.source_name) issues.push('source_name manquant')
  if (!row.source_date) issues.push('source_date manquant')
  if (!isBooleanString(row.opt_out)) issues.push('opt_out doit être true/false')
  if (!row.status) issues.push('status manquant')
  if (!row.company_name) issues.push('company_name manquant')
  if (looksPersonalEmail(row.email)) issues.push('email potentiellement personnel (à éviter)')

  return {
    row: index + 1,
    email: row.email || '',
    issues,
  }
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input introuvable: ${inputPath}`)
  }

  const rows = readCsv(inputPath)
  const checks = rows.map(validateRow)
  const withIssues = checks.filter((check) => check.issues.length > 0)

  console.log(JSON.stringify({
    inputPath,
    totalRows: rows.length,
    rowsWithIssues: withIssues.length,
    issues: withIssues,
    success: withIssues.length === 0,
  }, null, 2))

  if (withIssues.length > 0) {
    process.exitCode = 1
  }
}

main()
