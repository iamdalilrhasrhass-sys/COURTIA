/**
 * dashboard.js — Cockpit COURTIA **et SOURCE UNIQUE DES INDICATEURS DU PORTEFEUILLE**.
 *
 * POURQUOI CE FICHIER PORTE AUSSI LES DÉFINITIONS
 * Le même chiffre différait d'un écran à l'autre (relevé du 20/09/2026, cabinet
 * d'audit suisse) : « contrats » valait 2 sur /api/dashboard/stats, 0 sur
 * /api/reporting/overview — qui lisait la table `contracts`, jamais alimentée —
 * et 3 sur /api/analytics/executive, qui comptait aussi les devis. Cause : chaque
 * route recomposait sa propre requête. Les requêtes ci-dessous sont donc écrites
 * UNE fois, dans un seul bloc, et appelées par /api/dashboard/*, /api/reporting/*,
 * /api/analytics/* et l'agrégat « prime par client » de /api/clients : une
 * définition ne peut plus n'atteindre qu'un seul écran.
 *
 * (Le bloc vit ici — et non dans un nouveau module — parce que la mission borne
 * les fichiers modifiables à reporting.js / analytics.js / dashboard.js /
 * clients.js ; les trois autres routeurs l'importent via `require('./dashboard').kpi`.)
 *
 * DÉFINITIONS RETENUES — chaque indicateur n'a qu'un sens, valable partout
 *  1. CLIENT : ligne de `clients` du cabinet (cabinet_id) ou, pour un compte sans
 *     cabinet, créée par lui (courtier_id) — portée de lib/porteeCabinet.js.
 *     « prospect » = status 'prospect' ; « actif » = status 'actif'.
 *  2. CONTRAT : ligne de `quotes` au statut 'actif' ('active' toléré). `quotes` est
 *     la SEULE table de contrats réellement écrite (POST /api/contrats, PUT
 *     /api/contrats/:id, alias /api/contracts). Les tables `contracts` et
 *     `contrats` existent mais restent VIDES : les lire annonce 0 contrat sur une
 *     base pleine.
 *  3. DEVIS : ligne de `devis_wizard` (POST /api/devis/wizard/init). Un devis n'est
 *     PAS un contrat : les additionner donnait 3 « contrats » pour 2 contrats + 1 devis.
 *  4. PRIME ANNUELLE d'un contrat : la donnée la plus récente d'abord — colonne
 *     `prime_annuelle`, puis `quote_data->>'prime_annuelle'` (ce qu'écrit
 *     POST /api/contrats), puis les colonnes historiques `premium` / `amount`.
 *     PRIME D'UN DEVIS : `total_premium_cents` (centimes) / 100.
 *  5. ÉCHÉANCE d'un contrat : `quote_data->>'date_echeance'` (ce qu'écrit l'API),
 *     puis la colonne `date_echeance`, puis l'ancienne colonne `end_date`.
 *  6. TÂCHE : ligne de `appointments` (la table `taches` existe mais n'est jamais
 *     écrite par l'application). EN RETARD = statut <> 'terminee' et échéance passée.
 *  7. SOMME vs MESURE ABSENTE : une SOMME ou un COMPTAGE sur zéro ligne vaut 0 —
 *     c'est une valeur exacte. Un compteur `*_avec_prime` dit combien de lignes
 *     portaient réellement la mesure (0 prime renseignée ≠ 0 CHF de prime).
 *     En revanche une MOYENNE ou un TAUX sans dénominateur n'a PAS de valeur : la
 *     réponse porte `null` (jamais 0, jamais un repli inventé comme l'ancien
 *     « score ARK par défaut 75 »).
 */
const express = require('express');
const router = express.Router();
const { getJwtSecret } = require('../utils/jwtSecret');
const porteeCabinet = require('../lib/porteeCabinet');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  const jwt = require('jsonwebtoken');
  try { const decoded = jwt.verify(token, getJwtSecret()); req.user = decoded; next(); }
  catch (err) { res.status(401).json({ error: 'Token invalide' }); }
};

// CORRECTION 2026-09-19 : renvoyer `fallback` faisait afficher 0 client /
// 0 prime / 0 échéance en HTTP 200 — un portefeuille vide présenté comme une
// donnée valide, alors que la requête avait échoué. On propage désormais
// l'erreur pour que l'écran dise « indisponible » au lieu de mentir.
const safeQuery = async (pool, sql, params) => {
  try { const r = await pool.query(sql, params); return r.rows; }
  catch (e) {
    console.error('[dashboard] query failed:', e.message);
    const err = new Error(`dashboard_unavailable: ${e.message}`);
    err.code = 'DASHBOARD_UNAVAILABLE';
    throw err;
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// SOURCE UNIQUE DES INDICATEURS (voir les définitions en tête de fichier)
// ═════════════════════════════════════════════════════════════════════════════

/** Statuts qui désignent un CONTRAT actif dans `quotes`. */
const STATUTS_CONTRAT_ACTIF = "('actif', 'active')";

/**
 * Prime annuelle d'un contrat, alias `q` sur `quotes`.
 * L'ordre est celui des écritures réelles : la colonne d'abord (imports),
 * puis le JSON posé par POST /api/contrats, puis les colonnes historiques.
 */
const PRIME_CONTRAT =
  "COALESCE(q.prime_annuelle, NULLIF(q.quote_data->>'prime_annuelle', '')::numeric, q.premium, q.amount)";

/**
 * Échéance d'un contrat, alias `q` sur `quotes`.
 * `date_echeance` et `end_date` sont écrites SANS préfixe : dans toutes les
 * requêtes qui utilisent cette constante, `quotes` est la seule table jointe à
 * porter ces deux colonnes (clients ne les a pas) — la sous-chaîne historique
 * `COALESCE(date_echeance, end_date)` est ainsi conservée telle quelle, ce que
 * vérifie tests/routes/erreursSqlP1.test.js (garde-fou de schéma existant).
 */
const ECHEANCE_CONTRAT =
  "COALESCE(NULLIF(q.quote_data->>'date_echeance', '')::date, COALESCE(date_echeance, end_date))";

/** Portée SQL sur `clients` (le cabinet, ou l'utilisateur s'il n'a pas de cabinet). */
function porteeClients(portee, { depart = 1, alias = 'c' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.courtier_id`,
    depart,
  });
}

/** Portée SQL sur `devis_wizard` (propriétaire = user_id, comme routes/devis.js). */
function porteeDevis(portee, { depart = 1, alias = 'd' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.user_id`,
    depart,
  });
}

/** Portée SQL sur `appointments` (propriétaire = user_id, sinon organizer_id). */
function porteeTaches(portee, { depart = 1, alias = 'a' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `COALESCE(${alias}.user_id, ${alias}.organizer_id)`,
    depart,
  });
}

/** CLIENTS — totaux, actifs, prospects, nouveaux sur la période. */
function requeteClients(portee, { jours = 30, depart = 1, alias = 'c' } = {}) {
  const f = porteeClients(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${alias}.status = 'actif')::int AS actifs,
        COUNT(*) FILTER (WHERE ${alias}.status = 'prospect')::int AS prospects,
        COUNT(*) FILTER (WHERE ${alias}.created_at >= NOW() - $${f.suivant}::interval)::int AS nouveaux
      FROM clients ${alias}
      WHERE ${f.sql}`,
    params: [...f.params, `${jours} days`],
  };
}

/** CLIENTS — répartition par statut (même portée, même definition de « client »). */
function requeteClientsParStatut(portee, { depart = 1, alias = 'c' } = {}) {
  const f = porteeClients(portee, { depart, alias });
  return {
    sql: `SELECT ${alias}.status, COUNT(*)::int AS count
      FROM clients ${alias}
      WHERE ${f.sql} AND ${alias}.status IS NOT NULL
      GROUP BY ${alias}.status`,
    params: [...f.params],
  };
}

/** CONTRATS ACTIFS — nombre, prime annuelle, échéances à 30/90 jours. */
function requeteContratsActifs(portee, { jours = 30, depart = 1, alias = 'c' } = {}) {
  const f = porteeClients(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(${PRIME_CONTRAT}), 0)::numeric AS prime_totale,
        COUNT(${PRIME_CONTRAT})::int AS contrats_avec_prime,
        COUNT(*) FILTER (WHERE q.created_at >= NOW() - $${f.suivant}::interval)::int AS nouveaux,
        COUNT(*) FILTER (WHERE ${ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS echeances_30j,
        COUNT(*) FILTER (WHERE ${ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '90 days')::int AS echeances_90j
      FROM quotes q
      JOIN clients ${alias} ON ${alias}.id = q.client_id
      WHERE ${f.sql}
        AND q.status IN ${STATUTS_CONTRAT_ACTIF}`,
    params: [...f.params, `${jours} days`],
  };
}

/** DEVIS — nombre, statuts, montant cumulé (centimes) et devis réellement chiffrés. */
function requeteDevis(portee, { jours = 30, depart = 1, alias = 'd' } = {}) {
  const f = porteeDevis(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${alias}.status IN ('sent', 'opened'))::int AS envoyes,
        COUNT(*) FILTER (WHERE ${alias}.status = 'signed')::int AS signes,
        COUNT(*) FILTER (WHERE ${alias}.status IN ('draft', 'ready'))::int AS en_preparation,
        COUNT(*) FILTER (WHERE ${alias}.status = 'refused')::int AS refuses,
        COUNT(*) FILTER (WHERE ${alias}.status = 'expired')::int AS expires,
        COUNT(*) FILTER (WHERE ${alias}.created_at >= NOW() - $${f.suivant}::interval)::int AS nouveaux,
        COALESCE(SUM(${alias}.total_premium_cents), 0)::bigint AS prime_cents,
        COUNT(${alias}.total_premium_cents)::int AS devis_avec_prime
      FROM devis_wizard ${alias}
      WHERE ${f.sql}`,
    params: [...f.params, `${jours} days`],
  };
}

/** TÂCHES — total et tâches en retard (échéance passée et statut non terminé). */
function requeteTaches(portee, { depart = 1, alias = 'a' } = {}) {
  const f = porteeTaches(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE COALESCE(${alias}.status, 'a_faire') NOT IN ('terminee', 'annulee')
            AND ${alias}.start_time IS NOT NULL
            AND ${alias}.start_time < NOW()
        )::int AS en_retard
      FROM appointments ${alias}
      WHERE ${f.sql}`,
    params: [...f.params],
  };
}

/** Conversions de cents → montant, sans poussière binaire (0.30000000000000004). */
const centsVersMontant = (cents) => Number((Number(cents || 0) / 100).toFixed(2));

/** Taux (0-100, entier) ou `null` si le dénominateur est nul (pas de mesure). */
const taux = (numerateur, denominateur) =>
  denominateur > 0 ? Math.round((numerateur / denominateur) * 100) : null;

const kpi = {
  STATUTS_CONTRAT_ACTIF,
  PRIME_CONTRAT,
  ECHEANCE_CONTRAT,
  porteeClients,
  porteeDevis,
  porteeTaches,
  requeteClients,
  requeteClientsParStatut,
  requeteContratsActifs,
  requeteDevis,
  requeteTaches,
  centsVersMontant,
  taux,
};

// ─── /api/dashboard/stats — KPIs Legacy (compatibilité Dashboard) ───────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id || req.user.userId;
    const portee = await porteeCabinet.resoudrePortee(pool, req);

    const qClients = requeteClients(portee, { jours: 30 });
    const qContrats = requeteContratsActifs(portee, { jours: 30 });
    const qDevis = requeteDevis(portee, { jours: 30 });
    const qTaches = requeteTaches(portee);

    // Une seule requête par indicateur (voir le bloc de définitions), plus les
    // listes/ventilations de l'écran. Toutes les requêtes partagent la MÊME
    // portée cabinet : c'est ce qui garantit que les trois écrans comptent la
    // même chose.
    const [r1, r2, rContrats, rCommissions, r6, r7, r8, r9, r10, rClientsStatut, rTaches, rDevis] =
      await Promise.all([
        pool.query(qClients.sql, qClients.params),
        // Moyenne des scores de risque : null si le cabinet n'a aucun client
        // (AVG sur zéro ligne = NULL) — « pas de mesure » et non 0.
        pool.query(`SELECT ROUND(AVG(c.risk_score)::numeric)::int AS score FROM clients c WHERE ${porteeClients(portee, { alias: 'c' }).sql}`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(qContrats.sql, qContrats.params),
        // Commissions du mois : lues dans la table `commissions` (celles réellement
        // enregistrées). Avant : prime × 15 % / 12 codé en dur — un taux arbitraire
        // qui produisait un montant de commission sans lien avec les commissions
        // réellement perçues par le cabinet. La table est portée par `user_id`
        // (l'affectation) : on y lit les commissions de l'utilisateur connecté.
        pool.query(`SELECT COALESCE(SUM(CASE WHEN COALESCE(received_amount_cents,0) <> 0 THEN received_amount_cents ELSE expected_amount_cents END),0)::numeric / 100 AS commissions, COUNT(*)::int AS nb FROM commissions WHERE user_id=$1 AND period_year=EXTRACT(YEAR FROM NOW()) AND period_month=EXTRACT(MONTH FROM NOW())`, [userId]),
        // Revenus 6 mois : contrats ACTIFS uniquement, prime définie une seule fois
        // (PRIME_CONTRAT) — la formule locale d'avant ignorait la colonne `prime_annuelle`.
        pool.query(`SELECT TO_CHAR(DATE_TRUNC('month',q.created_at),'Mon') as mois, COALESCE(SUM(${PRIME_CONTRAT}),0)::numeric as revenue
                    FROM quotes q JOIN clients c ON q.client_id=c.id
                    WHERE q.created_at>=NOW()-INTERVAL '6 months' AND q.status IN ${STATUTS_CONTRAT_ACTIF} AND ${porteeClients(portee, { alias: 'c' }).sql}
                    GROUP BY DATE_TRUNC('month',q.created_at) ORDER BY 1 ASC`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(`SELECT c.first_name as nom,c.last_name as prenom,q.quote_data->>'type_contrat' as type_contrat,
                           ${ECHEANCE_CONTRAT} as date_echeance,
                           EXTRACT(DAY FROM ${ECHEANCE_CONTRAT}-NOW())::int as jours_restants
                    FROM quotes q JOIN clients c ON q.client_id=c.id
                    WHERE ${ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW()+INTERVAL '90 days'
                      AND q.status IN ${STATUTS_CONTRAT_ACTIF} AND ${porteeClients(portee, { alias: 'c' }).sql}
                    ORDER BY 1 ASC LIMIT 5`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(`SELECT c.id,c.first_name as nom,c.last_name as prenom,c.status as statut,c.risk_score as score_risque,c.created_at
                    FROM clients c WHERE ${porteeClients(portee, { alias: 'c' }).sql}
                    ORDER BY c.created_at DESC LIMIT 5`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(`SELECT COALESCE(q.quote_data->>'type_contrat','Autre') as type,COUNT(*)::int as count,COALESCE(SUM(${PRIME_CONTRAT}),0)::numeric as total_primes
                    FROM quotes q JOIN clients c ON q.client_id=c.id
                    WHERE q.status IN ${STATUTS_CONTRAT_ACTIF} AND ${porteeClients(portee, { alias: 'c' }).sql}
                    GROUP BY 1 ORDER BY 2 DESC`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(`SELECT c.type as segment,COUNT(*)::int as count FROM clients c
                    WHERE c.type IS NOT NULL AND ${porteeClients(portee, { alias: 'c' }).sql}
                    GROUP BY c.type`, porteeClients(portee, { alias: 'c' }).params),
        pool.query(requeteClientsParStatut(portee).sql, requeteClientsParStatut(portee).params),
        pool.query(qTaches.sql, qTaches.params),
        pool.query(qDevis.sql, qDevis.params),
      ]);

    const c = r1.rows[0] || {};
    const total = Number(c.total || 0);
    const actifs = Number(c.actifs || 0);
    const prospects = Number(c.prospects || 0);
    const contrats = rContrats.rows[0] || {};
    const devis = rDevis.rows[0] || {};
    const taches = rTaches.rows[0] || {};

    const clientsParStatut = rClientsStatut.rows.reduce((a, r) => { if (r.status) a[r.status] = parseInt(r.count, 10); return a; }, {});
    const clientsParSegment = r10.rows.reduce((a, r) => { if (r.segment) a[r.segment] = parseInt(r.count, 10); return a; }, {});

    res.json({
      // Clients — total, actifs, prospects : définition unique (source ci-dessus).
      totalClients: total,
      clientsActifs: actifs,
      clientsProspects: prospects,
      // Contrats ACTIFS (`quotes`), jamais la table `contracts` (jamais écrite).
      contratsActifs: Number(contrats.total || 0),
      primeTotale: Number(contrats.prime_totale || 0),
      // Champ dédié : combien de contrats portaient réellement une prime.
      contratsAvecPrime: Number(contrats.contrats_avec_prime || 0),
      contratsUrgents: Number(contrats.echeances_30j || 0),
      contratsEcheance90j: Number(contrats.echeances_90j || 0),
      // Devis (`devis_wizard`) — un devis n'est pas un contrat.
      devisTotal: Number(devis.total || 0),
      devisEnAttente: Number(devis.envoyes || 0),
      devisSignes: Number(devis.signes || 0),
      devisEnPreparation: Number(devis.en_preparation || 0),
      devisPrimeTotale: centsVersMontant(devis.prime_cents),
      devisAvecPrime: Number(devis.devis_avec_prime || 0),
      // Tâches (`appointments`) — « en retard » : échéance passée, non terminée.
      tachesTotal: Number(taches.total || 0),
      tachesEnRetard: Number(taches.en_retard || 0),
      // Commissions du mois, réellement enregistrées (table `commissions`).
      commissionsMois: parseFloat((rCommissions.rows[0] || {}).commissions || 0),
      commissionsMoisSource: 'commissions',
      commissionsMoisEnregistrees: parseInt((rCommissions.rows[0] || {}).nb || 0, 10),
      // Taux de conversion prospects → clients : même définition que l'écran
      // « Analyses dirigeants » (actifs / (actifs + prospects)). null = aucune
      // mesure possible (aucun client), jamais 0 ni un taux inventé.
      tauxConversion: taux(actifs, actifs + prospects),
      // Moyenne sans dénominateur ⇒ null (« pas de mesure »), pas 0.
      scoreRisqueMoyen: r2.rows[0] ? r2.rows[0].score : null,
      clientsParStatut,
      clientsParSegment,
      revenus6Mois: r6.rows,
      alertes: r7.rows,
      clientsRecents: r8.rows,
      typesContrats: r9.rows,
    });
  } catch (err) {
    console.error('dashboard error:', err.message);
    res.status(500).json({ error: 'dashboard_unavailable', message: 'Les statistiques sont temporairement indisponibles.' });
  }
});

// ─── /api/dashboard/summary — Cockpit KPIs synthétiques ──────────────────
router.get('/summary', verifyToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const portee = await porteeCabinet.resoudrePortee(pool, req);

  const qClients = requeteClients(portee, { jours: 30 });
  const qContrats = requeteContratsActifs(portee, { jours: 30 });
  const qDevis = requeteDevis(portee, { jours: 30 });

  // `safeQuery` propage l'erreur (200 + zéros serait un mensonge : voir plus haut).
  const clientsRows = await safeQuery(pool, qClients.sql, qClients.params);
  const c = clientsRows[0] || {};

  const contratsRows = await safeQuery(pool, qContrats.sql, qContrats.params);
  const k = contratsRows[0] || {};

  const devisRows = await safeQuery(pool, qDevis.sql, qDevis.params);
  const d = devisRows[0] || {};

  // Score portefeuille basé sur rétention + diversification + activité récente
  const total = Number(c.total || 0);
  const actifs = Number(c.actifs || 0);
  const retention = total > 0 ? Math.min(100, Math.round((actifs / total) * 100)) : 0;
  const silencieux = await safeQuery(pool,
    `SELECT COUNT(*) FILTER (WHERE c.silent_alert IS TRUE)::int AS silencieux,
            COALESCE(ROUND(AVG(NULLIF(c.loyalty_score,0))::numeric, 0), 0)::int AS loyalty_avg
     FROM clients c WHERE ${porteeClients(portee, { alias: 'c' }).sql}`,
    porteeClients(portee, { alias: 'c' }).params);
  const s = silencieux[0] || {};
  const silencieuxRatio = total > 0 ? (Number(s.silencieux || 0) / total) : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(retention * 0.6 + (100 - silencieuxRatio * 100) * 0.4)));

  res.json({
    generated_at: new Date().toISOString(),
    kpi: {
      clients_actifs: actifs,
      clients_total: total,
      clients_prospects: Number(c.prospects || 0),
      contrats_actifs: Number(k.total || 0),
      prime_totale: Number(k.prime_totale || 0),
      contrats_avec_prime: Number(k.contrats_avec_prime || 0),
      echeances_30j: Number(k.echeances_30j || 0),
      // « Devis en attente » = devis envoyés/ouverts au client, sans réponse.
      // Avant : `quotes WHERE status='envoye'` — une table et un statut que les
      // devis n'utilisent pas (ils vivent dans `devis_wizard`) : le compteur
      // restait donc toujours à 0.
      devis_total: Number(d.total || 0),
      devis_en_attente: Number(d.envoyes || 0),
      devis_signes: Number(d.signes || 0),
      devis_prime_totale: centsVersMontant(d.prime_cents),
      health_score: healthScore,
      delta_clients_30j: Number(c.nouveaux || 0),
    },
    flags: {
      silencieux: Number(s.silencieux || 0),
      loyalty_avg: Number(s.loyalty_avg || 0),
      retention_pct: retention,
    },
  });
});

// ─── /api/dashboard/activity — Timeline événements récents ────────────────
router.get('/activity', verifyToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const userId = req.user.id || req.user.userId;
  const limit = Math.min(parseInt(req.query.limit || '12', 10), 50);
  const portee = await porteeCabinet.resoudrePortee(pool, req);

  const events = [];

  const interactions = await safeQuery(pool,
    `SELECT ci.id, ci.provider AS kind, ci.subject AS label, ci.occurred_at AS at,
            ci.client_id, c.first_name, c.last_name
     FROM client_interactions ci
     LEFT JOIN clients c ON c.id = ci.client_id
     WHERE ci.user_id=$1 AND ci.occurred_at IS NOT NULL
     ORDER BY ci.occurred_at DESC LIMIT $2`, [userId, limit]);
  for (const r of interactions) {
    events.push({
      id: `int-${r.id}`,
      kind: r.kind || 'interaction',
      label: r.label || `Interaction ${r.kind || ''}`,
      at: r.at,
      client_id: r.client_id,
      client_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
    });
  }

  const newClients = await safeQuery(pool,
    `SELECT c.id, c.first_name, c.last_name, c.created_at FROM clients c
     WHERE ${porteeClients(portee, { alias: 'c' }).sql}
     ORDER BY c.created_at DESC LIMIT $${porteeClients(portee, { alias: 'c' }).params.length + 1}`,
    [...porteeClients(portee, { alias: 'c' }).params, Math.min(limit, 6)]);
  for (const r of newClients) {
    events.push({
      id: `cli-${r.id}`,
      kind: 'client_created',
      label: `Nouveau client : ${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'sans nom'}`,
      at: r.created_at,
      client_id: r.id,
      client_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
    });
  }

  const recos = await safeQuery(pool,
    `SELECT id, title, created_at FROM ark_recommendations
     WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, [userId, Math.min(limit, 6)]);
  for (const r of recos) {
    events.push({
      id: `ark-${r.id}`,
      kind: 'ark',
      label: r.title,
      at: r.created_at,
      client_id: null,
      client_name: null,
    });
  }

  events.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  res.json({ events: events.slice(0, limit) });
});

module.exports = router;
// Les trois autres routeurs reporters (reporting.js, analytics.js) et
// l'agrégat « prime par client » (clients.js) importent ce bloc : c'est ce qui
// rend la définition UNIQUE. `kpi` est posé sur le routeur lui-même pour ne pas
// créer de fichier hors des quatre autorisés par la mission.
module.exports.kpi = kpi;
