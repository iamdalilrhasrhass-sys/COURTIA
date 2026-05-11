/**
 * COURTIA — LOT 5 : Routes Insurance Providers & Broker Integrations
 * 
 * Routes:
 * - GET    /api/insurance-providers          Liste des providers
 * - GET    /api/broker-integrations          Intégrations du courtier
 * - POST   /api/broker-integrations          Créer une intégration
 * - PUT    /api/broker-integrations/:id      Modifier
 * - DELETE /api/broker-integrations/:id      Supprimer
 * - POST   /api/broker-integrations/:id/credentials      Ajouter credentials
 * - DELETE /api/broker-integrations/:id/credentials/:credId  Supprimer credential
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const cryptoVault = require('../services/cryptoVault')
const { listConnectors, getConnector } = require('../services/connectors')

// ============================================================
// HELPERS
// ============================================================

function getUserId(user) {
  return user?.id || user?.userId || null
}

// ============================================================
// PROVIDERS (Public ou Auth selon config)
// ============================================================

/**
 * GET /api/insurance-providers
 * Liste tous les providers d'assurance disponibles
 */
router.get('/insurance-providers', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    
    const result = await pool.query(`
      SELECT 
        id, code, name, type, logo_url, website, 
        api_status, supported_products, metadata, created_at
      FROM insurance_providers
      ORDER BY name ASC
    `)
    
    // Enrichir avec les infos connector
    const providers = result.rows.map(p => {
      const connector = getConnector(p.code)
      return {
        ...p,
        connector_status: connector?.status || 'not_registered',
        connector_available: !!connector
      }
    })
    
    return res.json({
      success: true,
      count: providers.length,
      providers
    })
  } catch (err) {
    console.error('[insuranceProviders] GET /insurance-providers error:', err.message)
    return res.status(500).json({ error: 'providers_fetch_failed', details: err.message })
  }
})

/**
 * GET /api/insurance-providers/connectors
 * Liste les connectors enregistrés (status API)
 */
router.get('/insurance-providers/connectors', async (req, res) => {
  try {
    const connectors = listConnectors()
    return res.json({
      success: true,
      count: connectors.length,
      connectors
    })
  } catch (err) {
    return res.status(500).json({ error: 'connectors_list_failed' })
  }
})

// ============================================================
// BROKER INTEGRATIONS (Protected)
// ============================================================

router.use('/broker-integrations', verifyToken)

/**
 * GET /api/broker-integrations
 * Liste les intégrations du courtier connecté
 */
router.get('/broker-integrations', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    
    const result = await pool.query(`
      SELECT 
        bi.id,
        bi.broker_id,
        bi.provider_id,
        bi.status,
        bi.priority,
        bi.commission_rate,
        bi.acceptance_rate,
        bi.preferred_products,
        bi.deposit_email,
        bi.webhook_url,
        bi.metadata,
        bi.created_at,
        bi.updated_at,
        ip.code AS provider_code,
        ip.name AS provider_name,
        ip.type AS provider_type,
        ip.logo_url AS provider_logo,
        ip.api_status AS provider_api_status,
        (
          SELECT COUNT(*) FROM integration_credentials ic 
          WHERE ic.integration_id = bi.id
        ) AS credentials_count,
        (
          SELECT json_agg(json_build_object(
            'id', ic.id,
            'type', ic.credential_type,
            'last_four', ic.last_four,
            'created_at', ic.created_at
          ))
          FROM integration_credentials ic 
          WHERE ic.integration_id = bi.id
        ) AS credentials_summary
      FROM broker_integrations bi
      JOIN insurance_providers ip ON bi.provider_id = ip.id
      WHERE bi.broker_id = $1
      ORDER BY bi.priority DESC, ip.name ASC
    `, [userId])
    
    // Enrichir avec connector info
    const integrations = result.rows.map(row => {
      const connector = getConnector(row.provider_code)
      return {
        ...row,
        connector_status: connector?.status || 'not_available',
        credentials_summary: row.credentials_summary || []
      }
    })
    
    return res.json({
      success: true,
      count: integrations.length,
      integrations
    })
  } catch (err) {
    console.error('[insuranceProviders] GET /broker-integrations error:', err.message)
    return res.status(500).json({ error: 'integrations_fetch_failed', details: err.message })
  }
})

/**
 * POST /api/broker-integrations
 * Créer une nouvelle intégration courtier <-> provider
 */
router.post('/broker-integrations', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    
    const {
      provider_code,
      provider_id,
      priority = 0,
      commission_rate,
      acceptance_rate,
      preferred_products,
      deposit_email,
      webhook_url,
      metadata
    } = req.body
    
    // Résoudre le provider_id depuis le code si nécessaire
    let resolvedProviderId = provider_id
    if (!resolvedProviderId && provider_code) {
      const providerResult = await pool.query(
        'SELECT id FROM insurance_providers WHERE code = $1',
        [provider_code]
      )
      if (!providerResult.rows[0]) {
        return res.status(404).json({ error: 'provider_not_found', provider_code })
      }
      resolvedProviderId = providerResult.rows[0].id
    }
    
    if (!resolvedProviderId) {
      return res.status(400).json({ error: 'provider_id_or_code_required' })
    }
    
    const result = await pool.query(`
      INSERT INTO broker_integrations (
        broker_id, provider_id, status, priority,
        commission_rate, acceptance_rate, preferred_products,
        deposit_email, webhook_url, metadata
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (broker_id, provider_id) 
      DO UPDATE SET
        priority = EXCLUDED.priority,
        commission_rate = COALESCE(EXCLUDED.commission_rate, broker_integrations.commission_rate),
        acceptance_rate = COALESCE(EXCLUDED.acceptance_rate, broker_integrations.acceptance_rate),
        preferred_products = COALESCE(EXCLUDED.preferred_products, broker_integrations.preferred_products),
        deposit_email = COALESCE(EXCLUDED.deposit_email, broker_integrations.deposit_email),
        webhook_url = COALESCE(EXCLUDED.webhook_url, broker_integrations.webhook_url),
        metadata = COALESCE(EXCLUDED.metadata, broker_integrations.metadata),
        updated_at = NOW()
      RETURNING *
    `, [
      userId,
      resolvedProviderId,
      priority,
      commission_rate || null,
      acceptance_rate || null,
      preferred_products ? JSON.stringify(preferred_products) : null,
      deposit_email || null,
      webhook_url || null,
      metadata ? JSON.stringify(metadata) : null
    ])
    
    return res.status(201).json({
      success: true,
      integration: result.rows[0]
    })
  } catch (err) {
    console.error('[insuranceProviders] POST /broker-integrations error:', err.message)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'integration_already_exists' })
    }
    return res.status(500).json({ error: 'integration_create_failed', details: err.message })
  }
})

/**
 * PUT /api/broker-integrations/:id
 * Modifier une intégration
 */
router.put('/broker-integrations/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const integrationId = parseInt(req.params.id, 10)
    
    if (!userId || !integrationId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    const {
      status,
      priority,
      commission_rate,
      acceptance_rate,
      preferred_products,
      deposit_email,
      webhook_url,
      metadata
    } = req.body
    
    const result = await pool.query(`
      UPDATE broker_integrations SET
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        commission_rate = COALESCE($3, commission_rate),
        acceptance_rate = COALESCE($4, acceptance_rate),
        preferred_products = COALESCE($5, preferred_products),
        deposit_email = COALESCE($6, deposit_email),
        webhook_url = COALESCE($7, webhook_url),
        metadata = COALESCE($8, metadata),
        updated_at = NOW()
      WHERE id = $9 AND broker_id = $10
      RETURNING *
    `, [
      status,
      priority,
      commission_rate,
      acceptance_rate,
      preferred_products ? JSON.stringify(preferred_products) : null,
      deposit_email,
      webhook_url,
      metadata ? JSON.stringify(metadata) : null,
      integrationId,
      userId
    ])
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'integration_not_found' })
    }
    
    return res.json({
      success: true,
      integration: result.rows[0]
    })
  } catch (err) {
    console.error('[insuranceProviders] PUT /broker-integrations/:id error:', err.message)
    return res.status(500).json({ error: 'integration_update_failed', details: err.message })
  }
})

/**
 * DELETE /api/broker-integrations/:id
 * Supprimer une intégration (et ses credentials en cascade)
 */
router.delete('/broker-integrations/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const integrationId = parseInt(req.params.id, 10)
    
    if (!userId || !integrationId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    const result = await pool.query(`
      DELETE FROM broker_integrations 
      WHERE id = $1 AND broker_id = $2
      RETURNING id
    `, [integrationId, userId])
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'integration_not_found' })
    }
    
    return res.json({
      success: true,
      deleted: true,
      integration_id: integrationId
    })
  } catch (err) {
    console.error('[insuranceProviders] DELETE /broker-integrations/:id error:', err.message)
    return res.status(500).json({ error: 'integration_delete_failed', details: err.message })
  }
})

// ============================================================
// CREDENTIALS (Vault chiffré)
// ============================================================

/**
 * POST /api/broker-integrations/:id/credentials
 * Ajouter des credentials chiffrés
 */
router.post('/broker-integrations/:id/credentials', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const integrationId = parseInt(req.params.id, 10)
    
    if (!userId || !integrationId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    const { type, value } = req.body
    
    if (!type || !value) {
      return res.status(400).json({ error: 'type_and_value_required' })
    }
    
    // Vérifier que l'intégration appartient au user
    const integCheck = await pool.query(
      'SELECT id FROM broker_integrations WHERE id = $1 AND broker_id = $2',
      [integrationId, userId]
    )
    
    if (!integCheck.rows[0]) {
      return res.status(404).json({ error: 'integration_not_found' })
    }
    
    // Chiffrer la valeur
    const encrypted = cryptoVault.encrypt(value)
    const lastFour = cryptoVault.getLastFour(value)
    
    const result = await pool.query(`
      INSERT INTO integration_credentials (
        integration_id, credential_type, encrypted_value, iv, auth_tag, last_four
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, credential_type, last_four, created_at
    `, [
      integrationId,
      type,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      lastFour
    ])
    
    // Mettre à jour le status de l'intégration
    await pool.query(`
      UPDATE broker_integrations SET 
        status = 'configured',
        credentials_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [result.rows[0].id, integrationId])
    
    return res.status(201).json({
      success: true,
      credential: result.rows[0],
      message: 'Credential chiffré et stocké (valeur jamais retournée en clair)'
    })
  } catch (err) {
    console.error('[insuranceProviders] POST credentials error:', err.message)
    return res.status(500).json({ error: 'credential_store_failed', details: err.message })
  }
})

/**
 * DELETE /api/broker-integrations/:id/credentials/:credId
 * Supprimer un credential (rotation)
 */
router.delete('/broker-integrations/:id/credentials/:credId', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const integrationId = parseInt(req.params.id, 10)
    const credId = parseInt(req.params.credId, 10)
    
    if (!userId || !integrationId || !credId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    // Vérifier ownership
    const integCheck = await pool.query(
      'SELECT id FROM broker_integrations WHERE id = $1 AND broker_id = $2',
      [integrationId, userId]
    )
    
    if (!integCheck.rows[0]) {
      return res.status(404).json({ error: 'integration_not_found' })
    }
    
    const result = await pool.query(`
      DELETE FROM integration_credentials 
      WHERE id = $1 AND integration_id = $2
      RETURNING id
    `, [credId, integrationId])
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'credential_not_found' })
    }
    
    // Vérifier s'il reste des credentials, sinon passer en pending
    const remaining = await pool.query(
      'SELECT COUNT(*) FROM integration_credentials WHERE integration_id = $1',
      [integrationId]
    )
    
    if (parseInt(remaining.rows[0].count, 10) === 0) {
      await pool.query(`
        UPDATE broker_integrations SET 
          status = 'pending',
          credentials_id = NULL,
          updated_at = NOW()
        WHERE id = $1
      `, [integrationId])
    }
    
    return res.json({
      success: true,
      deleted: true,
      credential_id: credId
    })
  } catch (err) {
    console.error('[insuranceProviders] DELETE credentials error:', err.message)
    return res.status(500).json({ error: 'credential_delete_failed', details: err.message })
  }
})

module.exports = router