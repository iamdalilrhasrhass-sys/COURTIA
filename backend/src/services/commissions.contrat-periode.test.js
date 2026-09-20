/**
 * commissions.contrat-periode.test.js — la chaîne « contrat → commission »
 * reste écrivable et son montant reste calculable.
 *
 * POURQUOI CES TESTS (défauts reproduits en production le 20/09/2026) :
 *   1. POST /api/commissions/contracts/15 et /calculate/15 → 500
 *      « there is no unique or exclusion constraint matching the ON CONFLICT
 *      specification » : la table `commissions` n'avait aucune contrainte unique
 *      sur (user_id, contract_id, period_year, period_month).
 *   2. Deux blocages cachés derrière cette erreur (mesurés sur une copie du
 *      schéma réel) : `commission_amount` NOT NULL et jamais alimentée par le
 *      code (23502) ; et `contract_id` référençait la table `contracts` — VIDE et
 *      jamais écrite — alors que le contrat du produit est une ligne de `quotes`.
 *   3. La prime était lue uniquement dans `prime_ttc` / `premium`, deux champs
 *      que POST /api/contrats n'écrit pas : le barème ne produisait donc jamais
 *      le montant attendu (0 € × taux + frais fixes).
 *   4. Avec une portée cabinet, le contrat d'un collègue répondait « Contrat
 *      introuvable ».
 */
const fs = require('fs');
const path = require('path');
// `uuid` est distribué en ESM : Node 26 sait le `require()`, Jest non. On le
// remplace par un générateur déterministe (aucun impact sur les montants testés).
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));
const { calculateCommission } = require('./commissionsAutoService');
const { upsertCommission } = require('./commissionService');

function makePool(reponses = []) {
  const calls = [];
  return {
    calls,
    query: jest.fn(async (sql, params) => {
      calls.push({ sql: String(sql), params });
      const suivante = reponses.shift();
      if (suivante instanceof Error) throw suivante;
      return suivante || { rows: [], rowCount: 0 };
    }),
  };
}

describe('commissionsAutoService.calculateCommission', () => {
  const contrat = {
    id: 15,
    client_id: 20,
    status: 'actif',
    quote_data: { type_contrat: 'auto', compagnie: 'QA Assureur', prime_annuelle: 1200 },
    first_name: 'Léa',
    last_name: 'Dupont',
  };
  const regle = { id: 5, rate_percent: 12.5, flat_fee_cents: 5000 };

  test('la prime du contrat (`prime_annuelle`) entre dans le calcul du barème', async () => {
    const pool = makePool([
      { rows: [contrat] },
      { rows: [regle] },
      { rows: [{ id: 33, contract_id: 15, expected_amount_cents: 20000, received_amount_cents: 0, status: 'expected' }] },
    ]);

    const resultat = await calculateCommission(pool, 11, 15, '2026-09');

    // Recalcul À LA MAIN : 1200 € × 12,5 % = 150 € ; + 50 € de frais fixes = 200 €.
    expect(resultat.expected_amount_eur).toBe(200);

    const insert = pool.calls.find(({ sql }) => sql.includes('INSERT INTO commissions'));
    expect(insert).toBeTruthy();
    // $6 = montant attendu en centimes, $8 = `commission_amount` en euros.
    expect(insert.params[5]).toBe(20000);
    expect(insert.params[7]).toBe(200);
    // `commission_amount` est bien écrite (colonne NOT NULL du schéma réel).
    expect(insert.sql).toContain('commission_amount');
    expect(insert.sql).toContain('ON CONFLICT (user_id, contract_id, period_year, period_month)');
  });

  test('sans portée, la recherche du contrat reste celle de l’appelant', async () => {
    const pool = makePool([
      { rows: [contrat] },
      { rows: [regle] },
      { rows: [{ id: 33, expected_amount_cents: 20000 }] },
    ]);
    await calculateCommission(pool, 11, 15, '2026-09');
    expect(pool.calls[0].sql).toContain('c.courtier_id = $2');
    expect(pool.calls[0].params).toEqual([15, 11]);
  });

  test('avec portée cabinet, le contrat d’un collègue est légitime', async () => {
    const pool = makePool([
      { rows: [contrat] },
      { rows: [regle] },
      { rows: [{ id: 33, expected_amount_cents: 20000 }] },
    ]);
    const portee = {
      userId: 11, mode: 'cabinet', cabinetId: '96000000-0000-4000-8000-000000000001',
      cabinetIds: ['96000000-0000-4000-8000-000000000001'],
      cabinetIdsEcriture: ['96000000-0000-4000-8000-000000000001'],
      peutEcrire: true,
    };

    await calculateCommission(pool, 11, 15, '2026-09', portee);

    expect(pool.calls[0].sql).toContain('c.cabinet_id = ANY');
    // La commission créée est estampillée du cabinet (sinon elle resterait
    // invisible pour les collègues).
    const insert = pool.calls.find(({ sql }) => sql.includes('INSERT INTO commissions'));
    expect(insert.params[8]).toBe('96000000-0000-4000-8000-000000000001');
  });

  test('un contrat invisible pour la portée lève « Contrat introuvable »', async () => {
    const pool = makePool([{ rows: [] }]);
    await expect(
      calculateCommission(pool, 11, 15, '2026-09', { cabinetIds: ['x'], cabinetIdsEcriture: ['x'], peutEcrire: true })
    ).rejects.toThrow('Contrat introuvable');
  });
});

describe('commissionService.upsertCommission', () => {
  test('écrit `commission_amount` et l’upsert reste ciblé sur la période', async () => {
    const pool = makePool([
      { rows: [{ id: 15, client_id: 20, quote_data: {}, client_nom: 'Dupont', client_prenom: 'Léa' }], rowCount: 1 },
      { rows: [{ id: 33, contract_id: 15, expected_amount_cents: 12050, received_amount_cents: 10000 }], rowCount: 1 },
    ]);

    await upsertCommission(pool, { id: 11, role: 'broker' }, 15, {
      period: '2026-09', insurer: 'QA Assureur', expected_amount: '120,50', received_amount: '100,00',
    });

    const insert = pool.calls[1];
    expect(insert.sql).toContain('commission_amount');
    expect(insert.sql).toContain('ON CONFLICT (user_id, contract_id, period_year, period_month)');
    expect(insert.params[12]).toBe(120.5);
  });
});

describe('migration 114 — contrainte unique des commissions', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'db', 'migrations', '114_commissions_contrat_periode_unique.sql'),
    'utf8'
  );

  test('pose la contrainte attendue par le ON CONFLICT du code', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS commissions_user_contract_period_uniq\s+ON commissions \(user_id, contract_id, period_year, period_month\)/);
  });

  test('est rejouable et ne supprime aucune ligne en dehors des doublons fusionnés', () => {
    expect(sql).toContain('DROP TABLE IF EXISTS _comm_doublons_114');
    expect(sql).toContain('received_amount_cents = GREATEST');
    expect(sql).toMatch(/HAVING COUNT\(\*\) > 1/);
  });

  test('débloque `commission_amount` et repointe la clé étrangère vers le contrat réel', () => {
    expect(sql).toMatch(/ALTER TABLE commissions ALTER COLUMN commission_amount SET DEFAULT 0/);
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS commissions_contract_id_fkey');
    expect(sql).toContain('REFERENCES quotes(id)');
    // Rejouable : la nouvelle contrainte n'est posée qu'une fois.
    expect(sql).toContain("conname = 'commissions_contract_id_quotes_fkey'");
  });
});
