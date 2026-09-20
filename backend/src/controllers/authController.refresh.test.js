/**
 * SEC-009 — Le renouvellement de session ne doit plus accepter indéfiniment un
 * jeton expiré : seul un jeton non expiré, ou expiré depuis moins que la fenêtre
 * de grâce (plafonnée à 15 min), est renouvelé. Au-delà : 401.
 * SEC-016 — Un jeton émis avant le dernier changement de mot de passe est refusé.
 *
 * Le temps est simulé (fake timers) pour dater réellement les jetons : `iat` est
 * posé par jsonwebtoken à l'instant courant.
 */

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));

const jwt = require('jsonwebtoken');
const pool = require('../db');
const User = require('../models/User');
const authController = require('./authController');

const SECRET = 'qa-only-signing-fixture-not-a-deployed-secret';
const T0 = new Date('2026-09-20T10:00:00.000Z');
const UTILISATEUR = { id: 12, email: 'qa@example.invalid', role: 'broker' };

const minutes = (n) => new Date(T0.getTime() + n * 60 * 1000);

function jeton(options = { expiresIn: '7d' }) {
  return jwt.sign({ id: 12 }, SECRET, options);
}

function reponseFactice() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

const requete = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: T0 });
  delete process.env.JWT_REFRESH_GRACE_SECONDS;
  pool.query.mockResolvedValue({ rows: [] }); // password_changed_at illisible => pas de révocation
  User.findById.mockResolvedValue(UTILISATEUR);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('authController.refresh — SEC-009 / SEC-016', () => {
  it('refuse une requête sans jeton', async () => {
    const res = reponseFactice();
    await authController.refresh(requete(null), res);
    expect(res.statusCode).toBe(401);
  });

  it('renouvelle un jeton encore valide', async () => {
    const token = jeton({ expiresIn: '1h' });
    jest.setSystemTime(minutes(10));
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(jwt.decode(res.body.token).id).toBe(12);
  });

  it('accepte un jeton expiré depuis moins que la fenêtre de grâce', async () => {
    const token = jeton({ expiresIn: '1h' });
    jest.setSystemTime(minutes(65)); // expiré depuis 5 minutes
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(200);
  });

  it('refuse un jeton expiré au-delà de la fenêtre de grâce (401, aucun renouvellement)', async () => {
    const token = jeton({ expiresIn: '1h' });
    jest.setSystemTime(new Date(T0.getTime() + 7 * 24 * 3600 * 1000)); // très largement expiré
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'session_expiree' });
    expect(res.body).not.toHaveProperty('token');
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('plafonne la fenêtre de grâce à 15 minutes quoi qu\'il arrive', async () => {
    process.env.JWT_REFRESH_GRACE_SECONDS = String(30 * 24 * 3600);
    const token = jeton({ expiresIn: '1h' });
    jest.setSystemTime(minutes(80)); // expiré depuis 20 minutes
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(401);
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    const token = jwt.sign({ id: 12 }, 'mauvais-secret-de-test', { expiresIn: '1h' });
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(401);
  });

  it('refuse le renouvellement d\'un jeton antérieur au changement de mot de passe (SEC-016)', async () => {
    const token = jeton({ expiresIn: '7d' });
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'session_revoquee' });
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('laisse passer un compte dont le mot de passe n\'a jamais été changé (password_changed_at NULL)', async () => {
    const token = jeton({ expiresIn: '7d' });
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null }] });
    jest.setSystemTime(minutes(5));
    const res = reponseFactice();

    await authController.refresh(requete(token), res);

    expect(res.statusCode).toBe(200);
  });
});
