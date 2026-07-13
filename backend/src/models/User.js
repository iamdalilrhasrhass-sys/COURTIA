const bcrypt = require('bcryptjs');
const pool = require('../db');

class User {
  static async create(email, password, firstName, lastName, role = 'broker') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, firstName, lastName, role]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findByLogin(identifier) {
    const normalized = String(identifier || '').trim().toLowerCase();
    const result = await pool.query(
      `SELECT * FROM users
       WHERE (LOWER(email) = $1 OR LOWER(username) = $1)
         AND deleted_at IS NULL
       LIMIT 1`,
      [normalized]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, status,
              must_change_password, suspended_at, deleted_at, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0];
  }

  static async verifyPassword(identifier, password) {
    const user = await User.findByLogin(identifier);
    if (!user) return null;
    if (user.suspended_at || String(user.status || 'active').toLowerCase() === 'suspended') return null;
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      must_change_password: Boolean(user.must_change_password)
    };
  }

  // --- Password reset ---

  static async setResetToken(email, token, expiresAt) {
    const result = await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
       WHERE email = $3
       RETURNING id, email`,
      [token, expiresAt, email]
    );
    return result.rows[0] || null;
  }

  static async findByResetToken(token) {
    const result = await pool.query(
      `SELECT id, email, password_reset_expires FROM users
       WHERE password_reset_token = $1`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async resetPassword(token, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL,
       must_change_password = FALSE, updated_at = NOW()
       WHERE password_reset_token = $2
       RETURNING id, email`,
      [hashedPassword, token]
    );
    return result.rows[0] || null;
  }
}

module.exports = User;
