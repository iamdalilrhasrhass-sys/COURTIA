/**
 * Partenaires — Routes API
 * Module de suivi des partenariats courtage
 *
 * CORRECTION 20/09/2026 (Red Team P1 #3) : ce routeur n'avait AUCUNE garde de
 * rôle. Un compte de cabinet en LECTURE SEULE (`assistant`) créait réellement
 * des partenaires en base (`POST /api/partners` → 201, ligne écrite). Les
 * écritures passent désormais par `exigerEcritureCabinet` : 403 `lecture_seule`
 * pour assistant/viewer, comportement inchangé pour owner/manager/broker et
 * pour les comptes sans cabinet.
 *
 * CORRECTION 20/09/2026 (P2 — portée cabinet) : les LECTURES filtraient encore
 * `partners.user_id = req.user.id`, c'est-à-dire « mes partenaires » alors que
 * tout le reste du CRM est passé à la portée du CABINET (`lib/porteeCabinet`).
 * Un collaborateur invité ne voyait donc AUCUN partenaire de son cabinet et ne
 * pouvait pas travailler le carnet commun (défaut reproduit sur un cabinet
 * d'audit à deux membres). Les quatre lectures/écritures passent maintenant par
 * la MÊME règle que les autres routes métier :
 *   • cabinet  → `partners.cabinet_id = ANY(cabinets de l'utilisateur)`
 *                OU `partners.user_id = utilisateur` (lignes créées avant son
 *                rattachement : aucune donnée existante ne disparaît) ;
 *   • mono     → `partners.user_id = utilisateur` (aucun cabinet : le
 *                comportement historique est préservé à l'identique) ;
 *   • et pour les écritures, la portée restreinte aux cabinets où le rôle
 *     autorise l'écriture (`lib/porteeCabinet.fragment` avec `ecriture: true`).
 * Une ligne hors cabinet répond 404 (jamais 200, jamais 500) : la ressource
 * n'existe pas pour l'appelant.
 *
 * ENTRÉES INVALIDES : un identifiant non numérique répond 400
 * `identifiant_invalide` (le contrôle est fait ici, avant la base, et non laissé
 * à la traduction du message PostgreSQL), et un champ trop long pour sa colonne
 * répond 400 `champ_trop_long` au lieu de laisser la base refuser en 500.
 */
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const poolModule = require('../db');
const porteeCabinet = require('../lib/porteeCabinet');
const { exigerEcritureCabinet } = require('../middleware/gardeEcritureRole');

/** Refus 403 pour un rôle de cabinet en lecture seule (assistant / viewer). */
const ecrire = exigerEcritureCabinet(poolModule, 'modifier les partenaires du cabinet');

/** Pool réellement utilisé par la requête (même convention que les autres routes métier). */
function poolDe(req) {
  return (req.app && req.app.locals && req.app.locals.pool) || poolModule;
}

/**
 * Clause SQL de portée « partenaires ».
 * @param {object} portee portée cabinet résolue
 * @param {{depart?: number, ecriture?: boolean}} options
 */
function filtrePartenaire(portee, { depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: 'partners.cabinet_id',
    proprietaire: 'partners.user_id',
    depart,
    ecriture,
  });
}

/** Longueurs réelles des colonnes de `partners` (migration 005 / 003z). */
const LONGUEURS = Object.freeze({
  nom: 255,
  categorie: 100,
  type_partenaire: 50,
  contact_nom: 255,
  contact_email: 255,
  contact_telephone: 30,
  produit_principal: 200,
  code_courtage: 100,
  commission: 100,
  extranet_url: 500,
  extranet_login: 255,
  volume_potentiel: 100,
});

/**
 * Un champ texte qui dépasse sa colonne est une ENTRÉE invalide : la base
 * refuserait en 500 (`value too long for type character varying(255)`) et le
 * courtier lirait le nom d'une contrainte interne. On refuse ici, en nommant le
 * champ et la limite.
 * @returns {string|null} nom du champ fautif, ou null si tout est correct
 */
function champTropLong(corps = {}) {
  for (const [champ, max] of Object.entries(LONGUEURS)) {
    const valeur = corps[champ];
    if (valeur == null) continue;
    if (String(valeur).length > max) return `${champ} (maximum ${max} caractères)`;
  }
  return null;
}

/** Identifiant de route exploitable : un entier positif, sinon null. */
function identifiantValide(valeur) {
  const brut = String(valeur ?? '').trim();
  if (!/^\d+$/.test(brut)) return null;
  const id = Number.parseInt(brut, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function refuserIdentifiant(res) {
  return res.status(400).json({
    success: false,
    error: 'identifiant_invalide',
    message: "L'identifiant du partenaire doit être un nombre entier.",
  });
}

// GET /api/partners — Liste des partenaires du CABINET
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = poolDe(req);
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const f = filtrePartenaire(portee, { depart: 1 });
    const clauses = [f.sql];
    const params = [...f.params];
    const { statut, categorie, vague, search } = req.query;

    if (statut) {
      params.push(statut);
      clauses.push(`statut = $${params.length}`);
    }
    if (categorie) {
      params.push(categorie);
      clauses.push(`categorie = $${params.length}`);
    }
    if (vague) {
      params.push(parseInt(vague, 10));
      clauses.push(`vague = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(nom ILIKE $${params.length} OR contact_nom ILIKE $${params.length} OR produit_principal ILIKE $${params.length})`);
    }

    const query = `SELECT * FROM partners WHERE ${clauses.join(' AND ')} ORDER BY priorite ASC, updated_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, partners: result.rows });
  } catch (err) {
    console.error('[partners] GET /', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/partners/stats — Statistiques du CABINET
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = poolDe(req);
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const f = filtrePartenaire(portee, { depart: 1 });
    const result = await pool.query(
      `SELECT statut, COUNT(*) as count FROM partners WHERE ${f.sql} GROUP BY statut`,
      f.params
    );
    const stats = {};
    result.rows.forEach(r => { stats[r.statut] = parseInt(r.count, 10); });
    res.json({
      success: true,
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      codes_ouverts: stats.Code_ouvert || 0,
      en_cours: (stats.A_contacter || 0) + (stats.Contacte || 0) + (stats.Dossier_envoye || 0) + (stats.En_analyse || 0),
      refus: stats.Refuse || 0,
      par_statut: stats
    });
  } catch (err) {
    console.error('[partners] GET /stats', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/partners — Créer un partenaire (dans le cabinet de l'appelant)
router.post('/', verifyToken, ecrire, async (req, res) => {
  try {
    const pool = poolDe(req);
    const userId = req.user.userId || req.user.id;
    const { nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite, vague, notes } = req.body;

    if (!nom) {
      return res.status(400).json({ success: false, error: 'nom_requis', message: 'Le nom du partenaire est requis' });
    }
    const trop = champTropLong(req.body);
    if (trop) {
      return res.status(400).json({ success: false, error: 'champ_trop_long', message: `Le champ ${trop} est trop long.` });
    }

    // `cabinet_id` estampille le tenant ; `user_id` reste l'AUTEUR de la ligne.
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const result = await pool.query(
      `INSERT INTO partners (user_id, nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite, vague, notes, cabinet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [userId, nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite || 2, vague || 1, notes, porteeCabinet.cabinetPourCreation(portee)]
    );

    res.status(201).json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] POST /', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /api/partners/:id — Mettre à jour un partenaire du cabinet
router.put('/:id', verifyToken, ecrire, async (req, res) => {
  try {
    const pool = poolDe(req);
    const id = identifiantValide(req.params.id);
    if (!id) return refuserIdentifiant(res);

    const trop = champTropLong(req.body);
    if (trop) {
      return res.status(400).json({ success: false, error: 'champ_trop_long', message: `Le champ ${trop} est trop long.` });
    }

    const { nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, code_courtage, commission, extranet_url, extranet_login, statut, documents_envoyes, notes, priorite, vague, volume_potentiel, date_contact, date_relance } = req.body;

    // Portée d'ÉCRITURE : seuls les cabinets où le rôle de l'appelant autorise
    // l'écriture. Un partenaire d'un autre cabinet est donc introuvable (404).
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const f = filtrePartenaire(portee, { depart: 21, ecriture: true });

    const result = await pool.query(
      `UPDATE partners SET
        nom = COALESCE($1, nom),
        categorie = COALESCE($2, categorie),
        type_partenaire = COALESCE($3, type_partenaire),
        contact_nom = COALESCE($4, contact_nom),
        contact_email = COALESCE($5, contact_email),
        contact_telephone = COALESCE($6, contact_telephone),
        produit_principal = COALESCE($7, produit_principal),
        code_courtage = COALESCE($8, code_courtage),
        commission = COALESCE($9, commission),
        extranet_url = COALESCE($10, extranet_url),
        extranet_login = COALESCE($11, extranet_login),
        statut = COALESCE($12, statut),
        documents_envoyes = COALESCE($13, documents_envoyes),
        notes = COALESCE($14, notes),
        priorite = COALESCE($15, priorite),
        vague = COALESCE($16, vague),
        volume_potentiel = COALESCE($17, volume_potentiel),
        date_contact = COALESCE($18, date_contact),
        date_relance = COALESCE($19, date_relance),
        updated_at = NOW()
       WHERE id = $20 AND ${f.sql} RETURNING *`,
      [nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, code_courtage, commission, extranet_url, extranet_login, statut, Array.isArray(documents_envoyes) ? documents_envoyes : null, notes, priorite, vague, volume_potentiel, date_contact, date_relance, id, ...f.params]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'not_found', message: 'Partenaire non trouvé' });
    }
    res.json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] PUT /:id', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/partners/:id — Supprimer un partenaire du cabinet
router.delete('/:id', verifyToken, ecrire, async (req, res) => {
  try {
    const pool = poolDe(req);
    const id = identifiantValide(req.params.id);
    if (!id) return refuserIdentifiant(res);

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const f = filtrePartenaire(portee, { depart: 2, ecriture: true });
    const result = await pool.query(`DELETE FROM partners WHERE id = $1 AND ${f.sql} RETURNING id`, [id, ...f.params]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'not_found', message: 'Partenaire non trouvé' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('[partners] DELETE /:id', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PATCH /api/partners/:id/statut — Changement rapide de statut
router.patch('/:id/statut', verifyToken, ecrire, async (req, res) => {
  try {
    const pool = poolDe(req);
    const id = identifiantValide(req.params.id);
    if (!id) return refuserIdentifiant(res);
    const { statut } = req.body;
    if (!statut) return res.status(400).json({ success: false, error: 'statut_requis', message: 'Statut requis' });

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const f = filtrePartenaire(portee, { depart: 3, ecriture: true });
    const result = await pool.query(
      `UPDATE partners SET statut = $1, updated_at = NOW() WHERE id = $2 AND ${f.sql} RETURNING *`,
      [statut, id, ...f.params]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'not_found', message: 'Partenaire non trouvé' });
    }
    res.json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] PATCH /:id/statut', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
