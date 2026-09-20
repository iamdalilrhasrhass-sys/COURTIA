const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireUnderLimit } = require('../middleware/planGuard');
const { getJwtSecret } = require('../utils/jwtSecret');
const porteeCabinet = require('../lib/porteeCabinet');

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES CONTRATS (`quotes`) : LE CABINET DE SON CLIENT
//
// POURQUOI : un contrat n'a pas de colonne « propriétaire » propre — il pend
// d'un client (`quotes.client_id`). Sa portée est donc CELLE DU CLIENT, et le
// client porte le cabinet (migration 113). On ne duplique pas `cabinet_id` sur
// `quotes` : deux vérités finiraient par diverger.
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL via la jointure obligatoire sur `clients`. */
function filtreClientsDuContrat(portee, { depart = 1, ecriture = false, alias = 'clients' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.courtier_id`,
    depart,
    ecriture,
  });
}

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

/**
 * GET /api/contrats — Lister les contrats (quotes table)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const clientId = req.query.client_id;
    const portee = await porteeCabinet.resoudrePortee(pool, req);

    let query, params;

    if (clientId) {
      const f = filtreClientsDuContrat(portee, { depart: 2, alias: 'c' });
      query = `SELECT 
        q.id, q.client_id, q.status as statut,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'compagnie' as compagnie,
        q.quote_data->>'numero' as numero,
        (q.quote_data->>'prime_annuelle')::decimal as prime_annuelle,
        q.quote_data->>'date_effet' as date_effet,
        q.quote_data->>'date_echeance' as date_echeance,
        c.first_name as client_prenom, c.last_name as client_nom,
        c.risk_score as risk_score,
        q.created_at
      FROM quotes q
      JOIN clients c ON q.client_id = c.id AND ${f.sql}
      WHERE q.client_id = $1
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [clientId, ...f.params];
    } else {
      const f = filtreClientsDuContrat(portee, { depart: 1, alias: 'c' });
      query = `SELECT 
        q.id, q.client_id, q.status as statut,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'compagnie' as compagnie,
        q.quote_data->>'numero' as numero,
        (q.quote_data->>'prime_annuelle')::decimal as prime_annuelle,
        q.quote_data->>'date_effet' as date_effet,
        q.quote_data->>'date_echeance' as date_echeance,
        c.first_name as client_prenom, c.last_name as client_nom,
        c.risk_score as risk_score,
        q.created_at
      FROM quotes q
      JOIN clients c ON q.client_id = c.id AND ${f.sql}
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [...f.params];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/contrats error:', err.message);
    res.status(500).json({ error: 'contracts_unavailable', message: 'Impossible de charger les contrats pour le moment.' });
  }
});

/**
 * POST /api/contrats — Créer un contrat (quote)
 */
router.post('/', verifyToken, requireUnderLimit('contracts'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { client_id, type_contrat, compagnie, numero,
      prime_annuelle, date_effet, date_echeance, statut
    } = req.body;

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un contrat')) return;

    // Vérifier que le client appartient AU CABINET.
    const fClient = filtreClientsDuContrat(portee, { depart: 2 });
    const own = await pool.query(
      `SELECT 1 FROM clients WHERE id = $1 AND ${fClient.sql}`,
      [client_id, ...fClient.params]
    );
    // 404 : un client d'un autre cabinet ne doit pas être confirmé.
    if (!own.rows.length) {
      return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable.' });
    }

    const quoteData = {
      type_contrat,
      compagnie,
      numero,
      prime_annuelle,
      date_effet,
      date_echeance
    };

    const result = await pool.query(
      `INSERT INTO quotes (client_id, quote_data, status, created_at)
      VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [client_id, JSON.stringify(quoteData), statut || 'actif']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/contrats error:', err.message);
    res.status(500).json({ error: 'contract_create_failed', message: 'Création du contrat impossible pour le moment.' });
  }
});

/**
 * PUT /api/contrats/:id — Modifier un contrat
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      type_contrat, compagnie, numero,
      prime_annuelle, date_effet, date_echeance, statut
    } = req.body;

    const quoteData = {
      type_contrat,
      compagnie,
      numero,
      prime_annuelle,
      date_effet,
      date_echeance
    };

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier un contrat')) return;
    const fEcriture = filtreClientsDuContrat(portee, { depart: 3, ecriture: true });

    const result = await pool.query(
      `UPDATE quotes SET quote_data = $1, status = $2 
       FROM clients 
       WHERE quotes.id = $3 AND quotes.client_id = clients.id AND ${fEcriture.sql}
       RETURNING quotes.*`,
      [JSON.stringify(quoteData), statut, req.params.id, ...fEcriture.params]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/contrats/:id error:', err.message);
    res.status(500).json({ error: 'contract_update_failed', message: 'Mise à jour du contrat impossible pour le moment.' });
  }
});

/**
 * DELETE /api/contrats/:id — Supprimer un contrat
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserSuppression(portee, res)) return;
    const f = filtreClientsDuContrat(portee, { depart: 2, ecriture: true });

    // Un contrat qui porte des commissions ne peut pas disparaître en silence :
    // la clé étrangère `commissions.contract_id → quotes(id)` (migration 114)
    // refuse la suppression du parent. On répond un refus EXPLICITE (409) avec
    // le nombre de commissions rattachées, plutôt que de laisser PostgreSQL
    // produire un 500 illisible — et sans jamais détruire une ligne comptable.
    const commissions = await pool.query(
      'SELECT COUNT(*)::int AS nombre FROM commissions WHERE contract_id = $1',
      [req.params.id]
    ).catch(() => ({ rows: [{ nombre: 0 }] }));
    const nombreCommissions = (commissions.rows[0] && commissions.rows[0].nombre) || 0;
    if (nombreCommissions > 0) {
      return res.status(409).json({
        error: 'contract_has_commissions',
        commissions: nombreCommissions,
        message: `Ce contrat porte ${nombreCommissions} commission(s) : supprimez-les ou annulez-le (statut) au lieu de le supprimer.`,
      });
    }

    const supprime = await pool.query(
      `DELETE FROM quotes USING clients
       WHERE quotes.id = $1 AND quotes.client_id = clients.id AND ${f.sql}`,
      [req.params.id, ...f.params]
    );
    // Aucun contrat supprimé = pas de succès (voir la même règle sur /api/clients).
    if (!supprime.rowCount) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/contrats/:id error:', err.message);
    res.status(500).json({ error: 'contract_delete_failed', message: 'Suppression du contrat impossible pour le moment.' });
  }
});

module.exports = router;
