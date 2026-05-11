/**
 * Developer Routes — LOT 23
 * Gestion des clés API pour utilisateurs connectés
 */

const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/apiKeyService');

/**
 * GET /api/developer/keys
 * Liste les clés API de l'utilisateur
 */
router.get('/keys', async (req, res) => {
  try {
    const keys = await apiKeyService.listApiKeys(req.user.id);
    res.json({ keys });
  } catch (error) {
    console.error('GET /developer/keys error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * POST /api/developer/keys
 * Génère une nouvelle clé API
 */
router.post('/keys', async (req, res) => {
  try {
    const { name, scopes } = req.body;
    
    // Limiter le nombre de clés par utilisateur
    const existingKeys = await apiKeyService.listApiKeys(req.user.id);
    const activeKeys = existingKeys.filter(k => k.isActive);
    
    if (activeKeys.length >= 5) {
      return res.status(400).json({
        error: 'max_keys_reached',
        message: 'Vous avez atteint la limite de 5 clés API actives. Révoquez une clé existante.'
      });
    }
    
    const result = await apiKeyService.generateApiKey(
      req.user.id,
      name || 'API Key',
      scopes || ['read:clients', 'read:contracts', 'read:commissions']
    );
    
    res.status(201).json({
      message: 'Clé API créée',
      id: result.keyId,
      name: result.name,
      keyPrefix: result.keyPrefix,
      scopes: result.scopes,
      createdAt: result.createdAt,
      // La clé complète est retournée UNE SEULE FOIS
      fullKey: result.key,
      warning: 'Copiez cette clé maintenant. Elle ne sera plus jamais affichée.'
    });
  } catch (error) {
    console.error('POST /developer/keys error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * DELETE /api/developer/keys/:keyId
 * Révoque une clé API
 */
router.delete('/keys/:keyId', async (req, res) => {
  try {
    const revoked = await apiKeyService.revokeApiKey(req.params.keyId, req.user.id);
    
    if (!revoked) {
      return res.status(404).json({ error: 'key_not_found', message: 'Clé non trouvée ou déjà révoquée' });
    }
    
    res.json({ message: 'Clé révoquée avec succès' });
  } catch (error) {
    console.error('DELETE /developer/keys/:keyId error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * GET /api/developer/keys/:keyId/usage
 * Statistiques d'usage d'une clé
 */
router.get('/keys/:keyId/usage', async (req, res) => {
  try {
    const stats = await apiKeyService.getUsageStats(req.params.keyId, 30);
    res.json({ stats });
  } catch (error) {
    console.error('GET /developer/keys/:keyId/usage error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * GET /api/developer/webhooks
 * Liste les webhooks de l'utilisateur
 */
router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = await apiKeyService.listWebhooks(req.user.id);
    res.json({ webhooks });
  } catch (error) {
    console.error('GET /developer/webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * POST /api/developer/webhooks
 * Crée un webhook
 */
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'missing_url' });
    }
    
    const webhook = await apiKeyService.registerWebhook(req.user.id, url, events);
    
    res.status(201).json({
      message: 'Webhook créé',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret  // Retourné une seule fois
      }
    });
  } catch (error) {
    console.error('POST /developer/webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * DELETE /api/developer/webhooks/:webhookId
 * Supprime un webhook
 */
router.delete('/webhooks/:webhookId', async (req, res) => {
  try {
    const deleted = await apiKeyService.deleteWebhook(req.params.webhookId, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'webhook_not_found' });
    }
    
    res.json({ message: 'Webhook supprimé' });
  } catch (error) {
    console.error('DELETE /developer/webhooks/:webhookId error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

module.exports = router;
