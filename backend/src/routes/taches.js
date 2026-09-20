const express = require('express');
const pool = require('../db');
const router = express.Router();
const { getJwtSecret } = require('../utils/jwtSecret');
const porteeCabinet = require('../lib/porteeCabinet');

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES TÂCHES / RENDEZ-VOUS (`appointments`) : LE CABINET
//
// POURQUOI : la tâche appartenait à UN utilisateur (`COALESCE(user_id,
// organizer_id)`). Un collaborateur du cabinet ne voyait donc aucune des
// tâches de ses collègues — y compris celles rattachées à un client qu'il
// traite. `appointments.cabinet_id` (migration 113) porte désormais le tenant ;
// `user_id`/`organizer_id` restent l'AFFECTATION (qui traite la tâche).
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL sur `appointments` (propriétaire = user_id, sinon organizer_id). */
function filtreTaches(portee, { depart = 1, ecriture = false, alias = 'a' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `COALESCE(${alias}.user_id, ${alias}.organizer_id)`,
    depart,
    ecriture,
  })
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
 * GET /api/taches — Lister les tâches (appointments)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    const clientId = req.query.clientId || req.query.client_id || null;
    const f = filtreTaches(portee, { depart: 1 });
    const params = [...f.params];
    const clientClause = clientId ? ` AND a.client_id = $${f.suivant}` : '';
    if (clientId) params.push(clientId);

    // CORRECTION 2026-09-20 : le JOIN était INNER sur clients, donc toute tâche
    // sans client était créée puis invisible (l'API répondait 201 et la liste
    // restait vide : un faux succès). Le périmètre est désormais le CABINET
    // (appointments.cabinet_id), avec repli sur l'utilisateur quand il n'y a
    // pas de cabinet, et le client est une jointure facultative.
    const result = await pool.query(`
      SELECT 
        a.id, a.title as titre, a.description, 
        a.status as statut, a.start_time as echeance,
        a.client_id, c.first_name as client_prenom, c.last_name as client_nom,
        a.created_at, a.user_id as affecte_a,
        CASE 
          WHEN a.start_time IS NULL THEN 'normale'
          WHEN a.start_time < NOW() + INTERVAL '3 days' THEN 'haute'
          WHEN a.start_time < NOW() + INTERVAL '7 days' THEN 'normale'
          ELSE 'basse'
        END as priorite
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE ${f.sql}
      ${clientClause}
      ORDER BY a.start_time ASC NULLS LAST
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/taches error:', err.message);
    res.status(500).json({ error: 'tasks_unavailable', message: 'Impossible de charger les tâches pour le moment.' });
  }
});

/**
 * POST /api/taches — Créer une tâche
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'créer une tâche')) return;
    const {
      titre, description, client_id, echeance, statut
    } = req.body;

    const userId = portee.userId || req.user.id || req.user.userId;

    // Validations explicites : sans titre ni échéance, la base refusait la ligne
    // (title et start_time sont NOT NULL) et l'API répondait 500 « création
    // impossible » — un message d'infrastructure au lieu de dire quel champ
    // manque. On refuse AVANT la base, sans inventer de date.
    const titreNettoye = typeof titre === 'string' ? titre.trim() : '';
    if (!titreNettoye) {
      return res.status(400).json({ error: 'validation_error', message: 'Le titre de la tâche est obligatoire.', champs: ['titre'] });
    }
    if (!echeance) {
      return res.status(400).json({
        error: 'validation_error',
        message: "L'échéance est obligatoire pour créer une tâche.",
        champs: ['echeance'],
      });
    }

    // Vérifier que le client appartient au CABINET (null en portée mono).
    if (client_id) {
      const fClient = porteeCabinet.fragment(portee, {
        cabinet: 'clients.cabinet_id',
        proprietaire: 'clients.courtier_id',
        depart: 2,
      });
      const own = await pool.query(
        `SELECT 1 FROM clients WHERE id = $1 AND ${fClient.sql}`,
        [client_id, ...fClient.params]
      );
      // 404 (et non 403) : ne jamais confirmer l'existence d'un client d'un
      // autre cabinet.
      if (!own.rows.length) {
        return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO appointments
       (title, description, client_id, start_time, status, user_id, organizer_id, cabinet_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6, $7, NOW()) RETURNING *`,
      [titreNettoye, description || null, client_id || null, echeance, statut || 'a_faire', userId,
       porteeCabinet.cabinetPourCreation(portee)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/taches error:', err.message);
    res.status(500).json({ error: 'task_create_failed', message: 'Création de tâche impossible pour le moment.' });
  }
});

/**
 * PUT /api/taches/:id — Modifier une tâche
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Un identifiant non numérique produisait un 500 « invalid input syntax for
    // type integer » : l'écran recevait une erreur de base au lieu d'un refus clair.
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ error: 'invalid_id', message: 'Identifiant de tâche invalide.' });
    }

    const { titre, description, statut, echeance } = req.body;
    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier une tâche')) return;
    const fEcriture = filtreTaches(portee, { depart: 6, ecriture: true });

    // COALESCE : une mise à jour partielle (ex. cocher « terminée ») ne doit pas
    // effacer le reste. L'ancienne requête écrasait titre/description par NULL si
    // l'appelant ne les envoyait pas, et ne trouvait la tâche que si elle avait un
    // client (FROM clients) : cocher une tâche sans client renvoyait 404.
    const result = await pool.query(
      `UPDATE appointments a
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           start_time = COALESCE($4, start_time)
      WHERE id = $5 AND ${fEcriture.sql}
      RETURNING *`,
      [titre ?? null, description ?? null, statut ?? null, echeance ?? null, req.params.id, ...fEcriture.params]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/taches/:id error:', err.message);
    res.status(500).json({ error: 'task_update_failed', message: 'Mise à jour de tâche impossible pour le moment.' });
  }
});

/**
 * GET /api/taches/auto-generate — Générer les tâches automatiques manquantes
 */
router.post('/auto-generate', verifyToken, async (req, res) => {
  try {
    const { generateAutoTasks } = require('../jobs/autoTasks')
    const pool = req.app.locals.pool
    const courtierId = req.user?.id || req.user?.userId
    const result = await generateAutoTasks(pool, courtierId)
    res.json(result)
  } catch (err) {
    console.error('POST /api/taches/auto-generate error:', err.message)
    res.status(500).json({ error: 'task_autogen_failed', message: 'Génération automatique indisponible pour le moment.' })
  }
});

/**
 * DELETE /api/taches/:id — Supprimer une tâche
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Un identifiant non numérique produisait un 500 « invalid input syntax for
    // type integer » : l'écran recevait une erreur de base au lieu d'un refus clair.
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ error: 'invalid_id', message: 'Identifiant de tâche invalide.' });
    }

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserSuppression(portee, res)) return;
    const f = filtreTaches(portee, { depart: 2, ecriture: true });
    const supprime = await pool.query(
      `DELETE FROM appointments a
       WHERE id = $1 AND ${f.sql}
       RETURNING id`,
      [req.params.id, ...f.params]
    );
    // Une suppression qui ne supprime rien doit le DIRE : l'écran affichait
    // « supprimé » alors que la ligne existait toujours.
    if (supprime.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Tâche introuvable.' });
    }
    res.json({ success: true, id: supprime.rows[0].id });
  } catch (err) {
    console.error('DELETE /api/taches/:id error:', err.message);
    res.status(500).json({ error: 'task_delete_failed', message: 'Suppression de tâche impossible pour le moment.' });
  }
});

module.exports = router;
