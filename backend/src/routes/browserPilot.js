/**
 * browserPilotRoutes.js — API pour ARK Browser Pilot
 *
 * POST   /task          → créer et lancer une tâche navigateur
 * GET    /task          → liste des tâches récentes
 * GET    /task/:id      → statut et logs d'une tâche
 * POST   /task/:id/approve → approuver une tâche en dry-run
 * DELETE /task/:id      → annuler/supprimer une tâche
 * GET    /screenshot/:taskId/:file → servir une capture
 * GET    /status        → état du service
 * GET    /allowed-urls  → liste des URLs autorisées
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/authMiddleware');

const browserPilotService = require('../services/browserPilotService');

router.use(verifyToken);

/**
 * Identifiant de l'appelant.
 * POURQUOI il est désormais transmis PARTOUT (P2 SEC-011, mesuré en production
 * le 20/09/2026) : les sessions du Browser Pilot étaient partagées entre TOUS
 * les cabinets. `routes/browserPilot.js` ne vérifiait que la présence d'un
 * jeton valide, `listSessions` renvoyait l'ensemble des sessions du serveur et
 * `getSession` n'avait aucun contrôle de propriétaire : un cabinet lisait — et
 * pouvait approuver — les tâches, journaux et captures d'un autre.
 * La session est maintenant indexée par utilisateur ; toute ressource d'un
 * autre cabinet répond 404 (la ressource n'existe pas pour l'appelant, elle ne
 * lui est pas « interdite »).
 */
function identifiantAppelant(req) {
  const id = Number(req.user?.id || req.user?.userId);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// POST /task — créer et lancer une tâche
router.post('/task', async (req, res) => {
  try {
    const { actions, dryRun, headless, name } = req.body;
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'actions (tableau) requis avec au moins 1 action'
      });
    }

    if (actions.length > 30) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Maximum 30 actions par tâche'
      });
    }

    const task = {
      taskId: undefined,
      // Propriétaire de la session : c'est lui, et lui seul, qui pourra la
      // relire, l'approuver ou la supprimer.
      userId: identifiantAppelant(req),
      actions,
      dryRun: dryRun !== undefined ? dryRun : true,
      headless: headless !== undefined ? headless : true,
    };

    const result = await browserPilotService.runTask(task);

    return res.status(result.status === 'failed' ? 400 : 201).json({
      success: result.status !== 'failed',
      data: {
        taskId: result.taskId,
        status: result.status,
        logs: result.logs.slice(-50),
        screenshots: result.screenshots?.length || 0,
        error: result.error,
        dryRunPlan: result.dryRunPlan,
        result: result.result,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      }
    });
  } catch (err) {
    console.error('[POST /api/browser-pilot/task]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /task — liste des tâches récentes DE L'APPELANT
router.get('/task', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    // Le propriétaire est passé en paramètre : le service ne renvoie QUE ses
    // sessions (fail-closed si l'identifiant est absent).
    const sessions = browserPilotService.listSessions(limit, identifiantAppelant(req));
    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[GET /api/browser-pilot/task]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /task/:id — statut d'une tâche
router.get('/task/:id', async (req, res) => {
  try {
    // 404 (et non 403) pour la session d'un autre cabinet : elle n'existe pas
    // pour l'appelant. Un 403 lui apprendrait qu'elle existe.
    const session = browserPilotService.getSession(req.params.id, identifiantAppelant(req));
    if (!session) {
      return res.status(404).json({ error: 'not_found', message: 'Tâche introuvable ou expirée' });
    }

    return res.json({
      success: true,
      data: {
        taskId: session.taskId,
        status: session.status,
        logs: session.logs,
        screenshots: session.screenshots,
        error: session.error,
        dryRunPlan: session.dryRunPlan,
        result: session.result,
        lastExtracted: session.lastExtracted,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      }
    });
  } catch (err) {
    console.error('[GET /api/browser-pilot/task/:id]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /task/:id/approve — approuver et exécuter
router.post('/task/:id/approve', async (req, res) => {
  try {
    const { actions } = req.body;
    const userId = identifiantAppelant(req);
    // Contrôle de propriétaire AVANT d'exécuter : sans lui, un cabinet pouvait
    // faire exécuter la tâche préparée par un autre (défaut P2 SEC-011).
    if (!browserPilotService.getSession(req.params.id, userId)) {
      return res.status(404).json({ error: 'not_found', message: 'Tâche introuvable ou expirée' });
    }
    const result = await browserPilotService.approveAndRun(req.params.id, actions, userId)
    // VÉRITÉ DE L'APPROBATION — correction 20/09/2026.
    // Cette route répondait 201 `{success: true, message: 'Tâche approuvée et
    // exécutée'}` même quand l'exécution avait échoué (`status: 'failed'`,
    // sélecteur introuvable, URL refusée) : le courtier lisait « exécutée »
    // alors que rien n'avait abouti, et le champ `error` passait inaperçu.
    if (result.status === 'failed') {
      return res.status(502).json({
        success: false,
        message: "La tâche n'a pas été exécutée : elle a échoué.",
        data: {
          taskId: result.taskId,
          status: result.status,
          logs: result.logs.slice(-50),
          error: result.error,
          result: result.result,
        },
      })
    }
    const partielle = result.status === 'partial'
    return res.status(partielle ? 207 : 201).json({
      success: true,
      message: partielle
        ? 'Tâche exécutée PARTIELLEMENT : certaines actions prévues n\'ont pas été jouées.'
        : 'Tâche approuvée et exécutée',
      data: {
        taskId: result.taskId,
        status: result.status,
        logs: result.logs.slice(-50),
        error: result.error,
        result: result.result,
      }
    })
  } catch (err) {
    console.error('[POST /api/browser-pilot/task/:id/approve]', err.message);
    return res.status(400).json({ error: 'approve_error', message: err.message });
  }
});

// DELETE /task/:id — annuler une tâche
router.delete('/task/:id', async (req, res) => {
  try {
    // Correction 20/09/2026 : la route répondait `{success: true, message:
    // 'Tâche supprimée'}` SANS RIEN supprimer (aucun appel au service). La
    // tâche réapparaissait immédiatement dans la liste. On supprime vraiment,
    // et on ne dit « supprimée » que si une session a été retirée.
    const supprimee = browserPilotService.cancelSession(req.params.id, identifiantAppelant(req))
    if (!supprimee) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Tâche introuvable, déjà terminée et nettoyée, ou annulée par un autre accès.',
      })
    }
    return res.json({
      success: true,
      message: 'Tâche annulée et retirée du suivi',
      data: {
        taskId: req.params.id,
        supprimee: true,
        limite: "Une action Playwright déjà en cours n'est pas interrompue : le navigateur se ferme à la fin de l'action courante.",
      },
    })
  } catch (err) {
    console.error('[DELETE /api/browser-pilot/task/:id]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /screenshot/:taskId/:fileName — servir une capture
router.get('/screenshot/:taskId/:fileName', async (req, res) => {
  try {
    const { taskId, fileName } = req.params;
    // La capture appartient à la session : hors de son cabinet, elle est
    // introuvable (404). Sans ce contrôle, les captures d'écran d'un cabinet
    // (pages client, tableaux de bord) étaient servies à tous les autres.
    if (!browserPilotService.getSession(taskId, identifiantAppelant(req))) {
      return res.status(404).json({ error: 'not_found' });
    }
    // Éviter path traversal
    const sanitized = path.basename(fileName);
    const filePath = path.join('/tmp/browser-pilot', taskId, sanitized);
    if (!filePath.startsWith('/tmp/browser-pilot/')) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.sendFile(filePath);
  } catch (err) {
    console.error('[GET /api/browser-pilot/screenshot]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /status — état du service (compteurs DES SESSIONS DE L'APPELANT)
router.get('/status', async (req, res) => {
  try {
    const sessions = browserPilotService.listSessions(50, identifiantAppelant(req));
    return res.json({
      success: true,
      data: {
        active: sessions.filter(s => s.status === 'running').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        failed: sessions.filter(s => s.status === 'failed').length,
        pending: sessions.filter(s => s.status === 'needs_approval').length,
        total: sessions.length,
        allowedUrls: browserPilotService.URL_ALLOWLIST,
      }
    });
  } catch (err) {
    console.error('[GET /api/browser-pilot/status]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /allowed-urls — URLs autorisées
router.get('/allowed-urls', async (req, res) => {
  return res.json({ success: true, data: browserPilotService.URL_ALLOWLIST });
});

module.exports = router;
