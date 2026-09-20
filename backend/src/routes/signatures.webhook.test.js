/**
 * SEC-007 — Le webhook Yousign ne vérifiait la signature QUE si
 * YOUSIGN_WEBHOOK_SECRET était configuré : sans secret, un événement « signed »
 * forgeait une signature électronique inexistante. Le webhook refuse désormais
 * explicitement (503) quand le secret manque.
 */

jest.mock('../db', () => ({ query: jest.fn() }));

const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const router = require('./signatures');

const SECRET_WEBHOOK = 'qa-yousign-webhook-fixture';

function signature(rawBody, secret = SECRET_WEBHOOK) {
  return crypto.createHmac('sha256', secret).update(Buffer.from(rawBody, 'utf8')).digest('hex');
}

describe('POST /api/signatures/webhook — signature obligatoire (SEC-007)', () => {
  let server;
  let origin;
  const envInitial = { ...process.env };

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
    process.env = envInitial;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
    delete process.env.YOUSIGN_WEBHOOK_SECRET;
  });

  const evenement = JSON.stringify({ event_name: 'signature_request.done', signature_request_id: 'req-1' });

  const poster = (payload, headers = {}) => fetch(`${origin}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: payload
  });

  it('refuse (503) un webhook non signé quand le secret n\'est pas configuré', async () => {
    const res = await poster(evenement);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('configuration_required');
    expect(body.missing).toContain('YOUSIGN_WEBHOOK_SECRET');
    // Aucune écriture métier : le statut « signé » n'est jamais appliqué.
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('refuse (401) une signature absente ou invalide quand le secret est configuré', async () => {
    process.env.YOUSIGN_WEBHOOK_SECRET = SECRET_WEBHOOK;

    expect((await poster(evenement)).status).toBe(401);
    expect((await poster(evenement, { 'x-yousign-signature-256': signature('autre-corps') })).status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('accepte un événement correctement signé et applique le statut', async () => {
    process.env.YOUSIGN_WEBHOOK_SECRET = SECRET_WEBHOOK;

    const res = await poster(evenement, { 'x-yousign-signature-256': signature(evenement) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    const update = pool.query.mock.calls.find(([sql]) => /UPDATE signature_requests/.test(sql));
    expect(update).toBeDefined();
    expect(update[1]).toEqual(['signed', 'req-1']);
  });
});
