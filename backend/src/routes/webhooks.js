const express = require('express')
const { verifyToken } = require('../middleware/auth')
const secretsEntrants = require('../lib/secretsEntrants')

const router = express.Router()

function getUserId(req) {
  return req.user?.id || req.user?.userId || null
}

async function ensureAutomationEventsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_webhook_events (
      id SERIAL PRIMARY KEY,
      direction TEXT NOT NULL,
      source TEXT,
      event_name TEXT,
      payload JSONB DEFAULT '{}'::jsonb,
      received_at TIMESTAMP DEFAULT NOW(),
      created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL
    );
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_automation_webhook_events_received_at ON automation_webhook_events(received_at DESC);')
}

// POST /api/webhooks/incoming
// Endpoint public pour Make/Zapier/Webhook entrants.
//
// DÉFAUT FERMÉ (P3 SEC-019, mesuré en production le 20/09/2026) : sans
// `WEBHOOK_INCOMING_SECRET` configuré, « la protection est optionnelle » et
// l'appel répondait 200 en insérant TROIS lignes réelles dans
// `automation_webhook_events`. Un point d'entrée public qui écrit en base sans
// aucune authentification est une porte ouverte sur l'espace de travail du
// cabinet (données injectées, automatisations déclenchées).
//
// RÈGLE : le secret est OBLIGATOIRE. Absent ⇒ 503 explicite, et RIEN n'est
// écrit (le contrôle a lieu avant toute requête SQL). Présent mais faux ⇒ 401.
router.post('/incoming', async (req, res) => {
  try {
    const expectedSecret = secretsEntrants.lireSecret(secretsEntrants.SECRETS.webhookEntrant)
    if (!expectedSecret) {
      // Aucune ligne insérée : on refuse AVANT de toucher la base.
      return secretsEntrants.repondreSecretAbsent(
        res,
        'webhook_incoming_secret',
        "Le webhook entrant est fermé : le secret partagé (WEBHOOK_INCOMING_SECRET) n'est pas configuré sur ce serveur."
      )
    }

    const provided = String(req.headers['x-courtia-webhook-secret'] || '').trim()
    if (!secretsEntrants.verifierSecretSimple({ secret: expectedSecret, fourni: provided }).valide) {
      return res.status(401).json({ error: 'invalid_webhook_secret' })
    }

    const pool = req.app.locals.pool
    await ensureAutomationEventsTable(pool)

    const source = String(req.body?.source || 'incoming_webhook').slice(0, 120)
    const eventName = String(req.body?.event_name || 'event').slice(0, 120)
    const payload = req.body?.payload || req.body || {}

    await pool.query(
      `INSERT INTO automation_webhook_events (direction, source, event_name, payload)
       VALUES ('incoming', $1, $2, $3::jsonb)`,
      [source, eventName, JSON.stringify(payload)]
    )

    return res.json({
      success: true,
      accepted: true,
      message: 'Webhook incoming enregistré.',
    })
  } catch (err) {
    console.error('[WEBHOOKS] POST /incoming error:', err.message)
    return res.status(500).json({ error: 'incoming_webhook_failed' })
  }
})

// POST /api/webhooks/outgoing/test
// Endpoint interne pour tester les automatisations sortantes sans dépendre d'un provider externe.
router.post('/outgoing/test', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const pool = req.app.locals.pool
    await ensureAutomationEventsTable(pool)

    const source = String(req.body?.source || 'manual_test').slice(0, 120)
    const eventName = String(req.body?.event_name || 'outgoing_test').slice(0, 120)
    const payload = req.body?.payload || {
      sample: true,
      timestamp: new Date().toISOString(),
      use_cases: ['nouveau_lead', 'nouvelle_tache', 'message_whatsapp', 'client_a_risque'],
    }

    await pool.query(
      `INSERT INTO automation_webhook_events (direction, source, event_name, payload, created_by_user_id)
       VALUES ('outgoing_test', $1, $2, $3::jsonb, $4)`,
      [source, eventName, JSON.stringify(payload), userId]
    )

    return res.json({
      success: true,
      message: 'Test webhook sortant enregistré. Connecteur Make/Zapier prêt côté API.',
      event_name: eventName,
      source,
      payload,
    })
  } catch (err) {
    console.error('[WEBHOOKS] POST /outgoing/test error:', err.message)
    return res.status(500).json({ error: 'outgoing_webhook_test_failed' })
  }
})

module.exports = router
