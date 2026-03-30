/**
 * Contract Model
 * Gestion des contrats d'assurance
 */

const pool = require('../db');

class Contract {
  // Créer un contrat
  static async create(contractData) {
    const {
      clientId,
      contractNumber,
      type = 'habitation',
      startDate,
      endDate,
      annualPremium = 0,
      status = 'actif',
      insurer = 'AXA'
    } = contractData;

    try {
      const query = `
        INSERT INTO contracts (
          client_id, contract_number, type, start_date, end_date, 
          annual_premium, status, insurer
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const result = await pool.query(query, [
        clientId,
        contractNumber,
        type,
        startDate,
        endDate,
        annualPremium,
        status,
        insurer
      ]);

      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  // Trouver par ID
  static async findById(id) {
    const query = 'SELECT * FROM contracts WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Lister les contrats
  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = 'SELECT * FROM contracts WHERE 1=1';
    const params = [];

    if (filters.clientId) {
      params.push(filters.clientId);
      query += ` AND client_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters.type) {
      params.push(filters.type);
      query += ` AND type = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY start_date DESC LIMIT $${params.length - 1} OFFSET $${params.length};`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Compter les contrats
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM contracts WHERE 1=1';
    const params = [];

    if (filters.clientId) {
      params.push(filters.clientId);
      query += ` AND client_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ';';
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  // Mettre à jour
  static async update(id, contractData) {
    const {
      contractNumber,
      type,
      startDate,
      endDate,
      annualPremium,
      status,
      insurer
    } = contractData;

    const query = `
      UPDATE contracts
      SET 
        contract_number = COALESCE($2, contract_number),
        type = COALESCE($3, type),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        annual_premium = COALESCE($6, annual_premium),
        status = COALESCE($7, status),
        insurer = COALESCE($8, insurer),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      contractNumber,
      type,
      startDate,
      endDate,
      annualPremium,
      status,
      insurer
    ]);

    return result.rows[0];
  }

  // Supprimer
  static async delete(id) {
    const query = 'DELETE FROM contracts WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Trouver par numéro de contrat
  static async findByNumber(contractNumber) {
    const query = 'SELECT * FROM contracts WHERE contract_number = $1;';
    const result = await pool.query(query, [contractNumber]);
    return result.rows[0];
  }

  // Obtenir les contrats d'un client
  static async findByClientId(clientId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM contracts 
      WHERE client_id = $1 
      ORDER BY start_date DESC 
      LIMIT $2 OFFSET $3;
    `;
    const result = await pool.query(query, [clientId, limit, offset]);
    return result.rows;
  }
}

module.exports = Contract;
