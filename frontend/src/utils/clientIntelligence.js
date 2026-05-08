/**
 * @file clientIntelligence.js — Central engine for client bubble intelligence.
 * Computes priority, risk, opportunity, signals, and WhatsApp actions.
 * Uses existing scoring.js for core calculations.
 */
import { computeScores } from '../lib/scoring'

// ─── CONSTANTS ───
const TYPE_MAP = {
  particulier: 'particulier',
  professionnel: 'professionnel',
  tpe: 'tpe_pme',
  pme: 'tpe_pme',
  entreprise: 'tpe_pme',
}
const STATUS_MAP = {
  actif: 'actif', prospect: 'prospect',
  inactif: 'inactif', résilié: 'resilié', resilié: 'resilié',
  perdu: 'resilié', a_risque: 'actif', opportunite: 'actif',
  en_attente: 'en_attente',
}

// ─── MAIN EXPORT ───
/**
 * Compute complete client intelligence profile.
 * @param {Object} client — Client from API (enriched with loyalty_score, lifetime_value, etc.)
 * @param {Array} quotes — Client's quotes/contracts
 * @param {Array} appointments — Client's appointments/tasks
 * @returns {Object} Full intelligence profile
 */
export function computeClientIntelligence(client, quotes = [], appointments = []) {
  if (!client) return null

  const scores = computeScores(client, quotes, appointments)
  if (!scores) return null

  const type = getClientType(client)
  const status = getClientStatus(client)
  const priority = getPriorityLevel(scores, client, appointments)
  const risk = getRiskLevel(scores, client)
  const opportunity = getOpportunityLevel(scores, client)
  const signal = getMainSignal(scores, priority, risk)
  const action = getNextBestAction(scores, priority, client, type)
  const whatsappMessage = getWhatsappMessageTemplate(client, type, status, signal, scores)
  const badges = getBadges(scores, client, quotes)
  const reasons = scores.raisons || []

  return {
    clientType: type,
    status,
    priorityLevel: priority,
    riskLevel: risk,
    opportunityLevel: opportunity,
    visualVariant: `${type}_${status}_${priority}`,
    mainSignal: signal,
    nextBestAction: action,
    whatsappMessage,
    badges,
    reasons,
    scores,
    displayName: getDisplayName(client),
    initials: getInitials(client),
    hasPhone: !!(client.mobile || client.telephone),
    phone: client.mobile || client.telephone || null,
  }
}

// ─── TYPE ───
function getClientType(client) {
  const seg = (client.segment || client.type || '').toLowerCase()
  const profession = (client.profession || '').toLowerCase()
  const proKeywords = ['médecin','dentiste','avocat','notaire','architecte','chef','directeur','gérant','pharmacien','ingénieur']
  const isPro = proKeywords.some(kw => profession.includes(kw)) || ['professionnel','tpe','pme','entreprise'].includes(seg)
  if (isPro) return (client.lifetime_value || 0) > 100000 ? 'vip' : TYPE_MAP[seg] || 'professionnel'
  if (seg === 'particulier') return 'particulier'
  return (client.company_name || client.siret) ? 'professionnel' : 'particulier'
}

// ─── STATUS ───
function getClientStatus(client) {
  const raw = (client.statut || client.status || 'prospect').toLowerCase()
  return STATUS_MAP[raw] || 'prospect'
}

// ─── PRIORITY ───
function getPriorityLevel(scores, client, appointments) {
  const { risque, retention, opportunite, prochaineEcheanceDays, completude, valeur_eur } = scores
  const hasAlert = !!(client.silent_alert)
  const overdueTask = appointments?.some(t => {
    const d = t.start_time || t.echeance
    return d && new Date(d) < new Date() && (t.status || t.statut) !== 'terminee'
  })

  // Urgent
  if (hasAlert && risque > 60) return 'urgent'
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 15) return 'urgent'
  if (overdueTask && (risque > 40 || retention < 40)) return 'urgent'
  if (valeur_eur > 50000 && retention < 45) return 'urgent'

  // High
  if (hasAlert) return 'high'
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) return 'high'
  if (risque > 70) return 'high'
  if (retention < 40 && nbActifs(scores) > 0) return 'high'
  if (completude < 40 && nbActifs(scores) > 0) return 'high'
  if (opportunite > 80) return 'high'

  // Medium
  if (opportunite > 60) return 'medium'
  if (completude < 70) return 'medium'
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 60) return 'medium'
  const daysSinceContact = lastContactDays(client)
  if (daysSinceContact > 90 && nbActifs(scores) > 0) return 'medium'

  return 'low'
}

// ─── RISK ───
function getRiskLevel(scores, client) {
  const { risque } = scores
  if (client.silent_alert || risque >= 70) return 'high'
  if (risque >= 40) return 'medium'
  return 'low'
}

// ─── OPPORTUNITY ───
function getOpportunityLevel(scores, client) {
  const { opportunite } = scores
  if (opportunite >= 75) return 'high'
  if (opportunite >= 50) return 'medium'
  return 'low'
}

// ─── MAIN SIGNAL ───
function getMainSignal(scores, priority, risk) {
  const { prochaineEcheanceDays, completude, retention, opportunite, nbActifs } = scores
  if (priority === 'urgent' && risk === 'high') return 'Alerte'
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) return 'Échéance'
  if (retention < 40 && (nbActifs > 0)) return 'À relancer'
  if (completude < 50) return 'Incomplet'
  if (opportunite >= 70) return 'Opportunité'
  if (risk === 'high') return 'Risque'
  if (nbActifs === 0) return 'Inactif'
  return 'Stable'
}

// ─── NEXT BEST ACTION ───
function getNextBestAction(scores, priority, client, type) {
  const { prochaineEcheanceDays, retention, opportunite, completude, nbActifs } = scores
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) return 'relance_echeance'
  if (retention < 40 && nbActifs > 0) return 'relance_retention'
  if (completude < 50) return 'completer_dossier'
  if (opportunite >= 70 && nbActifs <= 1) return 'cross_sell'
  if (type === 'professionnel' || type === 'tpe_pme') return 'proposition_pro'
  if (client.silent_alert) return 'appeler_urgent'
  if (nbActifs === 0) return 'reconquerir'
  return 'suivi_standard'
}

// ─── BADGES ───
function getBadges(scores, client, quotes) {
  const badges = []
  if (client.silent_alert) badges.push({ symbol: '!', label: 'Alerte', priority: 'high' })
  if (scores.opportunite >= 70) badges.push({ symbol: '€', label: 'Opportunité', priority: 'medium' })
  if (scores.prochaineEcheanceDays !== null && scores.prochaineEcheanceDays <= 30)
    badges.push({ symbol: '⏱', label: `J-${scores.prochaineEcheanceDays}`, priority: 'high' })
  if (scores.completude < 50) badges.push({ symbol: '?', label: 'Incomplet', priority: 'medium' })
  if (scores.retention >= 70 && scores.completude >= 70)
    badges.push({ symbol: '✓', label: 'Stable', priority: 'low' })
  if (scores.nbActifs === 1 && scores.fidelite > 40)
    badges.push({ symbol: '↗', label: 'Multi', priority: 'medium' })
  return badges
}

// ─── WHATSAPP TEMPLATE ───
function getWhatsappMessageTemplate(client, type, status, signal, scores) {
  const name = client.prenom || client.first_name || ''
  if (!name) return null
  const brokerName = 'votre courtier'

  const templates = {
    prospect: `Bonjour ${name}, c'est ${brokerName}. Je reviens vers vous concernant votre demande d'assurance. Est-ce que vous êtes disponible aujourd'hui pour faire le point rapidement ?`,
    echeance: `Bonjour ${name}, je vous contacte car votre contrat arrive bientôt à échéance. Je peux vérifier si on peut améliorer vos garanties ou votre tarif. Vous êtes disponible aujourd'hui ?`,
    inactif: `Bonjour ${name}, je me permets de revenir vers vous pour faire un point rapide sur vos assurances. Votre situation a peut-être évolué depuis notre dernier échange.`,
    resilié: `Bonjour ${name}, je voulais reprendre contact avec vous pour voir si votre situation d'assurance est bien stabilisée. Si besoin, je peux refaire un point avec vous.`,
    incomplet: `Bonjour ${name}, il me manque quelques éléments pour finaliser votre dossier. Vous pouvez me confirmer vos disponibilités pour qu'on termine cela rapidement ?`,
    opportunite: `Bonjour ${name}, en regardant votre dossier, je pense qu'on peut peut-être optimiser plusieurs contrats ensemble. Je peux vous faire un point rapide si vous êtes disponible.`,
    risque: `Bonjour ${name}, je souhaitais faire un point avec vous sur votre situation assurance. Je suis disponible pour en discuter quand vous voulez.`,
    standard: `Bonjour ${name}, c'est ${brokerName}. Je souhaitais prendre de vos nouvelles et faire le point sur vos assurances. N'hésitez pas à me dire quand vous êtes disponible.`,
  }

  if (status === 'prospect') return templates.prospect
  if (signal === 'Échéance') return templates.echeance
  if (status === 'inactif' || scores.nbActifs === 0) return templates.inactif
  if (status === 'resilié') return templates.resilié
  if (signal === 'Incomplet') return templates.incomplet
  if (signal === 'Opportunité') return templates.opportunite
  if (signal === 'Risque' || signal === 'Alerte') return templates.risque
  return templates.standard
}

// ─── HELPERS ───
function getDisplayName(client) {
  if (client.name) return client.name
  const name = `${client.prenom || client.first_name || ''} ${client.nom || client.last_name || ''}`.trim()
  if (name) return name
  if (client.company_name) return client.company_name
  return '—'
}

function getInitials(client) {
  const name = getDisplayName(client)
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function nbActifs(scores) { return scores.nbActifs || 0 }

function lastContactDays(client) {
  if (!client.last_contact) return 999
  return Math.floor((Date.now() - new Date(client.last_contact).getTime()) / 86400000)
}
