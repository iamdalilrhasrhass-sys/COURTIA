const bcrypt = require('bcryptjs');
const pool = require('../db');
const { hachageJeton } = require('../lib/jetons');

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
  //
  // DÉFAUT FERMÉ (P3 SEC-027, mesuré en production le 20/09/2026)
  // `password_reset_token` était écrit EN CLAIR dans `users`. Une lecture de la
  // base — sauvegarde, dump, accès en lecture d'un prestataire, injection SQL
  // ailleurs — donnait donc le pouvoir de réinitialiser (et donc de prendre) le
  // mot de passe de N'IMPORTE QUEL compte, pendant toute la durée de validité du
  // jeton. Une entrée de `users` suffisait à prendre la main sur un cabinet.
  //
  // CORRECTION : seul le HACHAGE SHA-256 du jeton est stocké (lib/jetons.js).
  // L'API de ce modèle ne change pas : l'appelant reçoit toujours le jeton en
  // clair (c'est lui, et lui seul, qui part dans l'e-mail), et le jeton présenté
  // est haché avant la comparaison. Aucun appelant n'a donc à être modifié, et
  // aucun chemin ne peut contourner le hachage par oubli.

  static async setResetToken(email, token, expiresAt) {
    const empreinte = hachageJeton(token);
    if (!empreinte) {
      // Un jeton trop court n'a pas l'entropie d'un jeton : on refuse de
      // l'enregistrer plutôt que de stocker un secret devinable.
      throw new Error('jeton_reinitialisation_invalide');
    }
    const result = await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
       WHERE email = $3
       RETURNING id, email`,
      [empreinte, expiresAt, email]
    )
    return result.rows[0] || null
  }

  static async findByResetToken(token) {
    const empreinte = hachageJeton(token);
    if (!empreinte) return null
    const result = await pool.query(
      `SELECT id, email, password_reset_expires FROM users
       WHERE password_reset_token = $1`,
      [empreinte]
    )
    return result.rows[0] || null
  }

  static async resetPassword(token, newPassword) {
    const empreinte = hachageJeton(token);
    if (!empreinte) return null
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // SEC-016 : un mot de passe réinitialisé doit invalider les sessions
    // ouvertes avec l'ancien mot de passe (password_changed_at testé par
    // middleware/auth.js).
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL,
                        password_changed_at = NOW(), updated_at = NOW()
       WHERE password_reset_token = $2
       RETURNING id, email`,
      [hashedPassword, empreinte]
    )
    return result.rows[0] || null
  }

  // --- Essai : invitation puis activation ---
  //
  // DEPART DE L'ESSAI (decision du 20/09/2026) : un cabinet invite ne doit pas
  // perdre des jours d'essai avant meme d'avoir active son acces. L'invitation
  // enregistre donc la DUREE prevue sans faire courir l'essai
  // (`pending_activation`, `trial_ends_at` NULL), et l'essai demarre a
  // l'activation reelle, pour exactement `trial_days` jours.

  /**
   * Prepare une invitation d'essai : le compte existe, l'essai ne court pas.
   * @returns {Promise<{trial_days: number}|null>}
   */
  static async preparerInvitation(userId, { cabinet, jours }) {
    const joursValides = Number.isFinite(Number(jours)) && Number(jours) > 0
      ? Math.trunc(Number(jours))
      : Number(process.env.BILLING_TRIAL_DAYS || 7);
    const result = await pool.query(
      `UPDATE users
          SET cabinet_name = $1,
              trial_days = $2,
              invited_at = NOW(),
              plan = 'trial',
              subscription_status = 'pending_activation',
              trial_ends_at = NULL,
              trial_started_at = NULL,
              updated_at = NOW()
        WHERE id = $3
        RETURNING id, email, cabinet_name, trial_days, invited_at`,
      [cabinet || '', joursValides, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Demarre l'essai a partir de MAINTENANT, une seule fois.
   * Sans effet si le compte n'est pas en attente d'activation : un compte deja
   * en essai ou abonne ne voit jamais ses dates recalculees par une activation.
   * @returns {Promise<{debut: string, fin: string, jours: number}|null>}
   */
  static async demarrerEssai(userId) {
    const result = await pool.query(
      `UPDATE users
          SET subscription_status = 'trialing',
              trial_started_at = NOW(),
              trial_ends_at = NOW() + (COALESCE(trial_days, $2) || ' days')::interval,
              plan = 'trial',
              updated_at = NOW()
        WHERE id = $1 AND subscription_status = 'pending_activation'
        RETURNING trial_started_at, trial_ends_at, COALESCE(trial_days, $2) AS trial_days`,
      [userId, Number(process.env.BILLING_TRIAL_DAYS || 7)]
    );
    const ligne = result.rows[0];
    if (!ligne) return null;
    return {
      debut: ligne.trial_started_at,
      fin: ligne.trial_ends_at,
      jours: Number(ligne.trial_days),
    };
  }

  // --- Accès direct : identifiants remis par l'exploitant ---
  //
  // DÉCISION DU 20/09/2026 : le cabinet n'a plus à « activer » son compte par un
  // lien pour pouvoir se connecter. L'identifiant est son e-mail et le mot de
  // passe initial est le nom du cabinet ; il est utilisable IMMÉDIATEMENT et
  // marqué temporaire (`must_change_password`). L'essai court dès la création du
  // compte : il n'y a plus d'activation à attendre, donc plus de jours perdus.
  //
  // Le mot de passe n'est jamais stocké en clair : même hachage bcrypt (10 tours)
  // que l'inscription et la réinitialisation.

  /**
   * Pose un mot de passe utilisable tout de suite et ouvre l'essai.
   * @returns {Promise<{id: number, email: string, debut: Date, fin: Date, jours: number}|null>}
   */
  static async definirAccesDirect(userId, motDePasse, { jours } = {}) {
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const joursValides = Number.isFinite(Number(jours)) && Number(jours) > 0
      ? Math.trunc(Number(jours))
      : Number(process.env.BILLING_TRIAL_DAYS || 7);
    const result = await pool.query(
      `UPDATE users
          SET password_hash = $1,
              must_change_password = TRUE,
              plan = 'trial',
              subscription_status = 'trialing',
              trial_days = $3::int,
              trial_started_at = NOW(),
              trial_ends_at = NOW() + ($3::int || ' days')::interval,
              invited_at = COALESCE(invited_at, NOW()),
              password_reset_token = NULL,
              password_reset_expires = NULL,
              updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, trial_started_at, trial_ends_at, trial_days`,
      [hashedPassword, userId, String(joursValides)]
    );
    const ligne = result.rows[0];
    if (!ligne) return null;
    return {
      id: ligne.id,
      email: ligne.email,
      debut: ligne.trial_started_at,
      fin: ligne.trial_ends_at,
      jours: Number(ligne.trial_days),
    };
  }

  /**
   * Changement de mot de passe par le titulaire (Paramètres > Sécurité).
   * L'ancien mot de passe est exigé et devient inopérant : le hachage est
   * remplacé, il n'existe aucun autre secret utilisable pour se connecter.
   * @returns {Promise<{ok: true}|{ok: false, raison: string}>}
   */
  static async changerMotDePasse(userId, motDePasseActuel, nouveauMotDePasse) {
    const { rows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId]
    );
    const compte = rows[0];
    if (!compte) return { ok: false, raison: 'compte_introuvable' };

    const actuelValide = await bcrypt.compare(motDePasseActuel, compte.password_hash);
    if (!actuelValide) return { ok: false, raison: 'mot_de_passe_actuel_invalide' };

    const identique = await bcrypt.compare(nouveauMotDePasse, compte.password_hash);
    if (identique) return { ok: false, raison: 'mot_de_passe_identique' };

    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
    await pool.query(
      `UPDATE users
          SET password_hash = $1,
              must_change_password = FALSE,
              password_changed_at = NOW(),
              updated_at = NOW()
        WHERE id = $2`,
      [hashedPassword, userId]
    );
    return { ok: true };
  }

  // --- Profil : identité du titulaire + identité RÉGLEMENTAIRE du cabinet ---
  //
  // POURQUOI CE BLOC : `PUT /api/auth/me` répondait `{success:true}` sans que
  // rien ne garantisse une écriture — la route lisait `req.user.id` alors que
  // certains jetons ne portent que `userId` (identifiant alors NULL dans le
  // `WHERE`, zéro ligne touchée, succès affiché quand même), elle n'écrivait
  // jamais `users.phone`, et elle écrasait `broker_profiles.orias`, `adresse`,
  // `ville`, `code_postal` par NULL dès qu'un formulaire partiel ne les
  // envoyait pas. Un cabinet suisse perdait ainsi son numéro FINMA/UID au
  // premier enregistrement depuis l'écran Paramètres.
  //
  // Règles appliquées ici :
  //   - on n'écrit que ce qui est réellement fourni (un champ omis ou vide
  //     CONSERVE sa valeur : `COALESCE(NULLIF($n,''), colonne)`) ;
  //   - aucune écriture ⇒ aucun succès : l'appelant reçoit une raison ;
  //   - `orias` est une donnée française : elle n'est jamais exigée ni
  //     inventée, et un cabinet suisse peut enregistrer FINMA + UID sans elle.

  /** Champs du profil cabinet acceptés (colonnes réelles de broker_profiles). */
  static get CHAMPS_PROFIL_CABINET() {
    return [
      'cabinet', 'pays', 'langue', 'registre_type', 'registre_numero', 'uid',
      'orias', 'telephone', 'adresse', 'ville', 'code_postal', 'site_web',
    ];
  }

  /**
   * Enregistre l'identité du titulaire (users) et du cabinet (broker_profiles).
   * @param {number} userId identifiant réel de l'utilisateur connecté
   * @param {object} donnees champs reçus (les absents sont conservés)
   * @returns {Promise<{ok: true, utilisateur: object, profil: object}|{ok: false, raison: string}>}
   */
  static async mettreAJourProfil(userId, donnees = {}) {
    const id = Number(userId);
    if (!Number.isFinite(id) || id <= 0) return { ok: false, raison: 'identifiant_utilisateur_absent' };

    const texteDe = (valeur) => (valeur === null ? '' : String(valeur).trim());
    const valeurSiFournie = (champ) => (donnees[champ] === undefined ? null : texteDe(donnees[champ]));

    // `telephone` (fiche cabinet) et `phone` (compte) désignent le même numéro.
    const telephone = donnees.telephone !== undefined
      ? texteDe(donnees.telephone)
      : (donnees.phone !== undefined ? texteDe(donnees.phone) : null);

    const champsCabinetFournis = User.CHAMPS_PROFIL_CABINET.filter((c) => donnees[c] !== undefined);
    // Identifiant de connexion : il n'est pas modifiable ici (il sert à
    // s'authentifier et porte une contrainte d'unicité). On le SIGNALE au lieu
    // de répondre « mis à jour » sur un champ resté inchangé.
    const emailFourni = donnees.email === undefined ? null : texteDe(donnees.email).toLowerCase();
    const rienAFournir = donnees.first_name === undefined && donnees.last_name === undefined
      && telephone === null && champsCabinetFournis.length === 0;
    if (rienAFournir) {
      return { ok: false, raison: emailFourni ? 'email_non_modifiable' : 'aucun_champ_modifiable' };
    }

    const utilisateur = await pool.query(
      `UPDATE users
          SET first_name = COALESCE(NULLIF($2, ''), first_name),
              last_name  = COALESCE(NULLIF($3, ''), last_name),
              phone      = COALESCE(NULLIF($4, ''), phone),
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, first_name, last_name, phone`,
      [id, valeurSiFournie('first_name'), valeurSiFournie('last_name'), telephone]
    );
    if (utilisateur.rows.length === 0) return { ok: false, raison: 'utilisateur_introuvable' };

    const majProfil = await pool.query(
      `UPDATE broker_profiles
          SET cabinet         = COALESCE(NULLIF($2, ''), cabinet),
              telephone       = COALESCE(NULLIF($3, ''), telephone),
              adresse         = COALESCE(NULLIF($4, ''), adresse),
              ville           = COALESCE(NULLIF($5, ''), ville),
              code_postal     = COALESCE(NULLIF($6, ''), code_postal),
              orias           = COALESCE(NULLIF($7, ''), orias),
              registre_type   = COALESCE(NULLIF($8, ''), registre_type),
              registre_numero = COALESCE(NULLIF($9, ''), registre_numero),
              uid             = COALESCE(NULLIF($10, ''), uid),
              site_web        = COALESCE(NULLIF($11, ''), site_web),
              pays            = COALESCE(NULLIF($12, ''), pays),
              langue          = COALESCE(NULLIF($13, ''), langue),
              first_name      = COALESCE(NULLIF($14, ''), first_name),
              last_name       = COALESCE(NULLIF($15, ''), last_name),
              updated_at      = NOW()
        WHERE user_id = $1
        RETURNING user_id, cabinet, pays, langue, registre_type, registre_numero, uid,
                  orias, telephone, adresse, ville, code_postal, site_web, first_name, last_name`,
      [
        id,
        valeurSiFournie('cabinet'), telephone, valeurSiFournie('adresse'), valeurSiFournie('ville'),
        valeurSiFournie('code_postal'), valeurSiFournie('orias'), valeurSiFournie('registre_type'),
        valeurSiFournie('registre_numero'), valeurSiFournie('uid'), valeurSiFournie('site_web'),
        valeurSiFournie('pays'), valeurSiFournie('langue'),
        valeurSiFournie('first_name'), valeurSiFournie('last_name'),
      ]
    );

    let profil = majProfil.rows[0];
    if (!profil) {
      const creation = await pool.query(
        `INSERT INTO broker_profiles (user_id, cabinet, pays, langue, registre_type, registre_numero,
                                      uid, orias, telephone, adresse, ville, code_postal, site_web,
                                      first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
         RETURNING user_id, cabinet, pays, langue, registre_type, registre_numero, uid,
                   orias, telephone, adresse, ville, code_postal, site_web, first_name, last_name`,
        [
          id, valeurSiFournie('cabinet') || '', valeurSiFournie('pays') || '', valeurSiFournie('langue') || '',
          valeurSiFournie('registre_type') || '', valeurSiFournie('registre_numero') || '',
          valeurSiFournie('uid') || '', valeurSiFournie('orias') || '', telephone || '',
          valeurSiFournie('adresse') || '', valeurSiFournie('ville') || '', valeurSiFournie('code_postal') || '',
          valeurSiFournie('site_web') || '', valeurSiFournie('first_name') || '', valeurSiFournie('last_name') || '',
        ]
      );
      profil = creation.rows[0];
    }

    const champsIgnores = emailFourni && emailFourni !== String(utilisateur.rows[0].email || '').toLowerCase()
      ? ['email']
      : [];

    return { ok: true, utilisateur: utilisateur.rows[0], profil, champs_ignores: champsIgnores };
  }
}

module.exports = User;
