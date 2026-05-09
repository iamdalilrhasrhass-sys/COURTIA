/**
 * @file imapService.js
 * Service GRATUIT de lecture des emails entrants via IMAP (Gmail).
 * Vérifie les nouveaux emails toutes les 5 minutes.
 * Transfère chaque email non lu à inboundProcessor pour analyse IA.
 *
 * Prérequis Gmail :
 *   - Activer "Accès IMAP" dans les paramètres Gmail
 *   - Générer un "Mot de passe d'application" (si 2FA activé)
 *   - Env vars : IMAP_USER, IMAP_PASSWORD
 *
 * Utilise imap-simple (npm) qui wrap node-imap.
 */

const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { processInboundEmail } = require('./inboundProcessor');
const logger = require('../lib/logger');

// Configuration IMAP
const IMAP_CONFIG = {
  imap: {
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASSWORD || '',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
  },
};

// État du watcher
let watcherInterval = null;
let isRunning = false;
let totalProcessed = 0;
let lastCheck = null;
let lastError = null;

/**
 * Récupère les emails non lus depuis la boîte INBOX
 */
async function fetchUnreadEmails() {
  try {
    if (!IMAP_CONFIG.imap.user || !IMAP_CONFIG.imap.password) {
      lastError = 'configuration_required';
      return { error: 'configuration_required', provider: 'imap', messages: [] };
    }
    const connection = await imaps.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    // Chercher les emails non lus (UNSEEN)
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // On marquera comme lu seulement après traitement réussi
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length > 0) {
      logger.info({ count: messages.length }, 'imap unread emails found');
    }

    const results = [];

    for (const item of messages) {
      try {
        const all = item.parts.find(p => p.which === '');
        const headerPart = item.parts.find(p => p.which === 'HEADER');
        const textPart = item.parts.find(p => p.which === 'TEXT');

        if (!all) continue;

        // Parser l'email complet avec mailparser (meilleure extraction)
        const parsed = await simpleParser(all.body);

        const emailData = {
          from: parsed.from?.text || headerPart?.body?.from?.[0] || 'inconnu',
          subject: parsed.subject || '(pas de sujet)',
          body: parsed.text || textPart?.body || parsed.html?.replace(/<[^>]*>/g, ' ') || '(corps vide)',
          attachments: (parsed.attachments || []).map(att => ({
            filename: att.filename || 'piece_jointe',
            contentType: att.contentType,
            size: att.size,
          })),
          date: parsed.date || new Date(),
          messageId: parsed.messageId || '',
        };

        // Transférer au processeur (le pool sera injecté par startIMAPWatcher)
        const pool = global.courtiaPool;
        if (!pool) {
          logger.warn({}, 'imap pool missing - email skipped');
          results.push({ error: 'pool_missing' });
          continue;
        }

        const result = await processInboundEmail(pool, emailData);
        results.push({ ...result });

        // Marquer comme lu (addFlags: ['\\Seen'])
        await connection.addFlags(item.attributes.uid, ['\\Seen']);
        totalProcessed++;
        logger.info({ type: result.analyse?.type || 'unknown' }, 'imap email processed');

      } catch (err) {
        logger.warn({ error: err.message }, 'imap email processing failed');
        results.push({ error: err.message });
      }
    }

    await connection.end();
    lastCheck = new Date().toISOString();
    lastError = null;
    return results;

  } catch (err) {
    logger.warn({ error: err.message }, 'imap fetch failed');
    lastError = err.message;
    return { error: err.message };
  }
}

/**
 * Démarre le watcher IMAP (boucle infinie avec setInterval)
 * @param {Object} pool - Instance pg Pool (stockée dans global pour usage interne)
 * @param {number} intervalMinutes - Intervalle en minutes (défaut: 5)
 */
function startIMAPWatcher(pool, intervalMinutes = 5) {
  if (isRunning) {
    logger.info({}, 'imap watcher already running');
    return;
  }

  // Stocker le pool globalement pour fetchUnreadEmails
  global.courtiaPool = pool;
  isRunning = true;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info({ interval_minutes: intervalMinutes, configured: Boolean(IMAP_CONFIG.imap.user) }, 'imap watcher starting');

  // Vérifier immédiatement
  fetchUnreadEmails().catch(err => logger.warn({ error: err.message }, 'imap initial check failed'));

  // Puis toutes les N minutes
  watcherInterval = setInterval(() => {
    fetchUnreadEmails().catch(err => logger.warn({ error: err.message }, 'imap cycle failed'));
  }, intervalMs);

  // Empêcher Node de s'arrêter (le watcher maintient le processus)
  watcherInterval.unref?.();
}

/**
 * Arrête le watcher IMAP
 */
function stopIMAPWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    isRunning = false;
    logger.info({}, 'imap watcher stopped');
  }
}

/**
 * Retourne le statut du watcher
 */
function getIMAPStatus() {
  return {
    running: isRunning,
    configured: Boolean(IMAP_CONFIG.imap.user && IMAP_CONFIG.imap.password),
    total_processed: totalProcessed,
    last_check: lastCheck,
    last_error: lastError,
    interval_minutes: watcherInterval ? 5 : 0,
  };
}

/**
 * Vérification unique (one-shot) — utile pour tests ou déclenchement manuel
 */
async function checkOnce(pool) {
  global.courtiaPool = pool;
  return fetchUnreadEmails();
}

module.exports = {
  startIMAPWatcher,
  stopIMAPWatcher,
  checkOnce,
  getIMAPStatus,
};
