/**
 * parametresSql.test.js — garde-fou : aucune requête ne réclame un paramètre
 * qui n'existe pas, et aucune valeur fournie n'est inutilisée.
 *
 * POURQUOI CE TEST : `documentInboxService.createDocumentRequest` construisait
 * un `UPDATE` référençant `$3::jsonb` alors que seules deux valeurs étaient
 * passées. PostgreSQL refusait avec « could not determine data type of
 * parameter $2 » et la création d'une demande de pièces répondait 500 à chaque
 * appel — une fonction de base invisible depuis les tests d'alors. Le défaut
 * n'est pas le `$3` : c'est l'absence de contrôle automatique du contrat
 * (nombre de valeurs fournies = plus haut $N utilisé). Ce test l'impose.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const service = require('./documentInboxService');

/** Rejoue tous les appels SQL capturés et vérifie le contrat des paramètres. */
function controler(sql, valeurs) {
  const references = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const plusHaut = references.length ? Math.max(...references) : 0;
  const attendu = Array.isArray(valeurs) ? valeurs.length : 0;
  expect({ sql: sql.replace(/\s+/g, ' ').slice(0, 60), plusHaut, attendu })
    .toEqual({ sql: sql.replace(/\s+/g, ' ').slice(0, 60), plusHaut, attendu: plusHaut });
}

describe('service de collecte de documents : contrat des paramètres SQL', () => {
  beforeEach(() => jest.clearAllMocks());

  test('la création d’une demande de pièces ne référence que des paramètres fournis', async () => {
    // 1re requête : la demande n'existe pas encore -> un INSERT de checklist.
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 42, token: 't' }] })   // INSERT document_requests
      .mockResolvedValueOnce({ rows: [] })                          // SELECT checklist
      .mockResolvedValueOnce({ rows: [{ id: 7 }] });                // INSERT checklist

    await service.createDocumentRequest(1, 2, ['Pièce d’identité', 'RIB'], 'message', 'client@exemple.invalid');

    for (const [sql, valeurs] of pool.query.mock.calls) controler(sql, valeurs);
  });

  test('le chemin de mise à jour d’une checklist existante tient le même contrat', async () => {
    // Ici la checklist EXISTE : c'est exactement le chemin qui répondait 500.
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 42, token: 't' }] })   // INSERT document_requests
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })                 // SELECT checklist -> existante
      .mockResolvedValueOnce({ rows: [] });                         // UPDATE checklist

    await service.createDocumentRequest(1, 2, ['Pièce d’identité'], '', null);

    const appels = pool.query.mock.calls;
    expect(appels.length).toBe(3);
    const [sqlMaj, valeursMaj] = appels[2];
    controler(sqlMaj, valeursMaj);
    // Aucune référence à un paramètre $3 dans la mise à jour : il n'existe pas.
    expect(sqlMaj).not.toMatch(/\$3/);
    expect(valeursMaj.length).toBe(2);
  });
});
