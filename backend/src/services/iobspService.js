/**
 * iobspService.js — Logique métier du module CAPITIA / IOBSP.
 *
 * checkCapitiaAccess(userId) → vérifie les 3 conditions d'accès :
 *   1. Plan >= Pro
 *   2. IOBSP validé par admin (financing_module_active = true)
 *   3. Add-on Stripe actif (financing_addon_active = true)
 *
 * Retourne { allowed: true } ou { allowed: false, reason, details }
 * Les codes reason sont les mêmes que ceux renvoyés par iobspGuard.js
 * → utilisés aussi directement par les routes qui n'utilisent pas le middleware.
 */

const pool = require('../db');

/**
 * Vérifie les 3 conditions d'accès à CAPITIA pour un utilisateur.
 * @param {number} userId
 * @returns {Promise<{ allowed: boolean, reason?: string, details?: object }>}
 */
async function checkCapitiaAccess(userId) {
  const result = await pool.query(
    `SELECT subscription_plan, subscription_status,
            iobsp_status, iobsp_approved_at,
            financing_module_active, financing_addon_active,
            role
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { allowed: false, reason: 'user_not_found', details: {} };
  }

  const user = result.rows[0];

  // Super admin : bypass total
  if (user.role === 'super_admin') {
    return { allowed: true, bypass: 'super_admin' };
  }

  // Condition 1 — Plan >= Pro
  const plan = user.subscription_plan || 'start';
  if (!['pro', 'elite'].includes(plan)) {
    return {
      allowed: false,
      reason:  'plan_too_low',
      details: {
        current_plan:  plan,
        required_plan: 'pro',
      },
    };
  }

  // Condition 2 — Attestation IOBSP validée (financing_module_active posé par admin)
  if (!user.financing_module_active) {
    const iobspState = user.iobsp_status || 'not_submitted';
    // Mapper le statut DB en état lisible frontend
    const stateMap = {
      not_requested: 'not_submitted',
      pending:       'pending',
      rejected:      'rejected',
      approved:      'pending',  // approved mais financing_module_active pas encore activé → en cours
    };
    return {
      allowed: false,
      reason:  'iobsp_not_validated',
      details: {
        state:          stateMap[iobspState] || 'not_submitted',
        iobsp_status:   iobspState,
        approved_at:    user.iobsp_approved_at || null,
      },
    };
  }

  // Condition 3 — Add-on Stripe actif (financing_addon_active)
  if (!user.financing_addon_active) {
    return {
      allowed: false,
      reason:  'capitia_addon_inactive',
      details: {
        requires_subscription: true,
        price:                 49,
        currency:              'EUR',
        addon_key:             'capitia',
      },
    };
  }

  return { allowed: true };
}

/**
 * Soumet une attestation IOBSP pour un utilisateur.
 * @param {number} userId
 * @param {{ fileUrl: string, oriasNumber: string, category: string, additionalInfo?: string }}
 * @returns {Promise<{ status: string, submitted_at: Date, estimated_review_by: Date }>}
 */
async function submitAttestation(userId, { fileUrl, oriasNumber, category, additionalInfo }) {
  // Validation numéro ORIAS
  if (!/^\d{8}$/.test(oriasNumber)) {
    throw { message: 'Numéro ORIAS invalide (8 chiffres requis)', status: 400 };
  }

  // Vérifier statut actuel
  const check = await pool.query(
    'SELECT iobsp_status FROM users WHERE id=$1',
    [userId]
  );

  if (check.rows.length > 0 && check.rows[0].iobsp_status === 'approved') {
    throw { message: 'Attestation déjà approuvée', status: 409 };
  }

  // Mise à jour utilisateur
  const update = await pool.query(
    `UPDATE users
     SET iobsp_status='pending',
         iobsp_orias_number=$1,
         iobsp_category=$2,
         iobsp_attestation_url=$3,
         iobsp_requested_at=NOW()
     WHERE id=$4 AND iobsp_status != 'approved'
     RETURNING iobsp_requested_at`,
    [oriasNumber, category, fileUrl, userId]
  );

  const row = update.rows[0];

  // Enregistrement du fichier
  await pool.query(
    `INSERT INTO financing_files (user_id, file_type, file_name, file_url, uploaded_at)
     VALUES ($1, 'iobsp_attestation', 'attestation_iobsp.pdf', $2, NOW())`,
    [userId, fileUrl]
  );

  return {
    status: 'pending',
    submitted_at: row.iobsp_requested_at,
    estimated_review_by: new Date(Date.now() + 48 * 3600 * 1000),
  };
}

/**
 * Retourne le statut d'attestation IOBSP d'un utilisateur avec son état frontend.
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getAttestationStatus(userId) {
  const result = await pool.query(
    `SELECT iobsp_status, iobsp_orias_number, iobsp_category, iobsp_attestation_url,
            iobsp_requested_at, iobsp_approved_at, financing_module_active, financing_addon_active
     FROM users WHERE id=$1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { state: 'A', status: 'not_requested' };
  }

  const row = result.rows[0];
  const status = row.iobsp_status || 'not_requested';

  let state;
  if (status === 'not_requested' || status === null) {
    state = 'A';
  } else if (status === 'pending') {
    state = 'B';
  } else if (status === 'approved') {
    if (row.financing_module_active && row.financing_addon_active) {
      state = 'C'; // Accès complet
    } else if (row.financing_module_active && !row.financing_addon_active) {
      state = 'D'; // Validé, add-on non payé
    } else {
      state = 'B'; // En attente activation admin
    }
  } else if (status === 'rejected') {
    state = 'E';
  } else {
    state = 'A';
  }

  return {
    state,
    status: row.iobsp_status,
    submitted_at: row.iobsp_requested_at,
    reviewed_at: row.iobsp_approved_at,
    orias_number: row.iobsp_orias_number,
    attestation_url: row.iobsp_attestation_url,
    financing_module_active: row.financing_module_active,
    financing_addon_active: row.financing_addon_active,
  };
}

module.exports = { checkCapitiaAccess, submitAttestation, getAttestationStatus };
