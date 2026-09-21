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
const { messagePublic } = require('../lib/erreursPubliques')
const porteeCabinet = require('../lib/porteeCabinet')

router.use(verifyToken)

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE = CABINET (et non « mes automatisations »)
//
// POURQUOI : une automatisation est une RÈGLE DU CABINET (« à l'échéance d'un
// contrat, prévenir le client »). Tant qu'elle était lue et écrite sur
// `courtier_id = moi`, un collaborateur voyait zéro automatisation et le cabinet
// n'avait pas de socle commun — la règle posée par un collègue était invisible.
//
// COMMENT : la table `automations` ne porte PAS de colonne `cabinet_id` (vérifié
// dans `information_schema` / migrations). Le cabinet d'une automatisation est
// donc celui de son propriétaire, résolu dans `cabinet_members` — c'est la règle
// de rattachement de la migration 113. La DÉCISION de portée reste entièrement
// dans `lib/porteeCabinet` (seule autorité) ; seule la colonne « cabinet » du
// fragment change de forme faute de colonne dédiée. Sans cabinet, le fragment
// retombe sur `a.courtier_id = $n` : comportement historique inchangé.
// ─────────────────────────────────────────────────────────────────────────────

/** Fragment de portée sur `automations` (alias `a`). */
function filtreAutomations(portee, { depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `(SELECT cm.cabinet_id FROM cabinet_members cm
                WHERE cm.user_id = a.courtier_id
                  AND cm.removed_at IS NULL
                  AND cm.cabinet_id = ANY($${depart}::uuid[])
                LIMIT 1)`,
    proprietaire: 'a.courtier_id',
    depart,
    ecriture,
  })
}

// GET /api/automations — liste avec indication locked si plan insuffisant
router.get('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const courtier_id = porteeCabinet.identifiantUtilisateur(req.user)

    const f = filtreAutomations(portee, { depart: 1 })
    const result = await pool.query(
      `SELECT a.* FROM automations a WHERE ${f.sql} ORDER BY a.created_at DESC`,
      [...f.params]
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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// POST /api/automations — créer une automation (plan PRO+)
router.post('/', requireFeature('automations'), async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'créer une automatisation')) return
    // `courtier_id` reste le CRÉATEUR de la règle : le cabinet d'une
    // automatisation est celui de son propriétaire, la règle est donc visible
    // par tout le cabinet une fois créée.
    const courtier_id = porteeCabinet.identifiantUtilisateur(req.user)
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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// PATCH /api/automations/:id — mise à jour partielle (plan PRO+)
router.patch('/:id', requireFeature('automations'), async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier une automatisation')) return
    const { id } = req.params

    // Vérifier l'appartenance au CABINET
    const fL = filtreAutomations(portee, { depart: 1, ecriture: true })
    const ownerCheck = await pool.query(
      `SELECT a.id FROM automations a WHERE a.id = $${fL.suivant} AND ${fL.sql}`,
      [...fL.params, id]
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

    // Portée d'ÉCRITURE : seuls les cabinets où l'appelant a le droit d'écrire.
    const f = filtreAutomations(portee, { depart: idx, ecriture: true })
    values.push(...f.params)
    const idParam = f.suivant
    values.push(id)
    const result = await pool.query(
      `UPDATE automations a SET ${updates.join(', ')} WHERE a.id = $${idParam} AND ${f.sql} RETURNING a.*`,
      values
    )

    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[PATCH /api/automations/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// POST /api/automations/:id/toggle — activer/désactiver (plan PRO+)
router.post('/:id/toggle', requireFeature('automations'), async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'activer ou désactiver une automatisation')) return
    const { id } = req.params

    const f = filtreAutomations(portee, { depart: 1, ecriture: true })
    const result = await pool.query(
      `UPDATE automations a
       SET active = NOT a.active
       WHERE a.id = $${f.suivant} AND ${f.sql}
       RETURNING a.*`,
      [...f.params, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Automation introuvable' })
    }

    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/automations/:id/toggle]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// GET /api/automations/:id/runs — historique d'exécutions
router.get('/:id/runs', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { id } = req.params

    // Vérifier l'appartenance de l'automation au CABINET
    const f = filtreAutomations(portee, { depart: 1 })
    const ownerCheck = await pool.query(
      `SELECT a.id FROM automations a WHERE a.id = $${f.suivant} AND ${f.sql}`,
      [...f.params, id]
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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// ────────────────────────────────────────────────────────────────────────
// GET /api/automations/templates — Templates pré-faits (LOT F4)
// ────────────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'welcome_new_client',
    name: 'Bienvenue nouveau client',
    description: 'Onboarding 30 jours pour fidéliser dès le départ',
    trigger_type: 'new_client',
    icon: '🎉',
    steps: [
      { day: 0, type: 'email', template: 'welcome', subject: 'Bienvenue chez {{cabinet.name}} !' },
      { day: 7, type: 'sms', body: 'Bonjour {{client.prenom}}, première semaine OK ? On est là si besoin.' },
      { day: 30, type: 'email', template: 'nps_survey', subject: 'Votre avis nous intéresse' },
    ],
  },
  {
    key: 'contract_renewal',
    name: 'Échéance contrat',
    description: 'Préparation renouvellement J-90 → J-7 avec proposition tarif',
    trigger_type: 'contract_expiring',
    icon: '🔄',
    steps: [
      { day: -90, type: 'task', title: 'Préparer comparatif renouvellement' },
      { day: -60, type: 'email', template: 'pre_renewal' },
      { day: -30, type: 'email', template: 'renewal_proposal' },
      { day: -7, type: 'sms', body: '{{client.prenom}}, votre contrat arrive à échéance, on en parle ?' },
    ],
  },
  {
    key: 'silent_client_wake',
    name: 'Réveil client silencieux',
    description: 'Détection silence 90j → email perso + tâche appel',
    trigger_type: 'silent',
    icon: '📞',
    steps: [
      { day: 0, type: 'email', template: 'reconnect', subject: 'On pense à vous, {{client.prenom}}' },
      { day: 14, type: 'task', title: 'Appel relance — silence 100j' },
    ],
  },
  {
    key: 'birthday',
    name: 'Anniversaire client',
    description: 'Geste émotionnel J-7 + offre cross-sell soft',
    trigger_type: 'birthday',
    icon: '🎂',
    steps: [
      { day: -7, type: 'email', template: 'birthday_offer', subject: 'Joyeux anniversaire {{client.prenom}} !' },
      { day: 0, type: 'sms', body: 'Joyeux anniversaire {{client.prenom}} 🎉' },
    ],
  },
  {
    key: 'claim_closed',
    name: 'Sinistre traité',
    description: 'Confirmation J+1 + enquête satisfaction J+15',
    trigger_type: 'claim_closed',
    icon: '✅',
    steps: [
      { day: 1, type: 'email', template: 'claim_closed_confirmation' },
      { day: 15, type: 'email', template: 'satisfaction_survey', subject: 'Comment s\'est passé votre dossier ?' },
    ],
  },
]

router.get('/templates', async (_req, res) => {
  return res.json({ ok: true, templates: TEMPLATES })
})

// POST /api/automations/from-template — Instancier une automation depuis un template
router.post('/from-template', requireFeature('automations'), async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'instancier une automatisation')) return
    const courtier_id = porteeCabinet.identifiantUtilisateur(req.user)
    const { template_key } = req.body || {}
    const tpl = TEMPLATES.find(t => t.key === template_key)
    if (!tpl) return res.status(404).json({ error: 'template_not_found' })

    const result = await pool.query(`
      INSERT INTO automations (courtier_id, name, description, trigger_type, trigger_config, steps, template_key, is_active)
      VALUES ($1, $2, $3, $4, '{}'::jsonb, $5::jsonb, $6, true)
      RETURNING *
    `, [courtier_id, tpl.name, tpl.description, tpl.trigger_type, JSON.stringify(tpl.steps), tpl.key])

    return res.json({ ok: true, automation: result.rows[0] })
  } catch (err) {
    console.error('[POST /automations/from-template]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
