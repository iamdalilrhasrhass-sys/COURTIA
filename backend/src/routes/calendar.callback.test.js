/**
 * SEC-008 — Le state OAuth Google n'était pas signé : chacun pouvait fabriquer
 * {"userId": <victime>} et faire enregistrer SON propre code d'autorisation sur
 * le compte de la victime. Le state est désormais signé (HMAC) et daté.
 */

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));
jest.mock('../services/calendarService', () => ({
  getAuthUrl: jest.fn(() => 'https://accounts.google.com/o/oauth2/auth?state=x'),
  getTokensFromCode: jest.fn(),
  createEvent: jest.fn(),
  listEvents: jest.fn(),
  deleteEvent: jest.fn(),
  updateEvent: jest.fn(),
  getConfigStatus: jest.fn(() => ({ configured: true, missing: [] })),
  isConfigured: jest.fn(() => true),
}));

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const calendarService = require('../services/calendarService');
const router = require('./calendar');

const SECRET = 'qa-only-signing-fixture-not-a-deployed-secret';

function stateSigne(payload, secret = SECRET) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('base64url');
  return `${raw}.${signature}`;
}

describe('GET /api/calendar/callback — state OAuth signé (SEC-008)', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.locals.pool = pool;
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENCRYPTION_KEY; // le secret de state retombe sur getJwtSecret()
    pool.query.mockResolvedValue({ rows: [] });
    calendarService.getTokensFromCode.mockResolvedValue({ access_token: 'at', refresh_token: 'rt' });
  });

  const callback = (query) => fetch(`${origin}/callback?${query}`, { redirect: 'manual' });

  it('refuse un state non signé (ancien format JSON)', async () => {
    const res = await callback(`code=code-attaquant&state=${encodeURIComponent(JSON.stringify({ userId: 5 }))}`);

    expect(res.status).toBe(400);
    expect(calendarService.getTokensFromCode).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('refuse un state absent', async () => {
    const res = await callback('code=code-attaquant');
    expect(res.status).toBe(400);
    expect(calendarService.getTokensFromCode).not.toHaveBeenCalled();
  });

  it('refuse un state signé avec un autre secret', async () => {
    const state = stateSigne({ userId: 5, issuedAt: Date.now() }, 'mauvais-secret');
    const res = await callback(`code=code-attaquant&state=${encodeURIComponent(state)}`);
    expect(res.status).toBe(400);
    expect(calendarService.getTokensFromCode).not.toHaveBeenCalled();
  });

  it('refuse un state signé mais expiré (au-delà de 10 minutes)', async () => {
    const state = stateSigne({ userId: 5, issuedAt: Date.now() - 11 * 60 * 1000 });
    const res = await callback(`code=code&state=${encodeURIComponent(state)}`);
    expect(res.status).toBe(400);
    expect(calendarService.getTokensFromCode).not.toHaveBeenCalled();
  });

  it('accepte un state signé valide et enregistre les jetons pour le bon utilisateur', async () => {
    const state = stateSigne({ userId: 5, provider: 'google_calendar', issuedAt: Date.now() });
    const res = await callback(`code=code&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('google=connected');
    expect(calendarService.getTokensFromCode).toHaveBeenCalledWith('code');

    const update = pool.query.mock.calls.find(([sql]) => /UPDATE users SET google_access_token/.test(sql));
    expect(update).toBeDefined();
    expect(update[1]).toEqual(['at', 'rt', 5]);
  });

  it('GET /auth-url produit un state signé, accepté par le callback', async () => {
    const token = jwt.sign({ id: 5, email: 'qa@example.invalid' }, SECRET, { expiresIn: '1h' });
    const authUrlRes = await fetch(`${origin}/auth-url`, { headers: { authorization: `Bearer ${token}` } });
    expect(authUrlRes.status).toBe(200);

    const args = calendarService.getAuthUrl.mock.calls[0][0];
    const [raw, signature] = String(args).split('.');
    const attendu = crypto.createHmac('sha256', SECRET).update(raw).digest('base64url');
    expect(signature).toBe(attendu);
    expect(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))).toMatchObject({ userId: 5 });
  });
});
