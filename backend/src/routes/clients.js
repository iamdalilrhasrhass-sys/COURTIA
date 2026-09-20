const express = require('express');
const pool = require('../db');
// Alias NON masqué par les `const pool = req.app.locals.pool` des gestionnaires :
// la résolution de portée doit passer par le module `../db` (le même pool en
// production ; l'objet simulé par les tests pour la portée).
const poolModule = pool;
const router = express.Router();
const { calculateRiskScore } = require('../utils/riskCalculator');
const { requireUnderLimit } = require('../middleware/planGuard');
const { getUserPlanInfo } = require('../services/planService');
const { getClientScoreBreakdown } = require('../services/portfolioAnalyzer');
const { listClientInteractions } = require('../services/integrationsStore');
const porteeCabinet = require('../lib/porteeCabinet');
const cabinetMembershipService = require('../services/cabinetMembershipService');
// Bloc unique des définitions d'indicateurs (contrat, prime, échéance) : la
// « prime annuelle d'un client » doit être le même calcul que la « prime
// annuelle totale » du tableau de bord, sinon la liste Clients affiche « — »
// pendant que le tableau de bord affiche 1 450 CHF (défaut reproduit en
// production le 20/09/2026).
const { kpi } = require('./dashboard');
const Anthropic = require('@anthropic-ai/sdk');

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES CLIENTS : LE CABINET, PAS L'UTILISATEUR
//
// POURQUOI : `clients.courtier_id` identifiait UN utilisateur. Un collaborateur
// invité (rôle broker) dans un cabinet voyait donc 0 client quand le
// propriétaire en voyait 1 — un cabinet à plusieurs commerciaux n'avait pas de
// CRM commun (défaut reproduit en production le 20/09/2026). La lecture et
// l'écriture sont désormais bornées au CABINET (migration 113,
// `clients.cabinet_id`), `courtier_id` restant le courtier en charge du dossier.
// Un utilisateur sans cabinet garde exactement l'ancien comportement : il ne
// voit que ses propres lignes (voir lib/porteeCabinet.js).
// ─────────────────────────────────────────────────────────────────────────────

// Portée SQL sur la table `clients` (lecture OU écriture selon `ecriture`).
// `alias` permet de réutiliser la même portée dans une jointure (`c`, `cli`…).
function filtreClients(portee, { depart = 1, ecriture = false, alias = 'clients' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.courtier_id`,
    depart,
    ecriture,
  });
}

/**
 * Identifiant numérique strict.
 * POURQUOI : `GET /api/clients/duplicates` tombait dans `GET /api/clients/:id`
 * et PostgreSQL répondait « invalid input syntax for type integer: "duplicates" »
 * — un 500 pour une entrée invalide. Un identifiant qui n'est pas un entier ne
 * peut désigner AUCUN client : la réponse est un 404 (et une route inexistante
 * reçoit le 404 du routeur, plus jamais une erreur de base).
 */
function identifiantClient(valeur) {
  const texte = String(valeur ?? '').trim();
  return /^\d+$/.test(texte) ? Number(texte) : null;
}

/**
 * Le cabinet de l'utilisateur existe-t-il ? Sinon, le créer MAINTENANT.
 *
 * POURQUOI : un compte ouvert par l'exploitant (invitation d'essai) n'a aucune
 * appartenance tant qu'il n'a pas visité les écrans Équipe / Onboarding. Ses
 * clients étaient donc créés avec `cabinet_id = NULL`, et le jour où un
 * collaborateur était invité dans ce cabinet, il ne voyait RIEN du portefeuille
 * déjà saisi (défaut reproduit en production le 20/09/2026 : les 3 clients du
 * cabinet d'audit A étaient invisibles pour le broker invité). Le cabinet naît
 * donc à la PREMIÈRE donnée métier écrite, avec le nom déjà saisi par le
 * cabinet (`users.cabinet_name`) — aucune donnée n'est inventée.
 *
 * Une panne de création ne doit pas empêcher l'enregistrement du client : on
 * retombe alors sur le comportement historique (cabinet_id NULL), sans jamais
 * prétendre le contraire.
 */
async function garantirCabinet(pool, utilisateur) {
  try {
    const userId = porteeCabinet.identifiantUtilisateur(utilisateur);
    if (!userId) return null;
    const { rows } = await pool.query('SELECT cabinet_name FROM users WHERE id = $1', [userId]);
    const nom = rows[0] && rows[0].cabinet_name;
    return await cabinetMembershipService.ensureUserCabinet(pool, userId, nom ? { cabinet: nom } : {});
  } catch (err) {
    console.error('[clients] création du cabinet impossible:', err.message);
    return null;
  }
}

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
          WHERE q.client_id = clients.id AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        ) AS contracts_count,
        (
          -- « Prime annuelle du client » = somme de la prime de ses contrats
          -- ACTIFS, avec l'expression de prime définie UNE fois (kpi.PRIME_CONTRAT :
          -- colonne prime_annuelle, sinon quote_data, sinon premium/amount).
          -- L'ancienne expression ne lisait que quote_data : un contrat dont la
          -- prime est dans la colonne comptait pour 0.
          -- COALESCE(...,0) est conservé : 0 est ici une VALEUR EXACTE (aucune
          -- prime à sommer) et empêche la liste de retomber sur lifetime_value
          -- comme le fait le front quand le champ est absent.
          SELECT COALESCE(SUM(${kpi.PRIME_CONTRAT}), 0)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        ) AS prime_totale,
        (
          -- Nom lu par la liste Clients (front : prime_annuelle_total ?? total_prime
          -- ?? portfolio_value) : même valeur, pour que l'écran n'affiche plus
          -- « — » là où le tableau de bord affiche un montant.
          SELECT COALESCE(SUM(${kpi.PRIME_CONTRAT}), 0)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        ) AS prime_annuelle_total,
        (
          -- Prochaine échéance : même définition d'échéance que partout ailleurs.
          SELECT MIN(${kpi.ECHEANCE_CONTRAT})
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
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
 *
 * `cabinetIds` absent ou vide ⇒ portée mono-utilisateur (`courtier_id = $1`),
 * c'est-à-dire exactement la requête historique.
 */
function construireRequeteListeClients({
  userId,
  cabinetIds,
  search,
  statut,
  segment,
  sort,
  direction,
  limit,
  offset,
  unaccentDisponible = false,
} = {}) {
  const portee = porteeCabinet.fragment(
    { userId, cabinetIds: Array.isArray(cabinetIds) ? cabinetIds : [] },
    { cabinet: 'clients.cabinet_id', proprietaire: 'clients.courtier_id', depart: 1 }
  )
  const clauses = [portee.sql]
  const paramsFiltre = [...portee.params]
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
    // La portée est résolue depuis `cabinet_members` (module `../db` : c'est le
    // même pool en production, et cela garde `req.app.locals.pool` — celui sur
    // lequel les tests comptent — réservé aux requêtes métier).
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const userId = portee.userId || req.user?.id || req.user?.userId;
    const limit = parseInt(req.query.limit) || 20;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const unaccentOk = await detecterUnaccent(pool);
    const requete = construireRequeteListeClients({
      userId,
      cabinetIds: portee.cabinetIds,
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
        // La portée appliquée est ANNONCÉE : le client de l'API peut vérifier
        // qu'une réponse vide vient d'un cabinet réellement vide, et non d'un
        // filtre resté sur l'utilisateur.
        portee: portee.mode === 'cabinet' ? 'cabinet' : 'utilisateur',
        role: portee.role || null,
      },
    });
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Regroupe des clients en DOUBLONS RÉELS (aucune donnée inventée : chaque ligne
 * rendue vient de la base).
 *
 * Trois familles de rapprochement, celles qui font perdre un dossier au
 * courtier : même nom + prénom (accents et casse repliés), même e-mail, même
 * numéro de téléphone (chiffres seuls, pour que « +41 79 123 45 67 » et
 * « 0791234567 » se rejoignent). Deux clients liés par N'IMPORTE laquelle de
 * ces clés sont dans le même groupe.
 *
 * @param {Array<object>} lignes lignes `clients` de la portée de l'appelant
 * @param {string} terme filtre optionnel (nom, prénom, e-mail, téléphone)
 */
function grouperDoublonsClients(lignes, terme) {
  const cle = (valeur) => normaliserTexteClient(valeur);
  // Clé de NOM : la ponctuation du nom est retirée (« Müller-d'Arc » et
  // « Muller d Arc » doivent se rejoindre — c'est exactement le doublon que le
  // courtier ne voit pas). Un tiret ou une apostrophe ne fait pas deux clients.
  const cleNom = (valeur) => normaliserTexteClient(valeur).replace(/[^a-z0-9]+/g, '');
  const chiffres = (valeur) => String(valeur ?? '').replace(/\D/g, '');

  const parent = new Map();
  const trouver = (id) => {
    let racine = id;
    while (parent.get(racine) !== racine) racine = parent.get(racine);
    return racine;
  };
  const unir = (a, b) => {
    const ra = trouver(a);
    const rb = trouver(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  const raisons = new Map(); // id -> Set des familles qui l'ont rapproché
  const parCle = new Map();  // `famille|clé` -> premier id

  for (const ligne of lignes) {
    const id = Number(ligne.id);
    parent.set(id, id);
    raisons.set(id, new Set());

    const nom = cleNom([ligne.last_name || ligne.nom, ligne.first_name || ligne.prenom].filter(Boolean).join(' '));
    const email = cle(ligne.email);
    const telephone = chiffres(ligne.phone || ligne.telephone || ligne.mobile);
    const candidats = [
      ['nom', nom],
      ['email', email],
      // Un numéro trop court (poste interne, indicatif seul) ne rapproche rien :
      // exiger 8 chiffres évite de fusionner deux dossiers sur un « 0 » commun.
      ['telephone', telephone.length >= 8 ? telephone.slice(-9) : ''],
    ];

    for (const [famille, valeur] of candidats) {
      if (!valeur) continue;
      const index = `${famille}|${valeur}`;
      if (parCle.has(index)) {
        const autre = parCle.get(index);
        unir(autre, id);
        raisons.get(autre)?.add(famille);
        raisons.get(id)?.add(famille);
      } else {
        parCle.set(index, id);
      }
    }
  }

  const parRacine = new Map();
  for (const ligne of lignes) {
    const id = Number(ligne.id);
    const racine = trouver(id);
    if (!parRacine.has(racine)) parRacine.set(racine, []);
    parRacine.get(racine).push(ligne);
  }

  const termeCherche = normaliserTexteClient(terme);
  const groupes = [];
  for (const membres of parRacine.values()) {
    if (membres.length < 2) continue;
    if (termeCherche) {
      const correspond = membres.some((m) => normaliserTexteClient(
        [m.first_name, m.last_name, m.nom, m.prenom, m.email, m.phone, m.telephone, m.mobile]
          .filter(Boolean).join(' ')
      ).includes(termeCherche));
      if (!correspond) continue;
    }
    const familles = new Set();
    for (const membre of membres) {
      for (const famille of raisons.get(Number(membre.id)) || []) familles.add(famille);
    }
    groupes.push({
      raisons: [...familles].sort(),
      clients: membres.map((m) => ({
        id: m.id,
        prenom: m.first_name || m.prenom || '',
        nom: m.last_name || m.nom || '',
        email: m.email || '',
        telephone: m.phone || m.telephone || m.mobile || '',
        ville: m.city || '',
        code_postal: m.postal_code || '',
        statut: m.status || '',
      })),
    });
  }

  // Les groupes les plus gros d'abord : ce sont ceux qui coûtent le plus cher.
  return groupes.sort((a, b) => b.clients.length - a.clients.length);
}

/**
 * GET /api/clients/duplicates — Clients en doublon dans le portefeuille.
 *
 * POURQUOI CETTE ROUTE : elle était absente et la requête tombait dans
 * `GET /api/clients/:id`, qui rendait un 500 « invalid input syntax for type
 * integer: "duplicates" » — l'écran ne pouvait ni détecter un doublon ni
 * comprendre l'erreur. Filtres optionnels : `nom`, `prenom`, `email`,
 * `telephone` (ou `q`) restreignent aux groupes contenant ce terme.
 */
router.get('/duplicates', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const f = filtreClients(portee, { depart: 1 });

    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, nom, prenom, email, phone, telephone, mobile,
              postal_code, city, status, created_at
         FROM clients
        WHERE ${f.sql}
        ORDER BY created_at ASC
        LIMIT 5000`,
      [...f.params]
    );

    const terme = req.query.q ?? req.query.nom ?? req.query.prenom ?? req.query.email ?? req.query.telephone;
    const groupes = grouperDoublonsClients(rows, terme);

    return res.json({
      success: true,
      data: groupes,
      total: groupes.reduce((somme, groupe) => somme + groupe.clients.length, 0),
      groupes: groupes.length,
      // Ce que la détection regarde, dit explicitement : l'appelant sait sur
      // quoi un dossier a été rapproché d'un autre.
      criteres: ['nom+prenom (accents et casse repliés)', 'email', 'telephone (chiffres seuls)'],
      portee: portee.mode === 'cabinet' ? 'cabinet' : 'utilisateur',
    });
  } catch (err) {
    console.error('GET /api/clients/duplicates error:', err.message);
    res.status(500).json({ error: 'duplicates_unavailable', message: 'Détection des doublons indisponible pour le moment.' });
  }
});

/**
 * GET /api/clients/:id/tags — Tags réellement associés à un client.
 *
 * POURQUOI : `POST` et `DELETE` d'association existaient (`/api/clients/:id/tags`)
 * mais aucune lecture : l'écran ne pouvait pas afficher les tags qu'il venait de
 * poser. Les lignes rendues viennent toutes de `client_tags` (aucun tag inventé) ;
 * un client sans tag rend une liste vide, pas une erreur.
 */
router.get('/:id/tags', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const clientId = identifiantClient(req.params.id);
    if (clientId === null) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const f = filtreClients(portee, { depart: 2 });

    const client = await pool.query(
      `SELECT id FROM clients WHERE id = $1 AND ${f.sql}`,
      [clientId, ...f.params]
    );
    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }

    const { rows } = await pool.query(
      `SELECT ct.tag_id AS id, COALESCE(t.name, ct.tag, '') AS name,
              COALESCE(t.color, '') AS color, ct.created_at
         FROM client_tags ct
         LEFT JOIN tags t ON t.id = ct.tag_id
        WHERE ct.client_id = $1
        ORDER BY ct.created_at ASC`,
      [clientId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/clients/:id/tags error:', err.message);
    res.status(500).json({ error: 'tags_unavailable', message: 'Tags du client indisponibles pour le moment.' });
  }
});

/**
 * GET /api/clients/:id — Récupérer un client par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const clientId = identifiantClient(req.params.id);
    // Un identifiant non numérique ne peut désigner aucun client : 404 (et non
    // un 500 SQL « invalid input syntax for type integer »).
    if (clientId === null) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    // Le client doit appartenir au CABINET de l'utilisateur (404 sinon : un 403
    // révélerait l'existence du client d'un autre cabinet).
    const f = filtreClients(portee, { depart: 2 });
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
      FROM clients WHERE id = $1 AND ${f.sql}`,
      [clientId, ...f.params]
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
    const portee = await porteeCabinet.resoudrePortee(poolModule, req)
    const f = filtreClients(portee, { depart: 2, alias: 'c' })
    const result = await pool.query(
      `SELECT q.id,
              q.client_id,
              q.status,
              q.status as statut,
              q.quote_data->>'type_contrat' as type_contrat,
              q.quote_data->>'compagnie' as compagnie,
              q.quote_data->>'numero' as numero,
              -- Prime : même expression que le tableau de bord et la liste
              -- (colonne prime_annuelle, sinon quote_data, sinon premium/amount).
              ${kpi.PRIME_CONTRAT} as prime_annuelle,
              NULLIF(q.quote_data->>'date_effet', '')::date as date_effet,
              ${kpi.ECHEANCE_CONTRAT} as date_echeance
       FROM quotes q
       JOIN clients c ON q.client_id = c.id AND ${f.sql}
       WHERE q.client_id = $1
       ORDER BY ${kpi.ECHEANCE_CONTRAT} ASC NULLS LAST`,
      [req.params.id, ...f.params]
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
    const portee = await porteeCabinet.resoudrePortee(poolModule, req)
    const userId = portee.userId || req.user.id
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 300)

    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'invalid_client_id' })
    }

    // Lecture d'un client du CABINET (l'historique d'interactions reste, lui,
    // celui du courtier qui a réalisé l'échange : c'est une trace, pas un
    // document partagé).
    const fClient = filtreClients(portee, { depart: 2 })
    const ownResult = await pool.query(
      `SELECT id FROM clients WHERE id = $1 AND ${fClient.sql} LIMIT 1`,
      [clientId, ...fClient.params]
    )

    if (!ownResult.rowCount) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }

    const [storedInteractions, taskRows, contractRows] = await Promise.all([
      listClientInteractions(pool, userId, clientId, { limit }),
      pool.query(
        `SELECT id, title, status, start_time, created_at
         FROM appointments
         WHERE client_id = $1 AND COALESCE(user_id, organizer_id) = $2
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
    // Un assistant ou un viewer lit tout le cabinet mais ne crée rien : ce
    // refus est prononcé AVANT toute écriture annexe (aucun cabinet créé pour
    // un rôle en lecture seule).
    let portee = await porteeCabinet.resoudrePortee(poolModule, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un client')) return;

    // Aucun cabinet connu (compte ouvert par l'exploitant, jamais passé par
    // l'écran Équipe) : il naît MAINTENANT pour que ce premier client soit
    // rattaché au cabinet — sans quoi il resterait invisible pour un
    // collaborateur invité plus tard. On relit la portée ensuite : c'est elle
    // qui estampille la ligne.
    if (portee.mode !== 'cabinet') {
      await garantirCabinet(poolModule, req.user);
      delete req._porteeCabinet;
      delete req._porteeCabinetPromesse;
      portee = await porteeCabinet.resoudrePortee(poolModule, req);
    }

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
       postal_code, city, civility, country, courtier_id, cabinet_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut || 'prospect', segment || 'particulier',
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country,
        // courtier_id = le courtier CRÉATEUR (affectation commerciale) ;
        // cabinet_id = le tenant (null pour un cabinet mono-utilisateur).
        portee.userId || req.user.id,
        porteeCabinet.cabinetPourCreation(portee)
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
    const clientId = identifiantClient(req.params.id);
    // Un identifiant non numérique ne peut désigner aucun client : 404, jamais
    // un 500 SQL.
    if (clientId === null) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier un client')) return;
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

    // La portée d'écriture reprend EXACTEMENT la portée de lecture : un membre
    // du cabinet modifie un dossier du cabinet ; un client d'un autre cabinet
    // ne matche aucune ligne et reçoit 404 (jamais 403).
    const fEcriture = filtreClients(portee, { depart: 21, ecriture: true });
    const result = await pool.query(
      `UPDATE clients SET
       first_name = $1, last_name = $2, email = $3, phone = $4,
       address = $5, status = $6, type = $7, risk_score = $8,
       notes = $9, bonus_malus = $10, annees_permis = $11,
       nb_sinistres_3ans = $12, zone_geographique = $13,
       profession = $14, situation_familiale = $15,
       postal_code = $16, city = $17, civility = $18, country = $19,
       updated_at = NOW()
      WHERE id = $20 AND ${fEcriture.sql} RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut, segment,
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.params.id, ...fEcriture.params
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
    const clientId = identifiantClient(req.params.id);
    if (clientId === null) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' });
    }
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    if (porteeCabinet.refuserSuppression(portee, res)) return;
    // La suppression ne renvoie un succès QUE si une ligne a réellement été
    // supprimée : un `{success:true}` sans suppression est un faux succès (le
    // client reste, et l'appelant croit l'avoir supprimé).
    const f = filtreClients(portee, { depart: 2, ecriture: true });
    const supprime = await pool.query(
      `DELETE FROM clients WHERE id = $1 AND ${f.sql}`,
      [clientId, ...f.params]
    );
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
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const courtierId = portee.userId || req.user.id;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Le client est-il dans le CABINET de l'appelant ? Si oui, l'analyse porte
    // sur le dossier de son courtier en charge (le score récompense le suivi
    // commercial de CE dossier, pas celui du lecteur).
    const f = filtreClients(portee, { depart: 2 });
    const proprietaire = await poolModule.query(
      `SELECT courtier_id FROM clients WHERE id = $1 AND ${f.sql} LIMIT 1`,
      [clientId, ...f.params]
    ).catch(() => ({ rows: [] }));
    if (!proprietaire.rows[0]) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }
    const courtierDuDossier = proprietaire.rows[0].courtier_id || courtierId;

    const [planInfo, breakdown] = await Promise.all([
      getUserPlanInfo(courtierId),
      getClientScoreBreakdown(clientId, courtierDuDossier),
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
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const courtierId = portee.userId || req.user.id;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Contrôle de portée CABINET (et non plus de propriété utilisateur) : le
    // dossier doit appartenir au cabinet de l'appelant.
    const fPortee = filtreClients(portee, { depart: 2 });
    const dossier = await poolModule.query(
      `SELECT courtier_id FROM clients WHERE id = $1 AND ${fPortee.sql} LIMIT 1`,
      [clientId, ...fPortee.params]
    ).catch(() => ({ rows: [] }));
    if (!dossier.rows[0]) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }
    const courtierDuDossier = dossier.rows[0].courtier_id || courtierId;

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
    const breakdown = await getClientScoreBreakdown(clientId, courtierDuDossier);
    if (!breakdown) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }

    // Données client pour le contexte
    const clientRes = await pool.query(
      `SELECT first_name, last_name, email, phone, profession,
              situation_familiale, address, created_at, notes
       FROM clients WHERE id = $1 AND ${fPortee.sql}`,
      [clientId, ...fPortee.params]
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
    const portee = await porteeCabinet.resoudrePortee(poolModule, req);
    const courtierId = portee.userId || req.user.userId;
    const clientId   = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Vérifier l'accès : portée CABINET (le client du collègue du même cabinet
    // est légitime pour une analyse de portefeuille).
    const fCross = filtreClients(portee, { depart: 2 });
    const cliRes = await pool.query(
      `SELECT id, first_name, last_name, type, status, profession, situation_familiale, lifetime_value
       FROM clients WHERE id=$1 AND ${fCross.sql}`, [clientId, ...fCross.params]);
    if (!cliRes.rows[0]) return res.status(404).json({ error: 'Client non trouvé' });
    const client = cliRes.rows[0];

    // Produits existants
    let produitsExistants = [];
    try {
      const qr = await pool.query(
        `SELECT DISTINCT LOWER(COALESCE(quote_data->>'type_contrat','')) AS produit
         FROM quotes WHERE client_id=$1 AND status IN ${kpi.STATUTS_CONTRAT_ACTIF}`, [clientId]);
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
