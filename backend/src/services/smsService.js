/**
 * smsService.js — SMS GRATUIT via TextBelt
 * COURTIA — 2026-04-25
 *
 * TextBelt : 1 SMS gratuit/jour en dev avec la clé 'textbelt'
 * Auto-hébergement possible pour SMS illimités (VPS à 3$/mois)
 * https://textbelt.com
 *
 * Pas de Twilio (payant) — Zéro service payant.
 *
 * Env vars :
 *   SMS_PROVIDER=textbelt          (par défaut)
 *   TEXTBELT_API_KEY=textbelt      (clé gratuite, 1 SMS/jour)
 *   TEXTBELT_SELF_HOST_URL=        (optionnel, pour auto-hébergement)
 */

const axios = require('axios');

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'textbelt';
const TEXTBELT_API_KEY = process.env.TEXTBELT_API_KEY || 'textbelt';
const TEXTBELT_SELF_HOST_URL = process.env.TEXTBELT_SELF_HOST_URL || null;

const TEXTBELT_URL = TEXTBELT_SELF_HOST_URL
  ? `${TEXTBELT_SELF_HOST_URL}/text`
  : 'https://textbelt.com/text';

/**
 * Nettoie un numéro de téléphone au format international E.164
 * Ex: "06 12 34 56 78" → "+33612345678"
 */
function sanitizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\.\-\(\)]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+33' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Envoie un SMS via TextBelt
 * @param {Object} params
 * @param {string} params.to      - Numéro du destinataire (format FR ou international)
 * @param {string} params.message - Contenu du SMS (max 160 caractères recommandé)
 * @returns {Promise<Object>} { success: boolean, quotaRemaining: number, id: string, provider: string }
 */
async function sendSMS({ to, message }) {
  const phone = sanitizePhone(to);
  if (!phone) {
    console.error('[SMS] Numéro invalide:', to);
    return { success: false, error: 'Numéro de téléphone invalide', provider: SMS_PROVIDER };
  }

  if (!message || message.trim().length === 0) {
    console.error('[SMS] Message vide');
    return { success: false, error: 'Message vide', provider: SMS_PROVIDER };
  }

  console.log(`[SMS] Envoi via ${SMS_PROVIDER} → ${phone} (${message.length} chars)`);

  try {
    const payload = {
      phone,
      message: message.trim(),
      key: TEXTBELT_API_KEY,
    };

    const response = await axios.post(TEXTBELT_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = response.data;

    if (data.success) {
      console.log(`[SMS] ✅ Envoyé — ID: ${data.id || data.textId}, Quota restant: ${data.quotaRemaining || 'N/A'}`);
      return {
        success: true,
        id: data.id || data.textId,
        quotaRemaining: data.quotaRemaining,
        provider: SMS_PROVIDER,
      };
    } else {
      // TextBelt renvoie success:false avec une erreur explicite
      const errorMsg = data.error || 'Erreur inconnue TextBelt';
      console.error(`[SMS] ❌ Échec TextBelt: ${errorMsg}`);

      // Suggestions utiles selon l'erreur
      if (errorMsg.includes('free') || errorMsg.includes('upgrade')) {
        console.warn('[SMS] 💡 Limite gratuite atteinte (1 SMS/jour). Auto-hébergez TextBelt pour SMS illimités : https://github.com/typpo/textbelt');
      }

      return {
        success: false,
        error: errorMsg,
        provider: SMS_PROVIDER,
      };
    }
  } catch (err) {
    console.error(`[SMS] ❌ Erreur réseau/API: ${err.message}`);
    return {
      success: false,
      error: err.message,
      provider: SMS_PROVIDER,
    };
  }
}

/**
 * Envoi groupé de SMS (séquentiel pour respecter les limites)
 * @param {Array<{to: string, message: string}>} recipients
 * @returns {Promise<Object>} { sent: number, failed: number, results: Array }
 */
async function sendBulkSMS(recipients) {
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const { to, message } of recipients) {
    const result = await sendSMS({ to, message });
    results.push({ to, ...result });
    if (result.success) sent++;
    else failed++;

    // Petit délai entre chaque envoi (pas de rate limit stricte en gratuit, mais poli)
    if (recipients.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[SMS Bulk] ${sent} envoyés, ${failed} échoués sur ${recipients.length}`);
  return { sent, failed, total: recipients.length, results };
}

/**
 * Vérifie le statut du quota TextBelt
 * @returns {Promise<Object>}
 */
async function checkQuota() {
  try {
    // TextBelt n'a pas d'endpoint /status officiel en gratuit,
    // on fait une requête légère pour voir
    const response = await axios.get(
      `https://textbelt.com/status/${TEXTBELT_API_KEY}`,
      { timeout: 10000 }
    );
    return { success: true, ...response.data };
  } catch (err) {
    // Pas critique, on retourne juste une erreur silencieuse
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendSMS,
  sendBulkSMS,
  checkQuota,
  sanitizePhone,
};
