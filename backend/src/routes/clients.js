const express = require('express');
const pool = require('../db');
const router = express.Router();
const { calculateRiskScore } = require('../utils/riskCalculator');
const { requireUnderLimit } = require('../middleware/planGuard');
const { getUserPlanInfo } = require('../services/planService');
const { getClientScoreBreakdown } = require('../services/portfolioAnalyzer');
const { listClientInteractions } = require('../services/integrationsStore');
const Anthropic = require('@anthropic-ai/sdk');

// ─────────────────────────────────────────────────────────────────────────────
// Recherche serveur des clients
//
// POURQUOI : `GET /api/clients` ignorait `search`, `statut`, `status`,
// `segment` et `sort` (aucun WHERE). L'assistant de devis appelle
// `/clients?search=<nom>&limit=10` : il recevait les 10 derniers clients du
// cabinet, quel que soit le terme — le courtier pouvait donc rattacher un
// devis au mauvais client. Le filtrage est désormais fait par PostgreSQL.
//
// Insensibilité aux accents : l'extension `unaccent` est utilisée si elle est
// RÉELLEMENT installée (vérifié une fois par processus) ; sinon on replie les
// accents avec `translate()` (fonction native, aucune extension) et on replie
// le terme de recherche côté serveur avec la même table de correspondance.
// ─────────────────────────────────────────────────────────────────────────────

// Table de repli des accents, construite PAIRES PAR PAIRES.
//
// POURQUOI AINSI : `translate()` remplace caractère par caractère, position par
// position. Les deux chaînes littérales qui vivaient ici étaient DÉSALIGNÉES
// (30 caractères en source contre 29 en cible) : à partir du décalage, chaque
// lettre était remplacée par la suivante de la table — « Müller » devenait
// « myller » — et la recherche accent-insensible ne trouvait plus les clients
// dont le nom contient un accent (défaut reproduit en production le 20/09/2026).
// En construisant les deux chaînes depuis les mêmes paires, elles ne peuvent
// plus diverger.
const PAIRES_ACCENTS = [
  ['à', 'a'], ['â', 'a'], ['ä', 'a'], ['á', 'a'], ['ã', 'a'], ['å', 'a'], ['ā', 'a'],
  ['ç', 'c'],
  ['è', 'e'], ['é', 'e'], ['ê', 'e'], ['ë', 'e'], ['ē', 'e'],
  ['ì', 'i'], ['í', 'i'], ['î', 'i'], ['ï', 'i'], ['ī', 'i'],
  ['ò', 'o'], ['ó', 'o'], ['ô', 'o'], ['ö', 'o'], ['õ', 'o'], ['ø', 'o'],
  ['ù', 'u'], ['ú', 'u'], ['û', 'u'], ['ü', 'u'],
  ['ÿ', 'y'], ['ñ', 'n'],
]
const TABLE_ACCENTS_SOURCE = PAIRES_ACCENTS.map(([de]) => de).join('')
const TABLE_ACCENTS_CIBLE = PAIRES_ACCENTS.map(([, vers]) => vers).join('')
if (TABLE_ACCENTS_SOURCE.length !== TABLE_ACCENTS_CIBLE.length) {
  // Impossible par construction ; garde-fou explicite si quelqu'un édite la
  // liste à la main un jour.
  throw new Error('table d\'accents désalignée : source et cible de longueurs différentes')
}

// Nom, prénom, entreprise, e-mail, téléphone : les deux familles de colonnes
// existent dans le schéma réel (first_name/last_name ET nom/prenom).
const RECHERCHE_CLIENT_EXPRESSION =
  "concat_ws(' ', clients.first_name, clients.last_name, clients.nom, clients.prenom, clients.company_name, clients.email, clients.phone, clients.telephone, clients.mobile)"

const SELECT_LISTE_CLIENTS = `SELECT 
        id, first_name as prenom, last_name as nom, 
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        status, risk_score,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        city, postal_code, silent_alert, last_contact, loyalty_score, lifetime_value,
        (
          SELECT COUNT(*)::int
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS contracts_count,
        (
          SELECT COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::numeric), 0)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS prime_totale,
        (
          SELECT MIN(NULLIF(q.quote_data->>'date_echeance', '')::date)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS next_echeance`

// Tris autorisés (liste blanche : jamais de SQL venu de la requête).
const TRIS_CLIENTS = Object.freeze({
  nom: "lower(COALESCE(clients.last_name, clients.nom, ''))",
  last_name: "lower(COALESCE(clients.last_name, clients.nom, ''))",
  prenom: "lower(COALESCE(clients.first_name, clients.prenom, ''))",
  first_name: "lower(COALESCE(clients.first_name, clients.prenom, ''))",
  entreprise: "lower(COALESCE(clients.company_name, ''))",
  email: "lower(COALESCE(clients.email, ''))",
  statut: "lower(COALESCE(clients.status, ''))",
  status: "lower(COALESCE(clients.status, ''))",
  segment: "lower(COALESCE(clients.type, ''))",
  score_risque: 'COALESCE(clients.risk_score, 0)',
  risque: 'COALESCE(clients.risk_score, 0)',
  ltv: 'COALESCE(clients.lifetime_value, 0)',
  valeur_client: 'COALESCE(clients.lifetime_value, 0)',
  dernier_contact: 'clients.last_contact',
  cree_le: 'clients.created_at',
  created_at: 'clients.created_at',
})

/** Replie accents et casse d'un texte (même table que translate() en SQL). */
function normaliserTexteClient(valeur) {
  return String(valeur ?? '')
    .normalize('NFD')
    // Replis insensibles à la casse : « HŒRTH » doit être trouvé comme « Hœrth ».
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'o')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Terme de recherche prêt pour LIKE : replié, borné, jokers neutralisés. */
function preparerTermeRecherche(valeur) {
  const replie = normaliserTexteClient(valeur).slice(0, 80)
  if (!replie) return ''
  return replie.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)
}

/** Expression SQL sans accents ni casse (unaccent si disponible, translate sinon). */
function expressionSansAccent(expression, unaccentDisponible) {
  const base = unaccentDisponible
    ? `unaccent(lower(COALESCE(${expression}, '')))`
    : `translate(lower(COALESCE(${expression}, '')), '${TABLE_ACCENTS_SOURCE}', '${TABLE_ACCENTS_CIBLE}')`
  return `replace(replace(${base}, 'œ', 'oe'), 'æ', 'ae')`
}

/** ORDER BY sûr : liste blanche + direction, `-nom` signifiant « descendant ». */
function construireTrieClients(sort, direction) {
  const brut = String(sort ?? '').trim()
  const descendantParPrefixe = brut.startsWith('-')
  const cle = (descendantParPrefixe ? brut.slice(1) : brut).toLowerCase()
  const expression = TRIS_CLIENTS[cle]
  if (!expression) return 'clients.created_at DESC'
  const sensDemande = String(direction ?? '').trim().toLowerCase()
  const sens = sensDemande === 'asc' || sensDemande === 'desc'
    ? sensDemande
    : (descendantParPrefixe ? 'desc' : 'asc')
  return `${expression} ${sens.toUpperCase()} NULLS LAST`
}

/**
 * Construit la requête de liste (page + total) à partir des filtres reçus.
 * Fonction PURE : aucun accès à la base, donc directement testable.
 */
function construireRequeteListeClients({
  userId,
  search,
  statut,
  segment,
  sort,
  direction,
  limit,
  offset,
  unaccentDisponible = false,
} = {}) {
  const clauses = ['clients.courtier_id = $1']
  const paramsFiltre = [userId]
  const ajouterParametre = (valeur) => {
    paramsFiltre.push(valeur)
    return `$${paramsFiltre.length}`
  }

  const terme = preparerTermeRecherche(search)
  if (terme) {
    clauses.push(`${expressionSansAccent(RECHERCHE_CLIENT_EXPRESSION, unaccentDisponible)} LIKE ${ajouterParametre(`%${terme}%`)}`)
  }
  if (statut !== undefined && statut !== null && String(statut).trim() !== '') {
    clauses.push(`lower(COALESCE(clients.status, '')) = lower(${ajouterParametre(String(statut).trim())})`)
  }
  if (segment !== undefined && segment !== null && String(segment).trim() !== '') {
    clauses.push(`lower(COALESCE(clients.type, '')) = lower(${ajouterParametre(String(segment).trim())})`)
  }

  const where = `WHERE ${clauses.join(' AND ')}`
  const limite = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 20
  const decalage = Number.isFinite(offset) && offset > 0 ? offset : 0
  const sql = `${SELECT_LISTE_CLIENTS}
      FROM clients
      ${where}
      ORDER BY ${construireTrieClients(sort, direction)}
      LIMIT $${paramsFiltre.length + 1} OFFSET $${paramsFiltre.length + 2}`

  return {
    sql,
    params: [...paramsFiltre, limite, decalage],
    countSql: `SELECT COUNT(*)::int AS count FROM clients ${where}`,
    countParams: paramsFiltre,
    terme,
  }
}

// `unaccent` est propre à une base : on vérifie une fois par processus.
let unaccentDisponible = null
async function detecterUnaccent(pool) {
  if (unaccentDisponible !== null) return unaccentDisponible
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'unaccent'
       UNION ALL
       SELECT 1 FROM pg_proc WHERE proname = 'unaccent'
       LIMIT 1`
    )
    unaccentDisponible = rows.length > 0
  } catch (_) {
    unaccentDisponible = false
  }
  return unaccentDisponible
}

/**
 * GET /api/clients — Lister les clients avec pagination et filtres serveur
 * Paramètres : search, statut|status, segment|type, sort (+ direction), page, limit
 */
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user?.id || req.user?.userId;
    const limit = parseInt(req.query.limit) || 20;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const unaccentOk = await detecterUnaccent(pool);
    const requete = construireRequeteListeClients({
      userId,
      search: req.query.search,
      // `statut` et `status` désignent le même filtre, comme `segment` et `type`.
      statut: req.query.statut ?? req.query.status,
      segment: req.query.segment ?? req.query.type,
      sort: req.query.sort,
      direction: req.query.direction,
      limit,
      offset,
      unaccentDisponible: unaccentOk,
    });

    const result = await pool.query(requete.sql, requete.params);

    // Le total porte EXACTEMENT les mêmes filtres que la page renvoyée.
    const countResult = await pool.query(requete.countSql, requete.countParams);
    const total = parseInt(countResult.rows[0].count, 10) || 0;

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
      filtres_appliques: {
        search: requete.terme || null,
        statut: req.query.statut ?? req.query.status ?? null,
        segment: req.query.segment ?? req.query.type ?? null,
        sort: req.query.sort || null,
      },
    });
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id — Récupérer un client par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      `SELECT 
        id, first_name as prenom, last_name as nom,
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        status, risk_score,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        loyalty_score, lifetime_value, civility, postal_code, city, country,
        silent_alert, last_contact
      FROM clients WHERE id = $1 AND courtier_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id/contrats — Contrats d'un client
 */
router.get('/:id/contrats', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const result = await pool.query(
      `SELECT q.id,
              q.client_id,
              q.status,
              q.status as statut,
              quote_data->>'type_contrat' as type_contrat,
              quote_data->>'compagnie' as compagnie,
              quote_data->>'numero' as numero,
              (quote_data->>'prime_annuelle')::numeric as prime_annuelle,
              (quote_data->>'date_effet')::date as date_effet,
              (quote_data->>'date_echeance')::date as date_echeance
       FROM quotes q
       JOIN clients c ON q.client_id = c.id AND c.courtier_id = $2
       WHERE q.client_id = $1
       ORDER BY (q.quote_data->>'date_echeance')::date ASC NULLS LAST`,
      [req.params.id, req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/clients/:id/contrats error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/clients/:id/interactions — Timeline interactions multi-canaux
 */
router.get('/:id/interactions', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const clientId = Number.parseInt(req.params.id, 10)
    const userId = req.user.id
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 300)

    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'invalid_client_id' })
    }

    const ownResult = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1',
      [clientId, userId]
    )

    if (!ownResult.rowCount) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }

    const [storedInteractions, taskRows, contractRows] = await Promise.all([
      listClientInteractions(pool, userId, clientId, { limit }),
      pool.query(
        `SELECT id, title, status, start_time, created_at
         FROM appointments
         WHERE client_id = $1 AND user_id = $2
         ORDER BY COALESCE(start_time, created_at) DESC
         LIMIT 30`,
        [clientId, userId]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT id, status, quote_data, created_at
         FROM quotes
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [clientId]
      ).catch(() => ({ rows: [] })),
    ])

    const mappedTasks = (taskRows.rows || []).map((task) => ({
      id: `task-${task.id}`,
      provider: 'task',
      direction: 'system',
      subject: `Tâche: ${task.title || 'Action'}`,
      body_preview: `Statut: ${task.status || 'a_faire'}`,
      occurred_at: task.start_time || task.created_at,
      metadata: { task_id: task.id, status: task.status || null },
      source: 'appointments',
    }))

    const mappedContracts = (contractRows.rows || []).map((contract) => {
      let quoteData = contract.quote_data || {}
      if (typeof contract.quote_data === 'string') {
        try {
          quoteData = JSON.parse(contract.quote_data)
        } catch {
          quoteData = {}
        }
      }
      const typeContrat = quoteData.type_contrat || 'Contrat'
      const compagnie = quoteData.compagnie || 'Compagnie'
      const echeance = quoteData.date_echeance || null
      return {
        id: `contract-${contract.id}`,
        provider: 'contract',
        direction: 'system',
        subject: `${typeContrat} - ${compagnie}`,
        body_preview: echeance ? `Échéance: ${echeance}` : `Statut: ${contract.status || 'actif'}`,
        occurred_at: contract.created_at,
        metadata: { contract_id: contract.id, status: contract.status || null, quote_data: quoteData },
        source: 'quotes',
      }
    })

    const merged = [...storedInteractions, ...mappedTasks, ...mappedContracts]
      .sort((a, b) => {
        const aTs = new Date(a.occurred_at || a.created_at || 0).getTime()
        const bTs = new Date(b.occurred_at || b.created_at || 0).getTime()
        return bTs - aTs
      })
      .slice(0, limit)

    return res.json({
      success: true,
      client_id: clientId,
      count: merged.length,
      rows: merged,
    })
  } catch (err) {
    console.error('GET /api/clients/:id/interactions error:', err.message)
    return res.status(500).json({ error: 'client_interactions_unavailable' })
  }
})

/**
 * POST /api/clients — Créer un client
 */
router.post('/', requireUnderLimit('clients'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Le schéma réel impose clients.first_name / last_name non nuls. Sans prénom,
    // l'insertion échouait en 500 SQL (« null value in column first_name ») :
    // l'appelant recevait une erreur de base au lieu d'une validation. On refuse
    // AVANT la base — et on n'invente jamais un prénom de remplacement.
    const prenomNettoye = typeof prenom === 'string' ? prenom.trim() : '';
    const nomNettoye = typeof nom === 'string' ? nom.trim() : '';
    if (!prenomNettoye || !nomNettoye) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Le prénom et le nom du client sont obligatoires.',
        champs: [!prenomNettoye ? 'prenom' : null, !nomNettoye ? 'nom' : null].filter(Boolean),
      });
    }

    // Parser les champs numériques (le frontend peut les envoyer en string)
    const bonus_malus        = parseFloat(req.body.bonus_malus) || 1.0;
    const annees_permis      = parseInt(req.body.annees_permis, 10) || 0;
    const nb_sinistres_3ans  = parseInt(req.body.nb_sinistres_3ans, 10) || 0;

    // Calculer le score risque
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `INSERT INTO clients 
      (first_name, last_name, email, phone, address, status, type,
       risk_score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
       zone_geographique, profession, situation_familiale,
       postal_code, city, civility, country, courtier_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut || 'prospect', segment || 'particulier',
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.user.id
      ]
    );

    // Notification email (non-blocking)
    try {
      const { emailNouveauClient } = require('../services/emailService')
      const fullName = [req.body.prenom, req.body.nom].filter(Boolean).join(' ') || 'Nouveau client'
      if (req.user?.email) {
        await emailNouveauClient({ courtierEmail: req.user.email, clientNom: fullName })
      }
    } catch(e) { console.error('Email notification skipped:', e.message) }

    try {
      const { trackEvent } = require('../services/analyticsService')
      await trackEvent({
        userId: req.user.id || req.user.userId,
        event: 'client_created',
        properties: { client_id: result.rows[0].id, status: result.rows[0].status },
      })
    } catch (e) { console.error('Product event skipped:', e.message) }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/clients/:id — Modifier un client
 */
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Parser les champs numériques (le frontend peut les envoyer en string)
    const bonus_malus        = parseFloat(req.body.bonus_malus) || 1.0;
    const annees_permis      = parseInt(req.body.annees_permis, 10) || 0;
    const nb_sinistres_3ans  = parseInt(req.body.nb_sinistres_3ans, 10) || 0;

    // Recalculer le score
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `UPDATE clients SET
       first_name = $1, last_name = $2, email = $3, phone = $4,
       address = $5, status = $6, type = $7, risk_score = $8,
       notes = $9, bonus_malus = $10, annees_permis = $11,
       nb_sinistres_3ans = $12, zone_geographique = $13,
       profession = $14, situation_familiale = $15,
       postal_code = $16, city = $17, civility = $18, country = $19,
       updated_at = NOW()
      WHERE id = $20 AND courtier_id = $21 RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut, segment,
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.params.id, req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/clients/:id — Supprimer un client
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // La suppression ne renvoie un succès QUE si une ligne a réellement été
    // supprimée : un `{success:true}` sans suppression est un faux succès (le
    // client reste, et l'appelant croit l'avoir supprimé).
    const supprime = await pool.query('DELETE FROM clients WHERE id = $1 AND courtier_id = $2', [req.params.id, req.user.id]);
    if (!supprime.rowCount) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/score
// Score de santé individuel du client.
// Tout plan : score brut visible.
// Pro/Elite : breakdown complet (client_score_breakdown).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/score', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.id;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    const [planInfo, breakdown] = await Promise.all([
      getUserPlanInfo(courtierId),
      getClientScoreBreakdown(clientId, courtierId),
    ]);

    if (!breakdown) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }

    const plan    = planInfo?.plan || 'start';
    const hasBreakdown = planInfo?.limits?.features?.client_score_breakdown === true;

    if (!hasBreakdown) {
      // Start : score brut uniquement
      return res.json({
        client_id:       clientId,
        score:           breakdown.score,
        grade:           breakdown.grade,
        plan,
        upgrade_required: true,
        upgrade_message:  'Le détail par dimension est disponible avec le plan Pro ou Elite.',
      });
    }

    res.json({ ...breakdown, plan });

  } catch (err) {
    console.error('GET /api/clients/:id/score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/ark-action-plan
// ARK génère un plan d'action personnalisé pour ce client (Elite uniquement).
// Claude Opus 4.6 : 5 actions concrètes, impact en points, délai, message suggéré.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/ark-action-plan', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.id;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Vérifier le plan (Elite uniquement)
    const planInfo = await getUserPlanInfo(courtierId);
    const plan     = planInfo?.plan || 'start';
    const hasFeature = planInfo?.limits?.features?.client_ark_action_plan === true;

    if (!hasFeature) {
      return res.status(402).json({
        error:            'plan_upgrade_required',
        feature:          'client_ark_action_plan',
        required_plan:    'elite',
        plan,
        message: plan === 'start'
          ? 'Le plan d\'action ARK personnalisé est disponible avec le plan Elite.'
          : 'Passez au plan Elite pour accéder au plan d\'action ARK personnalisé.',
      });
    }

    // Récupérer le breakdown
    const breakdown = await getClientScoreBreakdown(clientId, courtierId);
    if (!breakdown) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }

    // Données client pour le contexte
    const clientRes = await pool.query(
      `SELECT first_name, last_name, email, phone, profession,
              situation_familiale, address, created_at, notes
       FROM clients WHERE id = $1 AND courtier_id = $2`,
      [clientId, courtierId]
    );
    const client = clientRes.rows[0];

    const dimLines = breakdown.breakdown.map(d =>
      `- ${d.label} : ${d.score}/100 (${d.reason}) — ${d.impact}`
    ).join('\n');

    const prompt = `Tu es ARK, expert en courtage d'assurance français. Analyse ce client et génère un plan d'action personnalisé.

CLIENT :
- Nom : ${client.first_name || ''} ${client.last_name || ''}
- Profession : ${client.profession || 'Non renseignée'}
- Situation familiale : ${client.situation_familiale || 'Non renseignée'}
- Email : ${client.email ? 'OK' : 'MANQUANT'}
- Téléphone : ${client.phone ? 'OK' : 'MANQUANT'}
- Adresse : ${client.address ? 'OK' : 'MANQUANTE'}
- Client depuis : ${client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : 'inconnu'}
- Contrats actifs : ${breakdown.total_quotes}

SCORE ACTUEL : ${breakdown.score}/100 (grade ${breakdown.grade})
SCORE POTENTIEL : ${breakdown.potential_score}/100

DIMENSIONS :
${dimLines}

VALEUR CLIENT ESTIMÉE : ${breakdown.client_value_estimate.min}–${breakdown.client_value_estimate.max}€ LTV (${breakdown.client_value_estimate.label})

Génère exactement 5 actions concrètes et prioritaires pour améliorer ce score. Chaque action doit être réaliste, spécifique à ce profil, et inclure un message de contact (email ou SMS).

Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après, aucun bloc markdown :
{
  "actions": [
    {
      "order": 1,
      "title": "<max 80 chars>",
      "description": "<max 200 chars>",
      "dimension": "multi_equipment|compliance|recency|diversification|growth",
      "score_impact": <nombre de points gagnés estimés>,
      "delay_days": <délai recommandé en jours>,
      "priority": "critical|high|medium",
      "suggested_message": {
        "channel": "email|sms|call",
        "subject": "<sujet si email>",
        "body": "<max 300 chars — message personnalisé>"
      }
    }
  ],
  "projected_score": <score estimé si toutes les actions faites>,
  "time_to_100": "<estimation ex: 30 jours | 3 mois | 6 mois>",
  "coaching_summary": "<max 200 chars — synthèse ARK pour le courtier>"
}`;

    let result = {
      actions:          [],
      projected_score:  breakdown.potential_score,
      time_to_100:      'Non estimable',
      coaching_summary: 'Analyse ARK non disponible (clé API manquante).',
    };

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response   = await anthropic.messages.create({
        model:      'claude-haiku-4-5',
        max_tokens: 2500,
        messages:   [{ role: 'user', content: prompt }],
      });

      const rawText = response.content?.[0]?.text || '{}';
      const cleaned = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

      try {
        const parsed = JSON.parse(cleaned);
        result = { ...result, ...parsed };
      } catch (parseErr) {
        console.error('[clients/ark-action-plan] Erreur JSON Opus:', parseErr.message);
      }
    }

    res.json({
      client_id:       clientId,
      current_score:   breakdown.score,
      current_grade:   breakdown.grade,
      ltv:             breakdown.client_value_estimate,
      breakdown_short: breakdown.breakdown.map(d => ({
        dim: d.dim, score: d.score, points_lost: d.points_lost
      })),
      action_plan: result,
      plan,
    });

  } catch (err) {
    console.error('GET /api/clients/:id/ark-action-plan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/cross-sell
// Détecte les produits non souscrits par le client + estime le potentiel
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/cross-sell', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.userId;
    const clientId   = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Vérifier accès
    const cliRes = await pool.query(
      `SELECT id, first_name, last_name, type, status, profession, situation_familiale, lifetime_value
       FROM clients WHERE id=$1 AND courtier_id=$2`, [clientId, courtierId]);
    if (!cliRes.rows[0]) return res.status(404).json({ error: 'Client non trouvé' });
    const client = cliRes.rows[0];

    // Produits existants
    let produitsExistants = [];
    try {
      const qr = await pool.query(
        `SELECT DISTINCT LOWER(COALESCE(quote_data->>'type_contrat','')) AS produit
         FROM quotes WHERE client_id=$1 AND status='actif'`, [clientId]);
      produitsExistants = qr.rows.map(r => r.produit).filter(Boolean);
    } catch (_) { /* fallthrough */ }

    // Catalogue de référence — produits éligibles selon profil
    const CATALOGUE = [
      { code: 'auto',        label: 'Auto',         estPrime: 1100, profil: ['particulier','pro'] },
      { code: 'mrh',         label: 'MRH',          estPrime: 480,  profil: ['particulier'] },
      { code: 'habitation',  label: 'Habitation',   estPrime: 380,  profil: ['particulier'] },
      { code: 'sante',       label: 'Santé',        estPrime: 720,  profil: ['particulier','pro'] },
      { code: 'prevoyance',  label: 'Prévoyance',   estPrime: 520,  profil: ['particulier','pro'] },
      { code: 'rc_pro',      label: 'RC Pro',       estPrime: 2400, profil: ['pro'] },
      { code: 'pj',          label: 'Protection Juridique', estPrime: 220,  profil: ['particulier','pro'] },
      { code: 'cyber',       label: 'Cyber',        estPrime: 1800, profil: ['pro'] },
    ];

    const typeNorm = (client.type || 'particulier').toLowerCase().includes('pro') ? 'pro' : 'particulier';
    const has = (code) => produitsExistants.some(p => p.includes(code));

    const opportunites = CATALOGUE
      .filter(p => p.profil.includes(typeNorm))
      .filter(p => !has(p.code) && !has(p.label.toLowerCase()))
      .map(p => {
        // Score : 80 pour produits "core" manquants, 60 pour autres
        const isCore = ['rc_pro','sante','mrh','auto'].includes(p.code);
        const score = isCore ? 82 : 65;
        const rationale = isCore
          ? `Profil ${typeNorm} sans ${p.label} — produit core manquant.`
          : `Opportunité ${p.label} cohérente avec le profil.`;
        return {
          produit: p.code,
          label: p.label,
          prime_estimee: p.estPrime,
          commission_estimee: Math.round(p.estPrime * 0.15),
          score,
          rationale,
          cta: 'Créer devis',
        };
      })
      .sort((a,b) => b.score - a.score)
      .slice(0, 4);

    const potentielCA = opportunites.reduce((s,o) => s + (o.prime_estimee || 0), 0);

    res.json({
      client_id: clientId,
      client_type: typeNorm,
      produits_existants: produitsExistants,
      opportunites,
      potentiel_ca_annuel: potentielCA,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GET /api/clients/:id/cross-sell error:', err.message);
    res.status(500).json({ error: 'cross_sell_failed', message: err.message });
  }
});

module.exports = router;
// Exposés pour le test unitaire de la construction de requête (filtre + total).
module.exports.construireRequeteListeClients = construireRequeteListeClients;
module.exports.normaliserTexteClient = normaliserTexteClient;
module.exports.expressionSansAccent = expressionSansAccent;
module.exports.TABLE_ACCENTS_SOURCE = TABLE_ACCENTS_SOURCE;
module.exports.TABLE_ACCENTS_CIBLE = TABLE_ACCENTS_CIBLE;
module.exports.RECHERCHE_CLIENT_EXPRESSION = RECHERCHE_CLIENT_EXPRESSION;
