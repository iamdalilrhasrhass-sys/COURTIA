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

// Configuration IMAP
const IMAP_CONFIG = {
  imap: {
    user: process.env.IMAP_USER || 'arkcourtia@gmail.com',
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
      console.log(`[IMAP] ${messages.length} email(s) non lu(s) trouvé(s)`);
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
          console.error('[IMAP] Pool PostgreSQL non disponible — email ignoré');
          results.push({ from: emailData.from, error: 'pool_missing' });
          continue;
        }

        const result = await processInboundEmail(pool, emailData);
        results.push({ from: emailData.from, subject: emailData.subject, ...result });

        // Marquer comme lu (addFlags: ['\\Seen'])
        await connection.addFlags(item.attributes.uid, ['\\Seen']);
        totalProcessed++;
        console.log(`[IMAP] ✓ Traité: ${emailData.subject} → ${result.analyse?.type || '?'}`);

      } catch (err) {
        console.error('[IMAP] Erreur traitement email:', err.message);
        results.push({ error: err.message });
      }
    }

    await connection.end();
    lastCheck = new Date().toISOString();
    lastError = null;
    return results;

  } catch (err) {
    console.error('[IMAP] Erreur connexion/fetch:', err.message);
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
    console.log('[IMAP] Watcher déjà en cours');
    return;
  }

  // Stocker le pool globalement pour fetchUnreadEmails
  global.courtiaPool = pool;
  isRunning = true;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[IMAP] Démarrage watcher — intervalle: ${intervalMinutes} min`);
  console.log(`[IMAP] Compte: ${IMAP_CONFIG.imap.user}`);

  // Vérifier immédiatement
  fetchUnreadEmails().catch(err => console.error('[IMAP] Erreur initiale:', err.message));

  // Puis toutes les N minutes
  watcherInterval = setInterval(() => {
    fetchUnreadEmails().catch(err => console.error('[IMAP] Erreur cycle:', err.message));
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
    console.log('[IMAP] Watcher arrêté');
  }
}

/**
 * Retourne le statut du watcher
 */
function getIMAPStatus() {
  return {
    running: isRunning,
    user: IMAP_CONFIG.imap.user,
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
