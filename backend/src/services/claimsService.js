/**
 * claimsService — sinistres (module LOT 18).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DES SINISTRES : LE CABINET, PAS LA SEULE PERSONNE
 * (correction du 21/09/2026 — défaut P1 « deux vérités pour une même donnée »)
 *
 * DÉFAUT MESURÉ : toutes les requêtes filtraient `courtier_id = $n`. Un
 * collaborateur (`broker`) du même cabinet voyait donc 0 sinistre, recevait 404
 * sur le dossier d'un sinistre que le CRM lui affiche, et ne pouvait ni ouvrir
 * ni mettre à jour un sinistre d'un client du cabinet — alors que la fiche
 * client, elle, lui était servie.
 *
 * RÈGLE TENUE : chaque requête passe par `lib/porteeCabinet` (seule autorité).
 * `claims` ne porte PAS `cabinet_id` : son ancre est celle de son CLIENT
 * (`claims.client_id` est NOT NULL, ON DELETE CASCADE), donc `cl.cabinet_id`
 * via la jointure `JOIN clients cl`. La clause redevient EXACTEMENT
 * `c.courtier_id = $n` si le compte n'a pas de cabinet : les cabinets
 * mono-utilisateur ne changent pas de comportement, et un compte dont
 * l'appartenance a été retirée ne lit plus aucun sinistre.
 *
 * `options.portee` (ou `portee` dans l'objet d'arguments) évite une requête
 * d'appartenance supplémentaire quand la route l'a déjà résolue.
 * ────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../db');
const porteeCabinet = require('../lib/porteeCabinet');

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

async function createClaim({ courtierId, clientId, contractId, type, description, amount, insurerRef, portee } = {}, db = pool) {
  if (!courtierId) throw new Error('Authentification requise');
  if (!clientId) throw new Error('client_id requis');
  if (!type) throw new Error('type sinistre requis');
  // Le client doit être dans la portée (cabinet), pas seulement « le mien ».
  const p = await porteeCabinet.resoudrePorteeUtilisateur(db, courtierId, { portee });
  const f = porteeCabinet.fragment(p, {
    cabinet: 'clients.cabinet_id',
    proprietaire: 'clients.courtier_id',
    depart: 2,
  });
  const clientCheck = await db.query(`SELECT id FROM clients WHERE id = $1 AND ${f.sql}`, [clientId, ...f.params]);
  if (!clientCheck.rows.length) throw new Error('Client non autorise');
  const result = await db.query(
    `INSERT INTO claims (client_id, contract_id, type, status, description, amount, insurer_ref, courtier_id, opened_at) VALUES ($1, $2, $3, 'opened', $4, $5, $6, $7, CURRENT_DATE) RETURNING *`,
    [clientId, contractId || null, normalizeClaimType(type), description || null, amount || null, insurerRef || null, courtierId]
  );
  return result.rows[0];
}

async function listClaims({ courtierId, clientId, status, limit = 100, portee } = {}, db = pool) {
  const p = await porteeCabinet.resoudrePorteeUtilisateur(db, courtierId, { portee });
  const f = porteeCabinet.fragment(p, {
    cabinet: 'cl.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  });
  // `f.params` occupe $1..$n ; les filtres suivants continuent à $n+1.
  const params = [...f.params];
  let whereExtra = '';
  if (clientId) { params.push(clientId); whereExtra += ` AND c.client_id = $${params.length}`; }
  if (status) { params.push(normalizeClaimStatus(status)); whereExtra += ` AND c.status = $${params.length}`; }
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
  const result = await db.query(
    `SELECT c.*, cl.first_name, cl.last_name, cl.email FROM claims c JOIN clients cl ON cl.id = c.client_id WHERE ${f.sql} ${whereExtra} ORDER BY c.opened_at DESC LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function getClaimById(id, courtierId, db = pool, options = {}) {
  const p = await porteeCabinet.resoudrePorteeUtilisateur(db, courtierId, options);
  const f = porteeCabinet.fragment(p, {
    cabinet: 'cl.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 2,
  });
  const result = await db.query(`SELECT c.*, cl.first_name, cl.last_name, cl.email FROM claims c JOIN clients cl ON cl.id = c.client_id WHERE c.id = $1 AND ${f.sql}`, [id, ...f.params]);
  return result.rows[0] || null;
}

async function updateClaim(id, courtierId, updates, db = pool, options = {}) {
  const allowed = ['status', 'description', 'amount', 'insurer_ref', 'closed_at', 'ark_summary'];
  const sets = [];
  const p = await porteeCabinet.resoudrePorteeUtilisateur(db, courtierId, options);
  // Clause de portée portée par la jointure `FROM clients cl` : `claims` n'a pas
  // d'ancre de cabinet propre, son cabinet est celui de son CLIENT.
  const f = porteeCabinet.fragment(p, {
    cabinet: 'cl.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 2,
  });
  const params = [id, ...f.params];
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { params.push(key === 'status' ? normalizeClaimStatus(value) : value); sets.push(`${key} = $${params.length}`); }
  }
  if (!sets.length) return getClaimById(id, courtierId, db, { portee: p });
  sets.push('updated_at = NOW()');
  const result = await db.query(
    `UPDATE claims c SET ${sets.join(', ')} FROM clients cl WHERE cl.id = c.client_id AND c.id = $1 AND ${f.sql} RETURNING c.*`,
    params
  );
  return result.rows[0] || null;
}

async function generateArkSummary(claimId, courtierId, db = pool, options = {}) {
  const claim = await getClaimById(claimId, courtierId, db, options);
  if (!claim) return null;
  const summary = `Sinistre ${claim.type} ouvert le ${claim.opened_at}. Client: ${claim.first_name} ${claim.last_name}. Statut: ${claim.status}.`;
  await db.query('UPDATE claims SET ark_summary = $1, updated_at = NOW() WHERE id = $2', [summary, claimId]);
  return summary;
}

module.exports = { CLAIM_TYPES, CLAIM_STATUSES, normalizeClaimType, normalizeClaimStatus, createClaim, listClaims, getClaimById, updateClaim, generateArkSummary };
