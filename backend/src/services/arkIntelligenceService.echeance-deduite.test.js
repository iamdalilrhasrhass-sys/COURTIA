/**
 * arkIntelligenceService.echeance-deduite.test.js — UNE ÉCHÉANCE DÉDUITE EST
 * SIGNALÉE COMME TELLE (défaut P3 IA-031, 21/09/2026).
 *
 * DÉFAUT MESURÉ : l'optimiseur de renouvellements renvoie dans `echeance_date`
 * une date CALCULÉE (`created_at` + 12 mois, prolongée tant qu'elle est passée)
 * quand le dossier n'en porte aucune — et le booléen qui devait le dire était
 * calculé sur la seule présence d'un champ (`!data.date_echeance`) au lieu de la
 * source RÉELLEMENT servie. Résultat : un dossier portant sa propre échéance
 * recevait une date calculée étiquetée `false` (« date réelle »). Aucun écran ne
 * lisant `data_source` (grep frontend : 0 occurrence), le courtier lisait une
 * date déduite sans aucun marqueur.
 *
 * CONTRAT TESTÉ (trois cas exigés + un cas de fiabilité) :
 *   1. dossier SANS date → date calculée, `echeance_est_deduite === true` ;
 *   2. dossier AVEC date réelle → date du dossier, `echeance_est_deduite === false` ;
 *   3. date issue de `quote_data.date_echeance` (horodatage ISO) → `false` ;
 *   4. date du dossier ILLISIBLE → la date calculée est servie et signalée `true`
 *      (jamais une date inventée présentée comme réelle).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const porteeCabinet = require('../lib/porteeCabinet')
const { computeRenewalOptimizations } = require('./arkIntelligenceService')

const UTILISATEUR = 140
const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

/** Échéance déduite attendue : création + 12 mois, prolongée si elle est passée. */
function echeanceDeduiteAttendue(createdAt) {
  const date = new Date(createdAt)
  date.setFullYear(date.getFullYear() + 1)
  while (date < new Date()) date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function joursDepuis(createdAt) {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function jour(offsetJours) {
  return new Date(Date.now() + offsetJours * 86400000).toISOString().slice(0, 10)
}

let requetes = []

/** Pool simulé : les dossiers passés en paramètre sont les seuls lus. */
function installerPool(dossiers) {
  requetes = []
  pool.query.mockReset()
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    requetes.push({ sql: s, params })
    if (/FROM quotes q/.test(s)) return { rows: dossiers }
    return { rows: [], rowCount: 0 }
  })
}

/**
 * `created_at` à ~10 mois : l'échéance déduite (+12 mois) tombe alors dans la
 * fenêtre de 90 jours de l'optimiseur, comme un dossier réellement proche de
 * son renouvellement.
 */
function dossier({ id, quoteData, createdOffsetJours = -300 }) {
  return {
    id,
    client_id: id * 10,
    quote_data: quoteData,
    status: 'actif',
    created_at: new Date(Date.now() + createdOffsetJours * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    first_name: 'Jean',
    last_name: 'Test',
    city: 'Genève',
    loyalty_score: 60,
    lifetime_value: 1200,
  }
}

const OPTIONS = { portee: porteeCabinet.porteeMono(UTILISATEUR) }

describe('optimiseur de renouvellements — l’échéance déduite est signalée (P3 IA-031)', () => {
  beforeEach(() => installerPool([]))

  test('1. dossier SANS date : la date calculée est servie et marquée déduite', async () => {
    const d = dossier({ id: 1, quoteData: { produit: 'Auto', compagnie: 'Aurora', prime_annuelle: 900 } })
    installerPool([d])

    const { renewals } = await computeRenewalOptimizations(UTILISATEUR, OPTIONS)
    expect(renewals).toHaveLength(1)

    const r = renewals[0]
    // La date servie est bien le calcul historique (created_at + 12 mois)…
    expect(r.echeance_date).toBe(echeanceDeduiteAttendue(d.created_at))
    expect(r.days_to_echeance).toBeGreaterThanOrEqual(-7)
    expect(r.days_to_echeance).toBeLessThanOrEqual(90)
    // …et elle est signalée comme déduite, par le nom de champ explicite.
    expect(r.echeance_est_deduite).toBe(true)
    expect(r.echeance_source).toBe('derivee_creation_plus_12_mois')
    // Alias historique : même valeur, aucun appelant ne peut se tromper.
    expect(r.echeance_estimee).toBe(true)
    expect(r.data_source.echeance).toBe('derivee (creation + 12 mois)')
  })

  test('2. dossier AVEC date réelle : la date du dossier est servie, jamais recalculée', async () => {
    const dateDossier = jour(30)
    const d = dossier({
      id: 2,
      quoteData: { produit: 'Auto', compagnie: 'Aurora', prime_annuelle: 900, date_echeance: dateDossier },
      createdOffsetJours: -20,
    })
    installerPool([d])

    const { renewals } = await computeRenewalOptimizations(UTILISATEUR, OPTIONS)
    expect(renewals).toHaveLength(1)

    const r = renewals[0]
    expect(r.echeance_date).toBe(dateDossier)
    // La date servie n'est PAS le calcul created_at + 12 mois : le drapeau `false`
    // dit donc la vérité.
    expect(r.echeance_date).not.toBe(echeanceDeduiteAttendue(d.created_at))
    expect(r.echeance_est_deduite).toBe(false)
    expect(r.echeance_source).toBe('quote_data.date_echeance')
    expect(r.echeance_estimee).toBe(false)
    expect(r.data_source.echeance).toBe('quote_data.date_echeance')
  })

  test('3. date issue de quote_data.date_echeance (horodatage ISO) : déduite = false', async () => {
    const horodatage = new Date(Date.now() + 45 * 86400000).toISOString()
    const d = dossier({
      id: 3,
      quoteData: { produit: 'Habitation', date_echeance: horodatage },
      createdOffsetJours: -10,
    })
    installerPool([d])

    const { renewals } = await computeRenewalOptimizations(UTILISATEUR, OPTIONS)
    expect(renewals).toHaveLength(1)

    const r = renewals[0]
    expect(r.echeance_date).toBe(horodatage.slice(0, 10))
    expect(r.echeance_est_deduite).toBe(false)
    expect(r.echeance_source).toBe('quote_data.date_echeance')
  })

  test('4. date du dossier ILLISIBLE : la date calculée est servie et marquée déduite', async () => {
    const d = dossier({ id: 4, quoteData: { produit: 'Auto', date_echeance: 'à confirmer' } })
    installerPool([d])

    const { renewals } = await computeRenewalOptimizations(UTILISATEUR, OPTIONS)
    expect(renewals).toHaveLength(1)

    const r = renewals[0]
    expect(r.echeance_date).toBe(echeanceDeduiteAttendue(d.created_at))
    // Une valeur illisible ne peut pas faire passer une date calculée pour réelle.
    expect(r.echeance_est_deduite).toBe(true)
    expect(r.echeance_source).toBe('derivee_creation_plus_12_mois')
  })

  test('cohérence globale : le drapeau décrit toujours la date réellement servie', async () => {
    const deduit = dossier({ id: 5, quoteData: { produit: 'Auto' } })
    const reel = dossier({
      id: 6,
      quoteData: { produit: 'Prévoyance', date_echeance: jour(50) },
      createdOffsetJours: -15,
    })
    installerPool([deduit, reel])

    const { renewals } = await computeRenewalOptimizations(UTILISATEUR, OPTIONS)
    expect(renewals).toHaveLength(2)

    for (const r of renewals) {
      const dossierCorrespondant = r.contract_id === 5 ? deduit : reel
      if (r.echeance_est_deduite) {
        expect(r.echeance_date).toBe(echeanceDeduiteAttendue(dossierCorrespondant.created_at))
        expect(r.echeance_source).toBe('derivee_creation_plus_12_mois')
        expect(r.echeance_estimee).toBe(true)
      } else {
        expect(r.echeance_date).toBe(String(dossierCorrespondant.quote_data.date_echeance).slice(0, 10))
        expect(r.echeance_source).toBe('quote_data.date_echeance')
        expect(r.echeance_estimee).toBe(false)
      }
    }

    // Les deux cas coexistent dans le même scan : aucune règle globale ne peut
    // faire passer toutes les dates pour réelles (ni l'inverse).
    expect(renewals.filter((r) => r.echeance_est_deduite).length).toBe(1)
    expect(joursDepuis(deduit.created_at)).toBeGreaterThan(200)
  })
})
