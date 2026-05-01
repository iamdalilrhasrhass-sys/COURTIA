/**
 * @file inboundProcessor.js
 * Analyse les réponses entrantes (email) avec Claude Haiku (gratuit/efficace).
 * Identifie le client, classe la réponse, met à jour le dossier.
 *
 * Types de réponse détectés :
 *   - accord           : Le client accepte une proposition
 *   - refus            : Le client refuse
 *   - piece_jointe     : Le client envoie des documents demandés
 *   - question         : Le client pose une question
 *   - hors_sujet       : Spam, accusé de réception automatique, etc.
 *   - autre            : Non classifiable
 */

const Anthropic = require('@anthropic-ai/sdk');

// --- Messages Table (auto-create if not exists) ---
const CREATE_MESSAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'in',       -- 'in' ou 'out'
    canal VARCHAR(20) NOT NULL DEFAULT 'email',
    sujet VARCHAR(500),
    corps TEXT,
    analyse_type VARCHAR(30),                          -- accord, refus, piece_jointe, question, autre
    analyse_confiance DECIMAL(3,2),                    -- 0.00 à 1.00
    analyse_resume TEXT,
    action_effectuee VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

// --- Helper: Ensure messages table exists ---
let tableEnsured = false;
async function ensureMessagesTable(pool) {
  if (tableEnsured) return;
  try {
    await pool.query(CREATE_MESSAGES_TABLE);
    tableEnsured = true;
  } catch (err) {
    console.error('[inboundProcessor] Cannot create messages table:', err.message);
  }
}

// --- Claude Prompt ---
function buildAnalysisPrompt(from, subject, body) {
  return `Tu es un assistant CRM pour courtiers en assurance (COURTIA). Analyse cet email reçu d'un client et réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour).

Email :
- Expéditeur : ${from}
- Objet : ${subject}
- Corps : ${body.substring(0, 2000)}

Classifie cet email dans l'un de ces types :
- "accord" : le client accepte une proposition, un devis, un contrat
- "refus" : le client refuse, décline, n'est pas intéressé
- "piece_jointe" : le client envoie ou annonce l'envoi de documents (justificatifs, pièces, scans)
- "question" : le client pose une question, demande des précisions
- "hors_sujet" : spam, publicité, accusé de réception automatique, absence de bureau
- "autre" : ne correspond à aucun des types ci-dessus

Réponds avec ce JSON exact :
{
  "type": "accord|refus|piece_jointe|question|hors_sujet|autre",
  "confiance": 0.0 à 1.0,
  "resume": "résumé en 1 phrase (max 150 caractères)",
  "action_suggeree": "action recommandée en 1 phrase (max 150 caractères)",
  "intention_principale": "mot-clé décrivant l'intention"
}`;
}

// --- Analyse avec Claude Haiku (le moins cher) ---
async function analyzeWithClaude(from, subject, body) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildAnalysisPrompt(from, subject, body);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: systemPrompt }],
    });

    const raw = message.content[0]?.text || '{}';

    // Nettoyer la réponse (Claude peut ajouter ```json ... ```)
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    return {
      type: parsed.type || 'autre',
      confiance: typeof parsed.confiance === 'number' ? parsed.confiance : 0.5,
      resume: parsed.resume || '',
      action_suggeree: parsed.action_suggeree || '',
      intention: parsed.intention_principale || '',
    };
  } catch (err) {
    console.error('[inboundProcessor] Claude analysis error:', err.message);
    // Fallback simple sans IA
    return fallbackAnalysis(subject, body);
  }
}

// --- Fallback sans IA (si Claude échoue) ---
function fallbackAnalysis(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();

  if (/accord|accepte|ok pour|je prends|je valide|bon pour|go|allons-y|signé/i.test(text)) {
    return { type: 'accord', confiance: 0.7, resume: 'Le client semble accepter', action_suggeree: 'Vérifier et finaliser le contrat', intention: 'acceptation' };
  }
  if (/refus|non merci|pas intéressé|trop cher|je décline|je passe|annuler/i.test(text)) {
    return { type: 'refus', confiance: 0.7, resume: 'Le client semble refuser', action_suggeree: 'Contacter le client pour comprendre son refus', intention: 'refus' };
  }
  if (/pj|pièce jointe|ci-joint|joint|document|justificatif|scan|fichier|voici|je vous envoie/i.test(text)) {
    return { type: 'piece_jointe', confiance: 0.65, resume: 'Le client envoie un document', action_suggeree: 'Vérifier les pièces jointes et compléter le dossier', intention: 'envoi_document' };
  }
  if (/\?|question|comment|pourquoi|quand|combien|quelle|quel|pouvez-vous/i.test(text)) {
    return { type: 'question', confiance: 0.6, resume: 'Le client pose une question', action_suggeree: 'Répondre à la question du client', intention: 'question' };
  }
  if (/absence|bureau|automatique|accusé|réception|out of office|vacances|spam|pub|newsletter/i.test(text)) {
    return { type: 'hors_sujet', confiance: 0.8, resume: 'Réponse automatique ou spam', action_suggeree: 'Ignorer', intention: 'auto_reply' };
  }

  return { type: 'autre', confiance: 0.3, resume: 'Non classifié', action_suggeree: 'Lecture manuelle recommandée', intention: 'inconnu' };
}

// --- Mise à jour du statut client selon le type de réponse ---
async function updateClientStatus(pool, clientId, analysis) {
  const statusMap = {
    accord: 'signe',
    refus: 'perdu',
    piece_jointe: 'documents_envoyes',
    question: 'en_cours',
    autre: null,
    hors_sujet: null,
  };

  const newStatus = statusMap[analysis.type];
  if (!newStatus) return null;

  try {
    await pool.query(
      `UPDATE clients SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, clientId]
    );
    console.log(`[inboundProcessor] Client ${clientId} status → ${newStatus} (${analysis.type})`);
    return newStatus;
  } catch (err) {
    console.error(`[inboundProcessor] Status update failed for client ${clientId}:`, err.message);
    return null;
  }
}

// --- Sauvegarde du message dans la table messages ---
async function saveMessage(pool, { clientId, from, subject, body, analysis, action }) {
  try {
    await pool.query(
      `INSERT INTO messages (client_id, direction, canal, sujet, corps, analyse_type, analyse_confiance, analyse_resume, action_effectuee)
       VALUES ($1, 'in', 'email', $2, $3, $4, $5, $6, $7)`,
      [
        clientId,
        subject,
        body,
        analysis.type,
        analysis.confiance,
        analysis.resume,
        action,
      ]
    );
  } catch (err) {
    console.error('[inboundProcessor] Save message error:', err.message);
  }
}

// --- Trouver le client par email ---
async function findClientByEmail(pool, email) {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, status FROM clients
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[inboundProcessor] Find client error:', err.message);
    return null;
  }
}

// --- POINT D'ENTRÉE PRINCIPAL ---
/**
 * Traite un email entrant, identifie le client, analyse le contenu,
 * met à jour le statut et sauvegarde le message.
 *
 * @param {Object} pool        - Instance pg Pool
 * @param {Object} emailData   - { from, subject, body, attachments }
 * @returns {Promise<Object>}  - Résumé de l'action effectuée
 */
async function processInboundEmail(pool, { from, subject, body, attachments }) {
  await ensureMessagesTable(pool);

  const startTime = Date.now();
  const result = {
    success: false,
    client_trouve: false,
    client_id: null,
    client_nom: null,
    analyse: null,
    action: 'none',
    statut_precedent: null,
    statut_nouveau: null,
    message_sauvegarde: false,
    duree_ms: 0,
  };

  try {
    // 1. Extraire l'email de l'expéditeur (gère "Nom <email>" ou juste "email")
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const senderEmail = emailMatch[1].trim().toLowerCase();

    // 2. Chercher le client dans la DB
    const client = await findClientByEmail(pool, senderEmail);

    if (client) {
      result.client_trouve = true;
      result.client_id = client.id;
      result.client_nom = `${client.first_name || ''} ${client.last_name || ''}`.trim();
      result.statut_precedent = client.status;
    } else {
      console.log(`[inboundProcessor] Aucun client trouvé pour ${senderEmail}`);
    }

    // 3. Analyser le contenu avec Claude Haiku
    const analysis = await analyzeWithClaude(from, subject, body);
    result.analyse = analysis;

    // 4. Mettre à jour le statut du client si trouvé
    if (client && analysis.type !== 'hors_sujet') {
      const newStatus = await updateClientStatus(pool, client.id, analysis);
      if (newStatus) {
        result.statut_nouveau = newStatus;
        result.action = 'status_updated';
      }
    }

    // 4.5. Sauvegarder les pieces jointes dans document_uploads si client trouve
    if (client && attachments && attachments.length > 0 && analysis.type === 'piece_jointe') {
      try {
        const inboxService = require('./documentInboxService');
        for (const att of attachments) {
          if (att.filename && att.contentType) {
            const category = inboxService.guessCategory(att.filename);
            await pool.query(
              `INSERT INTO document_uploads (user_id, client_id, file_name, file_size, mime_type, storage_path, document_category, status, source, extracted_data)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 're\u00e7u', 'email', $8)`,
              [client.user_id || 1, client.id, att.filename, att.size || 0, att.contentType || 'application/octet-stream',
               `email/${client.id}/${Date.now()}_${att.filename}`, category,
               JSON.stringify({ subject, from: senderEmail })]
            );
            console.log('[inboundProcessor] Piece jointe sauvegardee:', att.filename);
          }
        }
        await inboxService.updateChecklistAfterUpload(client.user_id || 1, client.id);
      } catch (e) {
        console.error('[inboundProcessor] Erreur sauvegarde piece jointe:', e.message);
      }
    }

    // 5. Sauvegarder le message
    await saveMessage(pool, {
      clientId: client?.id || null,
      from: senderEmail,
      subject,
      body,
      analysis,
      action: result.action,
    });
    result.message_sauvegarde = true;

    result.success = true;
  } catch (err) {
    console.error('[inboundProcessor] Erreur:', err.message);
    result.error = err.message;
  }

  result.duree_ms = Date.now() - startTime;
  return result;
}

module.exports = { processInboundEmail, findClientByEmail };
