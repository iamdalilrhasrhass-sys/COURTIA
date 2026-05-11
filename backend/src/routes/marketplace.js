/**
 * Marketplace Routes — LOT 23
 * Connecteurs pré-construits pour intégrations tierces
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Connecteurs disponibles (mock)
const CONNECTORS = [
  {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Synchronisez vos commissions et factures avec votre comptabilité Pennylane.',
    logo: 'https://www.pennylane.com/favicon.ico',
    category: 'comptabilité',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API Pennylane', type: 'password', required: true },
      { key: 'company_id', label: 'ID Entreprise', type: 'text', required: true }
    ],
    features: ['Export commissions', 'Création factures auto', 'Rapprochement bancaire']
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Synchronisez vos contacts clients pour vos campagnes email marketing.',
    logo: 'https://mailchimp.com/favicon.ico',
    category: 'emailing',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API Mailchimp', type: 'password', required: true },
      { key: 'list_id', label: 'ID de la liste', type: 'text', required: true }
    ],
    features: ['Sync contacts', 'Tags automatiques', 'Segmentation']
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connectez COURTIA à 5000+ applications avec des automations personnalisées.',
    logo: 'https://zapier.com/favicon.ico',
    category: 'automation',
    status: 'available',
    configFields: [
      { key: 'webhook_url', label: 'URL Webhook Zapier', type: 'url', required: true }
    ],
    features: ['Triggers personnalisés', 'Actions sur événements', '5000+ apps']
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Recevez des notifications en temps réel dans vos channels Slack.',
    logo: 'https://slack.com/favicon.ico',
    category: 'notifications',
    status: 'available',
    configFields: [
      { key: 'webhook_url', label: 'URL Webhook Slack', type: 'url', required: true },
      { key: 'channel', label: 'Channel (optionnel)', type: 'text', required: false }
    ],
    features: ['Alertes sinistres', 'Nouveaux contrats', 'Rappels échéances']
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Synchronisez vos clients et prospects avec votre CRM HubSpot.',
    logo: 'https://www.hubspot.com/favicon.ico',
    category: 'crm',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API HubSpot', type: 'password', required: true },
      { key: 'sync_mode', label: 'Mode sync', type: 'select', options: ['bidirectional', 'courtia_to_hubspot', 'hubspot_to_courtia'], required: true }
    ],
    features: ['Sync contacts', 'Deals pipeline', 'Historique activités']
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    description: 'Alternative à Yousign pour la signature électronique de vos documents.',
    logo: 'https://www.docusign.com/favicon.ico',
    category: 'signature',
    status: 'available',
    configFields: [
      { key: 'integration_key', label: 'Integration Key', type: 'password', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', required: true },
      { key: 'user_id', label: 'User ID (impersonation)', type: 'text', required: true }
    ],
    features: ['Signature électronique', 'Templates', 'Audit trail']
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Sauvegardez automatiquement vos documents dans Google Drive.',
    logo: 'https://drive.google.com/favicon.ico',
    category: 'stockage',
    status: 'coming_soon',
    configFields: [],
    features: ['Backup auto', 'Organisation par client', 'Partage facile']
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Intégration comptable avec QuickBooks pour le marché US/UK.',
    logo: 'https://quickbooks.intuit.com/favicon.ico',
    category: 'comptabilité',
    status: 'coming_soon',
    configFields: [],
    features: ['Factures', 'Paiements', 'Rapports']
  }
];

/**
 * GET /api/marketplace
 * Liste tous les connecteurs + statut installation
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // Récupérer les intégrations installées de l'utilisateur
    const installed = await pool.query(
      `SELECT connector_type, status, last_sync_at, created_at, metadata
       FROM marketplace_integrations
       WHERE user_id = $1`,
      [req.user.id]
    );
    
    const installedMap = new Map(
      installed.rows.map(row => [row.connector_type, row])
    );
    
    // Enrichir les connecteurs avec le statut d'installation
    const enrichedConnectors = CONNECTORS.map(connector => {
      const installation = installedMap.get(connector.id);
      return {
        ...connector,
        installed: !!installation,
        installationStatus: installation?.status || null,
        lastSyncAt: installation?.last_sync_at || null,
        installedAt: installation?.created_at || null
      };
    });
    
    // Trier : installés en premier, puis disponibles, puis coming soon
    enrichedConnectors.sort((a, b) => {
      if (a.installed && !b.installed) return -1;
      if (!a.installed && b.installed) return 1;
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (a.status !== 'available' && b.status === 'available') return 1;
      return 0;
    });
    
    res.json({
      connectors: enrichedConnectors,
      categories: [...new Set(CONNECTORS.map(c => c.category))],
      installedCount: installed.rows.length
    });
  } catch (error) {
    console.error('GET /marketplace error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * GET /api/marketplace/:connectorId
 * Détail d'un connecteur
 */
router.get('/:connectorId', verifyToken, async (req, res) => {
  try {
    const connector = CONNECTORS.find(c => c.id === req.params.connectorId);
    
    if (!connector) {
      return res.status(404).json({ error: 'connector_not_found' });
    }
    
    // Vérifier si installé
    const installation = await pool.query(
      `SELECT * FROM marketplace_integrations
       WHERE user_id = $1 AND connector_type = $2`,
      [req.user.id, req.params.connectorId]
    );
    
    res.json({
      ...connector,
      installed: installation.rows.length > 0,
      installation: installation.rows[0] || null
    });
  } catch (error) {
    console.error('GET /marketplace/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * POST /api/marketplace/:connectorId/install
 * Installe/configure un connecteur
 */
router.post('/:connectorId/install', verifyToken, async (req, res) => {
  try {
    const connector = CONNECTORS.find(c => c.id === req.params.connectorId);
    
    if (!connector) {
      return res.status(404).json({ error: 'connector_not_found' });
    }
    
    if (connector.status === 'coming_soon') {
      return res.status(400).json({ error: 'connector_not_available', message: 'Ce connecteur sera bientôt disponible' });
    }
    
    const { config } = req.body;
    
    // Valider les champs requis
    const missingFields = connector.configFields
      .filter(f => f.required && (!config || !config[f.key]))
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'missing_config',
        message: `Champs requis manquants: ${missingFields.join(', ')}`
      });
    }
    
    // Pour la démo, on simule le chiffrement (en prod, utiliser une vraie lib de chiffrement)
    const configEncrypted = Buffer.from(JSON.stringify(config || {})).toString('base64');
    
    // Upsert l'intégration
    const result = await pool.query(
      `INSERT INTO marketplace_integrations (user_id, connector_type, config_encrypted, status, metadata)
       VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (user_id, connector_type)
       DO UPDATE SET config_encrypted = $3, status = 'active', updated_at = NOW()
       RETURNING *`,
      [req.user.id, req.params.connectorId, configEncrypted, JSON.stringify({ connectorName: connector.name })]
    );
    
    res.json({
      message: `${connector.name} installé avec succès`,
      integration: {
        id: result.rows[0].id,
        connectorType: result.rows[0].connector_type,
        status: result.rows[0].status,
        installedAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('POST /marketplace/:id/install error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * DELETE /api/marketplace/:connectorId
 * Désinstalle un connecteur
 */
router.delete('/:connectorId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM marketplace_integrations
       WHERE user_id = $1 AND connector_type = $2
       RETURNING id`,
      [req.user.id, req.params.connectorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'integration_not_found' });
    }
    
    res.json({ message: 'Connecteur désinstallé', id: result.rows[0].id });
  } catch (error) {
    console.error('DELETE /marketplace/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * POST /api/marketplace/:connectorId/sync
 * Déclenche une synchronisation manuelle
 */
router.post('/:connectorId/sync', verifyToken, async (req, res) => {
  try {
    const connector = CONNECTORS.find(c => c.id === req.params.connectorId);
    
    if (!connector) {
      return res.status(404).json({ error: 'connector_not_found' });
    }
    
    // Vérifier que le connecteur est installé
    const integration = await pool.query(
      `SELECT * FROM marketplace_integrations
       WHERE user_id = $1 AND connector_type = $2`,
      [req.user.id, req.params.connectorId]
    );
    
    if (integration.rows.length === 0) {
      return res.status(400).json({ error: 'not_installed', message: 'Connecteur non installé' });
    }
    
    // Simuler une sync (en prod, appeler le vrai service)
    await pool.query(
      `UPDATE marketplace_integrations
       SET last_sync_at = NOW(), status = 'active'
       WHERE user_id = $1 AND connector_type = $2`,
      [req.user.id, req.params.connectorId]
    );
    
    res.json({
      message: `Synchronisation ${connector.name} démarrée`,
      syncedAt: new Date().toISOString(),
      // Mock sync results
      results: {
        itemsSynced: Math.floor(Math.random() * 50) + 1,
        errors: 0,
        duration: Math.floor(Math.random() * 3000) + 500
      }
    });
  } catch (error) {
    console.error('POST /marketplace/:id/sync error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

module.exports = router;
