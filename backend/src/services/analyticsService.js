const axios = require('axios');
const pool = require('../db');
const logger = require('../lib/logger');

function isPostHogConfigured() {
  return Boolean(process.env.POSTHOG_KEY);
}

function getAnalyticsStatus() {
  return {
    provider: isPostHogConfigured() ? 'posthog' : 'local',
    configured: isPostHogConfigured(),
    posthog_host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    status: isPostHogConfigured() ? 'configured' : 'local_only',
  };
}

async function ensureProductEventsTable(db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      organization_id INTEGER,
      event_name TEXT NOT NULL,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_product_events_created ON product_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_events_user_created ON product_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_events_event_created ON product_events(event_name, created_at DESC);
  `);
}

async function storeLocalEvent({ userId = null, organizationId = null, event, properties = {} }, db = pool) {
  await db.query(
    `INSERT INTO product_events (user_id, organization_id, event_name, properties)
     VALUES ($1,$2,$3,$4::jsonb)`,
    [userId || null, organizationId || null, event, JSON.stringify(properties || {})]
  );
  return { stored: true, provider: 'local' };
}

async function sendPostHogEvent({ userId = null, event, properties = {} }) {
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';
  await axios.post(`${host.replace(/\/$/, '')}/capture/`, {
    api_key: process.env.POSTHOG_KEY,
    event,
    distinct_id: userId ? String(userId) : 'anonymous',
    properties,
  }, { timeout: 5000 });
  return { sent: true, provider: 'posthog' };
}

async function trackEvent({ userId = null, organizationId = null, event, properties = {} }, options = {}) {
  if (!event) return { stored: false, skipped: true, reason: 'event_required' };
  const db = options.db || pool;

  try {
    await ensureProductEventsTable(db);
    const local = await storeLocalEvent({ userId, organizationId, event, properties }, db);
    if (isPostHogConfigured()) {
      sendPostHogEvent({ userId, event, properties }).catch((err) => {
        logger.warn({ error: err.message, event }, 'PostHog capture failed');
      });
      return { ...local, forwarded: true, provider: 'posthog' };
    }
    return local;
  } catch (err) {
    logger.warn({ error: err.message, event }, 'product event capture failed');
    return { stored: false, error: 'event_capture_failed' };
  }
}

module.exports = {
  getAnalyticsStatus,
  ensureProductEventsTable,
  trackEvent,
};
