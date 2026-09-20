/* ============================================================================
   COURTIA — Helpers de formatage des fiches clients / listes
   ----------------------------------------------------------------------------
   POURQUOI ce fichier passe par lib/monnaie.js : ses dates étaient figées en
   « fr-FR » et ses montants en euros. La devise ET la locale viennent maintenant
   du marché du cabinet (profil réel, cf. lib/monnaie.js) : CHF + fr-CH en
   Suisse, EUR + fr-FR sinon. Valeur absente → « — », jamais 0.
   ========================================================================== */

import { fmtMontant, fmtDate } from '../lib/monnaie'

export function formatNomClient(client) {
  const nom = `${client.nom || client.first_name || ''} ${client.prenom || client.last_name || ''}`.trim()
  return nom || client.email || 'Client sans nom'
}

/** Date selon la locale du marché du cabinet ; absente → « — ». */
export function formatDate(dateStr) {
  return fmtDate(dateStr)
}

/** Montant dans la devise du cabinet ; absent → « — ». */
export function formatEuros(montant) {
  return fmtMontant(montant, { maximumFractionDigits: 0 })
}

export function formatTelephone(tel) {
  if (!tel) return '—'
  return tel.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

export function formatJoursRestants(dateEcheance) {
  const jours = Math.ceil((new Date(dateEcheance) - new Date()) / (1000 * 60 * 60 * 24))
  if (jours < 0) return 'Expiré'
  if (jours === 0) return "Aujourd'hui"
  return `dans ${jours} jour${jours > 1 ? 's' : ''}`
}
