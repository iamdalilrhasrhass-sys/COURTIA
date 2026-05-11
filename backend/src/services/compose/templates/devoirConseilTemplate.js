/**
 * Template Devoir de Conseil
 * Formalisme L520-1 Code des assurances
 * Recueil des besoins + recommandation argumentée
 * 
 * @module compose/templates/devoirConseilTemplate
 */

const PDFDocument = require('pdfkit')

const COLORS = {
  primary: '#8B5CF6',
  dark: '#1E1B4B',
  text: '#374151',
  lightBg: '#F3F4F6',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6'
}

/**
 * Génère un PDF Devoir de Conseil
 * @param {Object} data - Données du document
 * @returns {Promise<Buffer>} Buffer PDF
 */
async function generateDevoirConseil(data) {
  const {
    client = {},
    needs = {},
    recommendation = {},
    alternatives = [],
    broker = {},
    generatedAt = new Date(),
    aiReasoning = null
  } = data

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Devoir de Conseil - Recommandation personnalisée',
        Author: broker.company_name || 'COURTIA',
        Subject: `Conseil assurance - ${client.nom || 'Client'}`,
        Creator: 'COURTIA ARK Compose'
      }
    })

    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Page 1
    drawConseilHeader(doc, broker, client)
    drawSection1ClientInfo(doc, client)
    drawSection2Needs(doc, needs)
    
    // Page 2
    doc.addPage()
    drawSection3Recommendation(doc, recommendation, broker)
    drawSection4Alternatives(doc, alternatives)
    
    // Page 3
    doc.addPage()
    drawSection5Reasoning(doc, aiReasoning, recommendation)
    drawSection6Signature(doc, client, broker, generatedAt)
    
    drawConseilFooter(doc, broker, generatedAt)

    doc.end()
  })
}

function drawConseilHeader(doc, broker, client) {
  // Bandeau titre
  doc.rect(0, 0, 595, 80).fill(COLORS.dark)
  
  doc.fillColor(COLORS.white).fontSize(22)
     .text('DEVOIR DE CONSEIL', 50, 25)
  doc.fontSize(11)
     .text('Recommandation personnalisée — Article L520-1 Code des assurances', 50, 52)
  
  // Badge IA
  doc.rect(450, 20, 95, 40).fill(COLORS.primary)
  doc.fillColor(COLORS.white).fontSize(9)
     .text('Généré par', 460, 28)
     .fontSize(14).text('ARK IA', 465, 42)
  
  doc.moveDown(3)
}

function drawSection1ClientInfo(doc, client) {
  const y = 100
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('1. IDENTIFICATION DU CLIENT', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  doc.fillColor(COLORS.text).fontSize(10)
  let itemY = y + 30
  
  // Identité
  const fullName = `${client.civilite || ''} ${client.prenom || ''} ${client.nom || '[Nom à renseigner]'}`.trim()
  doc.font('Helvetica-Bold').text('Identité :', 50, itemY)
  doc.font('Helvetica').text(fullName, 160, itemY)
  itemY += 16
  
  if (client.date_naissance) {
    doc.font('Helvetica-Bold').text('Date de naissance :', 50, itemY)
    doc.font('Helvetica').text(client.date_naissance, 160, itemY)
    itemY += 16
  }
  
  if (client.adresse || client.ville) {
    doc.font('Helvetica-Bold').text('Adresse :', 50, itemY)
    const addr = `${client.adresse || ''}${client.code_postal ? `, ${client.code_postal}` : ''}${client.ville ? ` ${client.ville}` : ''}`
    doc.font('Helvetica').text(addr, 160, itemY, { width: 380 })
    itemY += 16
  }
  
  if (client.profession) {
    doc.font('Helvetica-Bold').text('Profession :', 50, itemY)
    doc.font('Helvetica').text(client.profession, 160, itemY)
    itemY += 16
  }
  
  if (client.situation_familiale) {
    doc.font('Helvetica-Bold').text('Situation familiale :', 50, itemY)
    doc.font('Helvetica').text(client.situation_familiale, 160, itemY)
    itemY += 16
  }
  
  // Type client
  const clientType = client.type === 'professionnel' ? 'Professionnel / Entreprise' : 'Particulier'
  doc.font('Helvetica-Bold').text('Type de client :', 50, itemY)
  doc.font('Helvetica').text(clientType, 160, itemY)
}

function drawSection2Needs(doc, needs) {
  const y = 270
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('2. RECUEIL DES BESOINS ET EXIGENCES', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  // Situation actuelle
  let itemY = y + 30
  doc.fillColor(COLORS.dark).fontSize(11)
     .text('Situation actuelle', 50, itemY)
  
  itemY += 18
  doc.fillColor(COLORS.text).fontSize(9)
  
  const situation = needs.situation || 'À compléter lors de l\'entretien'
  doc.text(situation, 50, itemY, { width: 495 })
  itemY += Math.ceil(situation.length / 80) * 12 + 15
  
  // Objectifs
  doc.fillColor(COLORS.dark).fontSize(11)
     .text('Objectifs de protection', 50, itemY)
  
  itemY += 18
  const objectives = needs.objectifs || [
    'Protection du patrimoine',
    'Couverture des risques professionnels',
    'Sécurisation de la famille'
  ]
  
  doc.fillColor(COLORS.text).fontSize(9)
  for (const obj of objectives) {
    doc.text(`→ ${typeof obj === 'string' ? obj : obj.description}`, 60, itemY, { width: 480 })
    itemY += 14
  }
  
  itemY += 10
  
  // Besoins identifiés
  doc.fillColor(COLORS.dark).fontSize(11)
     .text('Besoins identifiés', 50, itemY)
  
  itemY += 18
  const besoins = needs.besoins || [
    { type: 'Assurance', description: 'Protection adaptée au profil' }
  ]
  
  for (const b of besoins) {
    doc.fillColor(COLORS.info).fontSize(9)
       .text(`• ${b.type || 'Besoin'}`, 60, itemY)
    doc.fillColor(COLORS.text)
       .text(`  ${b.description || ''}`, 70, itemY + 11, { width: 470 })
    itemY += 28
  }
  
  // Contraintes budget
  if (needs.contraintes_budget) {
    itemY += 10
    doc.rect(50, itemY, 495, 35).fill(COLORS.lightBg)
    doc.fillColor(COLORS.dark).fontSize(10)
       .text('💰 Contraintes budgétaires', 60, itemY + 8)
    doc.fillColor(COLORS.text).fontSize(9)
       .text(needs.contraintes_budget, 60, itemY + 22, { width: 475 })
  }
}

function drawSection3Recommendation(doc, recommendation, broker) {
  const y = 50
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('3. RECOMMANDATION PERSONNALISÉE', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  // Encadré solution recommandée
  let itemY = y + 30
  doc.rect(50, itemY, 495, 100).fill(COLORS.success).fillOpacity(0.1)
  doc.fillOpacity(1)
  
  doc.circle(75, itemY + 25, 15).fill(COLORS.success)
  doc.fillColor(COLORS.white).fontSize(16).text('✓', 68, itemY + 17)
  
  doc.fillColor(COLORS.dark).fontSize(13)
     .text('SOLUTION RECOMMANDÉE', 100, itemY + 15)
  
  const productName = recommendation.recommended_product?.name || recommendation.product_name || '[Produit à définir]'
  const insurerName = recommendation.recommended_product?.insurer || recommendation.insurer || ''
  
  doc.fillColor(COLORS.dark).fontSize(11)
     .text(productName, 100, itemY + 35)
  
  if (insurerName) {
    doc.fillColor(COLORS.text).fontSize(9)
       .text(`Compagnie : ${insurerName}`, 100, itemY + 52)
  }
  
  if (recommendation.premium) {
    doc.fillColor(COLORS.primary).fontSize(11)
       .text(`Prime : ${recommendation.premium}€/an`, 100, itemY + 70)
  }
  
  // Raisons de la recommandation
  itemY += 120
  doc.fillColor(COLORS.dark).fontSize(11)
     .text('Pourquoi cette recommandation ?', 50, itemY)
  
  itemY += 20
  const reasons = recommendation.reasoning || recommendation.reasons || [
    'Correspond à vos besoins exprimés',
    'Rapport qualité/prix optimal',
    'Garanties adaptées à votre situation'
  ]
  
  doc.fillColor(COLORS.text).fontSize(9)
  for (const r of reasons) {
    doc.text(`✓ ${typeof r === 'string' ? r : r.description}`, 60, itemY, { width: 480 })
    itemY += 16
  }
  
  // Garanties principales
  itemY += 15
  if (recommendation.main_guarantees && recommendation.main_guarantees.length > 0) {
    doc.fillColor(COLORS.dark).fontSize(11)
       .text('Garanties principales incluses', 50, itemY)
    
    itemY += 20
    for (const g of recommendation.main_guarantees) {
      doc.fillColor(COLORS.info).fontSize(9)
         .text(`• ${g.name || g}`, 60, itemY)
      if (g.description) {
        doc.fillColor(COLORS.text)
           .text(`  ${g.description}`, 70, itemY + 11, { width: 470 })
        itemY += 26
      } else {
        itemY += 14
      }
    }
  }
}

function drawSection4Alternatives(doc, alternatives) {
  const y = 400
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('4. ALTERNATIVES ÉTUDIÉES', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  let itemY = y + 30
  
  if (!alternatives || alternatives.length === 0) {
    doc.fillColor(COLORS.text).fontSize(9)
       .text('Aucune alternative comparable n\'a été identifiée sur le marché.', 50, itemY)
    return
  }
  
  for (const alt of alternatives.slice(0, 3)) {
    doc.rect(50, itemY, 495, 55).fill(COLORS.lightBg)
    
    doc.fillColor(COLORS.dark).fontSize(10)
       .text(alt.name || alt.product_name || 'Alternative', 60, itemY + 8)
    
    doc.fillColor(COLORS.text).fontSize(8)
    if (alt.insurer) {
      doc.text(`Compagnie : ${alt.insurer}`, 60, itemY + 22)
    }
    if (alt.premium) {
      doc.text(`Prime : ${alt.premium}€/an`, 200, itemY + 22)
    }
    
    const whyRejected = alt.why_rejected || alt.rejection_reason || 'Ne correspond pas exactement aux besoins'
    doc.fillColor(COLORS.warning).fontSize(8)
       .text(`Non retenu : ${whyRejected}`, 60, itemY + 38, { width: 475 })
    
    itemY += 65
  }
}

function drawSection5Reasoning(doc, aiReasoning, recommendation) {
  const y = 50
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('5. ANALYSE ET RAISONNEMENT', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  // Badge IA
  doc.rect(50, y + 30, 495, 30).fill(COLORS.primary).fillOpacity(0.1)
  doc.fillOpacity(1)
  doc.fillColor(COLORS.primary).fontSize(9)
     .text('🤖 Cette analyse a été générée par ARK, l\'intelligence artificielle de COURTIA, et validée par votre courtier.', 60, y + 40, { width: 475 })
  
  let itemY = y + 75
  
  const reasoning = aiReasoning || recommendation.detailed_reasoning || 
    'Cette recommandation est basée sur l\'analyse de votre situation personnelle, ' +
    'de vos besoins exprimés et des offres disponibles sur le marché. ' +
    'Elle tient compte de votre budget, de votre profil de risque et de vos objectifs de protection. ' +
    'Le produit recommandé offre le meilleur équilibre entre couverture et coût.'
  
  doc.fillColor(COLORS.text).fontSize(9)
     .text(reasoning, 50, itemY, { width: 495, align: 'justify' })
}

function drawSection6Signature(doc, client, broker, generatedAt) {
  const y = 350
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('6. ATTESTATION ET SIGNATURE', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  let itemY = y + 35
  
  // Attestation client
  doc.fillColor(COLORS.text).fontSize(9)
     .text('Je soussigné(e), certifie avoir reçu ce document de conseil et en avoir pris connaissance.', 50, itemY)
     .text('J\'atteste que les informations communiquées à mon courtier sont exactes et complètes.', 50, itemY + 14)
     .text('J\'ai été informé(e) des caractéristiques essentielles du produit recommandé.', 50, itemY + 28)
  
  itemY += 60
  
  // Zone signature client
  doc.rect(50, itemY, 220, 80).stroke(COLORS.text)
  doc.fillColor(COLORS.text).fontSize(8)
     .text('Signature du client', 60, itemY + 5)
     .text(`Nom : ${client.prenom || ''} ${client.nom || '_______________'}`.trim(), 60, itemY + 60)
  
  // Zone signature courtier
  doc.rect(320, itemY, 225, 80).stroke(COLORS.text)
  doc.fillColor(COLORS.text).fontSize(8)
     .text('Signature du courtier', 330, itemY + 5)
     .text(`Cabinet : ${broker.company_name || '_______________'}`, 330, itemY + 60)
  
  itemY += 95
  
  doc.fillColor(COLORS.text).fontSize(8)
     .text(`Fait à ______________________, le ${generatedAt.toLocaleDateString('fr-FR')}`, 50, itemY)
}

function drawConseilFooter(doc, broker, generatedAt) {
  const y = 750
  
  doc.fillColor(COLORS.text).fontSize(7)
     .text(`Document généré par COURTIA ARK Compose — ${generatedAt.toLocaleDateString('fr-FR')} ${generatedAt.toLocaleTimeString('fr-FR')}`, 50, y)
  
  if (broker.orias_number) {
    doc.text(`Intermédiaire : ${broker.company_name || ''} — ORIAS n°${broker.orias_number}`, 50, y + 10)
  }
  
  doc.text('Ce document doit être conservé par le client. Il fait partie intégrante du dossier de souscription.', 50, y + 20)
}

module.exports = { generateDevoirConseil, COLORS }