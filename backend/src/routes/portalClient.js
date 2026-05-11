/**
 * Routes Portail Client — Côté Client — LOT 12
 * Espace self-service : contrats, documents, signatures, messages
 * Auth routes publiques, autres routes protégées par verifyClientPortalToken
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const portalAuth = require('../services/portail/portalAuth');

// Configuration multer pour upload documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || '/tmp/uploads/portal';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `portal-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Formats acceptés: PDF, JPEG, PNG, WebP'));
    }
  }
});

// ==================== AUTH ROUTES (PUBLIC) ====================

/**
 * POST /api/portal/auth/activate
 * Active un compte avec le token d'activation
 */
router.post('/auth/activate', async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await portalAuth.activate(token, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/portal/auth/login
 * Connexion au portail
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await portalAuth.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * POST /api/portal/auth/request-reset
 * Demande réinitialisation mot de passe
 */
router.post('/auth/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await portalAuth.requestReset(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/portal/auth/reset
 * Réinitialise le mot de passe
 */
router.post('/auth/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await portalAuth.resetPassword(token, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== PROTECTED ROUTES ====================

/**
 * GET /api/portal/me
 * Infos du client connecté
 */
router.get('/me', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const account = await portalAuth.getAccountInfo(req.portalUser.portalAccountId);
    res.json({ account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/contracts
 * Liste les contrats actifs du client
 */
router.get('/contracts', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;

    // Récupérer les devis convertis (= contrats)
    const contractsRes = await pool.query(
      `SELECT q.id, q.insurance_type, q.status, q.amount, q.details,
              q.created_at, q.updated_at,
              ip.name as provider_name, ip.logo_url as provider_logo
       FROM quotes q
       LEFT JOIN insurance_providers ip ON ip.id = q.provider_id
       WHERE q.client_id = $1 AND q.status = 'converted'
       ORDER BY q.created_at DESC`,
      [clientId]
    );

    // Récupérer aussi les contrats legacy si table existe
    let legacyContracts = [];
    try {
      const legacyRes = await pool.query(
        `SELECT id, type, compagnie, numero_police, date_debut, date_fin, prime_annuelle,
                status, created_at
         FROM contracts
         WHERE client_id = $1
         ORDER BY created_at DESC`,
        [clientId]
      );
      legacyContracts = legacyRes.rows;
    } catch (e) {
      // Table contracts n'existe peut-être pas
    }

    res.json({
      contracts: contractsRes.rows.map(row => ({
        id: row.id,
        type: row.insurance_type,
        status: row.status,
        amount: row.amount,
        details: row.details,
        provider: {
          name: row.provider_name,
          logo: row.provider_logo
        },
        createdAt: row.created_at
      })),
      legacyContracts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/documents
 * Liste les documents du client
 */
router.get('/documents', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;

    // Documents de conformité
    const complianceRes = await pool.query(
      `SELECT id, document_type, status, storage_path, generated_at, signed_at
       FROM compliance_documents
       WHERE client_id = $1
       ORDER BY generated_at DESC`,
      [clientId]
    );

    // Documents client uploadés
    let clientDocsRes = { rows: [] };
    try {
      clientDocsRes = await pool.query(
        `SELECT id, document_type, file_name, file_path, status, created_at
         FROM client_documents
         WHERE client_id = $1
         ORDER BY created_at DESC`,
        [clientId]
      );
    } catch (e) {
      // Table peut ne pas exister
    }

    res.json({
      complianceDocuments: complianceRes.rows.map(doc => ({
        id: doc.id,
        type: doc.document_type,
        status: doc.status,
        generatedAt: doc.generated_at,
        signedAt: doc.signed_at,
        canDownload: !!doc.storage_path,
        canSign: doc.status === 'generated' && !doc.signed_at
      })),
      clientDocuments: clientDocsRes.rows.map(doc => ({
        id: doc.id,
        type: doc.document_type,
        fileName: doc.file_name,
        status: doc.status,
        createdAt: doc.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/documents/:id/download
 * Télécharge un document
 */
router.get('/documents/:id/download', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const docId = parseInt(req.params.id, 10);

    // Chercher dans compliance_documents
    const docRes = await pool.query(
      `SELECT storage_path, document_type FROM compliance_documents
       WHERE id = $1 AND client_id = $2`,
      [docId, clientId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const doc = docRes.rows[0];

    if (!doc.storage_path) {
      return res.status(404).json({ error: 'Fichier non disponible' });
    }

    // Vérifier que le fichier existe
    if (!fs.existsSync(doc.storage_path)) {
      return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    }

    const fileName = `${doc.document_type}_${docId}.pdf`;
    res.download(doc.storage_path, fileName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portal/documents/upload
 * Upload une pièce demandée par le courtier
 */
router.post('/documents/upload', portalAuth.verifyClientPortalToken, upload.single('file'), async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const brokerId = req.portalUser.brokerId;
    const { document_type, request_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier requis' });
    }

    // Insérer dans client_documents si la table existe
    let docId = null;
    try {
      const insertRes = await pool.query(
        `INSERT INTO client_documents (client_id, broker_id, document_type, file_name, file_path, status)
         VALUES ($1, $2, $3, $4, $5, 'uploaded')
         RETURNING id`,
        [clientId, brokerId, document_type || 'autre', req.file.originalname, req.file.path]
      );
      docId = insertRes.rows[0].id;
    } catch (e) {
      // Table peut ne pas exister, on continue quand même
    }

    // Si request_id fourni, mettre à jour la demande
    if (request_id) {
      await pool.query(
        `UPDATE client_document_requests
         SET status = 'fulfilled', uploaded_document_id = $1, fulfilled_at = NOW()
         WHERE id = $2 AND client_id = $3`,
        [docId, request_id, clientId]
      );
    }

    res.status(201).json({
      success: true,
      document: {
        id: docId,
        fileName: req.file.originalname,
        type: document_type || 'autre',
        size: req.file.size
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/document-requests
 * Liste les pièces demandées par le courtier
 */
router.get('/document-requests', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;

    const requestsRes = await pool.query(
      `SELECT id, document_type, description, status, requested_at, fulfilled_at
       FROM client_document_requests
       WHERE client_id = $1
       ORDER BY requested_at DESC`,
      [clientId]
    );

    res.json({
      requests: requestsRes.rows,
      pendingCount: requestsRes.rows.filter(r => r.status === 'pending').length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portal/signatures
 * Signe un document (click-to-sign)
 */
router.post('/signatures', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const { compliance_document_id } = req.body;

    if (!compliance_document_id) {
      return res.status(400).json({ error: 'compliance_document_id requis' });
    }

    // Vérifier que le document existe et appartient au client
    const docRes = await pool.query(
      `SELECT id, status, signed_at FROM compliance_documents
       WHERE id = $1 AND client_id = $2`,
      [compliance_document_id, clientId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const doc = docRes.rows[0];

    if (doc.signed_at) {
      return res.status(400).json({ error: 'Document déjà signé' });
    }

    // Créer la signature
    const signatureProof = {
      method: 'click_to_sign',
      timestamp: new Date().toISOString(),
      clientId,
      portalAccountId: req.portalUser.portalAccountId,
      email: req.portalUser.email
    };

    const insertRes = await pool.query(
      `INSERT INTO client_portal_signatures
         (client_id, compliance_document_id, signature_method, signature_proof, ip_address, user_agent)
       VALUES ($1, $2, 'click_to_sign', $3, $4, $5)
       RETURNING id, signed_at`,
      [
        clientId,
        compliance_document_id,
        JSON.stringify(signatureProof),
        req.ip || req.headers['x-forwarded-for'] || null,
        (req.headers['user-agent'] || '').slice(0, 500)
      ]
    );

    // Mettre à jour le document
    await pool.query(
      `UPDATE compliance_documents
       SET signed_at = NOW(), signed_by = $1, signature_method = 'click_to_sign',
           signature_proof = $2, status = 'signed'
       WHERE id = $3`,
      [req.portalUser.email, JSON.stringify(signatureProof), compliance_document_id]
    );

    res.status(201).json({
      success: true,
      signature: {
        id: insertRes.rows[0].id,
        documentId: compliance_document_id,
        signedAt: insertRes.rows[0].signed_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/messages
 * Liste les messages avec le courtier
 */
router.get('/messages', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const brokerId = req.portalUser.brokerId;
    const { limit = 50, offset = 0 } = req.query;

    const messagesRes = await pool.query(
      `SELECT id, sender, body, attachments, read_at, created_at
       FROM client_portal_messages
       WHERE client_id = $1 AND broker_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [clientId, brokerId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    // Marquer comme lus les messages du courtier
    await pool.query(
      `UPDATE client_portal_messages
       SET read_at = NOW()
       WHERE client_id = $1 AND broker_id = $2 AND sender = 'broker' AND read_at IS NULL`,
      [clientId, brokerId]
    );

    // Compter non lus
    const unreadRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages
       WHERE client_id = $1 AND sender = 'broker' AND read_at IS NULL`,
      [clientId]
    );

    res.json({
      messages: messagesRes.rows,
      unreadCount: parseInt(unreadRes.rows[0].count, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portal/messages
 * Envoie un message au courtier
 */
router.post('/messages', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const brokerId = req.portalUser.brokerId;
    const { body, attachments = [] } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const insertRes = await pool.query(
      `INSERT INTO client_portal_messages (client_id, broker_id, sender, body, attachments)
       VALUES ($1, $2, 'client', $3, $4)
       RETURNING id, sender, body, attachments, created_at`,
      [clientId, brokerId, body.trim(), JSON.stringify(attachments)]
    );

    res.status(201).json({ message: insertRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/quote-requests
 * Liste les demandes de devis du client
 */
router.get('/quote-requests', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;

    const requestsRes = await pool.query(
      `SELECT qr.id, qr.insurance_type, qr.criteria, qr.status, qr.broker_notes,
              qr.created_at, qr.updated_at,
              q.amount as quote_amount, q.status as quote_status
       FROM client_portal_quote_requests qr
       LEFT JOIN quotes q ON q.id = qr.quote_id
       WHERE qr.client_id = $1
       ORDER BY qr.created_at DESC`,
      [clientId]
    );

    res.json({
      requests: requestsRes.rows.map(row => ({
        id: row.id,
        insuranceType: row.insurance_type,
        criteria: row.criteria,
        status: row.status,
        brokerNotes: row.broker_notes,
        createdAt: row.created_at,
        quote: row.quote_amount ? {
          amount: row.quote_amount,
          status: row.quote_status
        } : null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portal/quote-requests
 * Demande un nouveau devis
 */
router.post('/quote-requests', portalAuth.verifyClientPortalToken, async (req, res) => {
  try {
    const clientId = req.portalUser.clientId;
    const brokerId = req.portalUser.brokerId;
    const { type, criteria = {} } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Type d'assurance requis" });
    }

    const validTypes = ['auto', 'habitation', 'sante', 'vie', 'professionnel', 'autre'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Type invalide',
        validTypes
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO client_portal_quote_requests (client_id, broker_id, insurance_type, criteria)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, brokerId, type, JSON.stringify(criteria)]
    );

    res.status(201).json({
      success: true,
      request: {
        id: insertRes.rows[0].id,
        insuranceType: insertRes.rows[0].insurance_type,
        status: insertRes.rows[0].status,
        createdAt: insertRes.rows[0].created_at
      },
      message: 'Votre demande de devis a été transmise à votre courtier.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;