/**
 * messagingService.js — Orchestrateur central de messaging COURTIA
 * 2026-04-25
 *
 * Route les messages selon le canal préféré du client :
 *   - email   → emailService
 *   - sms     → smsService (TextBelt gratuit)
 *
 * Stocke l'historique dans la table `messages`.
 *
 * Canaux supportés :
 *   email, sms, telegram, whatsapp (les 2 derniers via services existants)
 */

const pool = require('../db');
const { sendEmail } = require('./emailService');
const { sendSMS, sendBulkSMS } = require('./smsService');
const telegramService = require('./telegramService');

// ==================== CONFIGURATION ====================

const CANAL_PAR_DEFAUT = 'email';

// Canal → fonction d'envoi
const SENDERS = {
  email: async ({ to, message, subject }) => {
    return sendEmail({
      to,
      subject: subject || 'Message COURTIA',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px">
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color:#6b7280;font-size:12px">Envoyé via COURTIA</p>
      </div>`,
    });
  },
  sms: async ({ to, message }) => {
    return sendSMS({ to, message });
  },
  telegram: async ({ chatId, message }) => {
    return telegramService.sendMessage(chatId, message);
  },
  // WhatsApp : lien wa.me seulement (pas d'API gratuite)
  whatsapp: async ({ to, message }) => {
    const waLink = `https://wa.me/${to.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    return { success: true, channel: 'whatsapp', link: waLink, note: 'Lien WhatsApp généré (ouverture manuelle requise)' };
  },
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Détermine le canal à utiliser pour un client donné
 * Priorité : canal explicite > preferred_canal du client > 'email'
 */
async function resolveChannel(clientId, canalExplicite) {
  if (canalExplicite && SENDERS[canalExplicite]) {
    return canalExplicite;
  }

  if (clientId) {
    try {
      const res = await pool.query(
        'SELECT preferred_canal, email, phone FROM clients WHERE id = $1',
        [clientId]
      );
      if (res.rows.length > 0) {
        const client = res.rows[0];
        const pref = client.preferred_canal;
        if (pref && SENDERS[pref]) return pref;
      }
    } catch (err) {
      console.warn(`[Messaging] Erreur résolution canal client ${clientId}:`, err.message);
    }
  }

  return CANAL_PAR_DEFAUT;
}

/**
 * Détermine l'adresse de destination pour un client selon le canal
 */
async function resolveDestination(clientId, canal) {
  if (!clientId) return null;

  try {
    const res = await pool.query(
      'SELECT email, phone FROM clients WHERE id = $1',
      [clientId]
    );
    if (res.rows.length === 0) return null;

    const client = res.rows[0];
    if (canal === 'sms') return client.phone;
    if (canal === 'telegram') return client.phone; // fallback, Telegram utilise chatId
    return client.email; // email par défaut
  } catch (err) {
    console.warn(`[Messaging] Erreur résolution destination client ${clientId}:`, err.message);
    return null;
  }
}

/**
 * Enregistre un message dans l'historique
 */
async function logMessage({ clientId, canal, direction, content, status, externalId, error }) {
  try {
    const result = await pool.query(
      `INSERT INTO messages (client_id, canal, direction, content, status, external_id, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [clientId || null, canal, direction, content, status, externalId || null, error || null]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[Messaging] Erreur log message:', err.message);
    return null;
  }
}

// ==================== API PUBLIQUE ====================

/**
 * Envoie un message à un client via son canal préféré
 *
 * @param {Object} params
 * @param {number} params.clientId   - ID du client dans la DB
 * @param {string} [params.canal]    - Force un canal ('email', 'sms', 'telegram', 'whatsapp')
 * @param {string} params.message    - Contenu du message
 * @param {string} [params.subject]  - Sujet (email uniquement)
 * @param {Array}  [params.attachments] - Pièces jointes (email uniquement, non implémenté ici)
 * @returns {Promise<Object>}
 */
async function sendMessage({ clientId, canal, message, subject, attachments }) {
  if (!clientId && !canal) {
    return { success: false, error: 'clientId requis si aucun canal explicite' };
  }

  const canalEffectif = await resolveChannel(clientId, canal);
  const sender = SENDERS[canalEffectif];

  if (!sender) {
    return { success: false, error: `Canal non supporté: ${canalEffectif}` };
  }

  // Résoudre la destination
  const destination = await resolveDestination(clientId, canalEffectif);
  if (!destination && canalEffectif !== 'whatsapp') {
    const errResult = {
      success: false,
      error: `Aucune destination trouvée pour le canal ${canalEffectif} (client ${clientId})`,
      canal: canalEffectif,
    };
    await logMessage({
      clientId, canal: canalEffectif, direction: 'outgoing',
      content: message, status: 'failed', error: errResult.error,
    });
    return errResult;
  }

  // Construire les paramètres d'envoi
  const sendParams = {
    to: destination,
    message,
    subject,
  };

  // Envoyer
  const sendResult = await sender(sendParams);
  const status = sendResult.success ? 'sent' : 'failed';

  // Logger dans l'historique
  await logMessage({
    clientId,
    canal: canalEffectif,
    direction: 'outgoing',
    content: message,
    status,
    externalId: sendResult.id || null,
    error: sendResult.error || null,
  });

  return {
    ...sendResult,
    canal: canalEffectif,
    clientId,
  };
}

/**
 * Envoi groupé à plusieurs clients
 *
 * @param {Object} params
 * @param {number[]} params.clientIds - Liste d'IDs clients
 * @param {string} [params.canal]     - Canal forcé (sinon canal préféré de chaque client)
 * @param {string} params.message     - Contenu du message
 * @param {string} [params.subject]   - Sujet (email uniquement)
 * @returns {Promise<Object>} { sent, failed, total, results }
 */
async function sendBulk({ clientIds, canal, message, subject }) {
  if (!clientIds || clientIds.length === 0) {
    return { success: false, error: 'Aucun client spécifié', sent: 0, failed: 0, total: 0, results: [] };
  }

  const results = [];
  let sent = 0;
  let failed = 0;

  // Si canal = 'sms', on utilise l'envoi groupé natif de smsService
  if (canal === 'sms') {
    // Récupérer les téléphones des clients
    const recipients = [];
    for (const clientId of clientIds) {
      const phone = await resolveDestination(clientId, 'sms');
      if (phone) {
        recipients.push({ clientId, to: phone, message });
      } else {
        results.push({ clientId, success: false, error: 'Pas de téléphone', canal: 'sms' });
        failed++;
      }
    }

    if (recipients.length > 0) {
      const smsResult = await sendBulkSMS(recipients.map(r => ({ to: r.to, message })));
      for (let i = 0; i < recipients.length; i++) {
        const r = smsResult.results[i];
        const clientId = recipients[i].clientId;
        const status = r.success ? 'sent' : 'failed';
        if (r.success) sent++; else failed++;
        results.push({ clientId, ...r, canal: 'sms' });
        await logMessage({ clientId, canal: 'sms', direction: 'outgoing', content: message, status, externalId: r.id || null, error: r.error || null });
      }
    }
  } else {
    // Envoi individuel pour chaque client (email, telegram, etc.)
    for (const clientId of clientIds) {
      const result = await sendMessage({ clientId, canal, message, subject });
      results.push(result);
      if (result.success) sent++;
      else failed++;

      // Délai entre les envois pour éviter les rate limits
      if (clientIds.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  return { sent, failed, total: clientIds.length, results };
}

/**
 * Récupère l'historique des messages pour un client
 *
 * @param {number} clientId
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @param {string} [options.canal] - Filtrer par canal
 * @returns {Promise<Array>}
 */
async function getHistory(clientId, options = {}) {
  const { limit = 50, offset = 0, canal } = options;

  try {
    let query = 'SELECT * FROM messages WHERE client_id = $1';
    const params = [clientId];

    if (canal) {
      query += ' AND canal = $2';
      params.push(canal);
      query += ' ORDER BY created_at DESC LIMIT $3 OFFSET $4';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('[Messaging] Erreur getHistory:', err.message);
    return [];
  }
}

/**
 * Récupère les canaux disponibles et leurs statuts
 */
function getAvailableChannels() {
  return {
    email: { available: true, description: 'Email via Gmail SMTP' },
    sms: { available: true, description: 'SMS via TextBelt (1 gratuit/jour)' },
    telegram: { available: true, description: 'Notifications Telegram' },
    whatsapp: { available: true, description: 'Lien WhatsApp (ouverture manuelle)' },
  };
}

// ==================== EXPORT ====================

module.exports = {
  sendMessage,
  sendBulk,
  getHistory,
  getAvailableChannels,
  resolveChannel,
  logMessage,
};
