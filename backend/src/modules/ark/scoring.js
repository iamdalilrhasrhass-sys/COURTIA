function scoreAgainst(requirements, { presentFields = [], presentDocuments = [] } = {}) {
  if (!requirements) {
    return {
      completion_score: 0,
      missing_fields: [],
      missing_documents: [],
      blocking_points: ['Produit non reconnu.'],
      next_best_action: null,
    }
  }

  const fieldsSet = new Set(presentFields)
  const documentsSet = new Set(presentDocuments)
  const fieldLabel = (key) => requirements.field_labels?.[key] || key
  const documentLabel = (key) => requirements.document_labels?.[key] || key

  const missing_fields = (requirements.required_fields || []).filter((field) => !fieldsSet.has(field))
  const missing_documents = (requirements.required_documents || []).filter((document) => !documentsSet.has(document))
  const total = (requirements.required_fields?.length || 0) + (requirements.required_documents?.length || 0)
  const present = total - missing_fields.length - missing_documents.length
  const completion_score = total === 0 ? 100 : Math.round((present / total) * 100)

  const blocking_points = []
  for (const key of requirements.blocking || []) {
    if (missing_fields.includes(key)) {
      blocking_points.push(`${fieldLabel(key)} manquant - bloquant, impossible d'avancer sans.`)
    } else if (missing_documents.includes(key)) {
      blocking_points.push(`${documentLabel(key)} manquant - piece indispensable.`)
    }
  }

  return {
    completion_score,
    missing_fields,
    missing_documents,
    blocking_points,
    next_best_action: pickNext(requirements, missing_fields, missing_documents, fieldLabel, documentLabel),
  }
}

function pickNext(requirements, missingFields, missingDocuments, fieldLabel, documentLabel) {
  const blockingDocument = (requirements.blocking || []).find((key) => missingDocuments.includes(key))
  if (blockingDocument) {
    return {
      type: 'request_missing_documents',
      target: blockingDocument,
      message: `Demander : ${documentLabel(blockingDocument)} (piece bloquante).`,
    }
  }

  const blockingField = (requirements.blocking || []).find((key) => missingFields.includes(key))
  if (blockingField) {
    return {
      type: 'request_information',
      target: blockingField,
      message: `Recueillir : ${fieldLabel(blockingField)} (information bloquante).`,
    }
  }

  if (missingDocuments.length > 0) {
    return {
      type: 'request_missing_documents',
      target: missingDocuments[0],
      message: `Demander : ${documentLabel(missingDocuments[0])}.`,
    }
  }

  if (missingFields.length > 0) {
    return {
      type: 'request_information',
      target: missingFields[0],
      message: `Completer : ${fieldLabel(missingFields[0])}.`,
    }
  }

  return { type: 'ready', target: null, message: 'Dossier complet - pret pour le conseil.' }
}

module.exports = { scoreAgainst }
