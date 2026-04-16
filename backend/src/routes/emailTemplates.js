/**
 * emailTemplates.js — Routes Email Templates
 * GET /  → tous les plans
 * POST / → requireFeature('email_templates_ai')
 * POST /generate → requireFeature('email_templates_ai')
 * GET /:id/render → tous les plans
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')
const Anthropic = require('@anthropic-ai/sdk')

router.use(verifyToken)

// GET /api/email-templates — liste templates du courtier + defaults
router.get('/', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { category } = req.query

    let query = `
      SELECT * FROM email_templates
      WHERE (courtier_id = $1 OR is_default = TRUE)
    `
    const params = [courtier_id]

    if (category) {
      query += ` AND category = $2`
      params.push(category)
    }

    query += ' ORDER BY is_default DESC, name'

    const result = await pool.query(query, params)
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/email-templates]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/email-templates — créer un template (plan PRO+)
router.post('/', requireFeature('email_templates_ai'), async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { name, subject, body, category, variables } = req.body

    if (!name || !subject || !body) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'name, subject et body sont requis'
      })
    }

    const result = await pool.query(
      `INSERT INTO email_templates (courtier_id, name, subject, body, category, variables, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING *`,
      [
        courtier_id,
        name,
        subject,
        body,
        category || null,
        variables ? JSON.stringify(variables) : null
      ]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/email-templates]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/email-templates/generate — génération IA (plan PRO+)
router.post('/generate', requireFeature('email_templates_ai'), async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { client_id, context_type } = req.body

    if (!client_id || !context_type) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'client_id et context_type sont requis'
      })
    }

    const VALID_CONTEXT_TYPES = ['relance', 'renouvellement', 'bienvenue', 'sinistre', 'resiliation', 'proposition', 'suivi']
    if (!VALID_CONTEXT_TYPES.includes(context_type)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `context_type invalide. Valeurs acceptées : ${VALID_CONTEXT_TYPES.join(', ')}`
      })
    }

    // Récupérer le client
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2',
      [client_id, courtier_id]
    )
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })
    }
    const client = clientResult.rows[0]

    // Récupérer les contrats du client
    const contratsResult = await pool.query(
      'SELECT * FROM contrats WHERE client_id = $1',
      [client_id]
    )
    const contrats = contratsResult.rows

    const clientData = JSON.stringify({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone
    })
    const contractsData = JSON.stringify(
      contrats.map(c => ({ type: c.type_contrat || c.contract_type, status: c.statut || c.status, premium: c.prime_annuelle || c.annual_premium }))
    )

    const prompt = `Tu es un rédacteur expert en courtage assurance. Génère un email professionnel de type ${context_type} pour ce client : ${clientData}. Contrats actuels : ${contractsData}. Réponds en JSON strict uniquement : {"subject": "...", "body": "...", "variables": ["{{first_name}}", ...], "suggested_category": "..."}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawContent = message.content[0].text
    let parsed
    try {
      // Extraire JSON depuis la réponse
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent)
    } catch (parseErr) {
      console.error('[POST /api/email-templates/generate] Parse JSON error:', parseErr.message)
      return res.status(502).json({ error: 'ai_parse_error', message: 'Réponse IA non parseable' })
    }

    return res.json({
      success: true,
      data: {
        subject: parsed.subject || '',
        body: parsed.body || '',
        variables: parsed.variables || [],
        suggested_category: parsed.suggested_category || context_type
      }
    })
  } catch (err) {
    console.error('[POST /api/email-templates/generate]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/email-templates/:id/render — rendu personnalisé
router.get('/:id/render', async (req, res) => {
  try {
    const courtier_id = req.user.userId
    const { id } = req.params
    const { client_id } = req.query

    // Récupérer le template
    const templateResult = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1 AND (courtier_id = $2 OR is_default = TRUE)',
      [id, courtier_id]
    )
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Template introuvable' })
    }
    const template = templateResult.rows[0]

    // Variables par défaut
    let vars = {
      first_name: '',
      last_name: '',
      contract_type: '',
      courtier_name: ''
    }

    // Récupérer les infos courtier
    const courtierResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [courtier_id]
    )
    if (courtierResult.rows.length > 0) {
      const u = courtierResult.rows[0]
      vars.courtier_name = `${u.first_name || ''} ${u.last_name || ''}`.trim()
    }

    // Récupérer le client si fourni
    if (client_id) {
      const clientResult = await pool.query(
        'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2',
        [client_id, courtier_id]
      )
      if (clientResult.rows.length > 0) {
        const c = clientResult.rows[0]
        vars.first_name = c.first_name || ''
        vars.last_name = c.last_name || ''

        // Dernier contrat
        const contractResult = await pool.query(
          'SELECT type_contrat FROM contrats WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
          [client_id]
        )
        if (contractResult.rows.length > 0) {
          vars.contract_type = contractResult.rows[0].type_contrat || ''
        }
      }
    }

    // Remplacer les variables dans subject et body
    const replace = (str) => {
      return str
        .replace(/\{\{first_name\}\}/g, vars.first_name)
        .replace(/\{\{last_name\}\}/g, vars.last_name)
        .replace(/\{\{contract_type\}\}/g, vars.contract_type)
        .replace(/\{\{courtier_name\}\}/g, vars.courtier_name)
    }

    const subject_rendered = replace(template.subject || '')
    const body_rendered = replace(template.body || '')

    // Détecter les variables utilisées
    const all_vars_regex = /\{\{(\w+)\}\}/g
    const used_variables = []
    let match
    const combined = (template.subject || '') + (template.body || '')
    while ((match = all_vars_regex.exec(combined)) !== null) {
      if (!used_variables.includes(match[1])) {
        used_variables.push(match[1])
      }
    }

    return res.json({
      success: true,
      data: { subject_rendered, body_rendered, used_variables }
    })
  } catch (err) {
    console.error('[GET /api/email-templates/:id/render]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
