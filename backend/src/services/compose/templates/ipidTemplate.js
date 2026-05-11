/**
 * Template IPID (Insurance Product Information Document)
 * Document d'information standardisé - 2 pages max
 * Conforme règlement UE 2017/1469
 * 
 * @module compose/templates/ipidTemplate
 */

const PDFDocument = require('pdfkit')

// Couleurs COURTIA
const COLORS = {
  primary: '#8B5CF6',      // Violet COURTIA
  dark: '#1E1B4B',         // Bleu très foncé
  text: '#374151',         // Gris texte
  lightBg: '#F3F4F6',      // Fond gris clair
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
}

/**
 * Génère un PDF IPID
 * @param {Object} data - Données du document
 * @returns {Promise<Buffer>} Buffer PDF
 */
async function generateIpid(data) {
  const {
    product = {},
    coverage = {},
    exclusions = [],
    premium = {},
    broker = {},
    client = {},
    insurer = {},
    generatedAt = new Date()
  } = data

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'IPID - Document d\'Information sur le Produit d\'Assurance',
        Author: broker.company_name || 'COURTIA',
        Subject: `IPID ${product.name || 'Assurance'}`,
        Creator: 'COURTIA ARK Compose'
      }
    })

    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // === PAGE 1 ===
    drawHeader(doc, product, insurer)
    drawSection1WhatIsInsured(doc, coverage)
    drawSection2WhatIsNotInsured(doc, exclusions)
    
    // === PAGE 2 ===
    doc.addPage()
    drawSection3Restrictions(doc, coverage.restrictions || [])
    drawSection4Obligations(doc, coverage.obligations || [])
    drawSection5Payment(doc, premium)
    drawSection6Duration(doc, product)
    drawSection7Cancellation(doc, product)
    drawFooter(doc, broker, generatedAt)

    doc.end()
  })
}

function drawHeader(doc, product, insurer) {
  // Logo placeholder
  doc.rect(50, 50, 60, 60).fill(COLORS.primary)
  doc.fillColor(COLORS.white).fontSize(24).text('IP', 62, 70)
  doc.fontSize(12).text('ID', 72, 90)
  
  // Titre principal
  doc.fillColor(COLORS.dark).fontSize(18)
     .text('Document d\'Information sur le Produit d\'Assurance', 120, 55, { width: 420 })
  
  doc.fillColor(COLORS.text).fontSize(10)
     .text('Ce document fournit les informations essentielles relatives à ce produit d\'assurance.', 120, 80, { width: 420 })
     .text('Il ne constitue pas un conseil personnalisé. Pour plus d\'informations, consultez la documentation précontractuelle.', 120, 95, { width: 420 })
  
  // Encadré produit
  doc.rect(50, 130, 495, 60).fill(COLORS.lightBg)
  doc.fillColor(COLORS.dark).fontSize(14)
     .text(product.name || 'Produit d\'assurance', 60, 140)
  doc.fillColor(COLORS.text).fontSize(10)
     .text(`Compagnie : ${insurer.name || 'À définir'}`, 60, 160)
     .text(`Type : ${product.type || 'Assurance'} | Référence : ${product.reference || '-'}`, 60, 175)
  
  doc.moveDown(3)
}

function drawSection1WhatIsInsured(doc, coverage) {
  const y = 210
  
  // Icône check vert
  doc.circle(65, y + 10, 12).fill(COLORS.success)
  doc.fillColor(COLORS.white).fontSize(14).text('✓', 59, y + 3)
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Qu\'est-ce qui est assuré ?', 85, y)
  
  const guarantees = coverage.guarantees || [
    { name: 'Responsabilité civile', description: 'Couverture des dommages causés aux tiers' },
    { name: 'Dommages matériels', description: 'Réparation ou remplacement des biens endommagés' },
    { name: 'Protection juridique', description: 'Prise en charge des frais de défense' }
  ]
  
  let itemY = y + 20
  doc.fillColor(COLORS.text).fontSize(9)
  
  for (const g of guarantees) {
    doc.font('Helvetica-Bold').text(`• ${g.name}`, 85, itemY)
    doc.font('Helvetica').text(`  ${g.description || ''}`, 95, itemY + 11, { width: 400 })
    itemY += 28
  }
  
  return itemY
}

function drawSection2WhatIsNotInsured(doc, exclusions) {
  const y = 380
  
  // Icône croix rouge
  doc.circle(65, y + 10, 12).fill(COLORS.danger)
  doc.fillColor(COLORS.white).fontSize(14).text('✗', 59, y + 3)
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Qu\'est-ce qui n\'est PAS assuré ?', 85, y)
  
  const excl = exclusions.length > 0 ? exclusions : [
    'Faits intentionnels de l\'assuré',
    'Dommages causés en état d\'ivresse ou sous emprise de stupéfiants',
    'Activités professionnelles non déclarées',
    'Guerre, émeutes, mouvements populaires',
    'Catastrophes naturelles (sauf garantie spécifique)'
  ]
  
  let itemY = y + 20
  doc.fillColor(COLORS.text).fontSize(9)
  
  for (const e of excl) {
    const text = typeof e === 'string' ? e : e.description
    doc.text(`✗ ${text}`, 85, itemY, { width: 410 })
    itemY += 14
  }
}

function drawSection3Restrictions(doc, restrictions) {
  const y = 50
  
  // Icône warning orange
  doc.circle(65, y + 10, 12).fill(COLORS.warning)
  doc.fillColor(COLORS.white).fontSize(12).text('!', 62, y + 4)
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Y a-t-il des restrictions de couverture ?', 85, y)
  
  const restr = restrictions.length > 0 ? restrictions : [
    'Franchise applicable selon conditions particulières',
    'Plafonds de garantie par sinistre et par année',
    'Délais de carence selon garanties',
    'Conditions d\'exercice de l\'activité à respecter'
  ]
  
  let itemY = y + 20
  doc.fillColor(COLORS.text).fontSize(9)
  
  for (const r of restr) {
    const text = typeof r === 'string' ? r : r.description
    doc.text(`⚠ ${text}`, 85, itemY, { width: 410 })
    itemY += 14
  }
  
  return itemY + 20
}

function drawSection4Obligations(doc, obligations) {
  const y = 180
  
  doc.rect(50, y, 495, 80).fill(COLORS.lightBg)
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Quelles sont mes obligations ?', 60, y + 10)
  
  const oblig = obligations.length > 0 ? obligations : [
    'Payer la prime dans les délais convenus',
    'Déclarer tout changement de situation ou de risque',
    'Déclarer tout sinistre dans les délais contractuels (généralement 5 jours, 2 jours vol)',
    'Prendre toutes mesures pour limiter les conséquences du sinistre'
  ]
  
  let itemY = y + 28
  doc.fillColor(COLORS.text).fontSize(9)
  
  for (const o of oblig) {
    const text = typeof o === 'string' ? o : o.description
    doc.text(`→ ${text}`, 70, itemY, { width: 465 })
    itemY += 12
  }
}

function drawSection5Payment(doc, premium) {
  const y = 280
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Quand et comment effectuer les paiements ?', 60, y)
  
  doc.fillColor(COLORS.text).fontSize(9)
  
  const primeText = premium.amount 
    ? `Prime annuelle : ${premium.amount}€ ${premium.taxes ? `(dont taxes : ${premium.taxes}€)` : ''}`
    : 'Prime : selon conditions particulières'
  
  const fracText = premium.frequency || 'Annuel, semestriel, trimestriel ou mensuel selon choix'
  const moyenText = premium.method || 'Prélèvement automatique, virement, chèque, carte bancaire'
  
  doc.text(`💰 ${primeText}`, 70, y + 18)
     .text(`📅 Fractionnement : ${fracText}`, 70, y + 32)
     .text(`💳 Moyens de paiement : ${moyenText}`, 70, y + 46)
}

function drawSection6Duration(doc, product) {
  const y = 350
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Quand commence et prend fin la couverture ?', 60, y)
  
  const startDate = product.start_date || 'À la date d\'effet mentionnée aux conditions particulières'
  const duration = product.duration || '1 an, renouvelable par tacite reconduction'
  
  doc.fillColor(COLORS.text).fontSize(9)
     .text(`📆 Début : ${startDate}`, 70, y + 18)
     .text(`⏱ Durée : ${duration}`, 70, y + 32)
}

function drawSection7Cancellation(doc, product) {
  const y = 420
  
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('Comment résilier le contrat ?', 60, y)
  
  const cancellation = product.cancellation || [
    'À échéance annuelle avec préavis de 2 mois (lettre recommandée)',
    'Loi Hamon : à tout moment après 1 an (assurances auto, MRH, affinitaires)',
    'Loi Chatel : l\'assureur doit vous informer de votre droit de résiliation',
    'Cas particuliers : vente du bien, déménagement, changement de situation'
  ]
  
  let itemY = y + 18
  doc.fillColor(COLORS.text).fontSize(9)
  
  for (const c of cancellation) {
    doc.text(`• ${c}`, 70, itemY, { width: 465 })
    itemY += 12
  }
}

function drawFooter(doc, broker, generatedAt) {
  const y = 560
  
  doc.rect(50, y, 495, 60).fill(COLORS.lightBg)
  
  doc.fillColor(COLORS.dark).fontSize(8)
     .text('Document généré par COURTIA ARK Compose', 60, y + 8)
  
  doc.fillColor(COLORS.text).fontSize(7)
  
  const brokerInfo = broker.company_name 
    ? `Intermédiaire : ${broker.company_name}${broker.orias_number ? ` | ORIAS n°${broker.orias_number}` : ''}`
    : 'Intermédiaire : À définir'
  
  doc.text(brokerInfo, 60, y + 22)
     .text(`Date de génération : ${generatedAt.toLocaleDateString('fr-FR')} à ${generatedAt.toLocaleTimeString('fr-FR')}`, 60, y + 34)
     .text('Ce document ne remplace pas les conditions générales et particulières du contrat.', 60, y + 46)
}

module.exports = { generateIpid, COLORS }