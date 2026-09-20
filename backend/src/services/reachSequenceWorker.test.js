/**
 * reachSequenceWorker.test.js — garde-fou : le worker REACH n'annonce jamais un
 * envoi qui n'a pas eu lieu.
 *
 * POURQUOI CE TEST (mesuré le 20/09/2026) : l'étape e-mail appelait
 * sendCommercialEmail SANS lire `success`, puis écrivait
 * reach_messages.status='sent' et renvoyait {ok:true,action:'email_sent'}.
 * Sans fournisseur d'e-mail (ou sans EMAIL_REPLY_TO) l'envoi était pourtant
 * refusé par emailService → des messages « envoyés » inexistants alimentaient
 * les KPI de /api/reach (sent_messages, sent_count, total_messages) et la
 * séquence avançait comme si le prospect avait été contacté.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('./emailService', () => ({
  sendCommercialEmail: jest.fn(),
  getEmailStatus: jest.fn(),
  isCommercialEmailReady: jest.fn(),
}))

const pool = require('../db')
const { sendCommercialEmail, getEmailStatus, isCommercialEmailReady } = require('./emailService')
const { tick } = require('./reachSequenceWorker')

const RUN = {
  id: 1,
  sequence_id: 5,
  prospect_id: 9,
  current_step: 0,
  status: 'active',
  next_run_at: new Date(),
  user_id: 42,
  steps_json: [
    { day_offset: 0, channel: 'email', subject: 'Bonjour', template: 'Salut {{firstName}}' },
    { day_offset: 3, channel: 'email', subject: 'Relance', template: 'Je reviens vers vous' },
  ],
}
const PROSPECT = {
  id: 9,
  user_id: 42,
  company_name: 'Garage du Pont',
  contact_first_name: 'Léa',
  email: 'lea@garage-du-pont.test',
}

let requetes

function brancherPool(run = RUN, prospect = PROSPECT) {
  requetes = []
  pool.query.mockImplementation(async (sql, params = []) => {
    requetes.push({ sql: String(sql), params })
    if (/FROM reach_sequence_runs r/.test(sql)) return { rows: run ? [run] : [] }
    if (/FROM reach_prospects/.test(sql)) return { rows: prospect ? [prospect] : [] }
    return { rows: [] }
  })
}

const insertsAvecStatut = (statut) => requetes.filter(
  ({ sql }) => /INSERT INTO reach_messages/.test(sql) && sql.includes(`'${statut}'`)
)
const avanceSequence = () => requetes.some(
  ({ sql }) => /UPDATE reach_sequence_runs/.test(sql) && /current_step=\$1/.test(sql)
)
const reporteNouvelEssai = () => requetes.some(
  ({ sql }) => /UPDATE reach_sequence_runs/.test(sql) && /next_run_at = NOW\(\) \+/.test(sql)
)

describe('worker REACH — aucun statut « sent » sans envoi confirmé', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_REPLY_TO
    delete process.env.EMAIL_PROVIDER
    brancherPool()
  })

  test('aucun fournisseur d’e-mail : l’étape échoue, rien n’est marqué envoyé, la séquence n’avance pas', async () => {
    isCommercialEmailReady.mockReturnValue(false)
    getEmailStatus.mockReturnValue({ configured: false, provider: 'none', missing: ['RESEND_API_KEY'] })

    const resultat = await tick()

    expect(insertsAvecStatut('sent')).toHaveLength(0)
    expect(sendCommercialEmail).not.toHaveBeenCalled()
    expect(resultat).toMatchObject({ executed: 0, failed: 1, scanned: 1 })
    expect(resultat.echecs[0]).toMatchObject({ run_id: 1, error: 'configuration_required', channel: 'email' })
    expect(resultat.echecs[0].missing).toEqual(['RESEND_API_KEY'])
    expect(avanceSequence()).toBe(false)
    expect(reporteNouvelEssai()).toBe(true)
    // L'échec est tracé (status 'failed'), jamais 'sent'.
    expect(insertsAvecStatut('failed')).toHaveLength(1)
  })

  test('fournisseur configuré mais envoi refusé (retour {success:false}) : aucun « sent » écrit', async () => {
    isCommercialEmailReady.mockReturnValue(true)
    getEmailStatus.mockReturnValue({ configured: true, provider: 'resend', missing: [] })
    sendCommercialEmail.mockResolvedValue({ success: false, error: 'send_failed', raison: 'send_failed' })

    const resultat = await tick()

    expect(sendCommercialEmail).toHaveBeenCalledTimes(1)
    expect(insertsAvecStatut('sent')).toHaveLength(0)
    expect(resultat).toMatchObject({ executed: 0, failed: 1 })
    expect(resultat.echecs[0].error).toBe('send_failed')
    expect(avanceSequence()).toBe(false)
  })

  test('envoi confirmé par le fournisseur : « sent » est écrit et la séquence avance', async () => {
    isCommercialEmailReady.mockReturnValue(true)
    getEmailStatus.mockReturnValue({ configured: true, provider: 'resend', missing: [] })
    sendCommercialEmail.mockResolvedValue({ success: true, provider: 'resend', id: 'msg_1' })

    const resultat = await tick()

    expect(resultat).toMatchObject({ executed: 1, failed: 0 })
    expect(resultat.echecs).toEqual([])
    expect(insertsAvecStatut('sent')).toHaveLength(1)
    expect(avanceSequence()).toBe(true)
  })

  test('prospect sans adresse e-mail : échec explicite, pas de « unknown_channel » trompeur', async () => {
    isCommercialEmailReady.mockReturnValue(true)
    brancherPool(RUN, { ...PROSPECT, email: null })

    const resultat = await tick()

    expect(resultat).toMatchObject({ executed: 0, failed: 1 })
    expect(resultat.echecs[0].error).toBe('email_absent')
    expect(insertsAvecStatut('sent')).toHaveLength(0)
    expect(avanceSequence()).toBe(false)
  })

  test('base injoignable : tick() échoue au lieu de renvoyer « 0 run scanné »', async () => {
    pool.query.mockRejectedValue(new Error('connection refused'))
    await expect(tick()).rejects.toThrow('connection refused')
  })
})
