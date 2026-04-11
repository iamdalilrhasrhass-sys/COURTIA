const express = require('express');
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
      error: err.message,
      timestamp: new Date().toISOString(),
      version: '2.0'
    });
  }
});

module.exports = router;
