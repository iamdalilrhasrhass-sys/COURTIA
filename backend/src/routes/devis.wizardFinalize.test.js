/**
 * Tests de la route POST /api/devis/wizard/finalize (point IA-002).
 *
 * Objectif : une offre SIMULÉE (sans provenance réelle) ne doit JAMAIS devenir
 * un devis PDF destiné au client. La route répond 400 simulated_offers_refused
 * avant toute génération de document.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/devisPdfService', () => ({
  buildDevisPdf: jest.fn(),
  buildPdfPath: jest.fn(() => '/tmp/x.pdf'),
  shortId: jest.fn(() => 'abc'),
}))

const pool = require('../db')
const router = require('./devis')

function handlerPour(chemin) {
  const couche = router.stack.find(l => l.route && l.route.path === chemin)
  if (!couche) throw new Error(`Route introuvable: ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseRequete(body, userId = 1) {
  return { body, user: { userId }, params: {}, query: {} }
}

function fausseReponse() {
  const res = {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
  return res
}

describe('POST /api/devis/wizard/finalize — refus des offres simulées', () => {
  beforeEach(() => {
    pool.query.mockReset()
    // ensureWizardSchema() : le schéma existe
    pool.query.mockResolvedValue({ rows: [] })
  })

  test('une offre sans provenance est refusée avec simulated_offers_refused', async () => {
    const finalize = handlerPour('/wizard/finalize')
    const res = fausseReponse()

    await finalize(fausseRequete({
      devis_id: 12,
      offers: [{ provider: 'Simulation A', prime_annuelle_eur: 640 }],
      ark_summary: 'scénario simulé',
    }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('simulated_offers_refused')
    expect(res.corps.sources_acceptees).toEqual(['manual', 'imported', 'api'])
    expect(res.corps.offres_refusees).toContain('Simulation A')
    expect(res.corps.message).toMatch(/simulation/i)
  })

  test('une offre explicitement marquée simulation est refusée', async () => {
    const finalize = handlerPour('/wizard/finalize')
    const res = fausseReponse()

    await finalize(fausseRequete({
      devis_id: 12,
      offers: [
        { provider: 'Assureur réel', source: 'api', prime_annuelle_eur: 500 },
        { provider: 'Simulation B', source: 'simulation', is_simulation: true },
      ],
    }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('simulated_offers_refused')
    expect(res.corps.offres_refusees).toEqual(['Simulation B'])
  })

  test('aucun PDF n\'est produit quand la finalisation est refusée', async () => {
    const { buildDevisPdf } = require('../services/devisPdfService')
    const finalize = handlerPour('/wizard/finalize')
    const res = fausseReponse()

    await finalize(fausseRequete({
      devis_id: 12,
      offers: [{ provider: 'Simulation C' }],
    }), res)

    expect(buildDevisPdf).not.toHaveBeenCalled()
  })

  test('une sélection 100 % réelle passe la validation des offres', async () => {
    const finalize = handlerPour('/wizard/finalize')
    const res = fausseReponse()

    // Le schéma DB n'existe pas : la route s'arrête après la validation des
    // offres, ce qui prouve que celles-ci n'ont PAS été refusées.
    pool.query.mockRejectedValueOnce(new Error('relation does not exist'))

    await finalize(fausseRequete({
      devis_id: 12,
      offers: [{ provider: 'Axa', source: 'manual', prime_annuelle_eur: 620 }],
    }), res)

    expect(res.corps?.error).not.toBe('simulated_offers_refused')
  })

  test('une liste d\'offres vide reste refusée pour no_offers_selected', async () => {
    const finalize = handlerPour('/wizard/finalize')
    const res = fausseReponse()

    await finalize(fausseRequete({ devis_id: 12, offers: [] }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('no_offers_selected')
  })
})
