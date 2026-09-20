/**
 * Template DDA (Directive Distribution Assurance)
 * Document d'information distributeur - Art. L521-2 Code des assurances
 * 
 * @module compose/templates/ddaTemplate
 */

const PDFDocument = require('pdfkit')
const { fmtMontant, marcheDepuis } = require('../../../lib/devise')

/**
 * Valeurs de repli HISTORIQUES d'autorité française.
 *
 * POURQUOI ce filtre : `broker_profile_settings.supervisor_name` vaut « ACPR »
 * et son adresse « 4 place de Budapest CS 92459 75436 Paris cedex 09 » par
 * DÉFAUT de base de données (migration 101). Un cabinet suisse dont la fiche de
 * composition n'a jamais été remplie héritait donc de ces valeurs, et le repli
 * du template faisait le reste : son document client portait une autorité
 * française. Le filtre refuse une autorité/adresse française sur un document
 * suisse — et réciproquement on ne mélange jamais les deux pays dans un même
 * couple (jamais « FINMA » avec une adresse parisienne).
 */
const MOTIF_AUTORITE_FRANCAISE = /ACPR|Paris|Budapest|ORIAS/i

const COLORS = {
  primary: '#8B5CF6',
  dark: '#1E1B4B',
  text: '#374151',
  lightBg: '#F3F4F6',
  white: '#FFFFFF',
  accent: '#6366F1'
}

/**
 * Génère un PDF Document d'Information Distributeur (DDA)
 * @param {Object} data - Données du document
 * @returns {Promise<Buffer>} Buffer PDF
 */
async function generateDda(data) {
  const {
    broker = {},
    client = {},
    generatedAt = new Date()
  } = data

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Document d\'Information - Distribution Assurance (DDA)',
        Author: broker.company_name || 'COURTIA',
        Subject: 'Information précontractuelle distributeur',
        Creator: 'COURTIA ARK Compose'
      }
    })

    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    drawDdaHeader(doc, broker)
    drawSection1Identity(doc, broker)
    drawSection2Registration(doc, broker)
    drawSection3Remuneration(doc, broker)
    drawSection4Conflicts(doc, broker)
    drawSection5Complaints(doc, broker)
    drawSection6Supervision(doc, broker)
    drawDdaFooter(doc, broker, client, generatedAt)

    doc.end()
  })
}

function drawDdaHeader(doc, broker) {
  // Bandeau coloré en haut
  doc.rect(0, 0, 595, 100).fill(COLORS.primary)
  
  // Logo COURTIA
  doc.fillColor(COLORS.white).fontSize(28)
     .text('COURTIA', 50, 35)
  doc.fontSize(10)
     .text('Plateforme de gestion pour courtiers', 50, 65)
  
  // Titre document
  doc.rect(350, 25, 200, 55).fill(COLORS.white)
  doc.fillColor(COLORS.dark).fontSize(12)
     .text('DOCUMENT', 365, 35)
     .text('D\'INFORMATION', 365, 50)
     .text('DISTRIBUTEUR', 365, 65)
  
  doc.moveDown(4)
}

function drawSection1Identity(doc, broker) {
  const y = 120
  // Identité du cabinet : le référentiel d'immatriculation suit le marché. Un
  // cabinet suisse n'a ni SIRET ni numéro de TVA intracommunautaire français :
  // l'ancienne version imprimait « SIRET : » sur TOUS les documents, y compris
  // ceux d'un cabinet suisse. Ici, un cabinet suisse n'affiche que ce qu'il a
  // réellement déclaré (fin de l'invention de champs français).
  const suisse = String(broker.market || '').toUpperCase() === 'CH'
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('1. IDENTITÉ DU DISTRIBUTEUR', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  const companyName = broker.company_name || '[Nom société à renseigner]'
  const legalForm = broker.legal_form || '[Forme juridique]'
  const address = broker.address || '[Adresse]'
  const postalCode = broker.postal_code || ''
  const city = broker.city || ''
  const fullAddress = `${address}${postalCode ? `, ${postalCode}` : ''}${city ? ` ${city}` : ''}`
  
  doc.fillColor(COLORS.text).fontSize(10)
  let itemY = y + 30
  
  doc.font('Helvetica-Bold').text('Raison sociale :', 50, itemY)
  doc.font('Helvetica').text(companyName, 160, itemY)
  itemY += 16
  
  doc.font('Helvetica-Bold').text('Forme juridique :', 50, itemY)
  doc.font('Helvetica').text(legalForm, 160, itemY)
  itemY += 16
  
  if (suisse) {
    // IDE (UID) = identifiant d'entreprise suisse. Affiché seulement s'il est
    // connu : un cabinet suisse sans IDE n'affiche pas de champ vide français.
    if (broker.uid) {
      doc.font('Helvetica-Bold').text('IDE (UID) :', 50, itemY)
      doc.font('Helvetica').text(broker.uid, 160, itemY)
      itemY += 16
    }
  } else {
    const siret = broker.siret || '[SIRET à renseigner]'
    doc.font('Helvetica-Bold').text('SIRET :', 50, itemY)
    doc.font('Helvetica').text(siret, 160, itemY)
    itemY += 16
  }
  
  doc.font('Helvetica-Bold').text('Adresse :', 50, itemY)
  doc.font('Helvetica').text(fullAddress, 160, itemY, { width: 380 })
  itemY += 16
  
  if (broker.phone) {
    doc.font('Helvetica-Bold').text('Téléphone :', 50, itemY)
    doc.font('Helvetica').text(broker.phone, 160, itemY)
    itemY += 16
  }
  
  if (broker.email) {
    doc.font('Helvetica-Bold').text('Email :', 50, itemY)
    doc.font('Helvetica').text(broker.email, 160, itemY)
    itemY += 16
  }
  
  if (broker.website) {
    doc.font('Helvetica-Bold').text('Site web :', 50, itemY)
    doc.font('Helvetica').text(broker.website, 160, itemY)
  }
}

function drawSection2Registration(doc, broker) {
  const y = 280
  // Le référentiel d'identification suit le MARCHÉ RÉEL du cabinet : un cabinet
  // suisse est identifié par son registre FINMA ou son IDE (UID). L'ancienne
  // version imprimait « IMMATRICULATION ORIAS », « www.orias.fr » et un numéro
  // de téléphone français sur le document d'un cabinet suisse.
  const suisse = String(broker.market || '').toUpperCase() === 'CH'

  doc.fillColor(COLORS.primary).fontSize(14)
     .text(suisse ? '2. IDENTIFICATION DU COURTIER' : '2. IMMATRICULATION ORIAS', 50, y)

  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)

  doc.fillColor(COLORS.text).fontSize(10)
  let itemY = y + 30

  if (suisse) {
    const registreLabel = broker.registry_label || (broker.registre_numero ? `N° ${broker.registre_type || 'FINMA'}` : null)
    const registreValeur = broker.registry_number || broker.registre_numero || broker.uid || null
    doc.font('Helvetica-Bold').text('Registre :', 50, itemY)
    doc.font('Helvetica').text(registreLabel || 'à renseigner', 160, itemY)
    itemY += 16
    doc.font('Helvetica-Bold').text('N° :', 50, itemY)
    doc.font('Helvetica').text(registreValeur || 'à renseigner', 160, itemY)
    itemY += 16
    if (broker.uid && broker.uid !== registreValeur) {
      doc.font('Helvetica-Bold').text('IDE (UID) :', 50, itemY)
      doc.font('Helvetica').text(broker.uid, 160, itemY)
      itemY += 16
    }
    doc.font('Helvetica-Bold').text('Pays :', 50, itemY)
    // `broker.country` peut encore valoir « France » : c'est le DEFAULT de
    // `broker_profile_settings.country` (migration 101), recopié dans les fiches
    // créées avant que le marché ne soit renseigné. Sur un document suisse, on
    // n'imprime pas « France » : le marché résolu (CH) fait foi.
    const paysAffiche = /france/i.test(String(broker.country || '')) ? 'Suisse' : (broker.country || 'Suisse')
    doc.font('Helvetica').text(paysAffiche, 160, itemY)
    itemY += 20

    doc.rect(50, itemY, 495, 32).fill(COLORS.lightBg)
    doc.fillColor(COLORS.dark).fontSize(8)
       .text('Intermédiaire d\'assurance enregistré en Suisse. L\'identification complète du cabinet est '
             + 'reprise ci-dessus telle qu\'elle est déclarée par le courtier.', 60, itemY + 10, { width: 475 })
  } else {
    const oriasNumber = broker.orias_number || '[N° ORIAS à renseigner]'
    doc.font('Helvetica-Bold').text('N° ORIAS :', 50, itemY)
    doc.font('Helvetica').text(oriasNumber, 160, itemY)
    itemY += 16

    doc.font('Helvetica-Bold').text('Catégorie :', 50, itemY)
    doc.font('Helvetica').text('Courtier en assurances (COA)', 160, itemY)
    itemY += 16

    doc.font('Helvetica-Bold').text('Vérification :', 50, itemY)
    doc.font('Helvetica').text('www.orias.fr', 160, itemY)
    itemY += 20

    // Encadré information
    doc.rect(50, itemY, 495, 45).fill(COLORS.lightBg)
    doc.fillColor(COLORS.dark).fontSize(8)
       .text('L\'ORIAS est l\'organisme pour le registre des intermédiaires en assurance, banque et finance.', 60, itemY + 10, { width: 475 })
       .text('Vous pouvez vérifier l\'immatriculation de votre intermédiaire sur www.orias.fr ou au 09 69 32 59 73.', 60, itemY + 25, { width: 475 })
  }
}

function drawSection3Remuneration(doc, broker) {
  const y = 410
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('3. MODE DE RÉMUNÉRATION', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  const remunerationType = broker.remuneration_type || 'commissions'
  const remunerationDetails = broker.remuneration_details || 
    'Notre cabinet est rémunéré par des commissions versées par les compagnies d\'assurance partenaires, ' +
    'calculées en pourcentage de la prime d\'assurance. Ces commissions sont incluses dans le montant ' +
    'de la prime que vous payez et ne génèrent aucun coût supplémentaire pour vous.'
  
  let typeText = ''
  switch (remunerationType) {
    case 'commissions':
      typeText = 'Commissions versées par les compagnies d\'assurance'
      break
    case 'honoraires':
      typeText = 'Honoraires facturés directement au client'
      break
    case 'mixte':
      typeText = 'Mode mixte : commissions et honoraires'
      break
    default:
      typeText = remunerationType
  }
  
  doc.fillColor(COLORS.text).fontSize(10)
  let itemY = y + 30
  
  doc.font('Helvetica-Bold').text('Type :', 50, itemY)
  doc.font('Helvetica').text(typeText, 160, itemY)
  itemY += 20
  
  doc.font('Helvetica-Bold').text('Détails :', 50, itemY)
  doc.font('Helvetica').text(remunerationDetails, 50, itemY + 16, { width: 495, align: 'justify' })
}

function drawSection4Conflicts(doc, broker) {
  const y = 550
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('4. LIENS AVEC DES COMPAGNIES / CONFLITS D\'INTÉRÊTS', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  const conflictsDisclosure = broker.conflicts_disclosure ||
    'Notre cabinet n\'est lié par aucun contrat d\'exclusivité avec une ou plusieurs compagnies d\'assurance. ' +
    'Nous sommes libres de vous proposer les produits de l\'ensemble du marché. ' +
    'Nous avons mis en place une politique de gestion des conflits d\'intérêts disponible sur demande.'
  
  doc.fillColor(COLORS.text).fontSize(10)
     .text(conflictsDisclosure, 50, y + 30, { width: 495, align: 'justify' })
}

function drawSection5Complaints(doc, broker) {
  // Page 2
  doc.addPage()
  const y = 50
  
  doc.fillColor(COLORS.primary).fontSize(14)
     .text('5. PROCÉDURE DE RÉCLAMATION', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)
  
  const suisse = String(broker.market || '').toUpperCase() === 'CH'

  // Le texte par défaut ne doit nommer AUCUN organisme du mauvais pays : le
  // « Médiateur de l'Assurance » et son adresse parisienne n'ont pas cours pour
  // un cabinet suisse. Les engagements génériques (accusé de réception, délai de
  // réponse) restent : ce sont des engagements du cabinet, pas une affirmation
  // sur une réglementation étrangère. L'organe compétent en Suisse n'est pas
  // prérempli ici : ses coordonnées exactes sont à renseigner par le cabinet.
  const complaintsHandling = broker.complaints_handling || (
    suisse
      ? 'En cas de réclamation, vous pouvez nous contacter par courrier, email ou téléphone. ' +
        'Nous nous engageons à accuser réception sous 10 jours et à apporter une réponse sous 2 mois maximum. ' +
        'En cas de désaccord persistant, le cabinet vous indiquera l\'organe de médiation compétent.'
      : 'En cas de réclamation, vous pouvez nous contacter par courrier, email ou téléphone. ' +
        'Nous nous engageons à accuser réception sous 10 jours et à apporter une réponse sous 2 mois maximum. ' +
        'En cas de désaccord persistant, vous pouvez saisir le Médiateur de l\'Assurance.'
  )
  
  doc.fillColor(COLORS.text).fontSize(10)
     .text(complaintsHandling, 50, y + 30, { width: 495, align: 'justify' })
  
  // Coordonnées du médiateur : celui du marché du cabinet.
  let itemY = y + 80
  doc.rect(50, itemY, 495, 60).fill(COLORS.lightBg)

  doc.fillColor(COLORS.dark).fontSize(9)
  if (suisse) {
    doc.text('MÉDIATION', 60, itemY + 10)
    doc.fillColor(COLORS.text).fontSize(8)
       .text('Les coordonnées de l\'organe de médiation compétent doivent être complétées par le cabinet '
             + 'avant remise au client.', 60, itemY + 25, { width: 475 })
       .text('Elles ne sont pas préremplies ici : aucune adresse de médiation étrangère n\'est reportée.', 60, itemY + 37, { width: 475 })
  } else {
    doc.text('MÉDIATEUR DE L\'ASSURANCE', 60, itemY + 10)
    doc.fillColor(COLORS.text).fontSize(8)
       .text('La Médiation de l\'Assurance', 60, itemY + 25)
       .text('TSA 50110 - 75441 Paris Cedex 09', 60, itemY + 37)
       .text('www.mediation-assurance.org', 60, itemY + 49)
  }
}

function drawSection6Supervision(doc, broker) {
  const y = 200
  // L'autorité de contrôle par défaut suit le MARCHÉ du cabinet. L'ancien repli
  // imprimait « ACPR » et « 4 place de Budapest … Paris » sur le document d'un
  // cabinet suisse. Pour la Suisse, la FINMA et son adresse officielle sont
  // reprises telles quelles (mêmes valeurs que la résolution de marché du
  // composer) ; jamais de fait inventé, jamais de repli français.
  const suisse = String(broker.market || '').toUpperCase() === 'CH'

  doc.fillColor(COLORS.primary).fontSize(14)
     .text('6. AUTORITÉ DE CONTRÔLE', 50, y)
  
  doc.moveTo(50, y + 18).lineTo(545, y + 18).stroke(COLORS.lightBg)

  // Le couple autorité + adresse doit décrire UN SEUL pays. Si l'un des deux
  // champs porte une autorité française alors que le cabinet est suisse (cas des
  // valeurs par défaut de la base), on n'en garde aucun : le couple suisse est
  // utilisé en entier.
  const autoriteFournie = broker.supervisor_name || broker.supervisor_address
  const autoriteFrancaise = MOTIF_AUTORITE_FRANCAISE.test(String(autoriteFournie || ''))
  const repliSuisse = suisse && (autoriteFrancaise || !autoriteFournie)

  const supervisorName = repliSuisse
    ? 'FINMA (Autorité fédérale de surveillance des marchés financiers)'
    : (broker.supervisor_name || 'ACPR (Autorité de Contrôle Prudentiel et de Résolution)')
  const supervisorAddress = repliSuisse
    ? 'Laupenstrasse 27, 3003 Berne'
    : (broker.supervisor_address || '4 place de Budapest CS 92459 75436 Paris cedex 09')
  
  doc.fillColor(COLORS.text).fontSize(10)
  let itemY = y + 30
  
  doc.font('Helvetica-Bold').text('Autorité :', 50, itemY)
  doc.font('Helvetica').text(supervisorName, 160, itemY, { width: 380 })
  itemY += 16
  
  doc.font('Helvetica-Bold').text('Adresse :', 50, itemY)
  doc.font('Helvetica').text(supervisorAddress, 160, itemY, { width: 380 })
  itemY += 30
  
  // Assurance RCP
  doc.fillColor(COLORS.primary).fontSize(12)
     .text('ASSURANCE RESPONSABILITÉ CIVILE PROFESSIONNELLE', 50, itemY)
  
  itemY += 20
  
  const rcpInsurer = broker.rcp_insurer || '[Assureur RCP à renseigner]'
  const rcpPolicy = broker.rcp_policy_number || '[N° police]'
  // Montant affiché dans la devise du cabinet (CHF pour un cabinet suisse).
  const marche = broker.market || marcheDepuis(broker)
  const rcpAmount = broker.rcp_coverage_amount
    ? fmtMontant(broker.rcp_coverage_amount, marche, 0)
    : '[Montant couverture]'
  
  doc.fillColor(COLORS.text).fontSize(10)
  doc.font('Helvetica-Bold').text('Assureur RCP :', 50, itemY)
  doc.font('Helvetica').text(rcpInsurer, 160, itemY)
  itemY += 16
  
  doc.font('Helvetica-Bold').text('N° police :', 50, itemY)
  doc.font('Helvetica').text(rcpPolicy, 160, itemY)
  itemY += 16
  
  doc.font('Helvetica-Bold').text('Couverture :', 50, itemY)
  doc.font('Helvetica').text(rcpAmount, 160, itemY)
  
  // Garantie financière si applicable
  if (broker.financial_guarantee_insurer) {
    itemY += 30
    doc.fillColor(COLORS.primary).fontSize(12)
       .text('GARANTIE FINANCIÈRE', 50, itemY)
    
    itemY += 20
    doc.fillColor(COLORS.text).fontSize(10)
    doc.font('Helvetica-Bold').text('Garant :', 50, itemY)
    doc.font('Helvetica').text(broker.financial_guarantee_insurer, 160, itemY)
    itemY += 16
    
    if (broker.financial_guarantee_amount) {
      doc.font('Helvetica-Bold').text('Montant :', 50, itemY)
      doc.font('Helvetica').text(fmtMontant(broker.financial_guarantee_amount, marcheDepuis(broker), 0), 160, itemY)
    }
  }
}

function drawDdaFooter(doc, broker, client, generatedAt) {
  const y = 700
  // Un document produit pour un cabinet suisse ne cite pas le Code des
  // assurances français : on ne prétend pas non plus qu'un article suisse
  // équivalent existe (il n'est pas vérifié ici), la phrase reste donc neutre.
  const suisse = String(broker.market || '').toUpperCase() === 'CH'
  const locale = suisse ? 'fr-CH' : 'fr-FR'
  
  doc.rect(50, y, 495, 80).fill(COLORS.primary)
  
  doc.fillColor(COLORS.white).fontSize(9)
     .text(suisse
       ? 'Document d\'information remis au client avant la conclusion du contrat d\'assurance'
       : 'Document remis conformément à l\'article L521-2 du Code des assurances', 60, y + 10)
     .text(`Généré le ${generatedAt.toLocaleDateString(locale)} à ${generatedAt.toLocaleTimeString(locale)}`, 60, y + 25)
  
  if (client.nom || client.prenom) {
    doc.text(`Destinataire : ${client.prenom || ''} ${client.nom || ''}`.trim(), 60, y + 40)
  }
  
  doc.fontSize(8)
     .text('Ce document est généré automatiquement par COURTIA ARK Compose.', 60, y + 60)
     .text('Il doit être remis au client avant la conclusion de tout contrat d\'assurance.', 60, y + 70)
}

module.exports = { generateDda, COLORS }