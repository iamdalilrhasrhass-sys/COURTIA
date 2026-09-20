/**
 * cabinetMembers.invite.test.js — inviter un membre d'équipe.
 *
 * POURQUOI CE TEST : `POST /api/cabinet/members/invite` répondait 500
 * `invalid_role` quand le rôle envoyé n'existait pas : une faute de saisie
 * était présentée comme une panne du serveur, sans indiquer les valeurs
 * acceptées. Le contrat attendu est : rôle inconnu (ou non invitable comme
 * `super_admin`) → 400 avec la liste des rôles acceptés ; rôle valide → 201.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../services/emailService', () => ({ sendEmail: jest.fn(async () => ({ skipped: true, provider: 'none' })) }));

const express = require('express');
const pool = require('../db');
const router = require('./cabinetMembers');

const CABINET_ID = '11111111-1111-1111-1111-111111111111';

/** Répond aux requêtes réelles des middlewares (cabinet, feature flag) et du service. */
function reponseSql(sql, params) {
  const requete = sql.replace(/\s+/g, ' ');
  if (requete.includes('FROM cabinet_members') && requete.includes('JOIN cabinets')) {
    return { rows: [{
      id: 'membre-1', cabinet_id: CABINET_ID, user_id: 1, role: 'owner',
      created_at: new Date().toISOString(), cabinet_name: 'Cabinet QA', orias_number: null,
    }] };
  }
  if (requete.includes('FROM feature_flags')) {
    return { rows: [{ key: 'v1_members_onboarding', enabled: true }] };
  }
  if (requete.includes('INSERT INTO cabinet_invitations')) {
    return { rows: [{
      id: 'invitation-1', cabinet_id: params[0], email: params[1], role: params[2],
      token_hash: params[3], token_preview: params[4], invited_by: params[5],
      expires_at: params[6], accepted_at: null, created_at: new Date().toISOString(),
    }] };
  }
  return { rows: [] };
}

describe('POST /api/cabinet/members/invite', () => {
  let server;
  let origin;
  let appelsSql;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // server.js applique verifyToken globalement : l'utilisateur est authentifié.
    app.use((req, _res, next) => { req.user = { id: 1, userId: 1, role: 'broker' }; next(); });
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    appelsSql = [];
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql, params) => {
      appelsSql.push({ sql: sql.replace(/\s+/g, ' '), params });
      return reponseSql(sql, params);
    });
  });

  const inviter = (corps) => fetch(`${origin}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });

  test('un rôle inconnu répond 400 avec la liste des rôles acceptés (jamais 500)', async () => {
    const res = await inviter({ email: 'chef@exemple.invalid', role: 'chef' });
    expect(res.status).toBe(400);
    const corps = await res.json();
    expect(corps.error).toBe('invalid_role');
    expect(corps.roles_acceptes).toEqual(['owner', 'manager', 'broker', 'assistant', 'viewer']);
    expect(corps.message).toContain('owner');
    // Rien n'a été écrit en base.
    expect(appelsSql.some((a) => a.sql.includes('INSERT INTO cabinet_invitations'))).toBe(false);
  });

  test('le rôle plateforme super_admin n’est pas invitable (400)', async () => {
    const res = await inviter({ email: 'super@exemple.invalid', role: 'super_admin' });
    expect(res.status).toBe(400);
    expect((await res.json()).roles_acceptes).toContain('manager');
  });

  test('un rôle absent est refusé en 400, pas en panne serveur', async () => {
    const res = await inviter({ email: 'sansrole@exemple.invalid' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_role');
  });

  test('un rôle valide crée réellement l’invitation (201)', async () => {
    const res = await inviter({ email: 'Manager@Exemple.Invalid', role: 'manager' });
    expect(res.status).toBe(201);
    const corps = await res.json();
    expect(corps.invitation.role).toBe('manager');
    expect(corps.invitation.email).toBe('manager@exemple.invalid');
    // Le jeton en clair ne sort jamais dans l'objet invitation.
    expect(corps.invitation.token_hash).toBeUndefined();
    expect(corps.invite_link).toContain('/invite/');
  });
});
