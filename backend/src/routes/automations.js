/**
 * automations.js — Routes Automations
 * GET /          → tous plans (liste avec locked:true si non autorisé)
 * POST, PATCH, POST/:id/toggle → requireFeature('automations')
 * GET /:id/runs  → tous plans (lecture seule)
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')
const { checkFeatureAccess } = require('../services/planService')

router.use(verifyToken)

// GET /api/automations — liste avec indication locked si plan insuffisant
router.get('/', async (req, res) => {
  try {
    const courtier_id = req.user.userId

    const result = await pool.query(
      'SELECT * FROM automations WHERE courtier_id = $1 ORDER BY created_at DESC',
      [courtier_id]
    )

    // Vérifier si le plan permet 'automations'
    const hasAccess = await checkFeatureAccess(courtier_id, 'automations')

    const data = result.rows.map(automation => {
      if (!hasAccess) {
        return {
          ...automation,
          locked: true,
          upgrade_required: 'pro'
        }
      }
      return automation
    })

    return res.json({ success: true, data })
  } catch (err) {
    console.error('[GET /api/automations]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/automations — créer une automation (plan PRO+)
router.post('/', requireFeature('automations'), async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { name, trigger_type, conditions, actions, active } = req.body

    if (!name || !trigger_type) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'name et trigger_type sont requis'
      })
    }

    const result = await pool.query(
      `INSERT INTO automations (courtier_id, name, trigger_type, conditions, actions, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        courtier_id,
        name,
        trigger_type,
        conditions ? JSON.stringify(conditions) : null,
        actions ? JSON.stringify(actions) : null,
        false // active = false par défaut
      ]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/automations]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// PATCH /api/automations/:id — mise à jour partielle (plan PRO+)
router.patch('/:id', requireFeature('automations'), async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { id } = req.params

    // Vérifier ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM automations WHERE id = $1 AND courtier_id = $2',
      [id, courtier_id]
    )
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Automation introuvable' })
    }

    const allowed = ['name', 'trigger_type', 'conditions', 'actions', 'active']
    const updates = []
    const values = []
    let idx = 1

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${idx}`)
        const val = (key === 'conditions' || key === 'actions') && typeof req.body[key] === 'object'
          ? JSON.stringify(req.body[key])
          : req.body[key]
        values.push(val)
        idx++
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'validation_error', message: 'Aucun champ à mettre à jour' })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE automations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[PATCH /api/automations/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/automations/:id/toggle — activer/désactiver (plan PRO+)
router.post('/:id/toggle', requireFeature('automations'), async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { id } = req.params

    const result = await pool.query(
      `UPDATE automations
       SET active = NOT active
       WHERE id = $1 AND courtier_id = $2
       RETURNING *`,
      [id, courtier_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Automation introuvable' })
    }

    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/automations/:id/toggle]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/automations/:id/runs — historique d'exécutions
router.get('/:id/runs', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { id } = req.params

    // Vérifier ownership de l'automation
    const ownerCheck = await pool.query(
      'SELECT id FROM automations WHERE id = $1 AND courtier_id = $2',
      [id, courtier_id]
    )
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Automation introuvable' })
    }

    const result = await pool.query(
      'SELECT * FROM automation_runs WHERE automation_id = $1 ORDER BY triggered_at DESC LIMIT 50',
      [id]
    )

    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/automations/:id/runs]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
