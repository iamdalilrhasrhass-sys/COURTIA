#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv, writeCsv } = require('./_csv')
const { LEAD_HEADERS } = require('./_schema')

const sourcePath = process.argv[2] || path.resolve(__dirname, '../exports/courtia_leads_sample.csv')
const outputPath = path.resolve(__dirname, '../data/manual_raw.csv')

function normalizeRow(row = {}) {
  const normalized = {}
  LEAD_HEADERS.forEach((header) => {
    normalized[header] = row[header] ?? ''
  })
  return normalized
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Fichier source introuvable: ${sourcePath}`)
  }

  const rows = readCsv(sourcePath)
  const normalizedRows = rows.map(normalizeRow)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  writeCsv(outputPath, normalizedRows, LEAD_HEADERS)

  console.log(JSON.stringify({
    source: sourcePath,
    destination: outputPath,
    importedRows: normalizedRows.length,
    success: true,
  }, null, 2))
}

main()
