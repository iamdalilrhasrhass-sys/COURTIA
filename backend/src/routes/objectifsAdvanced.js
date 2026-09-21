/**
 * LOT F5 — Objectifs & Commissions gamifiés
 * Endpoints :
 *   GET  /api/objectifs/current        → objectif annuel courant + progression
 *   POST /api/objectifs/set            → définir/maj objectif annuel
 *   GET  /api/commissions/dashboard    → décomposition commissions (par courtier/compagnie/produit/mois)
 *   GET  /api/objectifs/ranking        → ranking équipe avec badges gamification
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const porteeCabinet = require('../lib/porteeCabinet')
const pool = require('../db')
const { messagePublic } = require('../lib/erreursPubliques')

// CORRECTION 2026-09-19 : ce routeur est monte sur '/api' (server.js:435) et
// appliquait verifyToken a TOUT ce qui passe par ce prefixe. Consequence mesuree :
// toute requete /api/* non traitee plus haut renvoyait 401 « Token manquant » au
// lieu d'un 404 — c'est ainsi que GET /api/sales/leads (lecture des leads dans le
// produit) echouait en 401, et tout routeur public monte APRES cette ligne etait
// rendu inatteignable. La garde ne couvre plus que les routes qui appartiennent
// reellement a ce routeur.
const PREFIXES_PROTEGES = [/^\/objectifs(\/|$)/, /^\/commissions(\/|$)/]
router.use((req, res, next) =>
  PREFIXES_PROTEGES.some((motif) => motif.test(req.path)) ? verifyToken(req, res, next) : next()
)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

// ─── Objectifs ───────────────────────────────────────────────────────
router.get('/objectifs/current', async (req, res) => {
  try {
    const userId = uid(req)
    const year = new Date().getFullYear()

    const { rows } = await pool.query(`
      SELECT * FROM objectifs WHERE user_id = $1 AND year = $2
    `, [userId, year])

    // Aucun objectif enregistré ⇒ on n'en invente pas. Avant, une ligne
    // fictive (120 000 € de CA, 60 clients, 80 contrats, 36 000 € de
    // commissions) était servie comme les objectifs du cabinet : la barre de
    // progression comparait donc le réel à des cibles qui n'avaient jamais été
    // fixées. On renvoie des cibles nulles et `objectif_defini: false`.
    const obj = rows[0] || null
    const objectifDefini = Boolean(obj)
    const cible = (valeur) => (objectifDefini ? Number(valeur || 0) : null)
    const pourcentage = (actuel, cibleValeur) =>
      (cibleValeur && Number(cibleValeur) > 0 ? Math.round((Number(actuel || 0) / Number(cibleValeur)) * 100) : 0)

    // Calcule progression réelle
    const { rows: progress } = await pool.query(`
      SELECT
        COALESCE((SELECT COUNT(*) FROM clients WHERE courtier_id = $1 AND created_at >= $2), 0) AS new_clients,
        COALESCE((SELECT COUNT(*) FROM quotes WHERE client_id IN (SELECT id FROM clients WHERE courtier_id = $1) AND created_at >= $2), 0) AS new_contracts,
        COALESCE((SELECT SUM(lifetime_value)*100 FROM clients WHERE courtier_id = $1), 0)::bigint AS ca_cents
    `, [userId, `${year}-01-01`])

    const p = progress[0] || {}
    return res.json({
      ok: true,
      objectif: obj,
      objectif_defini: objectifDefini,
      ...(objectifDefini ? {} : {
        message: "Aucun objectif n'est enregistré pour cette année. Définissez vos cibles : rien n'est affiché par défaut.",
      }),
      progression: {
        ca: {
          current_cents: Number(p.ca_cents || 0),
          target_cents: cible(obj?.ca_target_cents),
          pct: pourcentage(p.ca_cents, obj?.ca_target_cents),
        },
        new_clients: {
          current: Number(p.new_clients || 0),
          target: objectifDefini ? Number(obj?.new_clients_target || 0) : null,
          pct: pourcentage(p.new_clients, obj?.new_clients_target),
        },
        new_contracts: {
          current: Number(p.new_contracts || 0),
          target: objectifDefini ? Number(obj?.new_contracts_target || 0) : null,
          pct: pourcentage(p.new_contracts, obj?.new_contracts_target),
        },
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'objectifs_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

// Cibles reconnues par cette route. Toute autre clé est REFUSÉE (400) : avant ce
// correctif, `{"annee":2026,"ca_cible":250000}` répondait 200 `ok:true` alors que
// rien de demandé n'était enregistré (les cibles étaient même remises à 0).
const CIBLES_OBJECTIF = Object.freeze([
  'ca_target_cents',
  'new_clients_target',
  'new_contracts_target',
  'commissions_target_cents',
])
const CLES_ACCEPTEES_OBJECTIF = Object.freeze(['year', ...CIBLES_OBJECTIF])

router.post('/objectifs/set', async (req, res) => {
  try {
    const userId = uid(req)
    const corps = req.body || {}

    // ─────────────────────────────────────────────────────────────────────────
    // P3 — UN CHAMP INCONNU N'EST JAMAIS IGNORÉ EN SILENCE (mesuré le 20/09/2026)
    //
    // DÉFAUT 1 : tous les champs hors des quatre cibles étaient ignorés sans un
    // mot, et la route répondait `200 {ok:true}`. Un appelant qui envoyait
    // `{"annee":2026,"ca_cible":250000,"clients_cible":40}` croyait avoir fixé
    // 250 000 de CA : la base contenait 0. Une réponse de succès pour une
    // écriture qui n'a pas eu lieu est un faux succès.
    // DÉFAUT 2 : les champs ABSENTS étaient écrits à 0 (`EXCLUDED`), donc une
    // mise à jour partielle (« change seulement la cible de CA ») remettait les
    // trois autres cibles à zéro.
    //
    // CORRECTIF : 400 nommant les champs non reconnus et la liste des noms
    // acceptés ; et l'écriture ne touche QUE les cibles réellement transmises.
    // ─────────────────────────────────────────────────────────────────────────
    const clesInconnues = Object.keys(corps).filter((cle) => !CLES_ACCEPTEES_OBJECTIF.includes(cle))
    if (clesInconnues.length > 0) {
      return res.status(400).json({
        error: 'champ_inconnu',
        message: `Champ(s) non reconnu(s) : ${clesInconnues.join(', ')}. `
          + `Noms acceptés : ${CLES_ACCEPTEES_OBJECTIF.join(', ')}. Aucune cible n'a été enregistrée.`,
        champs: clesInconnues,
        champs_acceptes: [...CLES_ACCEPTEES_OBJECTIF],
      })
    }

    const anneeBrute = corps.year
    const year = anneeBrute === undefined || anneeBrute === null || anneeBrute === ''
      ? new Date().getFullYear()
      : Number.parseInt(anneeBrute, 10)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        error: 'annee_invalide',
        message: "L'année transmise n'est pas valide (attendue entre 2000 et 2100). Aucune cible n'a été enregistrée.",
        champs: ['year'],
      })
    }

    const colonnes = CIBLES_OBJECTIF.filter((colonne) => corps[colonne] !== undefined)
    if (colonnes.length === 0) {
      return res.status(400).json({
        error: 'aucune_cible',
        message: `Aucune cible transmise. Noms acceptés : ${CIBLES_OBJECTIF.join(', ')}.`,
        champs_acceptes: [...CIBLES_OBJECTIF],
      })
    }

    const valeurs = []
    for (const colonne of colonnes) {
      const valeur = Number(corps[colonne])
      if (!Number.isFinite(valeur) || valeur < 0) {
        return res.status(400).json({
          error: 'valeur_invalide',
          message: `La cible « ${colonne} » doit être un nombre positif ou nul. Aucune cible n'a été enregistrée.`,
          champs: [colonne],
        })
      }
      valeurs.push(Math.round(valeur))
    }

    // Seules les colonnes transmises figurent dans l'INSERT et dans le UPDATE :
    // une cible absente du corps de la requête n'est jamais remise à zéro.
    const emplacements = colonnes.map((_, index) => `$${index + 3}`).join(', ')
    const majPartielle = colonnes.map((colonne) => `${colonne} = EXCLUDED.${colonne}`).join(',\n          ')

    const { rows } = await pool.query(`
      INSERT INTO objectifs (user_id, year, ${colonnes.join(', ')})
      VALUES ($1, $2, ${emplacements})
      ON CONFLICT (user_id, year) DO UPDATE
      SET ${majPartielle},
          updated_at = NOW()
      RETURNING *
    `, [userId, year, ...valeurs])

    res.json({ ok: true, objectif: rows[0], cibles_mises_a_jour: colonnes })
  } catch (err) {
    // Aucun message SQL brut dans la réponse.
    res.status(500).json({
      error: 'set_failed',
      message: "L'enregistrement des objectifs a échoué. Aucune cible n'a été modifiée.",
    })
  }
})

// ─── Commissions dashboard ───────────────────────────────────────────
router.get('/commissions/dashboard', async (req, res) => {
  try {
    const userId = uid(req)
    const year = Number(req.query.year || new Date().getFullYear())

    // Les KPI se calculent sur les commissions RÉELLEMENT enregistrées (table
    // `commissions`). Avant, chaque ligne valait prime × 12 % codé en dur, avec
    // une prime par défaut de 600 € inventée quand le contrat n'en avait pas :
    // l'écran affichait donc des commissions qui n'existaient nulle part.
    const montant = (alias) => `COALESCE(NULLIF(${alias}.received_amount_cents, 0), ${alias}.expected_amount_cents, 0)`

    const { rows: byProduct } = await pool.query(`
      SELECT
        COALESCE(NULLIF(q.quote_data->>'produit', ''), NULLIF(q.quote_data->>'type_contrat', ''), 'Non renseigné') AS product,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      LEFT JOIN quotes q ON q.id = co.contract_id
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY product
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const { rows: byCompany } = await pool.query(`
      SELECT
        COALESCE(NULLIF(co.insurer, ''), 'Non renseigné') AS provider,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY provider
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const { rows: byMonth } = await pool.query(`
      SELECT
        TO_CHAR(MAKE_DATE(co.period_year, co.period_month, 1), 'YYYY-MM') AS month,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY month
      ORDER BY month ASC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const total = byProduct.reduce((s, r) => s + Number(r.commission_eur || 0), 0)
    const nbLignes = byProduct.reduce((s, r) => s + Number(r.count || 0), 0)

    res.json({
      ok: true, year,
      source: 'commissions',
      has_data: nbLignes > 0,
      ...(nbLignes === 0
        ? { message: 'Aucune commission enregistrée pour cette année : rien à afficher.' }
        : {}),
      total_eur: Math.round(total),
      by_product: byProduct.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
      by_company: byCompany.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
      by_month: byMonth.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
    })
  } catch (err) {
    res.status(500).json({ error: 'commissions_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

// ─── Ranking équipe ──────────────────────────────────────────────────
//
// POURQUOI CETTE ROUTE A ÉTÉ RÉÉCRITE (défaut P0 du 20/09/2026)
// Elle lisait `SELECT id, cabinet_id FROM users` : `users.cabinet_id` N'EXISTE
// PAS (vérifiable dans information_schema). La requête échouait donc toujours,
// et son `.catch(() => ({ rows: [] }))` transformait l'erreur SQL en résultat
// vide : `cabinetId` restait indéfini, la clause `WHERE u.cabinet_id = $1`
// n'était jamais ajoutée, et la requête suivante partait SANS AUCUN FILTRE.
// Conséquence mesurée : N'IMPORTE QUEL compte authentifié recevait les 20
// premiers utilisateurs de la plateforme — nom, e-mail, volumes clients et
// contrats — y compris les deux comptes pilotes. Un catch ne doit JAMAIS
// pouvoir élargir une portée : ici la portée vient de lib/porteeCabinet.js
// (le cabinet, ou l'utilisateur lui-même s'il n'a pas de cabinet), et une erreur
// SQL remonte en 500 plutôt que d'être servie comme un classement.
router.get('/objectifs/ranking', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (!portee.estAuthentifie) {
      return res.status(401).json({ error: 'auth_required' })
    }

    // Portée CABINET : uniquement les membres actifs du cabinet courant. Pour un
    // compte sans cabinet (repli mono-utilisateur), le classement ne contient que
    // lui-même — jamais « tout le monde ».
    const membreDuCabinet = `u.id IN (SELECT cm.user_id FROM cabinet_members cm
                                       WHERE cm.cabinet_id = $1 AND cm.removed_at IS NULL)`
    const filtres = portee.mode === 'cabinet' && portee.cabinetId
      ? { sql: membreDuCabinet, params: [portee.cabinetId] }
      : { sql: 'u.id = $1', params: [portee.userId] }

    const teamQuery = `
      SELECT u.id, u.email, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM clients WHERE courtier_id = u.id) AS clients_count,
        (SELECT COUNT(*) FROM quotes q JOIN clients c ON c.id = q.client_id WHERE c.courtier_id = u.id) AS quotes_count,
        (SELECT COALESCE(SUM(lifetime_value),0)*100 FROM clients WHERE courtier_id = u.id) AS ca_cents
      FROM users u
      WHERE ${filtres.sql}
      ORDER BY ca_cents DESC LIMIT 20`

    // Aucun `.catch` de repli : une erreur SQL doit être visible (500), jamais
    // convertie en « requête sans filtre ».
    const { rows: team } = await pool.query(teamQuery, filtres.params)

    // Badges (gamification_badges si remplie) : le repli est un tableau VIDE, il
    // ne peut donc pas élargir la réponse — un badge manquant n'est pas une fuite.
    const { rows: badges } = await pool.query(`
      SELECT user_id, badge_key, label, awarded_at FROM gamification_badges
      WHERE user_id = ANY($1::int[])
      ORDER BY awarded_at DESC
    `, [team.map(t => t.id)]).catch(() => ({ rows: [] }))

    const ranking = team.map((m, idx) => ({
      rank: idx + 1,
      user_id: m.id,
      name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
      email: m.email,
      clients_count: Number(m.clients_count || 0),
      quotes_count: Number(m.quotes_count || 0),
      ca_cents: Number(m.ca_cents || 0),
      badges: badges.filter(b => b.user_id === m.id).map(b => ({ key: b.badge_key, label: b.label })),
    }))

    res.json({
      ok: true,
      // Ce qui a servi de filtre, dit explicitement : la recette peut vérifier
      // que le classement est bien celui d'un cabinet (et non de la plateforme).
      portee: portee.mode === 'cabinet' ? 'cabinet' : 'mono-utilisateur',
      ranking,
    })
  } catch (err) {
    res.status(500).json({ error: 'ranking_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
