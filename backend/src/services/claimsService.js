const pool = require('../db');

const CLAIM_TYPES = new Set(['auto_collision', 'auto_vol', 'auto_bris_glace', 'habitation_degat_eaux', 'habitation_incendie', 'habitation_vol', 'sante', 'prevoyance', 'responsabilite_civile', 'autre']);
const CLAIM_STATUSES = new Set(['opened', 'in_progress', 'pending_docs', 'settled', 'rejected', 'closed']);

function normalizeClaimType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return CLAIM_TYPES.has(normalized) ? normalized : 'autre';
}

function normalizeClaimStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return CLAIM_STATUSES.has(normalized) ? normalized : 'opened';
}

async function createClaim({ courtierId, clientId, contractId, type, description, amount, insurerRef }, db = pool) {
  if (!courtierId) throw new Error('Authentification requise');
  if (!clientId) throw new Error('client_id requis');
  if (!type) throw new Error('type sinistre requis');
  const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1 AND courtier_id = $2', [clientId, courtierId]);
  if (!clientCheck.rows.length) throw new Error('Client non autorise');
  const result = await db.query(
    `INSERT INTO claims (client_id, contract_id, type, status, description, amount, insurer_ref, courtier_id, opened_at) VALUES ($1, $2, $3, 'opened', $4, $5, $6, $7, CURRENT_DATE) RETURNING *`,
    [clientId, contractId || null, normalizeClaimType(type), description || null, amount || null, insurerRef || null, courtierId]
  );
  return result.rows[0];
}

async function listClaims({ courtierId, clientId, status, limit = 100 }, db = pool) {
  const params = [courtierId];
  let whereExtra = '';
  if (clientId) { params.push(clientId); whereExtra += ` AND c.client_id = $${params.length}`; }
  if (status) { params.push(normalizeClaimStatus(status)); whereExtra += ` AND c.status = $${params.length}`; }
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
  const result = await db.query(
    `SELECT c.*, cl.first_name, cl.last_name, cl.email FROM claims c JOIN clients cl ON cl.id = c.client_id WHERE c.courtier_id = $1 ${whereExtra} ORDER BY c.opened_at DESC LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function getClaimById(id, courtierId, db = pool) {
  const result = await db.query(`SELECT c.*, cl.first_name, cl.last_name, cl.email FROM claims c JOIN clients cl ON cl.id = c.client_id WHERE c.id = $1 AND c.courtier_id = $2`, [id, courtierId]);
  return result.rows[0] || null;
}

async function updateClaim(id, courtierId, updates, db = pool) {
  const allowed = ['status', 'description', 'amount', 'insurer_ref', 'closed_at', 'ark_summary'];
  const sets = [];
  const params = [id, courtierId];
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { params.push(key === 'status' ? normalizeClaimStatus(value) : value); sets.push(`${key} = $${params.length}`); }
  }
  if (!sets.length) return getClaimById(id, courtierId, db);
  sets.push('updated_at = NOW()');
  const result = await db.query(`UPDATE claims SET ${sets.join(', ')} WHERE id = $1 AND courtier_id = $2 RETURNING *`, params);
  return result.rows[0] || null;
}

async function generateArkSummary(claimId, courtierId, db = pool) {
  const claim = await getClaimById(claimId, courtierId, db);
  if (!claim) return null;
  const summary = `Sinistre ${claim.type} ouvert le ${claim.opened_at}. Client: ${claim.first_name} ${claim.last_name}. Statut: ${claim.status}.`;
  await db.query('UPDATE claims SET ark_summary = $1, updated_at = NOW() WHERE id = $2', [summary, claimId]);
  return summary;
}

module.exports = { CLAIM_TYPES, CLAIM_STATUSES, normalizeClaimType, normalizeClaimStatus, createClaim, listClaims, getClaimById, updateClaim, generateArkSummary };
