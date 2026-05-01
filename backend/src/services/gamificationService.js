// Gamification Service — XP, niveaux, déblocage de cartes
const pool = require('../db');

const LEVELS = [
  { level: 1, name: 'Découverte', xp_needed: 0 },
  { level: 2, name: 'Organisé', xp_needed: 100 },
  { level: 3, name: 'Courtier Actif', xp_needed: 250 },
  { level: 4, name: 'Pilote de Portefeuille', xp_needed: 500 },
  { level: 5, name: 'Expert Relance', xp_needed: 800 },
  { level: 6, name: 'Chasseur d\'Opportunités', xp_needed: 1200 },
  { level: 7, name: 'Stratège Commercial', xp_needed: 1800 },
  { level: 8, name: 'Courtier Augmenté', xp_needed: 2500 },
  { level: 9, name: 'Architecte de Cabinet', xp_needed: 3500 },
  { level: 10, name: 'Elite COURTIA', xp_needed: 5000 },
];

function getLevelFromXp(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp_needed) current = l;
  }
  return current;
}

function getNextLevelXp(level) {
  const next = LEVELS.find(l => l.level === level + 1);
  return next ? next.xp_needed : null;
}

async function ensureUserProgress(userId) {
  await pool.query(
    `INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getUserProgress(userId) {
  await ensureUserProgress(userId);
  const res = await pool.query('SELECT * FROM user_progress WHERE user_id = $1', [userId]);
  const progress = res.rows[0] || { user_id: userId, level: 1, xp: 0 };
  const currentLevel = getLevelFromXp(progress.xp);
  const nextLevelXp = getNextLevelXp(currentLevel.level);
  const prevLevelXp = currentLevel.xp_needed;
  const percent = nextLevelXp && nextLevelXp > prevLevelXp
    ? Math.min(100, Math.round(((progress.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100))
    : 100;

  const [unlockedCards, totalCards, coursesDone] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM user_skill_cards WHERE user_id = $1', [userId]),
    pool.query('SELECT COUNT(*) FROM skill_cards WHERE is_published = true'),
    pool.query('SELECT COUNT(*) FROM user_course_progress WHERE user_id = $1 AND status = $2', [userId, 'termine']),
  ]);

  return {
    userId,
    level: currentLevel.level,
    levelName: currentLevel.name,
    xp: progress.xp,
    nextLevelXp,
    percent,
    unlockedCards: parseInt(unlockedCards.rows[0]?.count || 0),
    totalCards: parseInt(totalCards.rows[0]?.count || 0),
    coursesDone: parseInt(coursesDone.rows[0]?.count || 0),
  };
}

async function addXp(userId, amount, reason) {
  await ensureUserProgress(userId);
  const res = await pool.query(
    `UPDATE user_progress SET xp = xp + $1, last_activity_at = NOW(), updated_at = NOW() WHERE user_id = $2 RETURNING xp`,
    [amount, userId]
  );
  const newXp = res.rows[0]?.xp || amount;
  const newLevel = getLevelFromXp(newXp);
  await pool.query(
    `UPDATE user_progress SET level = $1 WHERE user_id = $2 AND level < $1`,
    [newLevel.level, userId]
  );
  console.log(`[gamification] User ${userId}: +${amount} XP (${reason}). Total: ${newXp}`);
  return { xp: newXp, level: newLevel.level, reason };
}

async function getCards(userId) {
  const cards = await pool.query(
    `SELECT * FROM skill_cards WHERE is_published = true ORDER BY
      CASE rarity
        WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3
        WHEN 'diamond' THEN 4 WHEN 'epic' THEN 5 WHEN 'legendary' THEN 6
        ELSE 99
      END, title`
  );
  const unlocked = await pool.query(
    'SELECT skill_card_id, unlocked_at, shared_at FROM user_skill_cards WHERE user_id = $1',
    [userId]
  );
  const unlockedMap = {};
  for (const u of unlocked.rows) unlockedMap[u.skill_card_id] = u;

  return cards.rows.map(card => ({
    ...card,
    unlocked: !!unlockedMap[card.id],
    unlockedAt: unlockedMap[card.id]?.unlocked_at || null,
    sharedAt: unlockedMap[card.id]?.shared_at || null,
  }));
}

async function unlockCard(userId, cardId) {
  const card = await pool.query('SELECT * FROM skill_cards WHERE id = $1', [cardId]);
  if (!card.rows.length) return { error: 'Carte introuvable' };

  await pool.query(
    `INSERT INTO user_skill_cards (user_id, skill_card_id)
     VALUES ($1, $2) ON CONFLICT (user_id, skill_card_id) DO NOTHING`,
    [userId, cardId]
  );

  const reward = card.rows[0].xp_reward || 0;
  if (reward > 0) await addXp(userId, reward, `carte: ${card.rows[0].slug}`);

  return { card: card.rows[0], xpGained: reward };
}

async function checkUnlocks(userId, eventType, payload) {
  const cards = await pool.query(
    `SELECT * FROM skill_cards WHERE is_published = true AND unlock_condition_type = $1`,
    [eventType]
  );

  const unlocked = [];
  for (const card of cards.rows) {
    const existing = await pool.query(
      'SELECT id FROM user_skill_cards WHERE user_id = $1 AND skill_card_id = $2',
      [userId, card.id]
    );
    if (existing.rows.length > 0) continue;

    let shouldUnlock = false;
    if (card.unlock_condition_value) {
      if (eventType === 'client_count') {
        const res = await pool.query('SELECT COUNT(*) as c FROM clients WHERE courtier_id = $1', [userId]);
        shouldUnlock = parseInt(res.rows[0].c) >= card.unlock_condition_value;
      } else if (eventType === 'task_count') {
        const res = await pool.query('SELECT COUNT(*) as c FROM appointments WHERE user_id = $1', [userId]);
        shouldUnlock = parseInt(res.rows[0].c) >= card.unlock_condition_value;
      } else if (eventType === 'reminder_count') {
        // Use appointment count as proxy
        const res = await pool.query('SELECT COUNT(*) as c FROM appointments WHERE user_id = $1', [userId]);
        shouldUnlock = parseInt(res.rows[0].c) >= card.unlock_condition_value;
      } else {
        // Default: unlock if payload value matches
        shouldUnlock = payload?.value >= card.unlock_condition_value;
      }
    }

    if (shouldUnlock) {
      const result = await unlockCard(userId, card.id);
      if (result.card) unlocked.push(result);
    }
  }
  return unlocked;
}

async function completeCourse(userId, courseId, answers) {
  const course = await pool.query('SELECT * FROM academy_courses WHERE id = $1', [courseId]);
  if (!course.rows.length) return { error: 'Cours introuvable' };
  const c = course.rows[0];

  // Calculer le score du quiz
  let score = 0;
  const quiz = c.quiz_json || [];
  if (Array.isArray(quiz) && Array.isArray(answers)) {
    for (let i = 0; i < quiz.length && i < answers.length; i++) {
      if (quiz[i].correct === answers[i]) score++;
    }
  }

  // Marquer comme terminé
  await pool.query(
    `INSERT INTO user_course_progress (user_id, course_id, status, score, completed_at)
     VALUES ($1, $2, 'termine', $3, NOW())
     ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'termine', score = $3, completed_at = NOW()`,
    [userId, courseId, score]
  );

  // Ajouter XP
  const xpResult = await addXp(userId, c.xp_reward || 0, `cours: ${c.slug}`);

  // Débloquer carte associée si existante
  let unlockedCard = null;
  if (c.skill_card_id) {
    const result = await unlockCard(userId, c.skill_card_id);
    if (result.card) unlockedCard = result.card;
  }

  return {
    course: c,
    score,
    total: quiz.length,
    xpGained: c.xp_reward || 0,
    unlockedCard,
  };
}

async function getReferralInfo(userId) {
  const code = `COURTIA-${userId}-${Date.now().toString(36).toUpperCase()}`;
  // Upsert referral code
  await pool.query(
    `INSERT INTO referrals (referrer_user_id, referral_code, status)
     VALUES ($1, $2, 'envoye') ON CONFLICT DO NOTHING`,
    [userId, code]
  );
  const stats = await pool.query(
    `SELECT status, COUNT(*) as count FROM referrals WHERE referrer_user_id = $1 GROUP BY status`,
    [userId]
  );
  const statsMap = { envoye: 0, inscrit: 0, converti: 0 };
  for (const s of stats.rows) statsMap[s.status] = parseInt(s.count);

  return {
    referralCode: code,
    shareUrl: `https://courtia.vercel.app/register?ref=${code}`,
    stats: statsMap,
  };
}

async function createReferral(referrerUserId, referredEmail) {
  const code = `COURTIA-${referrerUserId}-${Date.now().toString(36).toUpperCase()}`;
  await pool.query(
    `INSERT INTO referrals (referrer_user_id, referred_email, referral_code, status)
     VALUES ($1, $2, $3, 'envoye')`,
    [referrerUserId, referredEmail, code]
  );
  return { referralCode: code, shareUrl: `https://courtia.vercel.app/register?ref=${code}` };
}

async function markCardShared(userId, cardId) {
  await pool.query(
    `UPDATE user_skill_cards SET shared_at = NOW() WHERE user_id = $1 AND skill_card_id = $2`,
    [userId, cardId]
  );
  return { shared: true };
}

module.exports = {
  getUserProgress,
  addXp,
  getCards,
  unlockCard,
  checkUnlocks,
  completeCourse,
  getReferralInfo,
  createReferral,
  markCardShared,
  LEVELS,
};
