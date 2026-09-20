const express = require('express');
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../models/User', () => ({ findByEmail: jest.fn(), create: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn() }));
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const router = require('./auth');

describe('Google authentication trust boundary', () => {
  let server;
  let origin;
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), router);
    await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    await new Promise(resolve => server.close(resolve));
  });
  beforeEach(() => { jest.clearAllMocks(); process.env.GOOGLE_CLIENT_ID = 'qa-client-id'; });
  const post = body => fetch(`${origin}/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('email and googleId alone never authenticate an existing user', async () => {
    const res = await post({ email: 'qa-victim@example.invalid', googleId: 'invented' });
    expect(res.status).toBe(401);
    expect(User.findByEmail).not.toHaveBeenCalled();
  });
  test('fails closed when Google is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await post({ credential: 'invalid' })).status).toBe(503);
    expect(User.findByEmail).not.toHaveBeenCalled();
  });
  test('rejects an invalid signature or unverified email', async () => {
    OAuth2Client.mockImplementation(() => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('bad signature')) }));
    expect((await post({ credential: 'invalid' })).status).toBe(401);
    OAuth2Client.mockImplementation(() => ({ verifyIdToken: jest.fn().mockResolvedValue({ getPayload: () => ({ sub: 'qa-sub', email: 'qa@example.invalid', email_verified: false }) }) }));
    expect((await post({ credential: 'unverified' })).status).toBe(401);
    expect(User.findByEmail).not.toHaveBeenCalled();
  });
  test('uses only the audience-verified identity, never the submitted email', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ getPayload: () => ({ sub: 'qa-sub', email: 'QA@example.invalid', email_verified: true }) });
    OAuth2Client.mockImplementation(() => ({ verifyIdToken }));
    User.findByEmail.mockResolvedValue({ id: 1, email: 'qa@example.invalid', role: 'broker' });
    expect((await post({ credential: 'verified-fixture', email: 'someone-else@example.invalid' })).status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'verified-fixture', audience: 'qa-client-id' });
    expect(User.findByEmail).toHaveBeenCalledWith('qa@example.invalid');
  });
});
