/**
 * Génère un PDF de comparateur brandé Aurora-Bubble C
 */
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

function fmtEur(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function buildComparatorPdf({ outputPath, quotes, summary, clientName = '', cabinetName = 'COURTIA' }) {
  ensureDir(path.dirname(outputPath))
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const stream = fs.createWriteStream(outputPath)
  doc.pipe(stream)

  // ── Header Aurora
  doc.rect(0, 0, doc.page.width, 100).fill('#080818')
  doc.circle(60, 50, 30).fill('#5B4DF5')
  doc.circle(80, 40, 12).fill('#8B5CF6')
  doc.circle(45, 55, 8).fill('#22D3EE')
  doc.fillColor('#FFFFFF').fontSize(22).text(cabinetName, 110, 32)
  doc.fontSize(11).fillColor('#9CA3AF').text('Comparateur intelligent — Aurora-Bubble C', 110, 60)
  doc.fontSize(9).fillColor('#6B7280').text(new Date().toLocaleString('fr-FR'), 110, 76)

  // ── Sous-header
  doc.fillColor('#000').fontSize(16).text(`Comparatif ${summary.produit} — niveau ${summary.level}`, 40, 120)
  if (clientName) doc.fontSize(11).fillColor('#444').text(`Pour : ${clientName}`, 40, 142)

  // ── Recommandation ARK
  doc.roundedRect(40, 165, doc.page.width - 80, 60, 8).fillAndStroke('#F5F2FF', '#8B5CF6')
  doc.fillColor('#5B4DF5').fontSize(11).text('⚡ ARK recommande', 50, 175)
  doc.fillColor('#1F2937').fontSize(10).text(summary.ark_explanation, 50, 192, { width: doc.page.width - 100 })

  // ── Synthèse
  doc.fillColor('#000').fontSize(11).text(`Moins cher : ${summary.cheapest_provider} — ${fmtEur(summary.cheapest_eur)}`, 40, 245)
  doc.text(`Plus cher : ${fmtEur(summary.most_expensive_eur)}`, 40, 262)
  doc.text(`Économie max : ${fmtEur(summary.economy_eur)} / an`, 40, 279)

  // ── Tableau quotes
  let y = 310
  const colW = [80, 60, 60, 50, 130, 70]
  const headers = ['Compagnie', 'Prime/an', 'Prime/mois', 'Franchise', 'Garanties', 'Score ARK']

  doc.rect(40, y, doc.page.width - 80, 22).fill('#080818')
  doc.fillColor('#FFFFFF').fontSize(9)
  let x = 45
  headers.forEach((h, i) => { doc.text(h, x, y + 6, { width: colW[i] - 4 }); x += colW[i] })
  y += 22

  quotes.forEach((q, idx) => {
    if (y > 770) { doc.addPage(); y = 60 }
    if (idx % 2 === 0) doc.rect(40, y, doc.page.width - 80, 50).fill('#F9FAFB')
    doc.fillColor('#000').fontSize(9)
    x = 45
    doc.text(q.provider, x, y + 6, { width: colW[0] - 4 }); x += colW[0]
    doc.text(fmtEur(q.prime_annuelle_eur), x, y + 6, { width: colW[1] - 4 }); x += colW[1]
    doc.text(fmtEur(q.prime_mensuelle_eur), x, y + 6, { width: colW[2] - 4 }); x += colW[2]
    doc.text(fmtEur(q.franchise_eur), x, y + 6, { width: colW[3] - 4 }); x += colW[3]
    doc.fontSize(7).text((q.garanties || []).join(', '), x, y + 6, { width: colW[4] - 4 }); x += colW[4]
    doc.fontSize(9).text(`${q.ark_score}/100`, x, y + 6, { width: colW[5] - 4 })

    // Badges
    if (q.badges && q.badges.length) {
      doc.fontSize(7).fillColor('#5B4DF5').text(q.badges.map(b => b.label).join(' · '), 45, y + 30, { width: doc.page.width - 90 })
    }
    y += 50
  })

  // ── Footer
  doc.fontSize(8).fillColor('#9CA3AF').text(
    `${cabinetName} — Comparatif établi le ${new Date().toLocaleDateString('fr-FR')}. Tarifs indicatifs susceptibles d'évoluer. Document à usage informatif.`,
    40, 800, { width: doc.page.width - 80, align: 'center' }
  )

  doc.end()
  return new Promise((resolve) => stream.on('finish', () => resolve(outputPath)))
}

module.exports = { buildComparatorPdf }
