/**
 * detectors.portee-cabinet.test.js — LA VEILLE ARK PORTE SUR LE CABINET
 * (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : chacun des huit détecteurs filtrait `clients.courtier_id = $1`
 * (ou `client_documents.broker_id = $1`). Un collaborateur (`broker`) lançait donc
 * une veille VIDE du portefeuille que le CRM lui affiche, et lisait 0 signal là où
 * le propriétaire en lisait douze.
 *
 * CONTRAT TESTÉ, détecteur par détecteur : (a) membre de cabinet → TOUTES les
 * clauses de portée portent `= ANY($1::uuid[])` et AUCUNE ne reste sur le seul
 * propriétaire ; (b) compte sans cabinet → les clauses HISTORIQUES sont intactes
 * (`courtier_id = $1` / `broker_id = $1`) ; (c) appartenance révoquée → clause
 * fausse (`AND FALSE`), aucune détection.
 */
const { detectors } = require('./index')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]
const UTILISATEUR = 146

/** Pool simulé : enregistre chaque requête et ne renvoie aucune ligne métier. */
function creerPool(appartenances) {
  const requetes = []
  return {
    requetes,
    query: async (sql, params) => {
      const s = String(sql)
      requetes.push({ sql: s, params })
      if (/cabinet_members/.test(s)) return { rows: appartenances, rowCount: appartenances.length }
      return { rows: [], rowCount: 0 }
    },
  }
}

const codes = Object.keys(detectors)

describe('ARK Watch — portée CABINET des huit détecteurs (P1)', () => {
  test('les huit détecteurs attendus sont bien couverts par ce test', () => {
    expect(codes.sort()).toEqual([
      'chatel', 'crossSell', 'documentsExpired', 'documentsMissing',
      'echeance', 'hamon', 'reconquete', 'silence',
    ])
  })

  for (const code of codes) {
    test(`(a) ${code} : toutes les clauses de portée visent le CABINET`, async () => {
      const pool = creerPool(CABINET)
      await detectors[code].run(UTILISATEUR, pool)

      expect(pool.requetes.length).toBeGreaterThan(0)
      const metier = pool.requetes.filter((r) => !/cabinet_members/.test(r.sql))
      expect(metier.length).toBeGreaterThan(0)
      for (const r of metier) {
        // Aucune lecture métier n'est laissée au seul propriétaire…
        expect(r.sql).not.toMatch(/\bcourtier_id = \$1\b/)
        expect(r.sql).not.toMatch(/\bbroker_id = \$1\b/)
        expect(r.sql).not.toMatch(/\buser_id = \$1\b/)
        // …et la clause du cabinet est bien présente, avec le bon cabinet.
        expect(r.sql).toContain('= ANY($1::uuid[])')
        expect(r.params[0]).toEqual([CAB_A])
        expect(r.params[1]).toBe(UTILISATEUR)
      }
    })

    test(`(b) ${code} : sans cabinet, les clauses historiques sont intactes`, async () => {
      const pool = creerPool([])
      await detectors[code].run(UTILISATEUR, pool)

      const metier = pool.requetes.filter((r) => !/cabinet_members/.test(r.sql))
      expect(metier.length).toBeGreaterThan(0)
      for (const r of metier) {
        expect(r.sql).not.toContain('= ANY(')
        expect(r.sql).not.toContain('AND FALSE')
        // Exactement la clause d'avant la migration 113.
        expect(r.sql).toMatch(/\b(courtier_id|broker_id|user_id) = \$1\b/)
        expect(r.params[0]).toBe(UTILISATEUR)
      }
    })

    test(`(c) ${code} : appartenance révoquée, plus rien n’est lu`, async () => {
      const pool = creerPool(REVOQUE)
      await detectors[code].run(UTILISATEUR, pool)

      const metier = pool.requetes.filter((r) => !/cabinet_members/.test(r.sql))
      expect(metier.length).toBeGreaterThan(0)
      for (const r of metier) expect(r.sql).toContain('AND FALSE')
    })

    test(`la portée déjà résolue évite la requête d’appartenance (${code})`, async () => {
      const pool = creerPool([])
      await detectors[code].run(UTILISATEUR, pool, {
        portee: { userId: UTILISATEUR, mode: 'cabinet', cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] },
      })
      expect(pool.requetes.some((r) => /cabinet_members/.test(r.sql))).toBe(false)
      const metier = pool.requetes.filter((r) => !/cabinet_members/.test(r.sql))
      for (const r of metier) expect(r.sql).toContain('= ANY($1::uuid[])')
    })
  }
})
