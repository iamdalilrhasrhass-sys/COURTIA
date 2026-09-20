/**
 * Template Devoir de Conseil
 * Formalisme L520-1 Code des assurances
 * Recueil des besoins + recommandation argumentée
 * 
 * @module compose/templates/devoirConseilTemplate
 */

const PDFDocument = require('pdfkit')
const { fmtMontant, marcheDepuis } = require('../../../lib/devise')

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
    // `withArkAnalysis` dit si une analyse ARK accompagne RÉELLEMENT le
    // document : sans elle, ni l'en-tête ni la section 5 n'ont le droit
    // d'attribuer ce document à l'IA (défaut IA-017).
    const withArkAnalysis = Boolean(String(aiReasoning || '').trim())
    drawConseilHeader(doc, broker, client, withArkAnalysis)
    drawSection1ClientInfo(doc, client)
    drawSection2Needs(doc, needs)
    
    // Page 2
    doc.addPage()
    drawSection3Recommendation(doc, recommendation, broker)
    drawSection4Alternatives(doc, alternatives, broker)
    
    // Page 3
    doc.addPage()
    drawSection5Reasoning(doc, aiReasoning, recommendation)
    drawSection6Signature(doc, client, broker, generatedAt)
    
    drawConseilFooter(doc, broker, generatedAt)

    doc.end()
  })
}

function drawConseilHeader(doc, broker, client, withArkAnalysis = false) {
  // Bandeau titre
  doc.rect(0, 0, 595, 80).fill(COLORS.dark)
  
  // Le sous-titre citait l'article L520-1 du Code des assurances, y compris sur
  // le document d'un cabinet suisse. On ne remplace pas cette mention par un
  // article suisse supposé : pour le marché CH, le sous-titre reste descriptif.
  const suisse = String((broker && broker.market) || '').toUpperCase() === 'CH'

  doc.fillColor(COLORS.white).fontSize(22)
     .text('DEVOIR DE CONSEIL', 50, 25)
  doc.fontSize(11)
     .text(suisse
       ? 'Recommandation personnalisée remise au client'
       : 'Recommandation personnalisée — Article L520-1 Code des assurances', 50, 52)
  
  // Badge ARK — correction 20/09/2026 (défaut IA-017).
  // Le badge « Généré par ARK IA » était imprimé sur TOUS les documents, y
  // compris ceux sans aucune analyse ARK : un document rédigé à la main
  // portait la signature de l'IA. Le badge n'est posé que si une analyse ARK
  // est réellement jointe ; sinon le document se déclare pour ce qu'il est,
  // un projet à valider.
  const badge = withArkAnalysis
    ? { ligne1: 'Généré par', ligne2: 'ARK IA' }
    : { ligne1: 'Projet à', ligne2: 'VALIDER' }
  doc.rect(450, 20, 95, 40).fill(withArkAnalysis ? COLORS.primary : COLORS.warning)
  doc.fillColor(COLORS.white).fontSize(9)
     .text(badge.ligne1, 460, 28)
     .fontSize(withArkAnalysis ? 14 : 11).text(badge.ligne2, 460, 42)
  
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
  // Devise du cabinet (CHF en Suisse) : un document client ne porte jamais la
  // devise d'un autre marché.
  const marche = (broker && (broker.market || marcheDepuis(broker))) || 'FR'
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
       .text(`Prime : ${fmtMontant(recommendation.premium, marche)}/an`, 100, itemY + 70)
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

function drawSection4Alternatives(doc, alternatives, broker) {
  const marche = (broker && (broker.market || marcheDepuis(broker))) || 'FR'
  const y = 400
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('4. ALTERNATIVES ÉTUDIÉES', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  let itemY = y + 30
  
  if (!alternatives || alternatives.length === 0) {
    // POURQUOI cette formulation : l'ancienne ligne affirmait « Aucune
    // alternative comparable n'a été identifiée sur le marché » — une
    // comparaison de marché qui n'avait pas eu lieu. On dit seulement que le
    // dossier n'en contient aucune.
    doc.fillColor(COLORS.text).fontSize(9)
       .text('Aucune alternative n\'est renseignée dans ce dossier.', 50, itemY)
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
      doc.text(`Prime : ${fmtMontant(alt.premium, marche)}/an`, 200, itemY + 22)
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
  
  // MENTION DE VALIDATION — correction 20/09/2026 (défaut IA-017).
  // Ce document imprimait TOUJOURS « Cette analyse a été générée par ARK, … et
  // validée par votre courtier », même sans la moindre analyse ARK et sans
  // qu'aucun courtier n'ait validé quoi que ce soit. C'est une attestation de
  // validation qui n'a pas eu lieu, imprimée sur une pièce du dossier de
  // souscription remise au client. On n'écrit plus que ce qui est vrai :
  //   • analyse ARK réellement jointe → le document est attribué à ARK et se
  //     déclare « projet à valider par votre courtier » (jamais « validée ») ;
  //   • raisonnement fourni par le cabinet → attribué au cabinet, sans ARK ;
  //   • rien → on le dit, au lieu de fabriquer un raisonnement de repli.
  const texteArk = String(aiReasoning || '').trim()
  const texteCabinet = String((recommendation && recommendation.detailed_reasoning) || '').trim()
  const reasoning = texteArk || texteCabinet

  const badge = texteArk
    ? `🤖 Analyse générée par ARK, l'intelligence artificielle de COURTIA. Projet à valider par votre courtier avant remise au client.`
    : (texteCabinet
      ? `Argumentaire établi par votre cabinet. Aucune analyse automatisée ARK n'est jointe à ce document.`
      : `Aucune analyse automatisée ARK n'est jointe à ce document : le raisonnement n'a pas été produit.`)

  doc.rect(50, y + 30, 495, 30).fill(COLORS.primary).fillOpacity(0.1)
  doc.fillOpacity(1)
  doc.fillColor(COLORS.primary).fontSize(9)
     .text(badge, 60, y + 40, { width: 475 })
  
  const itemY = y + 75
  
  doc.fillColor(COLORS.text).fontSize(9)
  if (reasoning) {
    doc.text(reasoning, 50, itemY, { width: 495, align: 'justify' })
  } else {
    // Aucun texte de repli fabriqué : un raisonnement inventé dans un devoir de
    // conseil est un motif de non-conformité, pas une commodité d'affichage.
    doc.fillColor(COLORS.warning)
       .text('Le raisonnement de la recommandation doit être saisi par le courtier avant remise au client.', 50, itemY, { width: 495 })
  }
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
  
  // Date en locale du marché : « fr-CH » pour un cabinet suisse.
  const locale = String((broker && broker.market) || '').toUpperCase() === 'CH' ? 'fr-CH' : 'fr-FR'
  doc.fillColor(COLORS.text).fontSize(8)
     .text(`Fait à ______________________, le ${generatedAt.toLocaleDateString(locale)}`, 50, itemY)
}

function drawConseilFooter(doc, broker, generatedAt) {
  const y = 750
  const suisse = String((broker && broker.market) || '').toUpperCase() === 'CH'
  const locale = suisse ? 'fr-CH' : 'fr-FR'
  
  doc.fillColor(COLORS.text).fontSize(7)
     .text(`Document généré par COURTIA ARK Compose — ${generatedAt.toLocaleDateString(locale)} ${generatedAt.toLocaleTimeString(locale)}`, 50, y)
  
  // L'ORIAS est un registre français : sur un document suisse, le pied de page
  // n'affiche pas de numéro d'un registre étranger. Un cabinet suisse est
  // identifié par son registre FINMA / son IDE, repris dans le document DDA.
  if (!suisse && broker.orias_number) {
    doc.text(`Intermédiaire : ${broker.company_name || ''} — ORIAS n°${broker.orias_number}`, 50, y + 10)
  }
  
  doc.text('Ce document doit être conservé par le client. Il fait partie intégrante du dossier de souscription.', 50, y + 20)
}

// Les deux fonctions de rendu sont exportées pour que la recette et les tests
// de non-régression puissent LIRE, sur un « doc » instrumenté, les mentions
// réellement imprimées (défaut IA-017 : une mention de validation qui n'a pas eu
// lieu était impossible à vérifier autrement, le PDF étant compressé).
module.exports = { generateDevoirConseil, COLORS, drawConseilHeader, drawSection5Reasoning }