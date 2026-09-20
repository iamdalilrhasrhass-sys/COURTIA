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

/**
 * Nom RÉEL du cabinet, ou '' si aucun n'est connu.
 *
 * POURQUOI : « Cabinet COURTIA » est le `DEFAULT` de la colonne `cabinets.name`
 * — un gabarit de base de données, pas une identité. Lu comme un nom réel, il
 * s'imprimait sur le document d'un cabinet établi en Suisse et portant un autre
 * nom. Un document client ne doit jamais porter un nom d'entreprise inventé :
 * ce qui n'est pas renseigné reste vide et l'appelant décide de son repli.
 */
function nomCabinetReel(...valeurs) {
  for (const valeur of valeurs) {
    const texte = String(valeur ?? '').trim()
    if (texte && texte.toUpperCase() !== 'CABINET COURTIA') return texte
  }
  return ''
}

function getOrias(cabinet = {}, courtier = {}) {
  return pick(cabinet.orias_number, cabinet.orias, courtier.orias_number, courtier.orias, courtier.iobsp_orias_number)
}

/**
 * Marché du cabinet : 'CH' ou 'FR'.
 *
 * Le produit sert DEUX marchés. Un cabinet suisse est identifié par sa
 * domiciliation (pays/ville/code postal), sa devise ou son registre (FINMA) —
 * jamais par un numéro ORIAS, qui est un registre FRANÇAIS. Cette fonction est
 * la seule à décider du référentiel utilisé par la suite du module.
 */
function getMarche(cabinet = {}, courtier = {}) {
  const pays = String(pick(cabinet.pays, courtier.pays, cabinet.country, courtier.country)).trim().toUpperCase()
  if (pays === 'CH' || pays === 'CHE' || pays === 'SUISSE' || pays === 'SWITZERLAND') return 'CH'
  const registre = String(pick(cabinet.registre_type, courtier.registre_type)).trim().toUpperCase()
  if (registre.includes('FINMA')) return 'CH'
  const devise = String(pick(cabinet.devise, cabinet.currency, courtier.devise)).trim().toUpperCase()
  if (devise === 'CHF') return 'CH'
  return 'FR'
}

/**
 * Identifiant réglementaire réellement disponible, selon le marché.
 * CH : numéro d'enregistrement FINMA ou IDE/UID (CHE-…).
 * FR : numéro ORIAS.
 * Aucune valeur n'est inventée : ce qui n'est pas renseigné reste vide.
 */
function getIdentifiantReglementaire(cabinet = {}, courtier = {}) {
  const marche = getMarche(cabinet, courtier)
  if (marche === 'CH') {
    const registreNumero = pick(cabinet.registre_numero, courtier.registre_numero)
    const uid = pick(cabinet.uid, courtier.uid)
    const registreType = pick(cabinet.registre_type, courtier.registre_type, registreNumero ? 'FINMA' : '')
    if (registreNumero) {
      return { marche, label: `N° ${registreType || 'registre'}`, valeur: registreNumero,
               registre_type: registreType || 'FINMA', registre_numero: registreNumero, uid,
               autorite: 'FINMA (Autorité fédérale de surveillance des marchés financiers)' }
    }
    if (uid) {
      return { marche, label: 'IDE (UID)', valeur: uid, registre_type: registreType || null,
               registre_numero: null, uid,
               autorite: 'FINMA (Autorité fédérale de surveillance des marchés financiers)' }
    }
    return { marche, label: null, valeur: '', registre_type: null, registre_numero: null, uid: '',
             autorite: 'FINMA (Autorité fédérale de surveillance des marchés financiers)' }
  }
  const orias = getOrias(cabinet, courtier)
  return { marche, label: 'ORIAS', valeur: orias || '', registre_type: 'ORIAS',
           registre_numero: orias || null, uid: '',
           autorite: pick(cabinet.tutelle_authority, 'ACPR (Autorité de Contrôle Prudentiel et de Résolution)') }
}

/**
 * Un document client n'est généré que si le cabinet peut être identifié selon
 * SON marché : numéro FINMA ou IDE pour un cabinet suisse, ORIAS pour un cabinet
 * français. Exiger un ORIAS à un cabinet suisse bloquait toute génération de
 * document — c'était le défaut mesuré en production (`orias_required`).
 */
function validateDdaReadiness({ cabinet = {}, courtier = {} } = {}) {
  const ident = getIdentifiantReglementaire(cabinet, courtier)
  if (!ident.valeur) {
    const message = ident.marche === 'CH'
      ? "Renseignez le numéro d'enregistrement FINMA ou l'IDE (UID) du cabinet dans Paramètres > Profil avant de générer un document."
      : 'Renseignez le numéro ORIAS du cabinet dans Paramètres > Conformité avant de générer un document DDA.'
    return {
      ok: false,
      error: ident.marche === 'CH' ? 'identifiant_reglementaire_requis' : 'orias_required',
      message,
      marche: ident.marche,
    }
  }
  return { ok: true, orias: ident.marche === 'FR' ? ident.valeur : undefined, identifiant: ident.valeur,
           marche: ident.marche, label: ident.label }
}

function buildDdaVariables({ type, client = {}, courtier = {}, cabinet = {}, contract = {}, overrides = {} } = {}) {
  const definition = getDocumentDefinition(type)
  if (!definition) throw new Error('unsupported_document_type')

  const generatedAt = new Date()
  const identiteReglementaire = getIdentifiantReglementaire(cabinet, courtier)
  return {
    document: {
      type: definition.type,
      title: definition.title,
      template_version: definition.templateVersion,
      generated_at: generatedAt.toISOString(),
      generated_date_fr: generatedAt.toLocaleDateString('fr-FR'),
    },
    cabinet: {
      // Nom RÉEL du cabinet. « Cabinet COURTIA » est le `DEFAULT` de colonne de
      // `cabinets.name` : le traiter comme une identité faisait imprimer ce
      // gabarit sur le PDF d'un cabinet portant un autre nom (défaut constaté
      // sur un cabinet suisse). En dernier recours — aucun nom nulle part — on
      // nomme l'intermédiaire qui remet le document : c'est une donnée réelle,
      // jamais un nom d'entreprise inventé.
      name: nomCabinetReel(cabinet.name, courtier.cabinet, courtier.cabinet_name)
        || getCourtierDisplayName(courtier),
      // `orias` est conservé pour les documents FRANÇAIS ; il reste vide pour un
      // cabinet suisse (aucun numéro ORIAS ne doit apparaître sur son document).
      orias: getIdentifiantReglementaire(cabinet, courtier).marche === 'FR' ? getOrias(cabinet, courtier) : '',
      marche: identiteReglementaire.marche,
      registry_label: identiteReglementaire.label,
      registry_number: identiteReglementaire.valeur,
      registre_type: identiteReglementaire.registre_type,
      registre_numero: identiteReglementaire.registre_numero,
      uid: identiteReglementaire.uid,
      pays: pick(cabinet.pays, courtier.pays),
      ville: pick(cabinet.city, courtier.ville),
      devise: identiteReglementaire.marche === 'CH' ? 'CHF' : 'EUR',
      rc_pro_company: pick(cabinet.rc_pro_company, courtier.rc_pro_company),
      rc_pro_number: pick(cabinet.rc_pro_number, courtier.rc_pro_number),
      address: pick(cabinet.address_line1, courtier.adresse),
      city: pick(cabinet.city, courtier.ville),
      postal_code: pick(cabinet.postal_code, courtier.code_postal),
      // Autorité de contrôle : celle du marché réel du cabinet, jamais un
      // « ACPR » posé par défaut sur un document suisse.
      tutelle_authority: identiteReglementaire.autorite,
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
    `Cabinet : ${v.cabinet?.name || 'Non renseigné'}`,
    v.cabinet?.registry_label
      ? `${v.cabinet.registry_label} : ${v.cabinet.registry_number}`
      : (v.cabinet?.orias ? `ORIAS : ${v.cabinet.orias}` : 'Identifiant réglementaire : non renseigné'),
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
  nomCabinetReel,
  validateDdaReadiness,
  buildDdaVariables,
  getMarche,
  getIdentifiantReglementaire,
  renderDdaPlainText,
  getDdaFileName,
}
