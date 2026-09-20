/**
 * SEC-012 / SEC-015 — arkChat vérifiait les jetons avec un secret de repli codé
 * en dur ('courtia_secret_key') et laissait lire la conversation d'un client via
 * un simple ?clientId= hors production. Les deux sont supprimés.
 */

jest.mock('../services/arkChatService', () => ({
  processMessage: jest.fn(async () => ({ response: 'ok', sessionId: 1, mock: false }))
}));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));

const express = require('express');
const jwt = require('jsonwebtoken');
const arkChatService = require('../services/arkChatService');
const router = require('./arkChat');

const SECRET_QA = 'qa-only-signing-fixture-not-a-deployed-secret';
const ANCIEN_SECRET_DE_REPLI = 'courtia_secret_key';

describe('arkChat — plus de secret de repli, plus de mode démo implicite', () => {
  let server;
  let origin;
  const envInitial = { ...process.env };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.locals.pool = { query: jest.fn() };
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    process.env = envInitial;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ARK_CHAT_DEMO_MODE;
    process.env.NODE_ENV = 'development';
  });

  const poster = (query = '', headers = {}) => fetch(`${origin}/message${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'Bonjour' })
  });

  it('refuse un jeton signé avec l\'ancien secret de repli', async () => {
    const tokenAncien = jwt.sign({ clientId: 5 }, ANCIEN_SECRET_DE_REPLI, { expiresIn: '1h' });

    const res = await poster('', { authorization: `Bearer ${tokenAncien}` });

    expect(res.status).toBe(401);
    expect(arkChatService.processMessage).not.toHaveBeenCalled();
  });

  it('refuse le mode démo par ?clientId= sans activation explicite', async () => {
    const res = await poster('?clientId=5', { authorization: 'Bearer jeton-invalide' });

    expect(res.status).toBe(401);
    expect(arkChatService.processMessage).not.toHaveBeenCalled();
  });

  it('refuse le mode démo même activé en production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ARK_CHAT_DEMO_MODE = 'true';

    const res = await poster('?clientId=5', { authorization: 'Bearer jeton-invalide' });

    expect(res.status).toBe(401);
    expect(arkChatService.processMessage).not.toHaveBeenCalled();
  });

  it('autorise le mode démo uniquement sur activation explicite hors production', async () => {
    process.env.ARK_CHAT_DEMO_MODE = 'true';

    const res = await poster('?clientId=5', { authorization: 'Bearer jeton-invalide' });

    expect(res.status).toBe(200);
    expect(arkChatService.processMessage).toHaveBeenCalledWith(expect.anything(), 5, 'Bonjour', null);
  });

  it('accepte un jeton client portail signé avec le secret configuré', async () => {
    const token = jwt.sign({ clientId: 9, aud: 'client_portal' }, SECRET_QA, { expiresIn: '1h' });

    const res = await poster('', { authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(arkChatService.processMessage).toHaveBeenCalledWith(expect.anything(), 9, 'Bonjour', null);
  });
});
