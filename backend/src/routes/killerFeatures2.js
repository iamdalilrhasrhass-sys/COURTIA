// ============================================================
// /srv/courtia/backend/src/routes/killerFeatures2.js
// Routes Express vague 2 — Voice + Email + DDA
// À brancher dans server.js (voir INTEGRATION.md)
// ============================================================

const express = require('express');
const path = require('path');
const router = express.Router();

const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const voice = require('../services/arkVoice');
const email = require('../services/emailParser');
const dda = require('../services/ddaAudit');

// ============================================================
// FEATURE 6 — ARK VOICE
// ============================================================
router.get('/voice/settings', verifyToken, async (req, res) => {
  try {
    const s = await voice.getVoiceSettings(req.user.userId);
    res.json({ success: true, settings: s });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/voice/settings', verifyToken, async (req, res) => {
  try {
    await voice.updateVoiceSettings(req.user.userId, req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/voice/morning-brief', verifyToken, async (req, res) => {
  try {
    const result = await voice.placeMorningBriefCall(req.user.userId);
    res.json({ success: result.success, ...result });
  } catch (e) {
    console.error('[voice/morning-brief]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/voice/call-client', verifyToken, async (req, res) => {
  try {
    const { client_id, call_type } = req.body;
    const call = await voice.placeClientCall(req.user.userId, client_id, call_type || 'qualification');
    res.json({ success: true, call });
  } catch (e) {
    console.error('[voice/call-client]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/voice/history', verifyToken, async (req, res) => {
  try {
    const history = await voice.getCallHistory(req.user.userId, pool, { limit: parseInt(req.query.limit) || 20 });
    res.json({ success: true, history });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Webhook Vapi (PUBLIC — pas de verifyToken)
router.post('/voice/webhook', async (req, res) => {
  try {
    const secret = req.headers['x-vapi-secret'];
    if (process.env.VAPI_WEBHOOK_SECRET && secret !== process.env.VAPI_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    await voice.handleWebhook(req.body);
    res.json({ success: true });
  } catch (e) {
    console.error('[voice/webhook]', e);
    res.json({ success: false });
  }
});

// ============================================================
// FEATURE 7 — EMAIL PARSER
// ============================================================
router.get('/email/settings', verifyToken, async (req, res) => {
  try {
    const s = await email.getEmailSettings(req.user.userId);
    if (s) delete s.imap_password;
    res.json({ success: true, settings: s });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/settings', verifyToken, async (req, res) => {
  try {
    await email.saveEmailSettings(req.user.userId, req.body);
    if (req.body.enabled) email.startAutoScan(req.user.userId);
    else email.stopAutoScan(req.user.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/scan', verifyToken, async (req, res) => {
  try {
    const result = await email.scanInbox(req.user.userId);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[email/scan]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/email/inbox', verifyToken, async (req, res) => {
  try {
    const inbox = await email.getInbox(req.user.userId, { status: req.query.status, limit: parseInt(req.query.limit) || 50 });
    res.json({ success: true, inbox });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/:id/replied', verifyToken, async (req, res) => {
  await email.markReplied(req.params.id, req.user.userId);
  res.json({ success: true });
});

router.post('/email/:id/reviewed', verifyToken, async (req, res) => {
  await email.markReviewed(req.params.id, req.user.userId);
  res.json({ success: true });
});

router.post('/email/:id/ignore', verifyToken, async (req, res) => {
  await email.ignoreEmail(req.params.id, req.user.userId);
  res.json({ success: true });
});

// ============================================================
// FEATURE 9 — DDA AUTO-AUDIT
// ============================================================
router.post('/dda/audit/:clientId', verifyToken, async (req, res) => {
  try {
    const audit = await dda.auditClient(req.params.clientId, req.user.userId);
    res.json({ success: true, audit });
  } catch (e) {
    console.error('[dda/audit]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/dda/batch-audit', verifyToken, async (req, res) => {
  try {
    const result = await dda.batchAudit(req.user.userId);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[dda/batch]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/dda/dashboard', verifyToken, async (req, res) => {
  try {
    const dashboard = await dda.getAuditDashboard(req.user.userId);
    res.json({ success: true, dashboard });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/dda/audit/:clientId', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM dda_audits WHERE client_id=$1 AND user_id=$2`, [req.params.clientId, req.user.userId]);
    res.json({ success: true, audit: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/dda/report/:clientId', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(`SELECT report_pdf_path FROM dda_audits WHERE client_id=$1 AND user_id=$2`, [req.params.clientId, req.user.userId]);
    if (!r.rows[0]?.report_pdf_path) return res.status(404).json({ success: false, error: 'Pas de rapport disponible' });
    res.download(r.rows[0].report_pdf_path, `DDA_client_${req.params.clientId}.pdf`);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
