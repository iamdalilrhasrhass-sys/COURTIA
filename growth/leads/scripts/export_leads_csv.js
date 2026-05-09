#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { readCsv, writeCsv } = require('./_csv')
const { LEAD_HEADERS } = require('./_schema')

const inputPath = process.argv[2] || path.resolve(__dirname, '../data/leads_deduped.csv')
const scoredExportPath = path.resolve(__dirname, '../exports/courtia_leads_scored.csv')
const priorityAPath = path.resolve(__dirname, '../exports/courtia_leads_priority_A.csv')

function priorityFromScore(scoreValue) {
  const score = Number.parseInt(scoreValue, 10) || 0
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'LOW'
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input introuvable: ${inputPath}`)
  }

  const rows = readCsv(inputPath).map((lead) => ({
    ...lead,
    notes: [
      String(lead.notes || '').trim(),
      `priority=${priorityFromScore(lead.lead_score)}`,
    ].filter(Boolean).join(' ; '),
  }))

  const priorityA = rows.filter((lead) => priorityFromScore(lead.lead_score) === 'A')

  writeCsv(scoredExportPath, rows, LEAD_HEADERS)
  writeCsv(priorityAPath, priorityA, LEAD_HEADERS)

  console.log(JSON.stringify({
    inputPath,
    scoredExportPath,
    priorityAPath,
    totalRows: rows.length,
    priorityARows: priorityA.length,
    success: true,
  }, null, 2))
}

main()
