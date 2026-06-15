const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { calculateCloserCommission, getPricingSnapshot } = require('./globalExpansionService')

const CONTRACT_TEMPLATES = {
  FR: {
    title: 'CONTRAT DE MANDAT COMMERCIAL',
    subtitle: 'Agent commercial indépendant — Courtia',
    signatureLabel: 'Le Mandataire',
    sections: [
      ['Article 1 — Parties', (closer) => `La société COURTIARK, ci-après désignée le Mandant, confie à ${closer.full_name}, ci-après désigné le Mandataire Commercial, une mission de prospection et de conclusion d'abonnements Courtia auprès de courtiers en assurance professionnels.`],
      ['Article 2 — Objet', () => "Le présent mandat porte sur la présentation de Courtia, la qualification des prospects, l'organisation des démonstrations et l'accompagnement jusqu'à la signature commerciale."],
      ['Article 3 — Rémunération', () => "Le Mandataire perçoit 40% du setup fee encaissé et 15% du revenu mensuel récurrent pendant 12 mois consécutifs pour chaque client signé et actif."],
      ['Article 4 — Churn guard', () => "Si le client résilie dans les trois premiers mois, la commission setup est récupérée par compensation sur les commissions futures."],
      ['Article 5 — Indépendance', () => "Le Mandataire agit en toute indépendance, sans lien de subordination, et reste responsable de ses obligations sociales, fiscales et professionnelles."],
    ],
  },
  CH: {
    title: "CONTRAT D'AGENT INDÉPENDANT",
    subtitle: 'Code des obligations suisse — art. 418a et ss.',
    signatureLabel: "L'Agent",
    sections: [
      ['Art. 1 — Parties', (closer) => `COURTIARK mandate ${closer.full_name} comme agent indépendant pour la prospection commerciale de Courtia en Suisse.`],
      ['Art. 2 — Mission', () => "L'Agent prospecte les courtiers suisses, présente Courtia et accompagne les signatures dans le respect des exigences LSA, FINMA et des règles applicables à son canton."],
      ['Art. 3 — Rémunération', () => "La rémunération est composée de 40% du setup fee et de 15% de l'abonnement mensuel pendant 12 mois sur les clients signés."],
      ['Art. 4 — Churn guard', () => "En cas de résiliation client avant trois mois, la commission setup est récupérée par compensation."],
      ['Art. 5 — Droit applicable', () => 'Le contrat est régi par le droit suisse. Les parties privilégient une résolution amiable avant toute procédure.'],
    ],
  },
  US: {
    title: 'INDEPENDENT CONTRACTOR AGREEMENT',
    subtitle: '1099 Sales Representative — Courtia Platform',
    signatureLabel: 'Contractor',
    sections: [
      ['1. Parties', (closer) => `This agreement is entered into between COURTIARK and ${closer.full_name}, acting as an independent contractor.`],
      ['2. Scope of work', (closer) => `Contractor prospects, presents, and closes Courtia subscription agreements. Segment focus: ${closer.us_segment || 'broker'}.`],
      ['3. Compensation', () => 'Contractor earns 40% of the paid setup fee and 15% of monthly recurring revenue for 12 consecutive months for each signed active client.'],
      ['4. Independent contractor status', () => 'Contractor is not an employee. Contractor is responsible for federal, state, and local taxes. A 1099-NEC may be issued when applicable.'],
      ['5. Churn guard', () => 'If a client cancels within three months of activation, setup commission is recovered through offset against future commissions.'],
      ['6. Governing law', () => 'This agreement is governed by Delaware law unless mandatory local rules require otherwise.'],
    ],
  },
}

function contractOutputDir() {
  return path.join(__dirname, '..', '..', 'contracts')
}

function writeSection(doc, heading, body) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(heading)
  doc.moveDown(0.35)
  doc.fontSize(10).font('Helvetica').fillColor('#374151').text(body, { lineGap: 4 })
  doc.moveDown(1)
}

async function generateCloserContract(closer, countryConfig) {
  const template = CONTRACT_TEMPLATES[closer.country_code]
  if (!template) throw new Error(`No contract template for ${closer.country_code}`)

  const outputDir = contractOutputDir()
  fs.mkdirSync(outputDir, { recursive: true })

  const safeCode = String(closer.referral_code || closer.id).replace(/[^a-z0-9-]/gi, '_')
  const filename = `contrat_closer_${safeCode}_${Date.now()}.pdf`
  const outputPath = path.join(outputDir, filename)
  const pricing = getPricingSnapshot(closer.country_code, closer.us_segment === 'insurer' ? 'insurer' : 'broker')
  const commission = calculateCloserCommission(closer.country_code, pricing)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 52, size: 'A4' })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#111827').text('COURTIA', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(15).text(template.title, { align: 'center' })
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(template.subtitle, { align: 'center' })
    doc.moveDown(1.5)

    doc.fontSize(9).fillColor('#6b7280')
      .text(`Date: ${new Date().toLocaleDateString(countryConfig.locale || 'fr-FR')}`)
      .text(`Closer: ${closer.full_name}`)
      .text(`Referral code: ${closer.referral_code}`)
      .text(`Country: ${countryConfig.name} (${countryConfig.currency})`)
      .moveDown(1.3)

    template.sections.forEach(([heading, sectionBody]) => {
      writeSection(doc, heading, typeof sectionBody === 'function' ? sectionBody(closer) : sectionBody)
    })

    doc.moveDown(0.5)
    writeSection(
      doc,
      'Commission summary',
      [
        `Setup fee snapshot: ${pricing.currencySym} ${pricing.setupFee}`,
        `Monthly subscription snapshot: ${pricing.currencySym} ${pricing.monthlyFee}`,
        `Setup commission: ${pricing.currencySym} ${commission.setupCommission}`,
        `MRR commission: ${pricing.currencySym} ${commission.mrrCommission} per month for ${commission.mrrMonths} months`,
        `Total potential per client: ${pricing.currencySym} ${commission.totalPotential}`,
      ].join('\n'),
    )

    doc.moveDown(2)
    const y = doc.y
    doc.fontSize(10).font('Helvetica').fillColor('#111827')
    doc.text('For COURTIARK:', 52, y)
    doc.text(`${template.signatureLabel}:`, 320, y)
    doc.moveDown(4)
    doc.text('Signature:', 52)
    doc.text(closer.full_name, 320, doc.y - doc.currentLineHeight())

    doc.end()
    stream.on('finish', () => resolve(`/contracts/${filename}`))
    stream.on('error', reject)
  })
}

module.exports = {
  CONTRACT_TEMPLATES,
  generateCloserContract,
}
