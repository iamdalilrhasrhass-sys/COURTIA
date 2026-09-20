const pool = require('../db');

/**
 * models/Client.js — LE MODÈLE CLIENT PORTE SA PORTÉE.
 *
 * DÉFAUTS FERMÉS (P4 SEC-030 et P3 SEC-023, mesurés en production le 20/09/2026)
 *   1. `update(id, data)` ne bornait RIEN : la requête écrivait
 *      `WHERE id = $9`, sans propriétaire. Un appelant qui passait l'identifiant
 *      d'un client d'un AUTRE cabinet le modifiait. Les trois autres méthodes
 *      (`create`, `findById`, `delete`) avaient exactement le même défaut, et
 *      `create` n'écrivait même pas `courtier_id` : le client créé n'appartenait
 *      à personne — invisible ensuite pour tout le monde, sauf en lecture sans
 *      filtre, ce qui est pire.
 *   2. Deux colonnes de propriété concurrentes cohabitaient dans `clients`
 *      (`user_id`, jamais renseignée, et `courtier_id`) : c'est ce qui a rendu
 *      l'upload documentaire mort (routes/clientDocuments.js filtrait sur
 *      `user_id`). Ce modèle n'en utilise plus qu'UNE : `courtier_id`.
 *
 * RÈGLE APPLIQUÉE ICI : une écriture (création, modification, suppression)
 * REFUSE de s'exécuter sans portée résolue. Un `WHERE id = $n` nu ne doit pas
 * pouvoir être écrit « par oubli » — il doit être impossible. `findById` accepte
 * une portée optionnelle pour rester utilisable en lecture interne, mais toute
 * ÉCRITURE l'exige.
 *
 * PORTÉE acceptée : un identifiant utilisateur (number → `courtier_id = id`,
 * sémantique historique, désormais RÉELLEMENT appliquée) ou un objet portée
 * résolu par `lib/porteeCabinet` (`{ userId, cabinetIds }`).
 */

/** Normalise la portée reçue en `{ userId, cabinetIds }`. `null` = non fournie. */
function normaliserPortee(portee) {
  if (portee === null || portee === undefined) return null;
  if (typeof portee === 'number') {
    return Number.isFinite(portee) && portee > 0 ? { userId: portee, cabinetIds: [] } : null;
  }
  const userId = Number.parseInt(portee.userId ?? portee.id, 10);
  const cabinetIds = Array.isArray(portee.cabinetIds) ? portee.cabinetIds.filter(Boolean) : [];
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return { userId, cabinetIds };
}

/** Clause SQL de portée sur la table `clients`. */
function clausePortee(portee, depart) {
  if (portee.cabinetIds.length > 0) {
    return {
      sql: `(cabinet_id = ANY($${depart}::uuid[]) OR courtier_id = $${depart + 1})`,
      params: [portee.cabinetIds, portee.userId],
      suivant: depart + 2,
    };
  }
  return { sql: `courtier_id = $${depart}`, params: [portee.userId], suivant: depart + 1 };
}

class Client {
  /**
   * Crée un client APPARTENANT à un utilisateur.
   * `courtier_id` est écrit : c'est la seule colonne d'appartenance du produit.
   * Sans portée, la création est refusée (un client orphelin est invisible).
   */
  static async create(data, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : un client ne peut pas être créé sans propriétaire');

    const { first_name, last_name, email, phone, company_name, type, status } = data;
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, company_name, type, status,
                            courtier_id, cabinet_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        first_name, last_name, email, phone, company_name, type, status || 'prospect',
        p.userId,
        // Le cabinet est estampillé quand la portée en connaît un : c'est lui qui
        // rend la ligne visible à toute l'équipe. `null` reste correct pour un
        // compte sans cabinet (comportement historique).
        p.cabinetIds.length > 0 ? String(p.cabinetIds[0]) : null,
      ]
    );
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : la liste des clients ne peut pas être globale');
    const f = clausePortee(p, 3);
    const result = await pool.query(
      `SELECT id, civility, first_name, last_name, email, phone, company_name, status, risk_score, loyalty_score, created_at
       FROM clients
       WHERE ${f.sql}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, ...f.params]
    );
    return result.rows;
  }

  static async count(portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : le comptage des clients ne peut pas être global');
    const f = clausePortee(p, 1);
    const result = await pool.query(`SELECT COUNT(*) as count FROM clients WHERE ${f.sql}`, f.params);
    return parseInt(result.rows[0].count, 10);
  }

  /** Lecture : portée optionnelle (usage interne), mais appliquée dès qu'elle est fournie. */
  static async findById(id, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) {
      const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
      return result.rows[0];
    }
    const f = clausePortee(p, 2);
    const result = await pool.query(`SELECT * FROM clients WHERE id = $1 AND ${f.sql}`, [id, ...f.params]);
    return result.rows[0];
  }

  /**
   * Modifie un client. La portée est OBLIGATOIRE et figure dans la requête :
   * c'est le défaut corrigé (SEC-030). Un client hors portée n'est pas touché.
   */
  static async update(id, data, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : une modification de client ne peut pas être non bornée');

    const { first_name, last_name, email, phone, company_name, type, status, risk_score } = data;
    const f = clausePortee(p, 9);
    const result = await pool.query(
      `UPDATE clients
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           company_name = COALESCE($5, company_name),
           type = COALESCE($6, type),
           status = COALESCE($7, status),
           risk_score = COALESCE($8, risk_score),
           updated_at = NOW()
       WHERE id = $9 AND ${f.sql}
       RETURNING *`,
      [first_name, last_name, email, phone, company_name, type, status, risk_score, id, ...f.params]
    );
    return result.rows[0];
  }

  static async updateScores(id, riskScore, loyaltyScore, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : une écriture de score ne peut pas être non bornée');
    const f = clausePortee(p, 4);
    const result = await pool.query(
      `UPDATE clients SET risk_score = $1, loyalty_score = $2, updated_at = NOW()
       WHERE id = $3 AND ${f.sql} RETURNING *`,
      [riskScore, loyaltyScore, id, ...f.params]
    );
    return result.rows[0];
  }

  static async delete(id, portee = null) {
    const p = normaliserPortee(portee);
    if (!p) throw new Error('portee_requise : une suppression de client ne peut pas être non bornée');
    const f = clausePortee(p, 2);
    const result = await pool.query(
      `DELETE FROM clients WHERE id = $1 AND ${f.sql} RETURNING id`,
      [id, ...f.params]
    );
    return result.rows[0];
  }
}

module.exports = Client;
