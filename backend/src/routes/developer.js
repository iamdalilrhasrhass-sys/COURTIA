/**
 * Developer Routes — LOT 23
 * Gestion des clés API pour utilisateurs connectés
 *
 * CORRECTION 20/09/2026 (Red Team P1 #3) : `POST /api/developer/keys` ÉMETTAIT
 * des clés d'API permanentes pour un rôle de cabinet en LECTURE SEULE
 * (`assistant`) — mesuré en production : `api_keys` id 1 et 2 créés par un
 * compte sans droit d'écriture. Une clé d'API ouvre l'API publique du cabinet
 * avec les scopes qu'on lui donne : c'est un acte d'administration, pas une
 * lecture. Toutes les écritures de ce routeur (clé, webhook) passent donc par
 * `exigerEcritureCabinet`.
 *
 * CORRECTION 20/09/2026 (troisième QA adverse — défauts D3-05 / D2-22 et D3-03)
 *   * `GET /api/developer/keys/:keyId/usage` répondait 200 `{"stats":[]}` pour
 *     une clé d'un AUTRE cabinet : aucune donnée n'était exposée, mais la
 *     ressource inexistante était annoncée comme existante et vide. La clé est
 *     désormais résolue DANS LA PORTÉE DU CABINET avant tout calcul ; hors
 *     portée = 404 (une clé d'API n'est jamais confirmée à un tiers).
 *   * plus aucun `error.message` dans une réponse : le détail (moteur, système,
 *     fournisseur) reste dans les journaux du serveur. Une panne se dit en mots.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const porteeCabinet = require('../lib/porteeCabinet');
const apiKeyService = require('../services/apiKeyService');
const { exigerEcritureCabinet } = require('../middleware/gardeEcritureRole');

/** Refus 403 pour un rôle de cabinet en lecture seule (assistant / viewer). */
const ecrire = exigerEcritureCabinet(null, "gérer les accès techniques du cabinet (clés d'API, webhooks)");

/** Journalise le détail technique côté serveur (jamais renvoyé au client). */
function journaliser(contexte, error) {
  console.error(contexte + ':', (error && (error.code || error.name)) || 'erreur');
}

/**
 * GET /api/developer/keys
 * Liste les clés API de l'utilisateur
 */
router.get('/keys', async (req, res) => {
  try {
    const keys = await apiKeyService.listApiKeys(req.user.id);
    res.json({ keys });
  } catch (error) {
    journaliser('GET /developer/keys', error);
    res.status(500).json({
      error: 'cles_indisponibles',
      message: "La liste des clés d'API n'a pas pu être chargée.",
    });
  }
});

/**
 * POST /api/developer/keys
 * Génère une nouvelle clé API
 */
router.post('/keys', ecrire, async (req, res) => {
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
    journaliser('POST /developer/keys', error);
    res.status(500).json({
      error: 'cle_non_creee',
      message: "La clé d'API n'a pas pu être créée.",
    });
  }
});

/**
 * DELETE /api/developer/keys/:keyId
 * Révoque une clé API
 */
router.delete('/keys/:keyId', ecrire, async (req, res) => {
  try {
    const revoked = await apiKeyService.revokeApiKey(req.params.keyId, req.user.id);

    if (!revoked) {
      return res.status(404).json({ error: 'key_not_found', message: 'Clé non trouvée ou déjà révoquée' });
    }

    res.json({ message: 'Clé révoquée avec succès' });
  } catch (error) {
    journaliser('DELETE /developer/keys/:keyId', error);
    res.status(500).json({
      error: 'cle_non_revoquee',
      message: "La clé d'API n'a pas pu être révoquée.",
    });
  }
});

/**
 * GET /api/developer/keys/:keyId/usage
 * Statistiques d'usage d'une clé
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DE LA CLÉ (correction du 20/09/2026 — D3-05 / D2-22, P3)
 *
 * DÉFAUT MESURÉ : la route répondait 200 `{"stats":[]}` à un cabinet ÉTRANGER
 * pour la clé d'un autre cabinet. Le tableau vide n'exposait rien, mais il
 * CONFIRMAIT la ressource et laissait la route atteignable : un « succès vide »
 * n'est pas une réponse, c'est un faux succès.
 *
 * RÈGLE TENUE : la clé est résolue dans la portée du cabinet AVANT tout calcul —
 * la clé de l'appelant, ou celle d'un COLLABORATEUR du même cabinet (comme
 * n'importe quelle donnée du cabinet) ; toute autre clé, et tout compte sans
 * droit (appartenance révoquée), répond 404. Aucun identifiant de clé d'autrui
 * n'est confirmé, ni par un succès, ni par un refus différent.
 * ────────────────────────────────────────────────────────────────────────────
 */
router.get('/keys/:keyId/usage', async (req, res) => {
  const refus = () =>
    res.status(404).json({ error: 'key_not_found', message: 'Clé non trouvée.' });

  try {
    const portee = await porteeCabinet.resoudrePortee(req.app.locals.pool || pool, req);
    // Compte sans droit (appartenance révoquée) : rien ne lui est confirmé.
    if (portee.mode === 'revoquee') return refus();

    const parametres = [req.params.keyId, portee.userId];
    let clauseCabinet = '';
    if (portee.cabinetIds && portee.cabinetIds.length > 0) {
      // `api_keys` n'a pas de colonne cabinet : l'appartenance de la clé se lit
      // par son PROPRIÉTAIRE, membre actif d'un cabinet de l'appelant.
      parametres.push(portee.cabinetIds);
      clauseCabinet = ` OR EXISTS (
             SELECT 1 FROM cabinet_members cm
              WHERE cm.user_id = ak.user_id
                AND cm.cabinet_id = ANY($3::uuid[])
                AND cm.removed_at IS NULL)`;
    }

    const cle = await pool.query(
      `SELECT ak.id FROM api_keys ak
        WHERE ak.id = $1 AND (ak.user_id = $2${clauseCabinet})
        LIMIT 1`,
      parametres
    );
    if (!cle.rows.length) return refus();

    const stats = await apiKeyService.getUsageStats(req.params.keyId, 30);
    res.json({ stats });
  } catch (error) {
    journaliser('GET /developer/keys/:keyId/usage', error);
    res.status(500).json({
      error: 'usage_indisponible',
      message: "Les statistiques d'usage de cette clé n'ont pas pu être chargées.",
    });
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
    journaliser('GET /developer/webhooks', error);
    res.status(500).json({
      error: 'webhooks_indisponibles',
      message: "La liste des webhooks n'a pas pu être chargée.",
    });
  }
});

/**
 * POST /api/developer/webhooks
 * Crée un webhook
 */
router.post('/webhooks', ecrire, async (req, res) => {
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
    journaliser('POST /developer/webhooks', error);
    res.status(500).json({
      error: 'webhook_non_cree',
      message: "Le webhook n'a pas pu être créé.",
    });
  }
});

/**
 * DELETE /api/developer/webhooks/:webhookId
 * Supprime un webhook
 */
router.delete('/webhooks/:webhookId', ecrire, async (req, res) => {
  try {
    const deleted = await apiKeyService.deleteWebhook(req.params.webhookId, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'webhook_not_found' });
    }

    res.json({ message: 'Webhook supprimé' });
  } catch (error) {
    journaliser('DELETE /developer/webhooks/:webhookId', error);
    res.status(500).json({
      error: 'webhook_non_supprime',
      message: "Le webhook n'a pas pu être supprimé.",
    });
  }
});

module.exports = router;
