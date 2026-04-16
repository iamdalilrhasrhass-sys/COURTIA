/**
 * tags.js — Routes gestion des tags et association tags-clients
 * Disponible pour tous les plans (pas de requireFeature).
 */

const express = require('express')
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
// tags is available on all plans — no requireFeature needed

// ── Router principal : /api/tags ──────────────────────────────────────────────

const router = express.Router()
router.use(verifyToken)

// GET /api/tags — liste tous les tags du courtier
router.get('/', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const result = await pool.query(
      'SELECT * FROM tags WHERE courtier_id = $1 ORDER BY name',
      [courtier_id]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/tags]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/tags — créer un tag
router.post('/', async (req, res) => {
  try {
    const courtier_id = req.user.userId
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
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// DELETE /api/tags/:id — supprimer un tag
router.delete('/:id', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 AND courtier_id = $2 RETURNING id',
      [id, courtier_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Tag introuvable' })
    }

    return res.json({ success: true, data: { deleted_id: id } })
  } catch (err) {
    console.error('[DELETE /api/tags/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// ── clientTagsRouter : /api/clients ──────────────────────────────────────────

const clientTagsRouter = express.Router()
clientTagsRouter.use(verifyToken)

// POST /api/clients/:clientId/tags — associer des tags à un client
clientTagsRouter.post('/:clientId/tags', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { clientId } = req.params
    const { tag_ids } = req.body

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'tag_ids doit être un tableau non vide'
      })
    }

    // Vérifier que le client appartient au courtier
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [clientId, courtier_id]
    )
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })
    }

    // Vérifier que tous les tags appartiennent au courtier
    const tagsCheck = await pool.query(
      'SELECT id FROM tags WHERE id = ANY($1::int[]) AND courtier_id = $2',
      [tag_ids, courtier_id]
    )
    if (tagsCheck.rows.length !== tag_ids.length) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Un ou plusieurs tag_ids sont invalides ou ne vous appartiennent pas'
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
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// DELETE /api/clients/:clientId/tags/:tagId — retirer un tag d'un client
clientTagsRouter.delete('/:clientId/tags/:tagId', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { clientId, tagId } = req.params

    // Vérifier ownership du client
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [clientId, courtier_id]
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
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = { router, clientTagsRouter }
