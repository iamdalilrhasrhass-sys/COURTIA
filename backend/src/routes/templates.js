const express = require('express')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const {
  normalizeTemplatePayload,
  renderTemplateText,
  seedDefaultTemplates,
} = require('../services/templateService')

const router = express.Router()

router.use(requireCabinetFeature('v1_notifications_search_reporting'))

function getUserId(req) {
  return Number(req.user?.userId || req.user?.id || 0)
}

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    await seedDefaultTemplates(req.app.locals.pool)
    const channel = String(req.query.channel || '').trim().toLowerCase()
    const params = [userId]
    let where = '(user_id = $1 OR scope = \'system\')'
    if (['email', 'whatsapp'].includes(channel)) {
      params.push(channel)
      where += ' AND channel = $2'
    }
    const result = await req.app.locals.pool.query(
      `SELECT id, scope, channel, kind, name, subject, body_text, variables_schema, created_at, updated_at
       FROM message_templates
       WHERE ${where}
       ORDER BY scope DESC, channel, kind, name`,
      params
    )
    res.json({ success: true, rows: result.rows, total: result.rows.length })
  } catch (err) {
    res.status(500).json({ error: 'templates_unavailable', message: 'Templates indisponibles.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const payload = normalizeTemplatePayload(req.body || {})
    if (!payload.body_text) return res.status(400).json({ error: 'body_required' })
    const result = await req.app.locals.pool.query(
      `INSERT INTO message_templates (user_id, scope, channel, kind, name, subject, body_mjml, body_text, variables_schema, updated_at)
       VALUES ($1,'cabinet',$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
       RETURNING *`,
      [userId, payload.channel, payload.kind, payload.name, payload.subject || null, payload.body_mjml, payload.body_text, JSON.stringify(payload.variables_schema)]
    )
    res.status(201).json({ success: true, row: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'template_create_failed', message: 'Création template impossible.' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const userId = getUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const payload = normalizeTemplatePayload(req.body || {})
    const result = await req.app.locals.pool.query(
      `UPDATE message_templates
       SET channel=$3, kind=$4, name=$5, subject=$6, body_mjml=$7, body_text=$8, variables_schema=$9::jsonb, updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND scope='cabinet'
       RETURNING *`,
      [id, userId, payload.channel, payload.kind, payload.name, payload.subject || null, payload.body_mjml, payload.body_text, JSON.stringify(payload.variables_schema)]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'template_not_found' })
    res.json({ success: true, row: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'template_update_failed', message: 'Mise à jour template impossible.' })
  }
})

router.post('/:id/render', async (req, res) => {
  try {
    const userId = getUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await req.app.locals.pool.query(
      `SELECT * FROM message_templates
       WHERE id=$1 AND (user_id=$2 OR scope='system')
       LIMIT 1`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'template_not_found' })
    res.json({
      success: true,
      body_text: renderTemplateText(result.rows[0].body_text || '', req.body?.variables || {}),
      subject: renderTemplateText(result.rows[0].subject || '', req.body?.variables || {}),
    })
  } catch (err) {
    res.status(500).json({ error: 'template_render_failed', message: 'Rendu template impossible.' })
  }
})

module.exports = router
