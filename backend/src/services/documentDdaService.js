const DDA_DOCUMENT_TYPES = ['fic', 'mandat_courtage', 'devoir_conseil', 'attestation']

const DOCUMENT_DEFINITIONS = {
  fic: {
    title: 'Fiche d’information et de conseil',
    templateVersion: 'fic-v1',
    statusLabel: 'FIC',
  },
  mandat_courtage: {
    title: 'Mandat de courtage',
    templateVersion: 'mandat-courtage-v1',
    statusLabel: 'Mandat',
  },
  devoir_conseil: {
    title: 'Devoir de conseil',
    templateVersion: 'devoir-conseil-v1',
    statusLabel: 'Conseil',
  },
  attestation: {
    title: 'Attestation / synthèse client',
    templateVersion: 'attestation-info-v1',
    statusLabel: 'Attestation',
  },
}

function normalizeDocumentType(value = '') {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  if (normalized === 'fic') return 'fic'
  if (normalized === 'mandat' || normalized === 'mandat_de_courtage') return 'mandat_courtage'
  if (normalized === 'devoir' || normalized === 'devoir_de_conseil') return 'devoir_conseil'
  if (normalized === 'synthese' || normalized === 'attestation_info') return 'attestation'
  return DDA_DOCUMENT_TYPES.includes(normalized) ? normalized : null
}

function getDocumentDefinition(type) {
  const normalized = normalizeDocumentType(type)
  return normalized ? { type: normalized, ...DOCUMENT_DEFINITIONS[normalized] } : null
}

function pick(...values) {
  return values.find((value) => value != null && String(value).trim() !== '') || ''
}

function getClientDisplayName(client = {}) {
  return pick(
    client.company_name,
    [client.first_name || client.prenom, client.last_name || client.nom].filter(Boolean).join(' '),
    client.email,
    `Client #${client.id || ''}`
  )
}

function getCourtierDisplayName(courtier = {}) {
  return pick(
    [courtier.first_name || courtier.prenom, courtier.last_name || courtier.nom].filter(Boolean).join(' '),
    courtier.email,
    'Courtier'
  )
}

function getOrias(cabinet = {}, courtier = {}) {
  return pick(cabinet.orias_number, cabinet.orias, courtier.orias_number, courtier.orias, courtier.iobsp_orias_number)
}

function validateDdaReadiness({ cabinet = {}, courtier = {} } = {}) {
  const orias = getOrias(cabinet, courtier)
  if (!orias) {
    return {
      ok: false,
      error: 'orias_required',
      message: 'Renseignez le numéro ORIAS du cabinet dans Paramètres > Conformité avant de générer un document DDA.',
    }
  }
  return { ok: true, orias }
}

function buildDdaVariables({ type, client = {}, courtier = {}, cabinet = {}, contract = {}, overrides = {} } = {}) {
  const definition = getDocumentDefinition(type)
  if (!definition) throw new Error('unsupported_document_type')

  const generatedAt = new Date()
  return {
    document: {
      type: definition.type,
      title: definition.title,
      template_version: definition.templateVersion,
      generated_at: generatedAt.toISOString(),
      generated_date_fr: generatedAt.toLocaleDateString('fr-FR'),
    },
    cabinet: {
      name: pick(cabinet.name, courtier.cabinet, 'Cabinet COURTIA'),
      orias: getOrias(cabinet, courtier),
      rc_pro_company: pick(cabinet.rc_pro_company, courtier.rc_pro_company),
      rc_pro_number: pick(cabinet.rc_pro_number, courtier.rc_pro_number),
      address: pick(cabinet.address_line1, courtier.adresse),
      city: pick(cabinet.city, courtier.ville),
      postal_code: pick(cabinet.postal_code, courtier.code_postal),
      tutelle_authority: pick(cabinet.tutelle_authority, 'ACPR'),
    },
    courtier: {
      name: getCourtierDisplayName(courtier),
      email: pick(courtier.email),
      phone: pick(courtier.telephone, courtier.phone),
    },
    client: {
      id: client.id || null,
      name: getClientDisplayName(client),
      email: pick(client.email),
      phone: pick(client.phone, client.telephone, client.mobile),
      address: pick(client.adresse, client.address),
      city: pick(client.ville, client.city),
      postal_code: pick(client.code_postal, client.postal_code),
      status: pick(client.status, client.statut),
      type: pick(client.type, client.segment),
    },
    contract: {
      id: contract.id || null,
      type: pick(contract.type, contract.contract_type),
      company: pick(contract.company, contract.compagnie, contract.insurer),
      number: pick(contract.number, contract.numero, contract.policy_number),
      annual_premium: pick(contract.annual_premium, contract.prime_annuelle),
      start_date: pick(contract.start_date, contract.date_effet),
      end_date: pick(contract.end_date, contract.date_echeance),
      status: pick(contract.status, contract.statut),
    },
    compliance: {
      disclaimer: 'COURTIA aide à structurer et tracer le devoir de conseil. Les recommandations restent indicatives et ne remplacent pas le jugement professionnel du courtier.',
      human_responsibility: 'Le courtier reste responsable de la validation, de l’adéquation du conseil et de la remise des informations au client.',
    },
    ...overrides,
  }
}

function renderDdaPlainText(type, variables) {
  const definition = getDocumentDefinition(type)
  if (!definition) throw new Error('unsupported_document_type')
  const v = variables || {}
  const lines = [
    'COURTIA',
    definition.title,
    '',
    `Date de génération : ${v.document?.generated_date_fr || new Date().toLocaleDateString('fr-FR')}`,
    `Cabinet : ${v.cabinet?.name || 'Cabinet COURTIA'}`,
    `ORIAS : ${v.cabinet?.orias || 'Non renseigné'}`,
    `Courtier : ${v.courtier?.name || 'Courtier'}`,
    '',
    `Client : ${v.client?.name || 'Client'}`,
    `Email : ${v.client?.email || 'Non renseigné'}`,
    `Téléphone : ${v.client?.phone || 'Non renseigné'}`,
    `Ville : ${v.client?.city || 'Non renseignée'}`,
    '',
  ]

  if (definition.type === 'fic') {
    lines.push('Objet : formaliser les informations client et les premiers éléments de conseil avant recommandation.')
    lines.push(`Besoin identifié : ${v.contract?.type || 'à préciser avec le client'}.`)
    lines.push('Action recommandée : compléter la découverte client, confirmer les attentes et archiver la version remise.')
  } else if (definition.type === 'mandat_courtage') {
    lines.push('Objet : préciser le cadre du mandat confié au courtier pour rechercher ou négocier des solutions d’assurance.')
    lines.push('Action recommandée : faire relire et signer le mandat avant toute démarche engageante.')
  } else if (definition.type === 'devoir_conseil') {
    lines.push('Objet : tracer la recommandation, les critères retenus et les raisons du conseil fourni au client.')
    lines.push(`Contrat concerné : ${v.contract?.company || 'compagnie à préciser'} — ${v.contract?.number || 'référence à compléter'}.`)
    lines.push('Action recommandée : vérifier l’adéquation garanties / besoins / budget avant remise définitive.')
  } else if (definition.type === 'attestation') {
    lines.push('Objet : synthétiser les informations disponibles sur le client, le contrat ou le dossier.')
    lines.push(`Contrat : ${v.contract?.type || 'non lié'} — prime annuelle : ${v.contract?.annual_premium || 'non renseignée'}.`)
  }

  lines.push('', v.compliance?.disclaimer || '', v.compliance?.human_responsibility || '')
  return lines.filter((line) => line !== null && line !== undefined).join('\n')
}

function getDdaFileName(type, documentId) {
  const definition = getDocumentDefinition(type)
  const safeType = definition?.type || 'document'
  return `courtia_${safeType}_${documentId}.pdf`
}

module.exports = {
  DDA_DOCUMENT_TYPES,
  getDocumentDefinition,
  normalizeDocumentType,
  validateDdaReadiness,
  buildDdaVariables,
  renderDdaPlainText,
  getDdaFileName,
}
