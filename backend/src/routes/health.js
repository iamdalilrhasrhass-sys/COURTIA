const express = require('express');
const { messagePublic } = require('../lib/erreursPubliques')
const router = express.Router();

/**
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      version: '2.0'
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      error: messagePublic(err, { statut: 503 }),
      timestamp: new Date().toISOString(),
      version: '2.0'
    });
  }
});

module.exports = router;
