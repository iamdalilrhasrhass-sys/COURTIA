const bcrypt = require('bcryptjs');
const pool = require('../db');

class User {
  static async create(email, password, firstName, lastName, role = 'broker') {
    const hashedPassword = await bcrypt.hash(password, 10);
    // CORRECTION 2026-09-19 : l'inscription ne renseignait NI plan NI statut
    // d'abonnement (users.plan NULL, subscription_status NULL). L'essai gratuit
    // annonce sur la landing (« 0 EUR aujourd'hui, 7 jours ») n'existait donc que
    // cote Stripe (trial_period_days) et jamais dans le produit : les fonctions
    // payantes restaient bridees et l'activation n'etait jamais comptee.
    // On accorde desormais l'essai a la creation du compte, duree lue dans
    // BILLING_TRIAL_DAYS (defaut 7, meme source que billingService et Stripe).
    const trialDays = Number(process.env.BILLING_TRIAL_DAYS || 7);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role,
                          plan, subscription_status, trial_ends_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'trial', 'trialing', NOW() + ($6 || ' days')::interval, NOW())
       RETURNING id, email, first_name, last_name, role, plan, subscription_status, trial_ends_at, created_at`,
      [email, hashedPassword, firstName, lastName, role, String(trialDays)]
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
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE password_reset_token = $2
       RETURNING id, email`,
      [hashedPassword, token]
    );
    return result.rows[0] || null;
  }
}

module.exports = User;
