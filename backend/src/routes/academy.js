// Academy Routes — /api/academy/*
const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const gamification = require('../services/gamificationService');
const router = express.Router();

router.use(verifyToken);

// ─── PROGRESS ─────────────────────────────────
router.get('/progress', async (req, res) => {
  try {
    const data = await gamification.getUserProgress(req.user.userId || req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CARDS ────────────────────────────────────
router.get('/cards', async (req, res) => {
  try {
    const cards = await gamification.getCards(req.user.userId || req.user.id);
    res.json({ success: true, data: cards });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cards/:id/share', async (req, res) => {
  try {
    const result = await gamification.markCardShared(req.user.userId || req.user.id, req.params.id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── COURSES ──────────────────────────────────
router.get('/courses', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const courses = await pool.query(
      'SELECT * FROM academy_courses WHERE is_published = true ORDER BY difficulty, title'
    );
    const progress = await pool.query(
      'SELECT course_id, status, score FROM user_course_progress WHERE user_id = $1',
      [userId]
    );
    const progressMap = {};
    for (const p of progress.rows) progressMap[p.course_id] = p;

    const result = courses.rows.map(c => ({
      ...c,
      progress: progressMap[c.id] || { status: 'en_cours', score: 0 },
    }));
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/courses/:slug', async (req, res) => {
  try {
    const course = await pool.query(
      'SELECT * FROM academy_courses WHERE slug = $1 AND is_published = true',
      [req.params.slug]
    );
    if (!course.rows.length) return res.status(404).json({ error: 'Cours introuvable' });
    res.json({ success: true, data: course.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/courses/:id/complete', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { answers } = req.body;
    const result = await gamification.completeCourse(userId, parseInt(req.params.id), answers);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── EVENTS ───────────────────────────────────
router.post('/events', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { eventType, payload } = req.body;
    if (!eventType) return res.status(400).json({ error: 'eventType requis' });

    // Add XP for event
    await gamification.addXp(userId, payload?.xp || 10, `event: ${eventType}`);

    // Check card unlocks
    const unlocked = await gamification.checkUnlocks(userId, eventType, payload);

    res.json({ success: true, xpAdded: payload?.xp || 10, unlockedCards: unlocked.length, unlocked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── REFERRAL ─────────────────────────────────
router.get('/referral', async (req, res) => {
  try {
    const data = await gamification.getReferralInfo(req.user.userId || req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/referral/invite', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email requis' });
    const data = await gamification.createReferral(req.user.userId || req.user.id, email);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
