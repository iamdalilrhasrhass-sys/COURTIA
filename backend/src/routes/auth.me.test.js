/**
 * auth.me.test.js — `PUT /api/auth/me` écrit VRAIMENT, sinon il le dit.
 *
 * POURQUOI CE TEST : la route répondait `{success:true,message:'Profil mis à
 * jour'}` sans qu'aucune écriture n'ait eu lieu (identifiant utilisateur absent
 * du jeton → `WHERE id = NULL` → zéro ligne), et elle ne persistait ni
 * `users.phone` ni l'identité réglementaire du cabinet — un cabinet suisse ne
 * pouvait donc pas enregistrer son numéro FINMA et son UID.
 *
 * Le faux `pool` ci-dessous TIENT COMPTE des écritures : le test fait un
 * aller-retour réel (PUT puis relecture), il ne vérifie pas seulement qu'une
 * requête a été émise.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
// server.js monte verifyToken globalement ; ici on choisit la forme du jeton.
// GET/PUT /api/auth/me utilisent `verifyToken` de ../middleware/auth.
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = global.__jetonDeTest; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = global.__jetonDeTest;
  next();
});

const express = require('express');
const pool = require('../db');
const router = require('./auth');

const UTILISATEUR_ID = 101;

function etatInitial() {
  return {
    utilisateur: {
      id: UTILISATEUR_ID, email: 'cabinet-qa@exemple.invalid',
      first_name: 'Fares', last_name: 'Yakoubi', phone: '', role: 'broker',
      plan: 'trial', subscription_status: 'trialing', created_at: '2026-01-01T00:00:00.000Z',
      must_change_password: false, trial_started_at: null, trial_ends_at: null, trial_days: 7,
    },
    profil: {
      user_id: UTILISATEUR_ID, cabinet: 'CENTURY FINANCE SARL', cabinet_name: null,
      orias: null, telephone: '+41 22 310 94 42', adresse: 'Rue de la Tour-Maîtresse 7',
      ville: 'Genève', code_postal: '1204', registre_type: 'FINMA',
      registre_numero: 'F00000000', uid: 'CHE-000.000.000', site_web: null,
      pays: 'CH', langue: 'fr', first_name: 'Fares', last_name: 'Yakoubi',
    },
  };
}

let etat = etatInitial();

/** Applique la sémantique SQL `COALESCE(NULLIF($n,''), colonne)` du code testé. */
function appliquer(valeur, existante) {
  return (valeur === null || valeur === undefined || valeur === '') ? existante : valeur;
}

/**
 * Faux pool qui exécute réellement les deux requêtes d'écriture et de lecture
 * sur un état en mémoire — donc un vrai aller-retour.
 */
function executerSql(sql, params = []) {
  const requete = sql.replace(/\s+/g, ' ');

  if (requete.startsWith('UPDATE users')) {
    if (params[0] !== UTILISATEUR_ID) return { rows: [] }; // WHERE id = $1
    etat.utilisateur.first_name = appliquer(params[1], etat.utilisateur.first_name);
    etat.utilisateur.last_name = appliquer(params[2], etat.utilisateur.last_name);
    etat.utilisateur.phone = appliquer(params[3], etat.utilisateur.phone);
    return { rows: [{ ...etat.utilisateur }] };
  }

  if (requete.startsWith('UPDATE broker_profiles')) {
    if (params[0] !== UTILISATEUR_ID) return { rows: [] }; // WHERE user_id = $1
    const colonnes = ['cabinet', 'telephone', 'adresse', 'ville', 'code_postal', 'orias',
      'registre_type', 'registre_numero', 'uid', 'site_web', 'pays', 'langue', 'first_name', 'last_name'];
    colonnes.forEach((colonne, index) => {
      etat.profil[colonne] = appliquer(params[index + 1], etat.profil[colonne]);
    });
    return { rows: [{ ...etat.profil }] };
  }

  if (requete.startsWith('INSERT INTO broker_profiles')) {
    const colonnes = ['user_id', 'cabinet', 'pays', 'langue', 'registre_type', 'registre_numero',
      'uid', 'orias', 'telephone', 'adresse', 'ville', 'code_postal', 'site_web', 'first_name', 'last_name'];
    etat.profil = {};
    colonnes.forEach((colonne, index) => { etat.profil[colonne] = params[index]; });
    return { rows: [{ ...etat.profil }] };
  }

  if (requete.includes('FROM broker_profiles')) return { rows: etat.profil ? [{ ...etat.profil }] : [] };
  if (requete.includes('FROM users')) return { rows: [{ ...etat.utilisateur }] };
  return { rows: [] };
}

describe('PUT /api/auth/me — persistance réelle du profil et de l’identité du cabinet', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => {
    etat = etatInitial();
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql, params) => executerSql(sql, params));
    global.__jetonDeTest = { id: UTILISATEUR_ID, userId: UTILISATEUR_ID, role: 'broker' };
  });
  afterAll(() => { delete global.__jetonDeTest; });

  const envoyer = (methode, chemin, corps) => fetch(`${origin}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });

  test('un cabinet suisse enregistre FINMA + IIDE/UID et les relit à l’identique', async () => {
    const reponse = await envoyer('PUT', '/me', {
      registre_type: 'FINMA',
      registre_numero: 'F01454389',
      uid: 'CHE-415.337.574',
      pays: 'CH',
      langue: 'fr',
      cabinet: 'CENTURY FINANCE SARL',
      telephone: '+41 22 310 94 42',
      adresse: 'Rue de la Tour-Maîtresse 7',
      ville: 'Genève',
      code_postal: '1204',
      // Aucun `orias` : il ne doit JAMAIS être exigé d'un cabinet suisse.
    });
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).success).toBe(true);

    const relecture = await (await envoyer('GET', '/me')).json();
    expect(relecture.registre_type).toBe('FINMA');
    expect(relecture.registre_numero).toBe('F01454389');
    expect(relecture.uid).toBe('CHE-415.337.574');
    expect(relecture.pays).toBe('CH');
    expect(relecture.langue).toBe('fr');
    expect(relecture.cabinet).toBe('CENTURY FINANCE SARL');
    expect(relecture.telephone).toBe('+41 22 310 94 42');
    expect(relecture.adresse).toBe('Rue de la Tour-Maîtresse 7');
    expect(relecture.ville).toBe('Genève');
    expect(relecture.code_postal).toBe('1204');
    // `orias` reste une donnée française : vide, et cela ne bloque rien.
    expect(relecture.orias).toBe('');
  });

  test('un jeton qui ne porte que `userId` écrit quand même (le bug « rien n’est écrit »)', async () => {
    global.__jetonDeTest = { userId: UTILISATEUR_ID, email: 'cabinet-qa@exemple.invalid' };
    const reponse = await envoyer('PUT', '/me', { first_name: 'Fares-MAJ', telephone: '+41 79 000 00 00' });
    expect(reponse.status).toBe(200);
    expect(etat.utilisateur.first_name).toBe('Fares-MAJ');
    expect(etat.utilisateur.phone).toBe('+41 79 000 00 00');
    expect(etat.profil.telephone).toBe('+41 79 000 00 00');
  });

  test('un formulaire partiel ne détruit pas adresse, ville, code postal ni orias', async () => {
    // Exactement les champs envoyés par l'écran Paramètres.
    const reponse = await envoyer('PUT', '/me', {
      first_name: 'Fares', last_name: 'Yakoubi', email: 'cabinet-qa@exemple.invalid',
      cabinet: 'CENTURY FINANCE SARL', orias: '', telephone: '+41 22 310 94 42',
    });
    expect(reponse.status).toBe(200);
    expect(etat.profil.adresse).toBe('Rue de la Tour-Maîtresse 7');
    expect(etat.profil.ville).toBe('Genève');
    expect(etat.profil.code_postal).toBe('1204');
    // Un cabinet suisse conserve son registre FINMA et n'écrase pas orias.
    expect(etat.profil.registre_type).toBe('FINMA');
    expect(etat.profil.orias).toBeNull();
  });

  test('un corps vide répond 400 : aucun succès sans écriture', async () => {
    const reponse = await envoyer('PUT', '/me', {});
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error).toBe('aucune_modification');
  });

  test('une tentative de changement d’e-mail est refusée, pas annoncée comme enregistrée', async () => {
    // Seul l'e-mail change : rien n'est écrit, donc aucun succès.
    const reponse = await envoyer('PUT', '/me', { email: 'nouveau@exemple.invalid' });
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error).toBe('email_non_modifiable');
    expect(etat.utilisateur.email).toBe('cabinet-qa@exemple.invalid');
  });

  test('les autres champs sont enregistrés et l’e-mail non modifiable est SIGNALÉ', async () => {
    const reponse = await envoyer('PUT', '/me', {
      first_name: 'Fares-MAJ', email: 'nouveau@exemple.invalid',
    });
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps.success).toBe(true);
    expect(corps.champs_ignores).toEqual(['email']);
    expect(etat.utilisateur.first_name).toBe('Fares-MAJ');
    expect(etat.utilisateur.email).toBe('cabinet-qa@exemple.invalid');
  });

  test('un e-mail inchangé (cas du formulaire) n’est pas signalé', async () => {
    const reponse = await envoyer('PUT', '/me', {
      first_name: 'Fares', email: 'Cabinet-QA@Exemple.Invalid',
    });
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).champs_ignores).toEqual([]);
  });

  test('un utilisateur inconnu répond 404, jamais un succès trompeur', async () => {
    global.__jetonDeTest = { id: 999999, userId: 999999 };
    const reponse = await envoyer('PUT', '/me', { first_name: 'Fantôme' });
    expect(reponse.status).toBe(404);
    expect((await reponse.json()).success).toBeUndefined();
  });

  test('un jeton sans identifiant du tout est refusé avant toute écriture', async () => {
    global.__jetonDeTest = { email: 'sans-id@exemple.invalid' };
    const reponse = await envoyer('PUT', '/me', { first_name: 'X' });
    expect(reponse.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
