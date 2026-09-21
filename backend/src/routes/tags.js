/**
 * tags.js — Routes gestion des tags et association tags-clients
 * Disponible pour tous les plans (pas de requireFeature).
 */

const express = require('express')
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const porteeCabinet = require('../lib/porteeCabinet')
const { messagePublic } = require('../lib/erreursPubliques')
// tags is available on all plans — no requireFeature needed

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE = CABINET (et non « mes tags »)
//
// POURQUOI : un tag est une classification du PORTEFEUILLE. Un collaborateur qui
// classe un client du cabinet avec l'étiquette « à relancer » ne voyait ni les
// tags de ses collègues, ni même pouvoir en poser un sur un dossier du cabinet.
//
// COMMENT, POURQUOI CETTE FORME : la table `tags` ne porte PAS de colonne
// `cabinet_id` (vérifié dans `information_schema` / migrations — la seule ancre
// de tenant ajoutée par la migration 113 est `clients.cabinet_id`). Le cabinet
// d'un tag est donc celui de son propriétaire, résolu dans `cabinet_members` —
// exactement la règle de rattachement de la migration 113. La DÉCISION de portée
// reste entièrement dans `lib/porteeCabinet` (seule autorité) : seule la colonne
// « cabinet » du fragment change de forme faute de colonne dédiée. Sans cabinet,
// le fragment retombe sur `t.courtier_id = $n` : comportement historique
// strictement inchangé pour les cabinets mono-utilisateur.
// ─────────────────────────────────────────────────────────────────────────────

/** Fragment de portée sur `tags` (alias `t`). */
function filtreTags(portee, { depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `(SELECT cm.cabinet_id FROM cabinet_members cm
                WHERE cm.user_id = t.courtier_id
                  AND cm.removed_at IS NULL
                  AND cm.cabinet_id = ANY($${depart}::uuid[])
                LIMIT 1)`,
    proprietaire: 't.courtier_id',
    depart,
    ecriture,
  })
}

/** Fragment de portée sur `clients` (alias `c`) — l'ancre du tenant. */
function filtreClient(portee, { depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart,
    ecriture,
  })
}

// ── Router principal : /api/tags ──────────────────────────────────────────────

const router = express.Router()
router.use(verifyToken)

// GET /api/tags — liste tous les tags du CABINET
router.get('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const f = filtreTags(portee, { depart: 1 })
    const result = await pool.query(
      `SELECT t.* FROM tags t WHERE ${f.sql} ORDER BY t.name`,
      [...f.params]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/tags]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// POST /api/tags — créer un tag
// `courtier_id` reste le CRÉATEUR du tag (colonne NOT NULL à contrainte unique
// `(courtier_id, name)` : on ne la réécrit pas). Le cabinet d'un tag étant celui
// de son propriétaire, un tag créé par un collaborateur est visible par tout le
// cabinet — c'est l'objet du correctif.
router.post('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un tag')) return
    const courtier_id = porteeCabinet.identifiantUtilisateur(req.user)
    const { name, color } = req.body

    // Validation name
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Le champ name est requis (1-50 caractères)'
      })
    }

    // Validation color (optionnel mais si fourni doit être #rrggbb)
    if (color !== undefined && color !== null && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'La couleur doit être au format hexadécimal #rrggbb'
      })
    }

    const result = await pool.query(
      `INSERT INTO tags (courtier_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (courtier_id, name) DO NOTHING
       RETURNING *`,
      [courtier_id, name.trim(), color || null]
    )

    if (result.rows.length === 0) {
      return res.status(409).json({
        error: 'conflict',
        message: 'Un tag avec ce nom existe déjà'
      })
    }

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/tags]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// DELETE /api/tags/:id — supprimer un tag
router.delete('/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const { id } = req.params

    // Suppression restreinte aux cabinets où l'appelant a le DROIT d'écrire
    // (`ecriture: true`), et à son propre tag si le compte n'a pas de cabinet.
    const f = filtreTags(portee, { depart: 1, ecriture: true })
    const result = await pool.query(
      `DELETE FROM tags AS t WHERE t.id = $${f.suivant} AND ${f.sql} RETURNING t.id`,
      [...f.params, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Tag introuvable' })
    }

    return res.json({ success: true, data: { deleted_id: id } })
  } catch (err) {
    console.error('[DELETE /api/tags/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// ── clientTagsRouter : /api/clients ──────────────────────────────────────────

const clientTagsRouter = express.Router()
clientTagsRouter.use(verifyToken)

// POST /api/clients/:clientId/tags — associer des tags à un client
clientTagsRouter.post('/:clientId/tags', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'associer des tags')) return
    const { clientId } = req.params
    const { tag_ids } = req.body

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'tag_ids doit être un tableau non vide'
      })
    }

    // Le client doit appartenir au CABINET (l'ancre du tenant), pas au seul appelant.
    const fC = filtreClient(portee, { depart: 1, ecriture: true })
    const clientCheck = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fC.suivant} AND ${fC.sql}`,
      [...fC.params, clientId]
    )
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })
    }

    // Les tags doivent appartenir au CABINET de l'appelant.
    const fT = filtreTags(portee, { depart: 1, ecriture: true })
    const tagsCheck = await pool.query(
      `SELECT t.id FROM tags t WHERE t.id = ANY($${fT.suivant}::int[]) AND ${fT.sql}`,
      [...fT.params, tag_ids]
    )
    if (tagsCheck.rows.length !== tag_ids.length) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Un ou plusieurs tag_ids sont invalides ou n’appartiennent pas à votre cabinet'
      })
    }

    // Insérer les associations
    const inserted = []
    for (const tag_id of tag_ids) {
      await pool.query(
        `INSERT INTO client_tags (client_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [clientId, tag_id]
      )
      inserted.push(tag_id)
    }

    return res.status(201).json({ success: true, data: { client_id: clientId, tag_ids: inserted } })
  } catch (err) {
    console.error('[POST /api/clients/:clientId/tags]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// DELETE /api/clients/:clientId/tags/:tagId — retirer un tag d'un client
clientTagsRouter.delete('/:clientId/tags/:tagId', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const { clientId, tagId } = req.params

    // Vérifier l'appartenance du client au CABINET
    const fC = filtreClient(portee, { depart: 1, ecriture: true })
    const clientCheck = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fC.suivant} AND ${fC.sql}`,
      [...fC.params, clientId]
    )
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })
    }

    await pool.query(
      'DELETE FROM client_tags WHERE client_id = $1 AND tag_id = $2',
      [clientId, tagId]
    )

    return res.json({ success: true, data: { client_id: clientId, tag_id: tagId } })
  } catch (err) {
    console.error('[DELETE /api/clients/:clientId/tags/:tagId]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = { router, clientTagsRouter }
