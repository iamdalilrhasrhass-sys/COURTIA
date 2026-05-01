/**
 * documentInbox.js — Routes pour Documents Inbox
 * POST   /upload              → upload manuel par courtier (multer)
 * GET    /                    → liste des documents (filtré par user_id)
 * GET    /client/:clientId    → documents d'un client
 * DELETE /:id                 → supprimer un document
 *
 * POST   /request             → créer une demande de pièces
 * GET    /request/:id         → détails d'une demande
 * GET    /request/token/:token → infos pour lien public
 * POST   /request/:id/send    → marquer comme envoyée
 *
 * GET    /checklist/:clientId    → checklist d'un client
 * POST   /checklist              → créer/mettre à jour checklist
 *
 * POST   /submission           → créer une soumission assurance
 * GET    /submission/:id       → détails soumission
 * POST   /submission/:id/submit → valider et envoyer
 *
 * ── Routes publiques (pas de verifyToken) ──
 * POST   /public/upload/:token → upload via lien client
 * GET    /public/request/:token → infos demande publique
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/authMiddleware');

const docInboxService = require('../services/documentInboxService');

// Multer : stockage temporaire
const tmpUpload = multer({ dest: '/tmp/inbox-uploads/' });
const tmpSingle = tmpUpload.single('file');

// Helper pattern for user IDs
function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.sub;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES (auth)
// ═══════════════════════════════════════════════════════════════════════════

router.use(verifyToken);

// GET / — liste des documents
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, status, category, limit } = req.query;
    let query = 'SELECT * FROM document_uploads WHERE user_id = $1';
    const params = [userId];
    let paramIdx = 2;

    if (client_id) { query += ` AND client_id = $${paramIdx++}`; params.push(client_id); }
    if (status) { query += ` AND status = $${paramIdx++}`; params.push(status); }
    if (category) { query += ` AND document_category = $${paramIdx++}`; params.push(category); }

    query += ' ORDER BY created_at DESC';
    if (limit) { query += ` LIMIT $${paramIdx}`; params.push(parseInt(limit)); }

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('[GET /api/document-inbox]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /client/:clientId — documents d'un client
router.get('/client/:clientId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT * FROM document_uploads WHERE user_id = $1 AND client_id = $2 ORDER BY created_at DESC`,
      [userId, clientId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[GET /api/document-inbox/client/:clientId]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /upload — upload manuel par le courtier
router.post('/upload', (req, res, next) => {
  tmpSingle(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'upload_error', message: err.message });
    try {
      const userId = getUserId(req);
      const { client_id, category } = req.body;
      if (!client_id) return res.status(400).json({ error: 'validation_error', message: 'client_id requis' });
      if (!req.file) return res.status(400).json({ error: 'validation_error', message: 'Fichier requis' });

      const doc = await docInboxService.saveUpload(userId, client_id, req.file, category);
      return res.status(201).json({ success: true, data: doc });
    } catch (err) {
      console.error('[POST /api/document-inbox/upload]', err.message);
      return res.status(400).json({ error: 'upload_error', message: err.message });
    }
  });
});

// DELETE /:id — supprimer un document
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await docInboxService.deleteDocument(req.params.id, userId);
    return res.json(result);
  } catch (err) {
    console.error('[DELETE /api/document-inbox/:id]', err.message);
    return res.status(err.message === 'Document introuvable' ? 404 : 500).json({ error: 'server_error', message: err.message });
  }
});

// POST /request — créer une demande de pièces
router.post('/request', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, required_docs, message, recipient_email } = req.body;
    if (!client_id || !required_docs) {
      return res.status(400).json({ error: 'validation_error', message: 'client_id et required_docs requis' });
    }
    const result = await docInboxService.createDocumentRequest(userId, client_id, required_docs, message, recipient_email);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /api/document-inbox/request]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /request — liste des demandes
router.get('/request', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, status } = req.query;
    let query = 'SELECT * FROM document_requests WHERE user_id = $1';
    const params = [userId];
    let idx = 2;
    if (client_id) { query += ` AND client_id = $${idx++}`; params.push(client_id); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[GET /api/document-inbox/request]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /request/:id — détails d'une demande
router.get('/request/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT * FROM document_requests WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });

    // Get uploads for this request
    const uploads = await pool.query(
      `SELECT * FROM document_uploads WHERE request_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ...result.rows[0], uploads: uploads.rows } });
  } catch (err) {
    console.error('[GET /api/document-inbox/request/:id]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /request/:id/send — marquer comme envoyée
router.post('/request/:id/send', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `UPDATE document_requests SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/document-inbox/request/:id/send]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /checklist/:clientId — checklist d'un client
router.get('/checklist/:clientId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT * FROM document_checklists WHERE user_id = $1 AND client_id = $2 ORDER BY updated_at DESC LIMIT 1`,
      [userId, req.params.clientId]
    );
    return res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('[GET /api/document-inbox/checklist/:clientId]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /checklist — créer/mettre à jour checklist
router.post('/checklist', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, contract_id, title, required_docs } = req.body;
    if (!client_id || !required_docs) {
      return res.status(400).json({ error: 'validation_error', message: 'client_id et required_docs requis' });
    }

    // Upsert
    const existing = await pool.query(
      `SELECT id FROM document_checklists WHERE user_id = $1 AND client_id = $2 AND status != 'submitted' ORDER BY id DESC LIMIT 1`,
      [userId, client_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE document_checklists SET required_docs = $1, title = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [JSON.stringify(required_docs), title || 'Dossier', existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO document_checklists (user_id, client_id, contract_id, title, required_docs, received_docs, missing_docs, status)
         VALUES ($1, $2, $3, $4, $5, '[]', $5, 'incomplete') RETURNING *`,
        [userId, client_id, contract_id || null, title || 'Dossier', JSON.stringify(required_docs)]
      );
    }

    // Recalculate
    await docInboxService.updateChecklistAfterUpload(userId, client_id);

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/document-inbox/checklist]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /submission — créer une soumission assurance
router.post('/submission', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, contract_id, insurer_email, subject, body, attachment_ids } = req.body;
    if (!client_id || !insurer_email) {
      return res.status(400).json({ error: 'validation_error', message: 'client_id et insurer_email requis' });
    }
    const result = await docInboxService.createInsuranceSubmission(userId, client_id, contract_id, insurer_email, subject, body, attachment_ids);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /api/document-inbox/submission]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /submission — liste des soumissions
router.get('/submission', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { client_id, status } = req.query;
    let query = 'SELECT * FROM insurance_submissions WHERE user_id = $1';
    const params = [userId];
    let idx = 2;
    if (client_id) { query += ` AND client_id = $${idx++}`; params.push(client_id); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[GET /api/document-inbox/submission]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /submission/:id — détails soumission
router.get('/submission/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await pool.query(
      `SELECT * FROM insurance_submissions WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/document-inbox/submission/:id]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /submission/:id/submit — valider et envoyer
router.post('/submission/:id/submit', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await docInboxService.submitInsurance(req.params.id, userId);
    return res.json(result);
  } catch (err) {
    console.error('[POST /api/document-inbox/submission/:id/submit]', err.message);
    return res.status(err.message === 'Soumission introuvable' ? 404 : 500).json({ error: 'server_error', message: err.message });
  }
});

// GET /stats — stats des documents
router.get('/stats', async (req, res) => {
  try {
    const userId = getUserId(req);
    const stats = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'reçu') AS recu,
        COUNT(*) FILTER (WHERE status = 'en_analyse') AS en_analyse,
        COUNT(*) FILTER (WHERE status = 'à_vérifier') AS a_verifier,
        COUNT(*) FILTER (WHERE status = 'accepté') AS accepte,
        COUNT(*) FILTER (WHERE status = 'rejeté') AS rejete
       FROM document_uploads WHERE user_id = $1`,
      [userId]
    );

    const requestStats = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status IN ('partial','complete')) AS responded
       FROM document_requests WHERE user_id = $1`,
      [userId]
    );

    return res.json({ success: true, data: { documents: stats.rows[0], requests: requestStats.rows[0] } });
  } catch (err) {
    console.error('[GET /api/document-inbox/stats]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES (pas d'auth — upload client via token)
// ═══════════════════════════════════════════════════════════════════════════

// POST /public/upload/:token — upload via lien client
router.post('/public/upload/:token', (req, res, next) => {
  tmpSingle(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'upload_error', message: err.message });
    try {
      const { token } = req.params;
      if (!req.file) return res.status(400).json({ error: 'validation_error', message: 'Fichier requis' });

      const doc = await docInboxService.processPublicUpload(token, req.file);
      return res.status(201).json({ success: true, data: doc });
    } catch (err) {
      console.error('[POST /api/document-inbox/public/upload/:token]', err.message);
      return res.status(400).json({ error: 'upload_error', message: err.message });
    }
  });
});

// GET /public/request/:token — infos demande publique
router.get('/public/request/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT id, client_id, required_docs, message, expires_at, status FROM document_requests WHERE token = $1`,
      [token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found', message: 'Lien invalide' });

    const reqData = result.rows[0];
    if (new Date(reqData.expires_at) < new Date()) {
      return res.status(410).json({ error: 'expired', message: 'Ce lien a expiré' });
    }

    // Get client name (anonymized)
    const client = await pool.query(
      `SELECT first_name, last_name FROM clients WHERE id = $1`,
      [reqData.client_id]
    );

    // Get already uploaded
    const uploads = await pool.query(
      `SELECT file_name, document_category, status, created_at FROM document_uploads WHERE request_id = $1`,
      [reqData.id]
    );

    const receivedCategories = uploads.rows.map(u => u.document_category);
    const missing = (reqData.required_docs || []).filter(d => !receivedCategories.includes(d));

    return res.json({
      success: true,
      data: {
        client_name: client.rows[0] ? `${client.rows[0].first_name} ${client.rows[0].last_name}` : 'Client',
        required_docs: reqData.required_docs,
        message: reqData.message,
        expires_at: reqData.expires_at,
        uploads: uploads.rows,
        missing,
        status: reqData.status
      }
    });
  } catch (err) {
    console.error('[GET /api/document-inbox/public/request/:token]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

module.exports = router;
