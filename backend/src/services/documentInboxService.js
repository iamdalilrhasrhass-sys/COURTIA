/**
 * documentInboxService.js — Upload, analyse, checklist, soumission assurance
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');

const UPLOAD_DIR = process.env.DOCUMENT_UPLOAD_DIR || '/srv/courtia/uploads/documents';
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const TOKEN_EXPIRY_HOURS = 72;

// ── Utilitaires ────────────────────────────────────────────────────────

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateFilePath(userId, clientId, fileName) {
  const ext = path.extname(fileName);
  const safeName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const subDir = `${userId}/${clientId}`;
  const fullDir = path.join(UPLOAD_DIR, subDir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }
  return { filePath: path.join(fullDir, safeName), storagePath: `uploads/documents/${subDir}/${safeName}` };
}

function validateFile(mimeType, size) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: 'Format non autorisé. Accepté : PDF, JPG, PNG, HEIC' };
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `Fichier trop volumineux. Maximum : ${MAX_FILE_SIZE / 1024 / 1024} MB` };
  }
  return { valid: true };
}

function computeChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ── Catégories de documents ────────────────────────────────────────────

const DOCUMENT_CATEGORIES = {
  carte_grise: { label: 'Carte grise', keywords: ['carte grise', 'certificat d\'immatriculation', 'carte verte'] },
  permis: { label: 'Permis de conduire', keywords: ['permis de conduire', 'driving license'] },
  piece_identite: { label: 'Pièce d\'identité', keywords: ['carte nationale', 'passeport', 'identité', 'titre d\'identité'] },
  rib: { label: 'RIB', keywords: ['rib', 'relevé d\'identité', 'iban', 'bic'] },
  justificatif_domicile: { label: 'Justificatif de domicile', keywords: ['justificatif de domicile', 'facture', 'quittance'] },
  releve_information: { label: 'Relevé d\'information', keywords: ['relevé d\'information', 'bonus', 'malus', 'sinistre'] },
  kbis: { label: 'KBIS', keywords: ['kbis', 'extrait kbis', 'rcs'] },
  contrat_signe: { label: 'Contrat signé', keywords: ['contrat signé', 'police d\'assurance'] },
  devis: { label: 'Devis', keywords: ['devis', 'proposition', 'tarif'] },
  mandat: { label: 'Mandat', keywords: ['mandat', 'mandat de courtage'] },
  autre: { label: 'Autre', keywords: [] }
};

function guessCategory(fileName) {
  const lower = fileName.toLowerCase();
  for (const [key, cat] of Object.entries(DOCUMENT_CATEGORIES)) {
    if (key === 'autre') continue;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) return key;
    }
  }
  return 'autre';
}

// ── Fonctions principales ──────────────────────────────────────────────

async function saveUpload(userId, clientId, file, category) {
  ensureUploadDir();

  const validation = validateFile(file.mimetype, file.size);
  if (!validation.valid) throw new Error(validation.error);

  const buffer = fs.readFileSync(file.path);
  const checksum = computeChecksum(buffer);
  const { filePath, storagePath } = generateFilePath(userId, clientId, file.originalname);

  fs.copyFileSync(file.path, filePath);
  const guessedCategory = category || guessCategory(file.originalname);

  const result = await pool.query(
    `INSERT INTO document_uploads (user_id, client_id, file_name, file_size, mime_type, storage_path, checksum, document_category, status, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reçu', 'upload')
     RETURNING *`,
    [userId, clientId, file.originalname, file.size, file.mimetype, storagePath, checksum, guessedCategory]
  );

  // Log action
  await pool.query(
    `INSERT INTO document_actions (user_id, document_id, action, metadata)
     VALUES ($1, $2, 'upload', $3)`,
    [userId, result.rows[0].id, JSON.stringify({ fileName: file.originalname, category: guessedCategory })]
  );

  // Try OCR if it's an image
  try {
    const { analyzeDocument } = require('./visionService');
    if (file.mimetype.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      const analysis = await analyzeDocument(base64, file.mimetype);
      if (analysis && analysis.type && analysis.type !== 'inconnu') {
        await pool.query(
          `UPDATE document_uploads SET document_category = $1, confidence = $2, extracted_data = $3, status = 'à_vérifier'
           WHERE id = $4`,
          [analysis.type, analysis.confiance || 0.5, JSON.stringify(analysis.donnees_extraites || {}), result.rows[0].id]
        );
      }
    }
  } catch (e) {
    // OCR non bloquant — silencieux
  }

  // Update checklist if exists
  await updateChecklistAfterUpload(userId, clientId);

  return result.rows[0];
}

async function createDocumentRequest(userId, clientId, requiredDocs, message, recipientEmail) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const result = await pool.query(
    `INSERT INTO document_requests (user_id, client_id, token, required_docs, message, expires_at, status, recipient_email)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     RETURNING *`,
    [userId, clientId, token, JSON.stringify(requiredDocs), message || '', expiresAt, recipientEmail || null]
  );

  // Create or update checklist
  const existingChecklist = await pool.query(
    `SELECT id FROM document_checklists WHERE user_id = $1 AND client_id = $2 AND status != 'submitted'`,
    [userId, clientId]
  );

  if (existingChecklist.rows.length === 0) {
    await pool.query(
      `INSERT INTO document_checklists (user_id, client_id, required_docs, received_docs, missing_docs, title, status)
       VALUES ($1, $2, $3, '[]', $3, 'Dossier', 'incomplete')`,
      [userId, clientId, JSON.stringify(requiredDocs)]
    );
  } else {
    const clId = existingChecklist.rows[0].id;
    // Merge required docs without duplicates
    await pool.query(
      `UPDATE document_checklists SET required_docs = (
         SELECT jsonb_agg(DISTINCT x) FROM jsonb_array_elements_text(required_docs || $3::jsonb) AS x
       ), missing_docs = (
         SELECT jsonb_agg(DISTINCT x) FROM jsonb_array_elements_text(required_docs || $3::jsonb) AS x
       ), updated_at = NOW() WHERE id = $1`,
      [clId, JSON.stringify(requiredDocs)]
    );
  }

  return { ...result.rows[0], upload_url: `https://courtia.vercel.app/upload/${token}` };
}

async function processPublicUpload(token, file) {
  const requestResult = await pool.query(
    `SELECT * FROM document_requests WHERE token = $1 AND status IN ('pending', 'partial', 'sent') AND expires_at > NOW()`,
    [token]
  );
  if (requestResult.rows.length === 0) {
    throw new Error('Lien invalide ou expiré');
  }

  const req = requestResult.rows[0];
  const validation = validateFile(file.mimetype, file.size);
  if (!validation.valid) throw new Error(validation.error);

  const buffer = fs.readFileSync(file.path);
  const checksum = computeChecksum(buffer);
  const { filePath, storagePath } = generateFilePath(req.user_id, req.client_id, file.originalname);
  fs.copyFileSync(file.path, filePath);

  const guessedCategory = guessCategory(file.originalname);

  const result = await pool.query(
    `INSERT INTO document_uploads (user_id, client_id, file_name, file_size, mime_type, storage_path, checksum, document_category, status, source, request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reçu', 'request', $9)
     RETURNING *`,
    [req.user_id, req.client_id, file.originalname, file.size, file.mimetype, storagePath, checksum, guessedCategory, req.id]
  );

  // Update request status
  await updateRequestStatus(req.id, req.client_id, req.required_docs);
  await updateChecklistAfterUpload(req.user_id, req.client_id);

  return result.rows[0];
}

async function updateRequestStatus(requestId, clientId, requiredDocs) {
  // Get received docs for this client from this request
  const received = await pool.query(
    `SELECT document_category FROM document_uploads WHERE request_id = $1 AND status != 'rejeté'`,
    [requestId]
  );

  const receivedCategories = received.rows.map(r => r.document_category);
  const required = requiredDocs || [];

  const missing = required.filter(d => !receivedCategories.includes(d));
  let status = 'complete';
  if (missing.length === required.length) status = 'pending';
  else if (missing.length > 0) status = 'partial';
  else status = 'complete';

  await pool.query(
    `UPDATE document_requests SET status = $1, completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END, updated_at = NOW() WHERE id = $3`,
    [status, status === 'complete', requestId]
  );
}

async function updateChecklistAfterUpload(userId, clientId) {
  const checklists = await pool.query(
    `SELECT * FROM document_checklists WHERE user_id = $1 AND client_id = $2 AND status != 'submitted' ORDER BY id DESC LIMIT 1`,
    [userId, clientId]
  );

  if (checklists.rows.length === 0) return;

  const cl = checklists.rows[0];
  const received = await pool.query(
    `SELECT DISTINCT document_category FROM document_uploads
     WHERE user_id = $1 AND client_id = $2 AND status NOT IN ('rejeté')`,
    [userId, clientId]
  );

  const receivedCategories = received.rows.map(r => r.document_category);
  const required = cl.required_docs || [];
  const missing = required.filter(d => !receivedCategories.includes(d));
  const receivedFiltered = required.filter(d => receivedCategories.includes(d));

  let status = 'incomplete';
  if (missing.length === 0 && required.length > 0) status = 'complete';
  else if (receivedFiltered.length > 0) status = 'partial';

  await pool.query(
    `UPDATE document_checklists SET received_docs = $1, missing_docs = $2, status = $3, updated_at = NOW() WHERE id = $4`,
    [JSON.stringify(receivedFiltered), JSON.stringify(missing), status, cl.id]
  );
}

async function createInsuranceSubmission(userId, clientId, contractId, insurerEmail, subject, body, attachmentIds) {
  const result = await pool.query(
    `INSERT INTO insurance_submissions (user_id, client_id, contract_id, insurer_name, insurer_email, subject, body, attachment_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
     RETURNING *`,
    [userId, clientId, contractId || null, '', insurerEmail, subject, body, JSON.stringify(attachmentIds || [])]
  );

  return result.rows[0];
}

async function submitInsurance(submissionId, userId) {
  const sub = await pool.query(
    `SELECT * FROM insurance_submissions WHERE id = $1 AND user_id = $2`,
    [submissionId, userId]
  );
  if (sub.rows.length === 0) throw new Error('Soumission introuvable');

  // En V1, on logge l'envoi sans envoyer réellement
  await pool.query(
    `UPDATE insurance_submissions SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [submissionId]
  );

  await pool.query(
    `INSERT INTO document_actions (user_id, action, metadata)
     VALUES ($1, 'insurance_submit', $2)`,
    [userId, JSON.stringify({ submissionId, insurerEmail: sub.rows[0].insurer_email })]
  );

  return { success: true, message: 'Email préparé. L\'envoi réel sera connecté en V2.' };
}

async function deleteDocument(docId, userId) {
  const doc = await pool.query(
    `SELECT * FROM document_uploads WHERE id = $1 AND user_id = $2`,
    [docId, userId]
  );
  if (doc.rows.length === 0) throw new Error('Document introuvable');

  // Delete file
  const fullPath = path.join('/srv/courtia', doc.rows[0].storage_path);
  try { fs.unlinkSync(fullPath); } catch (e) {}

  await pool.query(`DELETE FROM document_uploads WHERE id = $1`, [docId]);

  await pool.query(
    `INSERT INTO document_actions (user_id, document_id, action, metadata)
     VALUES ($1, $2, 'delete', $3)`,
    [userId, docId, JSON.stringify({ fileName: doc.rows[0].file_name })]
  );

  await updateChecklistAfterUpload(userId, doc.rows[0].client_id);

  return { success: true };
}

module.exports = {
  ensureUploadDir,
  saveUpload,
  createDocumentRequest,
  processPublicUpload,
  updateChecklistAfterUpload,
  createInsuranceSubmission,
  submitInsurance,
  deleteDocument,
  guessCategory,
  DOCUMENT_CATEGORIES,
  UPLOAD_DIR
};
