const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireUnderLimit } = require('../middleware/planGuard');
const { getJwtSecret } = require('../utils/jwtSecret');
const porteeCabinet = require('../lib/porteeCabinet');
// Règle UNIQUE des montants (refus explicite à l'écriture, cast tolérant à la
// lecture) : partagée avec les devis et les KPI — voir lib/montants.js.
const { montantOuNull, montantSur } = require('../lib/montants');

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES CONTRATS (`quotes`) : LE CABINET DE SON CLIENT
//
// POURQUOI : un contrat n'a pas de colonne « propriétaire » propre — il pend
// d'un client (`quotes.client_id`). Sa portée est donc CELLE DU CLIENT, et le
// client porte le cabinet (migration 113). On ne duplique pas `cabinet_id` sur
// `quotes` : deux vérités finiraient par diverger.
//
// ORDRE DES CONTRÔLES (défaut reproduit en production le 20/09/2026)
// L'appartenance est vérifiée EN PREMIER, les règles métier ENSUITE. Avant ce
// correctif, `DELETE /api/contrats/:id` comptait les commissions AVANT de
// vérifier l'appartenance : un cabinet B recevait « 409 : ce contrat porte 1
// commission » sur le contrat du cabinet A — un code qui CONFIRME l'existence
// d'une ressource d'un autre cabinet, et qui n'a aucun sens pour lui. Un refus
// d'appartenance est un 404 sec, sans aucune information sur la ressource.
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

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION D'UN CONTRAT
//
// POURQUOI : une entrée invalide ne doit jamais produire un 500 (erreur SQL) ni
// être enregistrée telle quelle. Un statut inconnu (« PIRATE ») est refusé
// explicitement avec la liste des statuts acceptés : un contrat dont le statut
// n'est compris par aucun écran sortirait silencieusement des compteurs.
// ─────────────────────────────────────────────────────────────────────────────

/** Statuts gérés par le produit (voir aussi dashboard.js : actif/active). */
const STATUTS_CONTRAT_ACCEPTES = Object.freeze([
  'actif', 'active', 'en_attente', 'envoye', 'brouillon',
  'resilie', 'expire', 'suspendu', 'annule',
]);

/** Identifiant numérique strict : `abc` ne doit pas finir en 500 SQL. */
function identifiantContrat(valeur) {
  const texte = String(valeur ?? '').trim();
  return /^\d+$/.test(texte) ? Number(texte) : null;
}

/** Nombre fini >= 0, ou `null` si la valeur est absente/vide. */
/**
 * Montant d'un contrat : la règle UNIQUE vit dans lib/montants.js (non
 * numérique, négatif ou au-delà du plafond ⇒ refus explicite 400). Elle est
 * partagée avec les devis pour qu'une correction ne puisse pas n'atteindre
 * qu'un seul des deux chemins d'écriture.
 */
function nombreOuNull(valeur) {
  const verdict = montantOuNull(valeur)
  if (!verdict.ok) return { ok: false, motif: verdict.motif, message: verdict.message, plafond: verdict.plafond }
  return { ok: true, valeur: verdict.valeur }
}
/** Date ISO `AAAA-MM-JJ` réelle (2027-02-31 est refusée), ou `null` si vide. */
function dateOuNull(valeur) {
  if (valeur === undefined || valeur === null) return { ok: true, valeur: null };
  const texte = String(valeur).trim();
  if (texte === '') return { ok: true, valeur: null };
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})/.exec(texte);
  if (!correspondance) return { ok: false };
  const [, annee, mois, jour] = correspondance;
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, Number(jour)));
  const valide = date.getUTCFullYear() === Number(annee)
    && date.getUTCMonth() === Number(mois) - 1
    && date.getUTCDate() === Number(jour);
  return valide ? { ok: true, valeur: `${annee}-${mois}-${jour}` } : { ok: false };
}

/**
 * Échéance + 1 an (renouvellement). Le jour est conservé ; un 29 février est
 * ramené au dernier jour du mois cible (29/02/2028 → 28/02/2029) : une échéance
 * qui « déborde » sur le mois suivant serait une date inventée.
 */
function ajouterUnAn(dateIso) {
  const [annee, mois, jour] = String(dateIso).split('-').map(Number);
  const cible = new Date(Date.UTC(annee + 1, mois - 1, jour));
  if (cible.getUTCMonth() !== mois - 1) {
    // Débordement (29/02 → 01/03) : dernier jour du mois cible.
    return new Date(Date.UTC(annee + 1, mois, 0)).toISOString().slice(0, 10);
  }
  return `${annee + 1}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

const CHAMPS_CONTRAT = Object.freeze([
  'type_contrat', 'compagnie', 'numero', 'prime_annuelle', 'date_effet', 'date_echeance',
]);

/**
 * Construit les données d'un contrat à écrire, par FUSION avec l'existant.
 *
 * POURQUOI une fusion et non un remplacement : un écran qui n'envoie que la
 * prime (correction ponctuelle) effaçait le numéro de police, les dates et le
 * type — le contrat devenait un devis anonyme dans les compteurs. Un champ non
 * transmis est CONSERVÉ ; un champ transmis vide remet la valeur à `null`
 * (l'appelant l'a demandé explicitement).
 *
 * @returns {{ok: boolean, erreur?: object, quoteData?: object, statut?: string, renouvele?: boolean}}
 */
function construireDonneesContrat(corps, existant) {
  const body = corps || {};
  const quoteData = { ...(existant.quote_data || {}) };

  for (const champ of CHAMPS_CONTRAT) {
    if (body[champ] === undefined) continue;
    quoteData[champ] = body[champ] === null ? null : body[champ];
  }

  const prime = nombreOuNull(quoteData.prime_annuelle);
  if (!prime.ok) {
    return {
      ok: false,
      erreur: {
        error: 'prime_invalide',
        // Motif nommé (`montant_non_numerique`, `montant_negatif`,
        // `montant_hors_plafond`) et message explicite : l'écran peut dire
        // POURQUOI la valeur est refusée, et la recette peut le vérifier.
        motif: prime.motif,
        message: prime.message || 'La prime annuelle doit être un nombre positif (ou vide).',
        champ: 'prime_annuelle',
        ...(prime.plafond ? { plafond: prime.plafond } : {}),
      },
    };
  }
  quoteData.prime_annuelle = prime.valeur;

  for (const champDate of ['date_effet', 'date_echeance']) {
    const date = dateOuNull(quoteData[champDate]);
    if (!date.ok) {
      return {
        ok: false,
        erreur: {
          error: 'date_invalide',
          message: `Le champ ${champDate} doit être une date réelle au format AAAA-MM-JJ (ou vide).`,
          champ: champDate,
        },
      };
    }
    quoteData[champDate] = date.valeur;
  }

  let statut = existant.status === undefined || existant.status === null
    ? 'actif'
    : String(existant.status);
  if (body.statut !== undefined && body.statut !== null && String(body.statut).trim() !== '') {
    const demande = String(body.statut).trim().toLowerCase();
    if (!STATUTS_CONTRAT_ACCEPTES.includes(demande)) {
      return {
        ok: false,
        erreur: {
          error: 'statut_inconnu',
          message: `« ${String(body.statut).trim()} » n'est pas un statut de contrat reconnu : rien n'a été modifié.`,
          statuts_acceptes: [...STATUTS_CONTRAT_ACCEPTES],
        },
      };
    }
    statut = demande;
  }

  // RENOUVELLEMENT : « la même police, un an de plus ».
  // Si une nouvelle échéance est fournie, c'est ELLE qui fait foi (le courtier
  // peut négocier une date différente) ; sinon elle est calculée (+1 an) et le
  // contrat redevient actif — un renouvellement qui laisserait le contrat
  // « resilie » serait un renouvellement sans effet.
  const renouvellement = body.renouvellement === true || body.renouveler === true;
  let renouvele = false;
  if (renouvellement) {
    const echeanceFournie = body.date_echeance !== undefined
      && body.date_echeance !== null
      && String(body.date_echeance).trim() !== '';
    if (!echeanceFournie) {
      const base = quoteData.date_echeance || quoteData.date_effet;
      if (!base) {
        return {
          ok: false,
          erreur: {
            error: 'echeance_introuvable',
            message: "Impossible de renouveler : le contrat n'a ni échéance ni date d'effet. Fournissez la nouvelle date_echeance.",
            champ: 'date_echeance',
          },
        };
      }
      quoteData.date_echeance = ajouterUnAn(base);
    }
    renouvele = true;
    if (body.statut === undefined) statut = 'actif';
  }

  return { ok: true, quoteData, statut, renouvele };
}

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
        ${montantSur('q')} as prime_annuelle,
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
        ${montantSur('q')} as prime_annuelle,
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
    const { client_id, statut } = req.body;

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

    const donnees = construireDonneesContrat(req.body, { status: statut, quote_data: {} });
    if (!donnees.ok) {
      return res.status(400).json(donnees.erreur);
    }
    const { quoteData } = donnees;

    // La prime et l'échéance sont écrites AUSSI dans les colonnes de `quotes` :
    // le bloc d'indicateurs (dashboard.js) lit la colonne EN PREMIER. Deux
    // emplacements divergents = un contrat dont la correction n'apparaît pas au
    // tableau de bord.
    const result = await pool.query(
      `INSERT INTO quotes (client_id, quote_data, status, prime_annuelle, date_echeance, broker_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [
        client_id, JSON.stringify(quoteData), donnees.statut || 'actif',
        quoteData.prime_annuelle ?? null, quoteData.date_echeance ?? null,
        portee.userId || req.user?.id || req.user?.userId || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/contrats error:', err.message);
    res.status(500).json({ error: 'contract_create_failed', message: 'Création du contrat impossible pour le moment.' });
  }
});

/**
 * Lit un contrat DANS LA PORTÉE de l'appelant.
 * Aucune règle métier n'est exécutée avant : une ressource hors périmètre ne
 * doit produire qu'un 404, sans le moindre indice (ni 403, ni 409).
 *
 * @returns {Promise<{existe: boolean, ligne?: object, filtreEcriture: object}>}
 */
async function lireContratDansPortee(pool, portee, id) {
  const filtreEcriture = filtreClientsDuContrat(portee, { depart: 2, ecriture: true });
  const { rows } = await pool.query(
    `SELECT q.id, q.client_id, q.status, q.quote_data
       FROM quotes q
       JOIN clients ON clients.id = q.client_id
      WHERE q.id = $1 AND ${filtreEcriture.sql}`,
    [id, ...filtreEcriture.params]
  );
  return { existe: rows.length > 0, ligne: rows[0], filtreEcriture };
}

/**
 * PUT /api/contrats/:id — Modifier un contrat (correction, résiliation, renouvellement)
 *
 * POURQUOI CETTE ROUTE ÉTAIT CASSÉE (production, 20/09/2026) : la clause de
 * portée était numérotée `depart: 3` alors que la requête utilisait déjà $1
 * (données), $2 (statut) et $3 (identifiant). Le fragment reprenait $3 pour le
 * cabinet : PostgreSQL recevait le MÊME paramètre comme entier et comme tableau
 * d'UUID — « impossible de déterminer le type du paramètre $3 » — donc 500 pour
 * toute modification de contrat. Un cabinet suisse ne pouvait plus corriger une
 * prime, résilier ni renouveler un contrat.
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const id = identifiantContrat(req.params.id);
    // Identifiant non numérique : la ressource ne peut pas exister.
    if (id === null) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier un contrat')) return;

    // 1) APPARTENANCE d'abord : 404 sec si le contrat n'est pas dans la portée.
    const { existe, ligne } = await lireContratDansPortee(pool, portee, id);
    if (!existe) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    // 2) RÈGLES MÉTIER : validation puis fusion avec l'existant.
    const donnees = construireDonneesContrat(req.body, ligne);
    if (!donnees.ok) {
      return res.status(400).json(donnees.erreur);
    }
    const { quoteData, statut } = donnees;

    const result = await pool.query(
      `UPDATE quotes
          SET quote_data = $1,
              status = $2,
              prime_annuelle = $3,
              date_echeance = $4
        WHERE id = $5
        RETURNING *`,
      [
        JSON.stringify(quoteData), statut,
        quoteData.prime_annuelle ?? null, quoteData.date_echeance ?? null, id,
      ]
    );

    if (result.rows.length === 0) {
      // Disparu entre la lecture et l'écriture : pas de faux succès.
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    res.json({
      ...result.rows[0],
      renouvele: donnees.renouvele === true,
    });
  } catch (err) {
    console.error('PUT /api/contrats/:id error:', err.message);
    res.status(500).json({ error: 'contract_update_failed', message: 'Mise à jour du contrat impossible pour le moment.' });
  }
});

/**
 * POST /api/contrats/:id/renouveler — Renouveler un contrat (échéance + 1 an).
 *
 * Route DÉDIÉE : le renouvellement est une opération récurrente du courtier
 * (échéance annuelle), elle mérite un point d'entrée qui dit ce qu'il fait au
 * lieu d'un PUT générique dont l'écran doit recalculer la date lui-même.
 * Corps optionnel : { date_echeance?, prime_annuelle?, statut? }.
 */
router.post('/:id/renouveler', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const id = identifiantContrat(req.params.id);
    if (id === null) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'renouveler un contrat')) return;

    const { existe, ligne } = await lireContratDansPortee(pool, portee, id);
    if (!existe) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    const donnees = construireDonneesContrat({ ...(req.body || {}), renouvellement: true }, ligne);
    if (!donnees.ok) {
      return res.status(400).json(donnees.erreur);
    }

    const { quoteData, statut } = donnees;
    const result = await pool.query(
      `UPDATE quotes
          SET quote_data = $1, status = $2,
              prime_annuelle = $3, date_echeance = $4
        WHERE id = $5
        RETURNING *`,
      [JSON.stringify(quoteData), statut, quoteData.prime_annuelle ?? null, quoteData.date_echeance ?? null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    res.json({
      success: true,
      renouvele: true,
      echeance_precedente: ligne.quote_data?.date_echeance ?? null,
      contrat: result.rows[0],
    });
  } catch (err) {
    console.error('POST /api/contrats/:id/renouveler error:', err.message);
    res.status(500).json({ error: 'contract_renew_failed', message: 'Renouvellement du contrat impossible pour le moment.' });
  }
});

/**
 * DELETE /api/contrats/:id — Supprimer un contrat
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const id = identifiantContrat(req.params.id);
    if (id === null) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    const portee = await porteeCabinet.resoudrePortee(pool, req);
    if (porteeCabinet.refuserSuppression(portee, res)) return;

    // 1) APPARTENANCE d'abord (404 sec). Sinon la réponse « ce contrat porte
    //    N commission(s) » confirmerait à un autre cabinet l'existence d'un
    //    contrat qu'il ne possède pas — et le code (409) serait faux pour lui.
    const { existe } = await lireContratDansPortee(pool, portee, id);
    if (!existe) {
      return res.status(404).json({ error: 'not_found', message: 'Contrat introuvable.' });
    }

    // 2) RÈGLE MÉTIER : un contrat qui porte des commissions ne peut pas
    //    disparaître en silence : la clé étrangère `commissions.contract_id →
    //    quotes(id)` (migration 114) refuse la suppression du parent. On répond
    //    un refus EXPLICITE (409) avec le nombre de commissions rattachées,
    //    plutôt que de laisser PostgreSQL produire un 500 illisible — et sans
    //    jamais détruire une ligne comptable.
    const commissions = await pool.query(
      'SELECT COUNT(*)::int AS nombre FROM commissions WHERE contract_id = $1',
      [id]
    ).catch(() => ({ rows: [{ nombre: 0 }] }));
    const nombreCommissions = (commissions.rows[0] && commissions.rows[0].nombre) || 0;
    if (nombreCommissions > 0) {
      return res.status(409).json({
        error: 'contract_has_commissions',
        commissions: nombreCommissions,
        message: `Ce contrat porte ${nombreCommissions} commission(s) : supprimez-les ou annulez-le (statut) au lieu de le supprimer.`,
      });
    }

    const supprime = await pool.query('DELETE FROM quotes WHERE id = $1', [id]);
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
