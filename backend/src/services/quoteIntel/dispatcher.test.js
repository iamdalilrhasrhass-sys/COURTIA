jest.mock('../../db', () => ({ query: jest.fn() }))

const pool = require('../../db')
const { sendBrief, sendBriefsBatch, BRIEF_STATUS } = require('./dispatcher')

const BRIEF = {
  id: 5,
  broker_id: 3,
  provider_id: 9,
  provider_name: 'Assureur Test',
  provider_email: 'contact@assureur.test',
  subject: 'Demande de tarif Auto',
  status: BRIEF_STATUS.READY,
  metadata: {},
}

describe('quoteIntel/dispatcher — aucun faux succès d\'envoi', () => {
  beforeEach(() => {
    pool.query.mockReset()
    pool.query.mockImplementation(async () => ({ rows: [BRIEF] }))
  })

  test('le dry-run ne déclare pas un envoi réussi', async () => {
    const resultat = await sendBrief(5, 3, { dryRun: true })

    expect(resultat.success).toBe(false)
    expect(resultat.email_sent).toBe(false)
    expect(resultat.dry_run).toBe(true)
    expect(resultat.status).toBe(BRIEF_STATUS.READY)
    expect(resultat.message).toMatch(/aucun envoi/i)
  })

  test('le dry-run ne touche pas au statut du brief', async () => {
    await sendBrief(5, 3, { dryRun: true })
    const ecritures = pool.query.mock.calls.map(c => String(c[0]))
    expect(ecritures.some(sql => /SET\s+status\s*=\s*'sent'/i.test(sql))).toBe(false)
    // La trace dry-run porte explicitement email_sent: false
    const metadonnees = pool.query.mock.calls
      .map(c => c[1] && c[1][0])
      .filter(v => typeof v === 'string' && v.includes('dry_run'))
    expect(metadonnees).toHaveLength(1)
    expect(JSON.parse(metadonnees[0]).email_sent).toBe(false)
  })

  test('envoi réel non activé : erreur explicite, pas un succès', async () => {
    await expect(sendBrief(5, 3, { dryRun: false })).rejects.toThrow(/pas activé/i)
  })

  test('un brief déjà marqué envoyé est refusé', async () => {
    pool.query.mockImplementation(async () => ({ rows: [{ ...BRIEF, status: 'sent' }] }))
    await expect(sendBrief(5, 3, { dryRun: true })).rejects.toThrow(/déjà envoyé/i)
  })

  test('le batch ne compte comme envoyé que les envois réels', async () => {
    const resultat = await sendBriefsBatch([5], 3, { dryRun: true })

    expect(resultat.sent).toHaveLength(0)
    expect(resultat.errors).toHaveLength(1)
    expect(resultat.errors[0].non_envoye).toBe(true)
    expect(resultat.errors[0].briefId).toBe(5)
  })
})
