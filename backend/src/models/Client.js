const pool = require('../db');

class Client {
  static async create(data) {
    const { first_name, last_name, email, phone, company_name, type, status } = data;
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, company_name, type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [first_name, last_name, email, phone, company_name, type, status || 'prospect']
    );
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT id, civility, first_name, last_name, email, phone, company_name, status, risk_score, loyalty_score, created_at
       FROM clients
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM clients');
    return parseInt(result.rows[0].count, 10);
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async update(id, data) {
    const { first_name, last_name, email, phone, company_name, type, status, risk_score } = data;
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
       WHERE id = $9
       RETURNING *`,
      [first_name, last_name, email, phone, company_name, type, status, risk_score, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }
}

module.exports = Client;
