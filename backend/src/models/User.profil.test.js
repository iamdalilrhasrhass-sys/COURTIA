/**
 * User.profil.test.js — contrat SQL de l'enregistrement du profil.
 *
 * POURQUOI CE TEST : le contrat « nombre de valeurs fournies = plus haut $N
 * utilisé » a déjà cassé une route de l'application (voir
 * services/parametresSql.test.js). Il est vérifié ici pour les deux écritures
 * du profil, ainsi que la règle métier : un champ omis est CONSERVÉ (jamais
 * écrasé par NULL) et l'identité réglementaire du cabinet (registre FINMA/UID)
 * est transmise telle quelle.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const User = require('./User');

/** Rejoue le contrat des paramètres SQL. */
function controler(sql, valeurs) {
  const references = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const plusHaut = references.length ? Math.max(...references) : 0;
  expect({ plusHaut, fournis: valeurs.length }).toEqual({ plusHaut, fournis: plusHaut });
}

describe('User.mettreAJourProfil', () => {
  beforeEach(() => pool.query.mockReset());

  test('écrit users puis broker_profiles en respectant le contrat des paramètres', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 101, email: 'a@b.invalid', first_name: 'Fares', last_name: 'Yakoubi', phone: '+41790000000' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 101, registre_type: 'FINMA' }] });

    const resultat = await User.mettreAJourProfil(101, {
      first_name: 'Fares', last_name: 'Yakoubi', telephone: '+41790000000',
      registre_type: 'FINMA', registre_numero: 'F01454389', uid: 'CHE-415.337.574', pays: 'CH',
    });

    expect(resultat.ok).toBe(true);
    expect(pool.query).toHaveBeenCalledTimes(2);

    const [sqlUtilisateur, valeursUtilisateur] = pool.query.mock.calls[0];
    controler(sqlUtilisateur, valeursUtilisateur);
    expect(valeursUtilisateur).toEqual([101, 'Fares', 'Yakoubi', '+41790000000']);
    // Un champ omis ou vide ne peut pas écraser la valeur existante.
    expect(sqlUtilisateur).toContain("COALESCE(NULLIF($2, ''), first_name)");
    expect(sqlUtilisateur).toContain("COALESCE(NULLIF($4, ''), phone)");

    const [sqlProfil, valeursProfil] = pool.query.mock.calls[1];
    controler(sqlProfil, valeursProfil);
    // Identifiant + 14 colonnes : la position de chaque valeur compte.
    expect(valeursProfil[0]).toBe(101);
    expect(valeursProfil[7]).toBe('FINMA');            // registre_type
    expect(valeursProfil[8]).toBe('F01454389');         // registre_numero
    expect(valeursProfil[9]).toBe('CHE-415.337.574');   // uid
    expect(valeursProfil[11]).toBe('CH');               // pays
    // Sans `orias` dans la demande : aucune valeur inventée, colonne préservée.
    expect(valeursProfil[6]).toBeNull();
    expect(sqlProfil).toContain("orias           = COALESCE(NULLIF($7, ''), orias)");
  });

  test('crée la fiche cabinet quand elle n’existe pas encore', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 42, email: 'a@b.invalid', first_name: 'Neuf', last_name: null, phone: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_id: 42, registre_type: 'FINMA' }] });

    const resultat = await User.mettreAJourProfil(42, { first_name: 'Neuf', registre_type: 'FINMA', uid: 'CHE-1.2.3' });
    expect(resultat.ok).toBe(true);
    const [sqlInsertion, valeursInsertion] = pool.query.mock.calls[2];
    controler(sqlInsertion, valeursInsertion);
    expect(sqlInsertion).toContain('INSERT INTO broker_profiles');
    expect(valeursInsertion[4]).toBe('FINMA');
    expect(valeursInsertion[6]).toBe('CHE-1.2.3');
  });

  test('un identifiant d’utilisateur absent n’écrit rien', async () => {
    expect(await User.mettreAJourProfil(undefined, { first_name: 'X' }))
      .toEqual({ ok: false, raison: 'identifiant_utilisateur_absent' });
    expect(await User.mettreAJourProfil(null, { first_name: 'X' })).toEqual({ ok: false, raison: 'identifiant_utilisateur_absent' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('aucun champ enregistrable ⇒ aucune écriture (pas de succès vide)', async () => {
    expect(await User.mettreAJourProfil(101, {}))
      .toEqual({ ok: false, raison: 'aucun_champ_modifiable' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('un changement d’e-mail seul est signalé comme non modifiable', async () => {
    expect(await User.mettreAJourProfil(101, { email: 'nouveau@exemple.invalid' }))
      .toEqual({ ok: false, raison: 'email_non_modifiable' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('un e-mail différent est signalé quand d’autres champs sont enregistrés', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 101, email: 'actuel@exemple.invalid', first_name: 'Fares', last_name: null, phone: null }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 101 }] });
    const resultat = await User.mettreAJourProfil(101, { first_name: 'Fares', email: 'autre@exemple.invalid' });
    expect(resultat.ok).toBe(true);
    expect(resultat.champs_ignores).toEqual(['email']);
  });

  test('utilisateur inexistant : la mise à jour ne prétend pas avoir réussi', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await User.mettreAJourProfil(999999, { first_name: 'Fantôme' }))
      .toEqual({ ok: false, raison: 'utilisateur_introuvable' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
