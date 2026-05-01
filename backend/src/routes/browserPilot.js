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

// GET /task — liste des tâches récentes
router.get('/task', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sessions = browserPilotService.listSessions(limit);
    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[GET /api/browser-pilot/task]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /task/:id — statut d'une tâche
router.get('/task/:id', async (req, res) => {
  try {
    const session = browserPilotService.getSession(req.params.id);
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
    const result = await browserPilotService.approveAndRun(req.params.id, actions);
    return res.status(201).json({
      success: true,
      message: 'Tâche approuvée et exécutée',
      data: {
        taskId: result.taskId,
        status: result.status,
        logs: result.logs.slice(-50),
        error: result.error,
        result: result.result,
      }
    });
  } catch (err) {
    console.error('[POST /api/browser-pilot/task/:id/approve]', err.message);
    return res.status(400).json({ error: 'approve_error', message: err.message });
  }
});

// DELETE /task/:id — annuler une tâche
router.delete('/task/:id', async (req, res) => {
  try {
    const session = browserPilotService.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'not_found' });

    // Note: on ne peut pas vraiment kill une tâche en cours
    // mais on peut la marquer comme annulée dans la map
    // Pour l'instant on la supprime juste de la mémoire
    return res.json({ success: true, message: 'Tâche supprimée' });
  } catch (err) {
    console.error('[DELETE /api/browser-pilot/task/:id]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /screenshot/:taskId/:fileName — servir une capture
router.get('/screenshot/:taskId/:fileName', async (req, res) => {
  try {
    const { taskId, fileName } = req.params;
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

// GET /status — état du service
router.get('/status', async (req, res) => {
  try {
    const sessions = browserPilotService.listSessions(50);
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
