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
 * ═════════════════════════════════════════════════════════════════════════════
 * DEUX NOTIONS, DEUX NOMS — ARBITRAGE DU 20/09/2026 (« contrats actifs » / « tous »)
 *
 * MESURE DU DÉFAUT : le mot « contrat » servait à TROIS mesures selon l'écran —
 * 2 sur /api/dashboard/stats (« contrats actifs »), 3 sur une base où un devis v1
 * traînait dans `quotes` (« toutes les lignes »), 4 sur /api/analytics/executive
 * (contrats + devis), et la recette attendait encore autre chose. Un écran ne se
 * trompait pas seul : le mot était ambigu, donc chaque route l'avait résolu à sa
 * façon. L'arbitrage retenu nomme les deux notions et les expose PARTOUT :
 *
 *   contrats.total   = TOUTES les lignes de `quotes` de NATURE contrat — résilié,
 *                      expiré, suspendu, annulé compris. C'est la réponse à
 *                      « combien de contrats ce cabinet a-t-il eus ? ».
 *   contrats.actifs  = les seules lignes au statut 'actif'/'active'. C'est la
 *                      réponse à « combien de contrats sont en cours ? » et la
 *                      base de la somme des primes du portefeuille.
 *   devis.total      = `devis_wizard` PLUS les devis v1 restés dans `quotes`.
 *
 * Les deux notions existent désormais sous le même nom dans les trois écrans :
 * /api/dashboard/stats (`contratsTotal`, `contratsActifs`, `devisTotal`),
 * /api/reporting/overview (`kpis.contracts.total`, `.actifs`, `kpis.devis`) et
 * /api/analytics/executive (`data.contracts_total`, `data.contracts_actifs`,
 * `data.devis_count`). Elles ne peuvent plus diverger : les trois routes lisent
 * les MÊMES requêtes canoniques (ci-dessous) et assemblent les nombres avec les
 * MÊMES fonctions (`agregerContrats`, `agregerDevis`) — aucune n'a le droit de
 * recompter un contrat à la main.
 *
 * « SOMME DES PRIMES » — deux valeurs, jamais confondues :
 *   • primeTotale = somme des primes des contrats ACTIFS = la mesure de
 *     portefeuille (celle affichée comme chiffre d'affaires).
 *   • primeTotaleTous = somme des primes de TOUTES les lignes de nature contrat
 *     (résiliés compris). Elle n'existe QUE pour l'audit (traçabilité, contrôle
 *     des écarts) : une prime résiliée n'est pas encaissée, l'afficher comme
 *     chiffre d'affaires serait un faux chiffre.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * DÉFINITIONS RETENUES — chaque indicateur n'a qu'un sens, valable partout
 *  1. CLIENT : ligne de `clients` du cabinet (cabinet_id) ou, pour un compte sans
 *     cabinet, créée par lui (courtier_id) — portée de lib/porteeCabinet.js.
 *     « prospect » = status 'prospect' ; « actif » = status 'actif'.
 *  2. CONTRAT : ligne de `quotes` de NATURE contrat (voir NATURE_CONTRAT : les
 *     statuts 'envoye'/'brouillon' sont des devis v1, pas des contrats), quel que
 *     soit son statut pour `contrats.total`, au statut 'actif'/'active' pour
 *     `contrats.actifs`. `quotes` est la SEULE table de contrats réellement
 *     écrite (POST /api/contrats, PUT /api/contrats/:id, alias /api/contracts).
 *     Les tables `contracts` et `contrats` existent mais restent VIDES : les
 *     lire annonce 0 contrat sur une base pleine.
 *  3. DEVIS : ligne de `devis_wizard` (POST /api/devis/wizard/init) PLUS les devis
 *     v1 restés dans `quotes` (statuts 'envoye'/'brouillon', écrits par l'ancien
 *     parcours). Un devis n'est PAS un contrat : les additionner donnait
 *     3 « contrats » pour 2 contrats + 1 devis.
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
// Montants : cast tolérant (une valeur fautive est ignorée, elle ne casse pas
// l'écran) — lib/montants.js.
const { montantSur } = require('../lib/montants');

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
 * Statuts d'une ligne de `quotes` qui EST un contrat sans être actif : le contrat
 * a existé (ou attend une validation) — il compte dans `contrats.total`, jamais
 * dans `contrats.actifs`, et sa prime n'entre PAS dans la somme du portefeuille.
 * (Liste = statuts de contrat acceptés à l'écriture par POST /api/contrats, moins
 * les deux statuts de devis v1 ci-dessous.)
 */
const STATUTS_CONTRAT_INACTIF = "('en_attente', 'resilie', 'expire', 'suspendu', 'annule')";

/**
 * Statuts des DEVIS v1 restés dans `quotes` — la frontière entre les deux notions.
 *
 * POURQUOI : l'ancien parcours de devis écrivait ses devis dans la table `quotes`
 * avec le statut 'envoye' ('brouillon' avant envoi). Une telle ligne n'est PAS un
 * contrat ; la compter comme telle est ce qui faisait afficher « 3 contrats »
 * pour 2 contrats + 1 devis. Ces statuts sont donc exclus de `contrats.*` et
 * comptés dans `devis.*` (voir requeteDevisV1).
 */
const STATUTS_DEVIS_V1 = "('envoye', 'brouillon')";

/**
 * Prédicat SQL : « cette ligne de `quotes` est un CONTRAT » (et non un devis v1).
 * Il ne filtre PAS le statut actif/inactif : c'est la définition de `contrats.total`.
 * Le statut ABSENT (NULL) est traité comme un contrat de nature inconnue — il
 * apparaît donc dans `contrats.total` (visible par l'audit) mais jamais dans
 * `contrats.actifs`. POURQUOI ne pas l'exclure : une ligne de nature inconnue
 * n'est pas un devis v1, et la faire disparaître de partout serait un trou muet.
 */
const NATURE_CONTRAT = `COALESCE(q.status, '') NOT IN ${STATUTS_DEVIS_V1}`;

/**
 * Prime annuelle d'une ligne de `quotes`, alias `q`.
 * L'ordre est celui des écritures réelles : la colonne d'abord (imports),
 * puis le JSON posé par POST /api/contrats, puis les colonnes historiques.
 * Sert aussi bien à un contrat qu'à un devis v1 resté dans `quotes` : dans les
 * deux cas c'est « la prime portée par cette ligne », lue de la même façon.
 */
const PRIME_CONTRAT =
  // `montantSur` (lib/montants.js) ne caste la valeur JSON QUE si elle a la
  // forme d'un nombre : sans lui, une prime 'abc' écrite un jour faisait tomber
  // en 500 la liste des clients, le reporting ET le cockpit du cabinet entier
  // (« invalid input syntax for type numeric: "abc" », défaut P0 du 20/09/2026).
  // Une valeur illisible est ignorée (NULL), jamais devinée.
  `COALESCE(q.prime_annuelle, ${montantSur('q')}, q.premium, q.amount)`;

/**
 * Échéance d'un contrat, alias `q` sur `quotes`.
 * `date_echeance` et `end_date` sont écrites SANS préfixe : dans toutes les
 * requêtes qui utilisent cette constante, `quotes` est la seule table jointe à
 * porter ces deux colonnes (clients ne les a pas) — la sous-chaîne historique
 * `COALESCE(date_echeance, end_date)` est ainsi conservée telle quelle, ce que
 * vérifie tests/routes/erreursSqlP1.test.js (garde-fou de schéma existant).
 */
const ECHEANCE_CONTRAT =
  `COALESCE(CASE WHEN q.quote_data->>'date_echeance' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                 THEN (q.quote_data->>'date_echeance')::date END, COALESCE(date_echeance, end_date))`;

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

/**
 * CONTRATS — LES DEUX NOTIONS DANS UNE SEULE REQUÊTE (donc un seul SQL, une
 * seule définition pour les trois écrans) :
 *   total            = toutes les lignes de `quotes` de nature contrat ;
 *   actifs           = celles au statut 'actif'/'active' ;
 *   prime_totale     = somme des primes des contrats ACTIFS (mesure du portefeuille) ;
 *   prime_totale_tous= somme des primes de TOUTES les lignes de nature contrat
 *                      (résiliés compris) — audit seulement, jamais affichée
 *                      comme chiffre d'affaires ;
 *   echeances/nouveaux = contrats ACTIFS uniquement (un résilié n'échoit plus).
 * Les deux compteurs viennent de la MÊME passe SQL : ils ne peuvent pas se
 * contredire, et aucune route n'a besoin de recompter.
 */
function requeteContrats(portee, { jours = 30, depart = 1, alias = 'c' } = {}) {
  const f = porteeClients(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE q.status IN ${STATUTS_CONTRAT_ACTIF})::int AS actifs,
        COALESCE(SUM(${PRIME_CONTRAT}) FILTER (WHERE q.status IN ${STATUTS_CONTRAT_ACTIF}), 0)::numeric AS prime_totale,
        COALESCE(SUM(${PRIME_CONTRAT}), 0)::numeric AS prime_totale_tous,
        COUNT(${PRIME_CONTRAT}) FILTER (WHERE q.status IN ${STATUTS_CONTRAT_ACTIF})::int AS contrats_avec_prime,
        COUNT(*) FILTER (WHERE q.created_at >= NOW() - $${f.suivant}::interval
                           AND q.status IN ${STATUTS_CONTRAT_ACTIF})::int AS nouveaux,
        COUNT(*) FILTER (WHERE ${ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '30 days'
                           AND q.status IN ${STATUTS_CONTRAT_ACTIF})::int AS echeances_30j,
        COUNT(*) FILTER (WHERE ${ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '90 days'
                           AND q.status IN ${STATUTS_CONTRAT_ACTIF})::int AS echeances_90j
      FROM quotes q
      JOIN clients ${alias} ON ${alias}.id = q.client_id
      WHERE ${f.sql}
        AND ${NATURE_CONTRAT}`,
    params: [...f.params, `${jours} days`],
  };
}

/**
 * Ancien nom conservé À DESSEIN : c'est exactement le même SQL (aucune copie),
 * pour ne pas casser les appelants et pour que les tests de cohérence continuent
 * de désigner la requête canonique des contrats.
 */
const requeteContratsActifs = requeteContrats;

/**
 * DEVIS v1 — les devis restés dans `quotes` (statuts 'envoye'/'brouillon').
 * Ils sont comptés (et leur prime sommée) AVEC les devis de `devis_wizard` :
 * c'est `agregerDevis` qui assemble les deux sources, jamais une route à la main.
 * Portée : celle du CLIENT de la ligne (comme un contrat, qui pend d'un client).
 */
function requeteDevisV1(portee, { jours = 30, depart = 1, alias = 'c' } = {}) {
  const f = porteeClients(portee, { depart, alias });
  return {
    sql: `SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(${PRIME_CONTRAT}), 0)::numeric AS prime_v1,
        COUNT(${PRIME_CONTRAT})::int AS devis_avec_prime,
        COUNT(*) FILTER (WHERE q.status = 'envoye')::int AS envoyes,
        COUNT(*) FILTER (WHERE q.created_at >= NOW() - $${f.suivant}::interval)::int AS nouveaux
      FROM quotes q
      JOIN clients ${alias} ON ${alias}.id = q.client_id
      WHERE ${f.sql}
        AND COALESCE(q.status, '') IN ${STATUTS_DEVIS_V1}`,
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

/** Entier sûr depuis une colonne SQL (jamais NaN, jamais undefined). */
const entier = (valeur) => parseInt(valeur, 10) || 0;

/** Montant sûr depuis une colonne SQL. */
const nombre = (valeur) => parseFloat(valeur) || 0;

/**
 * Assemble les CONTRATS à partir de la SEULE ligne de `requeteContrats`.
 * POURQUOI une fonction et non du code dans chaque route : c'est ici que
 * `total` (toutes lignes de nature contrat) et `actifs` (statut actif) sont
 * nommés une fois pour toutes. Une route qui voudrait « juste recompter »
 * devrait contourner cette fonction — c'est visible en revue.
 */
function agregerContrats(ligne = {}) {
  return {
    total: entier(ligne.total),          // toutes les lignes de nature contrat
    actifs: entier(ligne.actifs),        // statut 'actif' / 'active'
    primeTotale: nombre(ligne.prime_totale),            // contrats ACTIFS
    primeTotaleTous: nombre(ligne.prime_totale_tous),   // audit : résiliés compris
    avecPrime: entier(ligne.contrats_avec_prime),
    nouveaux: entier(ligne.nouveaux),
    echeances30j: entier(ligne.echeances_30j),
    echeances90j: entier(ligne.echeances_90j),
  };
}

/**
 * Assemble les DEVIS des DEUX sources : `devis_wizard` (parcours actuel) et les
 * devis v1 restés dans `quotes` (statuts 'envoye'/'brouillon').
 *
 * POURQUOI (arbitrage du 20/09/2026) : ces lignes de `quotes` ne sont pas des
 * contrats ; avant, elles étaient soit comptées comme contrats (3 « contrats »
 * pour 2 contrats + 1 devis), soit ignorées. Elles sont ici comptées comme
 * DEVIS, montant compris — et `dontV1` publie leur part pour que l'audit puisse
 * le vérifier sans relire la base.
 * Un devis refusé ou expiré reste un devis (compté dans `total`) : il n'est
 * simplement pas « signé », donc pas converti.
 */
function agregerDevis(wizard = {}, v1 = {}) {
  const total = entier(wizard.total) + entier(v1.total);
  const signes = entier(wizard.signes);
  return {
    total,
    totalValue: Number((centsVersMontant(wizard.prime_cents) + nombre(v1.prime_v1)).toFixed(2)),
    avecPrime: entier(wizard.devis_avec_prime) + entier(v1.devis_avec_prime),
    signes,
    envoyes: entier(wizard.envoyes) + entier(v1.envoyes),
    enPreparation: entier(wizard.en_preparation),
    refuses: entier(wizard.refuses),
    expires: entier(wizard.expires),
    nouveaux: entier(wizard.nouveaux) + entier(v1.nouveaux),
    dontV1: entier(v1.total),
    // Aucun devis ⇒ le taux n'existe pas : null (« pas de mesure »), pas 0 %.
    conversionRate: taux(signes, total),
  };
}

const kpi = {
  STATUTS_CONTRAT_ACTIF,
  STATUTS_CONTRAT_INACTIF,
  STATUTS_DEVIS_V1,
  NATURE_CONTRAT,
  PRIME_CONTRAT,
  ECHEANCE_CONTRAT,
  porteeClients,
  porteeDevis,
  porteeTaches,
  requeteClients,
  requeteClientsParStatut,
  requeteContrats,
  requeteContratsActifs,
  requeteDevis,
  requeteDevisV1,
  requeteTaches,
  agregerContrats,
  agregerDevis,
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
    const qContrats = requeteContrats(portee, { jours: 30 });
    const qDevis = requeteDevis(portee, { jours: 30 });
    // Les devis v1 restés dans `quotes` sont comptés AVEC les devis : c'est la
    // deuxième source de l'indicateur « devis » (voir agregerDevis).
    const qDevisV1 = requeteDevisV1(portee, { jours: 30 });
    const qTaches = requeteTaches(portee);

    // Une seule requête par indicateur (voir le bloc de définitions), plus les
    // listes/ventilations de l'écran. Toutes les requêtes partagent la MÊME
    // portée cabinet : c'est ce qui garantit que les trois écrans comptent la
    // même chose.
    const [r1, r2, rContrats, rCommissions, r6, r7, r8, r9, r10, rClientsStatut, rTaches, rDevis, rDevisV1] =
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
        pool.query(qDevisV1.sql, qDevisV1.params),
      ]);

    const c = r1.rows[0] || {};
    const total = Number(c.total || 0);
    const actifs = Number(c.actifs || 0);
    const prospects = Number(c.prospects || 0);
    // LES DEUX NOTIONS, assemblées par les fonctions PARTAGÉES : le cockpit ne
    // peut plus nommer « contrats » autre chose que les deux autres écrans.
    const contrats = agregerContrats(rContrats.rows[0]);
    const devis = agregerDevis(rDevis.rows[0], rDevisV1.rows[0]);
    const taches = rTaches.rows[0] || {};

    const clientsParStatut = rClientsStatut.rows.reduce((a, r) => { if (r.status) a[r.status] = parseInt(r.count, 10); return a; }, {});
    const clientsParSegment = r10.rows.reduce((a, r) => { if (r.segment) a[r.segment] = parseInt(r.count, 10); return a; }, {});

    res.json({
      // Clients — total, actifs, prospects : définition unique (source ci-dessus).
      totalClients: total,
      clientsActifs: actifs,
      clientsProspects: prospects,
      // CONTRATS — les deux notions, nommées :
      //   contratsTotal = toutes les lignes de nature contrat (résiliés compris) ;
      //   contratsActifs = statut 'actif'/'active' (base de la prime du portefeuille).
      contratsTotal: contrats.total,
      contratsActifs: contrats.actifs,
      contrats: contrats,
      primeTotale: contrats.primeTotale,
      // Audit seulement : primes des contrats résiliés/expirés comprises.
      primeTotaleTous: contrats.primeTotaleTous,
      // Champ dédié : combien de contrats portaient réellement une prime.
      contratsAvecPrime: contrats.avecPrime,
      contratsUrgents: contrats.echeances30j,
      contratsEcheance90j: contrats.echeances90j,
      // DEVIS (`devis_wizard` + devis v1 restés dans `quotes`) — un devis n'est
      // pas un contrat. Les clés historiques restent, elles pointent sur les
      // mêmes nombres (aucun écran ne peut plus lire autre chose).
      devisTotal: devis.total,
      devis: devis,
      devisEnAttente: devis.envoyes,
      devisSignes: devis.signes,
      devisEnPreparation: devis.enPreparation,
      devisPrimeTotale: devis.totalValue,
      devisAvecPrime: devis.avecPrime,
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
  const qContrats = requeteContrats(portee, { jours: 30 });
  const qDevis = requeteDevis(portee, { jours: 30 });
  const qDevisV1 = requeteDevisV1(portee, { jours: 30 });

  // `safeQuery` propage l'erreur (200 + zéros serait un mensonge : voir plus haut).
  const clientsRows = await safeQuery(pool, qClients.sql, qClients.params);
  const c = clientsRows[0] || {};

  const contratsRows = await safeQuery(pool, qContrats.sql, qContrats.params);
  const k = agregerContrats(contratsRows[0]);

  const devisRows = await safeQuery(pool, qDevis.sql, qDevis.params);
  const devisV1Rows = await safeQuery(pool, qDevisV1.sql, qDevisV1.params);
  const d = agregerDevis(devisRows[0], devisV1Rows[0]);

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
      // Contrats : LES DEUX NOTIONS (contrats_total = toutes les lignes de nature
      // contrat, contrats_actifs = statut actif) — mêmes fonctions partagées que
      // les autres écrans.
      contrats_total: k.total,
      contrats_actifs: k.actifs,
      prime_totale: k.primeTotale,
      prime_totale_tous: k.primeTotaleTous,
      contrats_avec_prime: k.avecPrime,
      echeances_30j: k.echeances30j,
      // Devis : `devis_wizard` + devis v1 restés dans `quotes`.
      devis_total: d.total,
      devis_dont_v1: d.dontV1,
      devis_en_attente: d.envoyes,
      devis_signes: d.signes,
      devis_prime_totale: d.totalValue,
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
