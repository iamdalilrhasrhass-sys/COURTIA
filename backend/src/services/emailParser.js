// ============================================================
// /srv/courtia/backend/src/services/emailParser.js
// KILLER FEATURE #7 — Email Parser entrant
// IMAP listener → classification IA → suggestion de réponse
// Boucle commerciale fermée : relance → réponse → action auto
// ============================================================

const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const OpenAI = require('openai');
const crypto = require('crypto');
const pool = require('../db');

const deepseek = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

// Chiffrement password IMAP (AES-256-GCM, clé depuis .env)
const ENCRYPT_KEY = (process.env.ENCRYPT_KEY || 'courtia-default-key-32-chars-aaa').slice(0, 32).padEnd(32, '0');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPT_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(payload) {
  const [ivHex, tagHex, data] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPT_KEY), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function saveEmailSettings(userId, settings) {
  const encrypted = settings.imap_password ? encrypt(settings.imap_password) : null;
  await pool.query(`
    INSERT INTO user_email_settings (user_id, imap_host, imap_port, imap_user, imap_password_encrypted, imap_tls, inbox_folder, signature, enabled, scan_interval_minutes, updated_at)
    VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT imap_password_encrypted FROM user_email_settings WHERE user_id=$1)), $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      imap_host=$2, imap_port=$3, imap_user=$4,
      imap_password_encrypted=COALESCE($5, user_email_settings.imap_password_encrypted),
      imap_tls=$6, inbox_folder=$7, signature=$8, enabled=$9, scan_interval_minutes=$10, updated_at=NOW()
  `, [userId, settings.imap_host, settings.imap_port || 993, settings.imap_user, encrypted,
      settings.imap_tls !== false, settings.inbox_folder || 'INBOX', settings.signature || '',
      settings.enabled || false, settings.scan_interval_minutes || 5]);
}

async function getEmailSettings(userId) {
  const r = await pool.query(`SELECT * FROM user_email_settings WHERE user_id=$1`, [userId]);
  if (!r.rows[0]) return null;
  const s = r.rows[0];
  return { ...s, imap_password: s.imap_password_encrypted ? decrypt(s.imap_password_encrypted) : null };
}

async function classifyAndExtract(email, clientContext = null) {
  const prompt = `Tu analyses un email reçu par un courtier en assurance pour son compte.

EMAIL :
De : ${email.from}
Sujet : ${email.subject}
Corps :
"""
${(email.body_text || '').slice(0, 4000)}
"""

${clientContext ? `CLIENT CONNU :
- ${clientContext.last_name} ${clientContext.first_name || ''}
- Type : ${clientContext.type}
- Dernière opportunité : ${clientContext.last_opportunity || 'aucune'}
- Statut : ${clientContext.status}` : 'CLIENT INCONNU (nouveau lead potentiel)'}

PRODUIS UN JSON STRICT :
{
  "classification": "positive_response|question|objection|refusal|signed|unrelated|new_lead|complaint",
  "sentiment": "positif|neutre|negatif",
  "urgency": "haute|moyenne|basse",
  "intent": {
    "demande_principale": "string courte",
    "attente_client": "ce que le client attend concrètement",
    "blocage_eventuel": "string ou null"
  },
  "key_questions": ["liste des questions posées par le client"],
  "suggested_reply_subject": "Re: ... (max 80 chars)",
  "suggested_reply": "string — réponse complète, vouvoiement, ton pro et chaleureux, max 150 mots, signature non incluse",
  "suggested_next_action": "verbe d'action court ARK doit faire après la réponse",
  "should_create_opportunity": true|false,
  "should_update_opportunity_status": "string|null — nouveau statut si applicable"
}

RÈGLES :
- Si classification="signed" : c'est une acceptation explicite du devis
- Si "refusal" : ton de réponse respectueux, garder porte ouverte
- Si "objection" : la réponse doit traiter l'objection avec argument concret
- Si "new_lead" : réponse de remerciement + demande qualification (besoin, urgence, budget)
- N'invente JAMAIS un tarif ou une garantie spécifique
- La réponse doit toujours proposer une prochaine étape claire (RDV, doc à envoyer, etc.)`;

  const c = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1500
  });

  return JSON.parse(c.choices[0].message.content);
}

async function processEmail(userId, raw) {
  const parsed = await simpleParser(raw);
  const messageId = parsed.messageId;
  if (!messageId) return null;

  // Déduplication
  const existing = await pool.query(`SELECT id FROM parsed_emails WHERE message_id=$1`, [messageId]);
  if (existing.rows.length) return existing.rows[0];

  const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
  const fromName = parsed.from?.value?.[0]?.name || '';
  const subject = parsed.subject || '';
  const bodyText = parsed.text || '';
  const bodyHtml = parsed.html || '';

  // Match client par email
  let clientRow = null;
  let clientContext = null;
  if (fromEmail) {
    const m = await pool.query(`
      SELECT c.*, (SELECT product_current FROM opportunites WHERE client_id=c.id ORDER BY created_at DESC LIMIT 1) last_opportunity
      FROM clients c WHERE LOWER(c.email)=$1 AND c.courtier_id=$2 LIMIT 1
    `, [fromEmail, userId]);
    if (m.rows[0]) {
      clientRow = m.rows[0];
      clientContext = clientRow;
    }
  }

  const analysis = await classifyAndExtract({
    from: fromEmail,
    subject,
    body_text: bodyText
  }, clientContext);

  // Match opportunité si client connu
  let opportunityId = null;
  if (clientRow) {
    const opp = await pool.query(`
      SELECT id FROM opportunites WHERE client_id=$1 AND status NOT IN ('signe','perdu')
      ORDER BY estimated_revenue DESC LIMIT 1
    `, [clientRow.id]);
    opportunityId = opp.rows[0]?.id || null;

    // Update statut opportunité si IA suggère
    if (opportunityId && analysis.should_update_opportunity_status) {
      await pool.query(`UPDATE opportunites SET status=$1, updated_at=NOW() WHERE id=$2`,
        [analysis.should_update_opportunity_status, opportunityId]).catch(() => {});
    }
  }

  // Création nouveau lead si suggéré et inconnu
  if (!clientRow && analysis.should_create_opportunity && fromEmail) {
    const inserted = await pool.query(`
      INSERT INTO clients (courtier_id, last_name, email, phone, type, status, source, created_at)
      VALUES ($1, $2, $3, '', 'particulier', 'prospect', 'email_inbound', NOW()) RETURNING id
    `, [userId, fromName || fromEmail.split('@')[0], fromEmail]).catch(() => ({ rows: [] }));
    if (inserted.rows[0]) clientRow = { id: inserted.rows[0].id };
  }

  const result = await pool.query(`
    INSERT INTO parsed_emails (
      message_id, user_id, client_id, opportunity_id, from_email, from_name, subject,
      body_text, body_html, received_at, classification, sentiment, urgency,
      intent, key_questions, suggested_reply, suggested_subject, suggested_next_action, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending') RETURNING *
  `, [
    messageId, userId, clientRow?.id || null, opportunityId, fromEmail, fromName, subject,
    bodyText, bodyHtml, parsed.date || new Date(),
    analysis.classification, analysis.sentiment, analysis.urgency,
    analysis.intent, JSON.stringify(analysis.key_questions || []),
    analysis.suggested_reply, analysis.suggested_reply_subject, analysis.suggested_next_action
  ]);

  return result.rows[0];
}

async function scanInbox(userId) {
  const settings = await getEmailSettings(userId);
  if (!settings || !settings.enabled || !settings.imap_password) {
    return { scanned: 0, processed: 0, error: 'not_configured' };
  }

  const config = {
    imap: {
      user: settings.imap_user,
      password: settings.imap_password,
      host: settings.imap_host,
      port: settings.imap_port,
      tls: settings.imap_tls,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }
    }
  };

  const lastScan = settings.last_scan_at || new Date(Date.now() - 24 * 60 * 60 * 1000);
  let connection;
  let scanned = 0;
  let processed = 0;

  try {
    connection = await imaps.connect(config);
    await connection.openBox(settings.inbox_folder || 'INBOX');

    const searchCriteria = [['SINCE', lastScan]];
    const fetchOptions = { bodies: [''], markSeen: false, struct: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    scanned = messages.length;

    for (const m of messages) {
      const raw = m.parts.find(p => p.which === '')?.body;
      if (!raw) continue;
      try {
        const result = await processEmail(userId, raw);
        if (result) processed++;
      } catch (e) {
        console.error('[email/process]', e.message);
      }
    }

    await pool.query(`UPDATE user_email_settings SET last_scan_at=NOW() WHERE user_id=$1`, [userId]);
  } finally {
    if (connection) connection.end();
  }

  return { scanned, processed };
}

async function getInbox(userId, { status = 'pending', limit = 50 } = {}) {
  const r = await pool.query(`
    SELECT pe.*, c.last_name||' '||COALESCE(c.first_name,'') client_name, c.phone client_phone
    FROM parsed_emails pe
    LEFT JOIN clients c ON c.id=pe.client_id
    WHERE pe.user_id=$1 ${status === 'all' ? '' : `AND pe.status='${status.replace(/[^a-z_]/g, '')}'`}
    ORDER BY pe.received_at DESC NULLS LAST LIMIT $2
  `, [userId, limit]);
  return r.rows;
}

async function markReplied(emailId, userId) {
  await pool.query(`UPDATE parsed_emails SET status='replied', replied_at=NOW() WHERE id=$1 AND user_id=$2`, [emailId, userId]);
}

async function markReviewed(emailId, userId) {
  await pool.query(`UPDATE parsed_emails SET status='reviewed', reviewed_at=NOW() WHERE id=$1 AND user_id=$2`, [emailId, userId]);
}

async function ignoreEmail(emailId, userId) {
  await pool.query(`UPDATE parsed_emails SET status='ignored' WHERE id=$1 AND user_id=$2`, [emailId, userId]);
}

// Boucle de scan automatique
const scanIntervals = new Map();
function startAutoScan(userId) {
  if (scanIntervals.has(userId)) clearInterval(scanIntervals.get(userId));
  const interval = setInterval(() => {
    scanInbox(userId).catch(e => console.error(`[autoscan/${userId}]`, e.message));
  }, 5 * 60 * 1000);
  scanIntervals.set(userId, interval);
}

function stopAutoScan(userId) {
  if (scanIntervals.has(userId)) {
    clearInterval(scanIntervals.get(userId));
    scanIntervals.delete(userId);
  }
}

async function startAllEnabledScanners() {
  const r = await pool.query(`SELECT user_id FROM user_email_settings WHERE enabled=true`);
  r.rows.forEach(row => startAutoScan(row.user_id));
  console.log(`[email] Started auto-scan for ${r.rows.length} users`);
}

module.exports = {
  saveEmailSettings, getEmailSettings, scanInbox, processEmail,
  getInbox, markReplied, markReviewed, ignoreEmail,
  startAutoScan, stopAutoScan, startAllEnabledScanners
};
