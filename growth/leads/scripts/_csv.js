const fs = require('fs')

function splitCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

function parseCsv(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = splitCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row = {}

    headers.forEach((header, index) => {
      row[header] = values[index] === undefined ? '' : values[index]
    })

    return row
  })
}

function toCsvValue(value) {
  if (value == null) return ''
  const text = String(value)
  if (!text.includes(',') && !text.includes('"') && !text.includes('\n')) return text
  return `"${text.replace(/"/g, '""')}"`
}

function formatCsv(rows, headers) {
  const out = [headers.join(',')]
  rows.forEach((row) => {
    out.push(headers.map((header) => toCsvValue(row[header])).join(','))
  })
  return `${out.join('\n')}\n`
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return parseCsv(content)
}

function writeCsv(filePath, rows, headers) {
  fs.writeFileSync(filePath, formatCsv(rows, headers), 'utf8')
}

module.exports = {
  formatCsv,
  parseCsv,
  readCsv,
  splitCsvLine,
  writeCsv,
}
