/**
 * Prospect Model
 * Gestion des prospects avec pipeline Kanban
 */

const pool = require('../db');

class Prospect {
  // Créer un prospect
  static async create(prospectData) {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      stage = 'nouveau',
      source = 'web',
      value = 0
    } = prospectData;

    try {
      const query = `
        INSERT INTO prospects (
          first_name, last_name, email, phone, company_name,
          stage, source, estimated_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const result = await pool.query(query, [
        firstName,
        lastName,
        email,
        phone,
        company || null,
        stage,
        source,
        value
      ]);

      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  // Trouver par ID
  static async findById(id) {
    const query = 'SELECT * FROM prospects WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Lister les prospects (avec pagination)
  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = 'SELECT * FROM prospects WHERE 1=1';
    const params = [];

    if (filters.stage) {
      params.push(filters.stage);
      query += ` AND stage = $${params.length}`;
    }
    if (filters.source) {
      params.push(filters.source);
      query += ` AND source = $${params.length}`;
    }
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      const idx = params.length - 2;
      query += ` AND (first_name ILIKE $${idx} OR last_name ILIKE $${idx+1} OR email ILIKE $${idx+2})`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length};`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Lister par stage (pour Kanban)
  static async findByStage(stage, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM prospects
      WHERE stage = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await pool.query(query, [stage, limit, offset]);
    return result.rows;
  }

  // Pipeline Kanban: obtenir les comptes par stage
  static async getPipelineStages() {
    const query = `
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM prospects
      GROUP BY stage
      ORDER BY stage;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Compter les prospects
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM prospects WHERE 1=1';
    const params = [];

    if (filters.stage) {
      params.push(filters.stage);
      query += ` AND stage = $${params.length}`;
    }
    if (filters.source) {
      params.push(filters.source);
      query += ` AND source = $${params.length}`;
    }

    query += ';';
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  // Mettre à jour
  static async update(id, prospectData) {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      stage,
      source,
      value
    } = prospectData;

    const query = `
      UPDATE prospects
      SET 
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        company_name = COALESCE($6, company_name),
        stage = COALESCE($7, stage),
        source = COALESCE($8, source),
        estimated_value = COALESCE($9, estimated_value),
        stage_updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      firstName,
      lastName,
      email,
      phone,
      company,
      stage,
      source,
      value
    ]);

    return result.rows[0];
  }

  // Supprimer
  static async delete(id) {
    const query = 'DELETE FROM prospects WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Déplacer vers un autre stage (pour Kanban)
  static async moveToStage(id, newStage) {
    const query = `
      UPDATE prospects
      SET stage = $2, stage_updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id, newStage]);
    return result.rows[0];
  }

  // Stages disponibles
  static getAvailableStages() {
    return ['nouveau', 'contact', 'devis', 'negotiation', 'gain', 'perdu'];
  }
}

module.exports = Prospect;
