/**
 * COURTIA REACH — Compliance Service
 * Conformité RGPD, opt-out, sources, consentement.
 */

const SOURCES = {
  google_places: { label: 'Google Places (API officielle)', legal_basis: 'intérêt légitime (prospection B2B)' },
  csv_import: { label: 'Import CSV', legal_basis: 'fourni par l\'utilisateur' },
  manual: { label: 'Saisie manuelle', legal_basis: 'fourni par l\'utilisateur' },
  directory: { label: 'Annuaire public', legal_basis: 'données publiquement accessibles' },
};

const STATUSES = ['nouveau', 'a_contacter', 'contacte', 'interesse', 'rdv_pris', 'signe', 'perdu', 'opt_out'];

/**
 * Vérifier si un prospect est en opt-out.
 */
function isOptOut(prospect) {
  return prospect.status === 'opt_out';
}

/**
 * Marquer un prospect en opt-out.
 */
function markOptOut(prospect) {
  return {
    ...prospect,
    status: 'opt_out',
    opt_out_at: new Date().toISOString(),
  };
}

/**
 * Vérifier la conformité d'une campagne avant envoi.
 */
function validateCampaign(campaign) {
  const warnings = [];

  if (!campaign.name) warnings.push('La campagne doit avoir un nom');
  if (!campaign.target_description) warnings.push('Ajoutez une description de la cible');

  return {
    valid: warnings.length === 0,
    warnings,
    disclaimer: 'Tous les messages doivent être validés par un humain avant envoi. LinkedIn : pas d\'automatisation (message assisté uniquement). Google Places : utilisation via API officielle.',
  };
}

/**
 * Obtenir le badge de conformité pour une source.
 */
function getSourceBadge(source) {
  const s = SOURCES[source];
  if (!s) return { label: source || 'Inconnue', color: 'gray' };
  return {
    label: s.label,
    legal_basis: s.legal_basis,
    color: source === 'google_places' ? 'green' : source === 'manual' ? 'blue' : 'gray',
  };
}

module.exports = {
  isOptOut,
  markOptOut,
  validateCampaign,
  getSourceBadge,
  SOURCES,
  STATUSES,
};
