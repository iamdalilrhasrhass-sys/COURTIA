const bcrypt = require('bcryptjs');
const { pool } = require('../../server');

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

  static async findById(id) {
    
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async verifyPassword(email, password) {
    const user = await User.findByEmail(email);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };
  }
}

module.exports = User;
