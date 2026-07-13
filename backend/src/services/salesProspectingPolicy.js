const PIPELINE_STATUSES = Object.freeze([
  'non_attribue',
  'a_contacter',
  'appel_en_cours',
  'appel_tente',
  'injoignable',
  'a_rappeler',
  'contact_etabli',
  'contact_qualifie',
  'interesse',
  'rdv_a_programmer',
  'rdv_programme',
  'demo_programmee',
  'demo_realisee',
  'proposition_a_envoyer',
  'proposition_envoyee',
  'negociation',
  'signe',
  'client_actif',
  'refuse',
  'pas_interesse',
  'non_pertinent',
  'ne_plus_contacter',
  'cabinet_ferme',
])

const TERMINAL_STATUSES = new Set([
  'signe',
  'client_actif',
  'refuse',
  'pas_interesse',
  'non_pertinent',
  'ne_plus_contacter',
  'cabinet_ferme',
])

const CALL_OUTCOMES = Object.freeze([
  'oui',
  'non',
  'pas_de_reponse',
  'mauvais_numero',
  'a_rappeler',
  'refus',
  'contact_indisponible',
  'deja_equipe',
  'pas_interesse',
  'numero_invalide',
  'autre',
])

const NEXT_STEPS = Object.freeze([
  'envoyer_presentation',
  'envoyer_email',
  'rappeler',
  'organiser_demo',
  'envoyer_proposition',
  'attendre_reponse',
  'classer_non_pertinent',
])

function cleanText(value, max = 500) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : null
}

function cleanDigits(value, max) {
  const normalized = String(value || '').replace(/\D/g, '')
  return normalized ? normalized.slice(0, max) : null
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const normalized = typeof value === 'string'
    ? value.replace(/\s/g, '').replace(',', '.')
    : value
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function employeeScore(count) {
  if (count === null) return null
  if (count <= 1) return 4
  if (count <= 4) return 12
  if (count <= 9) return 22
  if (count <= 19) return 34
  if (count <= 49) return 45
  if (count <= 249) return 54
  return 60
}

function revenueScore(revenue) {
  if (revenue === null) return null
  if (revenue < 250000) return 3
  if (revenue < 1000000) return 7
  if (revenue < 5000000) return 13
  if (revenue < 25000000) return 19
  return 25
}

function establishmentScore(count) {
  if (count === null) return null
  if (count <= 1) return 1
  if (count <= 3) return 4
  if (count <= 10) return 7
  return 10
}

function categoryScore(category) {
  const value = String(category || '').toLowerCase()
  if (!value) return null
  if (value.includes('micro')) return 1
  if (value.includes('pme') || value.includes('petite')) return 3
  if (value.includes('eti') || value.includes('intermediaire')) return 4
  if (value.includes('grande') || value.includes('groupe')) return 5
  return 2
}

function categoryFromScore(score) {
  if (score < 12) return 'independant_micro'
  if (score < 25) return 'tres_petit'
  if (score < 45) return 'petit'
  if (score < 68) return 'intermediaire'
  if (score < 88) return 'grand'
  return 'groupe_national'
}

function calculateSizeScore(input = {}) {
  const employees = toNullableNumber(input.employee_count ?? input.employeeCount)
  const revenue = toNullableNumber(input.revenue_eur ?? input.revenueEur)
  const establishments = toNullableNumber(input.establishment_count ?? input.establishmentCount)
  const companyCategory = cleanText(input.company_category ?? input.companyCategory, 80)

  const components = {
    employees: employeeScore(employees),
    revenue: revenueScore(revenue),
    establishments: establishmentScore(establishments),
    company_category: categoryScore(companyCategory),
  }
  const known = Object.entries(components).filter(([, value]) => value !== null)
  const rawScore = known.length ? known.reduce((sum, [, value]) => sum + value, 0) : 8
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100))
  const missing = Object.entries(components).filter(([, value]) => value === null).map(([key]) => key)
  const explanationParts = []
  if (employees !== null) explanationParts.push(`${employees} salarié(s) — composante principale`)
  if (revenue !== null) explanationParts.push(`${Math.round(revenue).toLocaleString('fr-FR')} € de CA`)
  if (establishments !== null) explanationParts.push(`${establishments} établissement(s)`)
  if (companyCategory) explanationParts.push(`catégorie ${companyCategory}`)
  if (!explanationParts.length) explanationParts.push('aucun indicateur quantitatif disponible')

  return {
    score,
    category: categoryFromScore(score),
    estimated: missing.length > 0,
    explanation: `${explanationParts.join(' ; ')}. ${missing.length ? `Estimation : données manquantes (${missing.join(', ')}).` : 'Données complètes.'}`,
    components,
  }
}

function normalizeCabinetPayload(input = {}) {
  const size = calculateSizeScore(input)
  return {
    legal_name: cleanText(input.legal_name ?? input.raison_sociale, 255),
    trade_name: cleanText(input.trade_name ?? input.nom_commercial, 255),
    siren: cleanDigits(input.siren, 9),
    siret: cleanDigits(input.siret, 14),
    orias_number: cleanText(input.orias_number ?? input.numero_orias, 40),
    address: cleanText(input.address ?? input.adresse, 1000),
    postal_code: cleanText(input.postal_code ?? input.code_postal, 10),
    city: cleanText(input.city ?? input.ville, 120),
    department: cleanText(input.department ?? input.departement, 100),
    region: cleanText(input.region, 120),
    phone: cleanText(input.phone ?? input.telephone, 40),
    professional_email: cleanText(input.professional_email ?? input.email_professionnel ?? input.email, 255)?.toLowerCase() || null,
    website: cleanText(input.website ?? input.site_internet, 500),
    legal_representative_name: cleanText(input.legal_representative_name ?? input.nom_dirigeant, 255),
    primary_contact_name: cleanText(input.primary_contact_name ?? input.nom_contact_principal, 255),
    primary_contact_role: cleanText(input.primary_contact_role ?? input.fonction_contact, 160),
    employee_count: toNullableNumber(input.employee_count ?? input.nombre_salaries),
    revenue_eur: toNullableNumber(input.revenue_eur ?? input.chiffre_affaires),
    establishment_count: toNullableNumber(input.establishment_count ?? input.nombre_etablissements),
    company_category: cleanText(input.company_category ?? input.categorie_entreprise, 80),
    size_category: size.category,
    size_score: size.score,
    size_is_estimated: size.estimated,
    size_explanation: size.explanation,
    data_source: cleanText(input.data_source ?? input.source, 120) || 'manual',
    source_url: cleanText(input.source_url, 1000),
    verified_at: input.verified_at ?? input.date_verification ?? null,
    priority: ['basse', 'normale', 'haute', 'urgente'].includes(input.priority) ? input.priority : 'normale',
    notes: cleanText(input.notes, 5000),
  }
}

function validateCabinetPayload(cabinet) {
  const errors = []
  if (!cabinet.legal_name) errors.push('raison_sociale_required')
  if (cabinet.siren && cabinet.siren.length !== 9) errors.push('siren_invalid')
  if (cabinet.siret && cabinet.siret.length !== 14) errors.push('siret_invalid')
  if (cabinet.professional_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cabinet.professional_email)) errors.push('email_invalid')
  return errors
}

function validateCallResult(input = {}) {
  const errors = []
  const outcome = cleanText(input.outcome, 40)
  const reached = input.reached === true || outcome === 'oui'
  if (!CALL_OUTCOMES.includes(outcome)) errors.push('outcome_required')
  if (reached) {
    if (!cleanText(input.contacted_person_name, 255)) errors.push('contacted_person_name_required')
    if (!['faible', 'moyen', 'fort', 'tres_fort'].includes(input.interest_level)) errors.push('interest_level_required')
    if (!cleanText(input.identified_need, 3000)) errors.push('identified_need_required')
    if (!NEXT_STEPS.includes(input.next_step)) errors.push('next_step_required')
  } else {
    if (!cleanText(input.comment, 3000)) errors.push('failure_comment_required')
    if (!['oui', 'non', 'plus_tard'].includes(input.callback_decision)) errors.push('callback_decision_required')
    if (input.callback_decision === 'oui' && !input.callback_at) errors.push('callback_at_required')
  }
  return { valid: errors.length === 0, errors, reached }
}

function statusAfterCall(input = {}) {
  const outcome = input.outcome
  if (input.reached === true || outcome === 'oui') {
    if (input.next_step === 'organiser_demo') return 'demo_programmee'
    if (input.next_step === 'envoyer_proposition') return 'proposition_a_envoyer'
    if (input.next_step === 'classer_non_pertinent') return 'non_pertinent'
    if (['fort', 'tres_fort'].includes(input.interest_level)) return 'interesse'
    return 'contact_qualifie'
  }
  if (input.callback_decision === 'oui' || outcome === 'a_rappeler') return 'a_rappeler'
  if (outcome === 'refus') return 'refuse'
  if (outcome === 'pas_interesse' || outcome === 'deja_equipe') return 'pas_interesse'
  if (outcome === 'mauvais_numero' || outcome === 'numero_invalide') return 'injoignable'
  if (outcome === 'pas_de_reponse' || outcome === 'contact_indisponible') return 'appel_tente'
  return 'appel_tente'
}

module.exports = {
  PIPELINE_STATUSES,
  TERMINAL_STATUSES,
  CALL_OUTCOMES,
  NEXT_STEPS,
  calculateSizeScore,
  cleanText,
  cleanDigits,
  toNullableNumber,
  normalizeCabinetPayload,
  validateCabinetPayload,
  validateCallResult,
  statusAfterCall,
}
