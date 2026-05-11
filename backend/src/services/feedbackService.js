const pool = require('../db');

const FEEDBACK_TYPES = new Set(['bug', 'idea', 'friction', 'praise']);
const FEEDBACK_STATUSES = new Set(['new', 'seen', 'resolved']);

function normalizeFeedbackType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return FEEDBACK_TYPES.has(normalized) ? normalized : 'friction';
}

function normalizeFeedbackStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return FEEDBACK_STATUSES.has(normalized) ? normalized : 'new';
}

function buildFeedbackError(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

async function createFeedback({ userId, type, page, message, metadata = {} }, db = pool) {
  const cleaned = String(message || '').trim();
  if (!userId) throw buildFeedbackError('FEEDBACK_AUTH_REQUIRED', 'Authentification requise.', 401);
  if (!cleaned) throw buildFeedbackError('FEEDBACK_MESSAGE_REQUIRED', 'Message feedback requis.', 400);
  if (cleaned.length > 4000) throw buildFeedbackError('FEEDBACK_MESSAGE_TOO_LONG', 'Message limité à 4000 caractères.', 400);

  const result = await db.query(
    `INSERT INTO feedback_items (user_id, type, page, message, metadata)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING id, user_id, type, page, message, metadata, status, created_at`,
    [
      userId,
      normalizeFeedbackType(type),
      String(page || '').slice(0, 500) || null,
      cleaned,
      JSON.stringify(metadata || {}),
    ]
  );

  return result.rows[0];
}

async function listFeedback({ status, limit = 100 } = {}, db = pool) {
  const params = [];
  let where = '';
  if (status) {
    params.push(normalizeFeedbackStatus(status));
    where = `WHERE fi.status = $${params.length}`;
  }
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 250));
  const result = await db.query(
    `SELECT fi.id, fi.user_id, fi.type, fi.page, fi.message, fi.metadata, fi.status, fi.created_at,
            u.email, u.first_name, u.last_name
       FROM feedback_items fi
       LEFT JOIN users u ON u.id = fi.user_id
       ${where}
       ORDER BY fi.created_at DESC
       LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function updateFeedbackStatus({ id, status }, db = pool) {
  const normalized = normalizeFeedbackStatus(status);
  const result = await db.query(
    `UPDATE feedback_items
        SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, updated_at`,
    [id, normalized]
  );
  return result.rows[0] || null;
}

module.exports = {
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  normalizeFeedbackType,
  normalizeFeedbackStatus,
  createFeedback,
  listFeedback,
  updateFeedbackStatus,
};

// LOT 18 — Claims Service (sinistres) — Moved to claimsService.js
// This module is extended with claims functionality in a separate service file.
