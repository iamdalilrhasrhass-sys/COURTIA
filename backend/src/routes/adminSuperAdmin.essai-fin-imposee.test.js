/**
 * adminSuperAdmin.essai-fin-imposee.test.js — la fin d'essai à l'HEURE PRÈS.
 *
 * POURQUOI CE TEST : `POST /api/admin/super/trials/invite` ne savait fixer la
 * fin d'essai que par une DURÉE (« 7 jours »), donc `NOW() + 7 jours` : l'heure
 * de fin dépendait de l'instant d'exécution et le cabinet ne pouvait pas se voir
 * annoncer une échéance précise (« vendredi 2 octobre 2026 à 17:00, heure de
 * Paris »). Un essai commercial se termine à une heure choisie, pas à l'heure
 * où l'exploitant a lancé la commande.
 *
 * Ce que ce test exige :
 *   1. `fin_essai_at` (ISO 8601, fuseau DANS la chaîne) est transmis tel quel au
 *      modèle — aucune conversion dépendante du fuseau du serveur ;
 *   2. la réponse dit que la fin a été IMPOSÉE et reprend l'instant réellement
 *      enregistré ;
 *   3. l'e-mail d'accès annonce CETTE heure, à l'heure de Paris ;
 *   4. une échéance illisible ou déjà passée est REFUSÉE en 400 — jamais
 *      ignorée en silence (le compte se connecterait en lecture seule sans que
 *      personne ne comprenne pourquoi) ;
 *   5. sans `fin_essai_at`, rien ne change : la durée relative reste le défaut.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 5, userId: 5, role: 'super_admin' }; next(); },
}));
jest.mock('../middleware/superAdminGuard', () => (req, _res, next) => next());
jest.mock('../models/User', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  definirAccesDirect: jest.fn(),
}));

const express = require('express');
const pool = require('../db');
const User = require('../models/User');
const router = require('./adminSuperAdmin');

const FIN_PARIS = '2026-10-02T17:00:00+02:00';
const FIN_UTC = '2026-10-02T15:00:00.000Z';

function lancer() {
  const app = express();
  app.use(express.json());
  app.use(router);
  return new Promise((resolve) => {
    const serveur = app.listen(0, '127.0.0.1', () => resolve({ serveur, origin: `http://127.0.0.1:${serveur.address().port}` }));
  });
}

async function poster(origin, corps) {
  const reponse = await fetch(`${origin}/trials/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  return { code: reponse.status, corps: await reponse.json() };
}

describe("essai : fin imposée à l'instant près", () => {
  let serveur;
  let origin;

  beforeAll(async () => { ({ serveur, origin } = await lancer()); });
  afterAll(async () => { await new Promise((r) => serveur.close(r)); });

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByEmail.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: 300, email: 'contact@exemple.fr' });
    User.definirAccesDirect.mockResolvedValue({
      id: 300,
      email: 'contact@exemple.fr',
      debut: '2026-09-25T08:00:00.000Z',
      fin: FIN_UTC,
      jours: 8,
      fin_imposee: true,
    });
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).startsWith('UPDATE users SET cabinet_name')) return { rows: [] };
      return {
        rows: [{
          subscription_status: 'trialing',
          trial_days: 8,
          invited_at: '2026-09-25T08:00:00.000Z',
          trial_started_at: '2026-09-25T08:00:00.000Z',
          trial_ends_at: FIN_UTC,
        }],
      };
    });
  });

  test("l'instant demandé est transmis tel quel au modèle (fuseau porté par la chaîne)", async () => {
    const { code } = await poster(origin, {
      email: 'contact@exemple.fr',
      cabinet_name: 'LC COURTIER EN ASSURANCES',
      first_name: 'Lalia',
      last_name: 'Chikhaoui',
      mot_de_passe_initial: 'LcCourtierEnAssurances',
      fin_essai_at: FIN_PARIS,
    });

    expect(code).toBe(201);
    expect(User.definirAccesDirect).toHaveBeenCalledTimes(1);
    const [userId, motDePasse, options] = User.definirAccesDirect.mock.calls[0];
    expect(userId).toBe(300);
    expect(motDePasse).toBe('LcCourtierEnAssurances');
    expect(options.finEssai).toBe(FIN_PARIS);
  });

  test("la réponse annonce la fin imposée et l'heure de Paris dans l'e-mail", async () => {
    const { corps } = await poster(origin, {
      email: 'contact@exemple.fr',
      cabinet_name: 'LC COURTIER EN ASSURANCES',
      first_name: 'Lalia',
      fin_essai_at: FIN_PARIS,
    });

    const inv = corps.invitation;
    expect(inv.fin_essai_imposee).toBe(true);
    expect(inv.fin_essai_demandee).toBe(FIN_PARIS);
    expect(inv.essai_finit_le).toBe(FIN_UTC);
    expect(inv.statut_compte).toBe('trialing');
    expect(inv.email_envoye).toBe(false);
    expect(inv.email_acces.html).toContain('vendredi 2 octobre 2026 à 17:00');
    expect(inv.email_acces.text).toContain('vendredi 2 octobre 2026 à 17:00');
    expect(inv.email_acces.html).toContain('(heure de Paris)');
  });

  test('une échéance illisible est refusée en 400 AVANT toute création de compte', async () => {
    const { code, corps } = await poster(origin, {
      email: 'contact@exemple.fr', cabinet_name: 'Cabinet X', fin_essai_at: 'vendredi prochain',
    });
    expect(code).toBe(400);
    expect(corps.error).toBe('fin_essai_illisible');
    expect(User.create).not.toHaveBeenCalled();
    expect(User.definirAccesDirect).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('une échéance déjà passée est refusée en 400 (pas de compte en lecture seule surprise)', async () => {
    const { code, corps } = await poster(origin, {
      email: 'contact@exemple.fr', cabinet_name: 'Cabinet X', fin_essai_at: '2020-01-01T00:00:00Z',
    });
    expect(code).toBe(400);
    expect(corps.error).toBe('fin_essai_dans_le_passe');
    expect(User.create).not.toHaveBeenCalled();
  });

  test("si le modèle refuse après la création, le compte créé est RETIRÉ (aucun compte fantôme)", async () => {
    User.definirAccesDirect.mockResolvedValue({ ok: false, raison: 'fin_essai_dans_le_passe' });
    const { code } = await poster(origin, {
      email: 'contact@exemple.fr', cabinet_name: 'Cabinet X', fin_essai_at: '2030-01-01T00:00:00Z',
    });
    expect(code).toBe(400);
    const suppressions = pool.query.mock.calls.map(([sql]) => String(sql));
    expect(suppressions.some((sql) => sql.startsWith('DELETE FROM users WHERE id = $1'))).toBe(true);
  });

  test('sans fin imposée, la durée relative reste le défaut', async () => {
    const { code, corps } = await poster(origin, {
      email: 'contact@exemple.fr', cabinet_name: 'Cabinet X', duree_essai_jours: 7,
    });
    expect(code).toBe(201);
    expect(User.definirAccesDirect.mock.calls[0][2].finEssai).toBe('');
    expect(corps.invitation.fin_essai_imposee).toBe(false);
  });
});
