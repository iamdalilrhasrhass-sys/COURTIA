/**
 * echeance.portee-cabinet.test.js — LA VEILLE DÉTECTE VRAIMENT LES ÉCHÉANCES DU
 * CABINET, ET LE RUN LES ENREGISTRE (défaut P1, 21/09/2026).
 *
 * Ce test ne vérifie pas seulement la FORME du SQL (couvert par
 * `detectors.portee-cabinet.test.js`) : il exécute le détecteur sur un contrat
 * réel du cabinet (appartenant à un COLLÈGUE) et prouve qu'un signal est produit,
 * puis que le runner l'insère sous `broker_id` de l'appelant.
 *
 * DÉFAUT MESURÉ : le détecteur filtrait `c.courtier_id = $1`. Le collaborateur
 * d'un cabinet à plusieurs commerciaux ne recevait donc AUCUN signal d'échéance
 * sur le portefeuille que le CRM lui affiche.
 */
const echeance = require('./echeance')
const { runArkWatch } = require('../runner')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

// Contrat ACTIF à 20 jours d'échéance, porté par le PROPRIÉTAIRE du cabinet.
const ECHEANCE = {
  quote_id: 5,
  client_id: 148,
  quote_data: { product_type: 'Auto', prime_annuelle: 1000, date_echeance: '2026-10-11' },
  created_at: new Date('2025-10-11'),
  echeance_date: '2026-10-11',
  days_until: 20,
  first_name: 'Marta',
  last_name: 'Dossier',
  cabinet_id: CAB_A,
  courtier_id: PROPRIETAIRE,
}

function creerPool(appartenances, { ligne = ECHEANCE } = {}) {
  const requetes = []
  return {
    requetes,
    query: async (sql, params) => {
      const s = String(sql)
      const p = params || []
      requetes.push({ sql: s, params: p })
      if (/cabinet_members/.test(s)) return { rows: appartenances, rowCount: appartenances.length }
      if (/INSERT INTO ark_watch_runs/.test(s)) return { rows: [{ id: 7 }], rowCount: 1 }
      if (/UPDATE ark_watch_runs/.test(s)) return { rows: [], rowCount: 1 }
      if (/INSERT INTO ark_watch_signals/.test(s)) return { rows: [{ id: 1 }], rowCount: 1 }
      if (/FROM (cabinets|r\.|referentiel)/.test(s)) return { rows: [] }
      if (/FROM quotes q/.test(s)) {
        if (/AND FALSE/.test(s)) return { rows: [], rowCount: 0 }
        const i = p.findIndex((x) => Array.isArray(x))
        const cabinetIds = i >= 0 ? p[i] : []
        const userId = i >= 0 ? p[i + 1] : p[0]
        const visible = cabinetIds.includes(ligne.cabinet_id) || ligne.courtier_id === userId
        return { rows: visible ? [ligne] : [], rowCount: visible ? 1 : 0 }
      }
      return { rows: [], rowCount: 0 }
    },
  }
}

const requeteDe = (pool, motif) => pool.requetes.find((r) => motif.test(r.sql))

describe('ARK Watch — échéances du cabinet réellement détectées (P1)', () => {
  test('(a) membre du cabinet : le contrat d’un collègue produit un signal', async () => {
    const pool = creerPool(CABINET)
    const signals = await echeance.run(COLLABORATEUR, pool)

    const requete = requeteDe(pool, /FROM quotes q/)
    expect(requete.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(requete.params).toEqual([[CAB_A], COLLABORATEUR])
    expect(signals).toHaveLength(1)
    expect(signals[0].quote_id).toBe(5)
    expect(signals[0].dedup_key).toContain('echeance:5:30')
  })

  test('(b) compte SANS cabinet : le contrat d’un tiers n’est pas lu', async () => {
    const pool = creerPool([])
    const signals = await echeance.run(COLLABORATEUR, pool)

    expect(requeteDe(pool, /FROM quotes q/).sql).toContain('c.courtier_id = $1')
    expect(signals).toEqual([])
  })

  test('(c) appartenance révoquée : aucune échéance détectée', async () => {
    const pool = creerPool(REVOQUE)
    const signals = await echeance.run(COLLABORATEUR, pool)

    expect(requeteDe(pool, /FROM quotes q/).sql).toContain('AND FALSE')
    expect(signals).toEqual([])
  })

  test('un cabinet ÉTRANGER n’est jamais détecté', async () => {
    const pool = creerPool(CABINET, { ligne: { ...ECHEANCE, cabinet_id: CAB_B, courtier_id: 141 } })
    const signals = await echeance.run(COLLABORATEUR, pool)
    expect(signals).toEqual([])
  })

  test('le runner exécute les détecteurs dans la portée du CABINET et enregistre le signal', async () => {
    const pool = creerPool(CABINET)
    const resultat = await runArkWatch(COLLABORATEUR, pool, { marche: 'FR', detectorsFilter: ['echeance'] })

    expect(resultat.success).toBe(true)
    const requeteDetecteur = requeteDe(pool, /FROM quotes q/)
    expect(requeteDetecteur.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(requeteDetecteur.params[0]).toEqual([CAB_A])

    const insertion = requeteDe(pool, /INSERT INTO ark_watch_signals/)
    expect(insertion).toBeDefined()
    // Le signal est enregistré pour l'appelant (stockage des signaux inchangé)…
    expect(insertion.params[0]).toBe(COLLABORATEUR)
    expect(resultat.signalsDetected).toBe(1)
    expect(resultat.signalsInserted).toBe(1)
    // …et la veille a bien lu le portefeuille du cabinet.
    expect(resultat.byType.echeance).toBe(1)
  })
})
