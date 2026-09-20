/**
 * Notifications opérationnelles COURTIA → UNE adresse administrateur.
 *
 * Principe : une seule variable porte l'adresse, jamais une adresse en dur dans
 * les écrans ou les services. `COURTIA_ADMIN_EMAIL` (Render, côté backend).
 *
 * RÈGLES DE SÛRETÉ
 *  - Une notification ne doit JAMAIS faire échouer le produit : `notifierAdmin`
 *    n'émet aucune exception, et `notifierAdminSansBloquer` ne bloque pas la
 *    requête en cours (une inscription ou une demande de démo n'attend pas un
 *    serveur d'e-mail).
 *  - Aucun statut trompeur : si l'envoi n'a pas eu lieu (adresse absente,
 *    fournisseur non configuré, erreur réseau), on répond `envoye: false` avec
 *    la raison réelle. Rien ne déclare « envoyé » sans succès du fournisseur.
 *  - Aucun secret, aucun mot de passe, aucun jeton, aucun document client dans
 *    le corps du message. On notifie un ÉVÉNEMENT et de quoi le traiter.
 */
const logger = require('../lib/logger')
const emailService = require('./emailService')

const VARIABLE = 'COURTIA_ADMIN_EMAIL'
const ADRESSE_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function adresseAdmin() {
  const brut = String(process.env[VARIABLE] || '').trim().toLowerCase()
  return ADRESSE_VALIDE.test(brut) ? brut : null
}

/** État lisible, sans secret : sert aux écrans d'administration et au diagnostic. */
function etatConfiguration() {
  const adresse = adresseAdmin()
  return {
    variable: VARIABLE,
    configuree: Boolean(adresse),
    adresse: adresse || null,
    fournisseur_email: emailService.getEmailStatus().provider || null,
    fournisseur_pret: emailService.isEmailEnabled(),
    envoi_possible: Boolean(adresse) && emailService.isEmailEnabled(),
  }
}

/**
 * Envoie une notification à l'adresse administrateur.
 * @returns {Promise<{envoye: boolean, raison?: string, provider?: string|null}>}
 */
async function notifierAdmin({ evenement, sujet, lignes = [], replyTo } = {}) {
  const destinataire = adresseAdmin()
  if (!destinataire) {
    logger.warn({ evenement }, `Notification admin ignorée : ${VARIABLE} non configurée`)
    return { envoye: false, raison: 'configuration_required' }
  }
  try {
    const corps = Array.isArray(lignes) ? lignes.filter(Boolean).join('\n') : String(lignes || '')
    const resultat = await emailService.sendEmail({
      to: destinataire,
      subject: sujet,
      text: corps,
      html: `<pre style="font-family:ui-monospace,monospace">${corps
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
      ...(replyTo ? { replyTo } : {}),
    })
    if (!resultat?.success) {
      logger.warn({ evenement, raison: resultat?.error || 'inconnu' }, 'Notification admin non envoyée')
      return { envoye: false, raison: resultat?.error || 'send_failed' }
    }
    return { envoye: true, provider: resultat.provider || null }
  } catch (err) {
    logger.warn({ evenement, err: err.message }, 'Notification admin en échec')
    return { envoye: false, raison: 'exception' }
  }
}

/**
 * Variante non bloquante : à utiliser depuis un chemin utilisateur (inscription,
 * demande de démo). Elle ne renvoie rien et ne peut pas interrompre la requête.
 */
function notifierAdminSansBloquer(charge) {
  try {
    Promise.resolve(notifierAdmin(charge)).catch((err) => {
      logger.warn({ evenement: charge?.evenement, err: err.message }, 'Notification admin en échec (non bloquante)')
    })
  } catch (err) {
    logger.warn({ evenement: charge?.evenement, err: err.message }, 'Notification admin en échec (non bloquante)')
  }
}

module.exports = { VARIABLE, adresseAdmin, etatConfiguration, notifierAdmin, notifierAdminSansBloquer }
