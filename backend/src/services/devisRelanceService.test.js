/**
 * Tests du worker de relances de devis (points IA-012 / IA-015).
 *
 * Règle : une relance n'est marquée « envoyée » QUE si le service d'envoi
 * renvoie un succès explicite. Le fournisseur d'e-mail n'étant pas configuré en
 * production, ce chemin doit échouer proprement — jamais mentir.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('./emailService', () => ({
  sendEmail: jest.fn(),
  sendCommercialEmail: jest.fn(),
}))

const pool = require('../db')
const { sendCommercialEmail } = require('./emailService')
const { processDueRelances } = require('./devisRelanceService')

const RELANCE = {
  relance_id: 42,
  template_key: 'J3',
  devis_id: 7,
  status: 'sent',
  product: 'Auto',
  reference: 'DV-7',
  client_email_cache: 'client@example.com',
  client_name_cache: 'Jean Test',
  cabinet_name_cache: 'Cabinet Test',
  pdf_path: null,
}

function brancherPool(relances = [RELANCE]) {
  const appels = []
  pool.query.mockImplementation(async (sql, params) => {
    appels.push({ sql, params })
    if (String(sql).includes('FROM devis_relances r')) return { rows: relances }
    return { rows: [] }
  })
  return appels
}

const appelsAvec = (appels, motif) => appels.filter(a => String(a.sql).includes(motif))

describe('processDueRelances — statut « envoyé » exigeant', () => {
  beforeEach(() => {
    pool.query.mockReset()
    sendCommercialEmail.mockReset()
  })

  test('envoi NON configuré : aucune relance marquée envoyée', async () => {
    const appels = brancherPool()
    sendCommercialEmail.mockResolvedValue({ success: false, skipped: true, missing: ['RESEND_API_KEY'] })

    const resultat = await processDueRelances()

    expect(resultat.sent).toBe(0)
    expect(resultat.not_sent).toBe(1)
    expect(appelsAvec(appels, "status='sent'")).toHaveLength(0)
    const majStatut = appelsAvec(appels, "status='a_envoyer'")
    expect(majStatut).toHaveLength(1)
    expect(majStatut[0].params).toEqual([42])
  })

  test('envoi en échec : statut a_envoyer et aucun événement relance_sent', async () => {
    const appels = brancherPool()
    sendCommercialEmail.mockResolvedValue({ success: false, skipped: false, provider: 'resend' })

    const resultat = await processDueRelances()

    expect(resultat.sent).toBe(0)
    expect(appelsAvec(appels, "status='sent'")).toHaveLength(0)
    const evenements = appelsAvec(appels, 'devis_activity')
    expect(evenements.some(a => String(a.sql).includes('relance_sent'))).toBe(false)
    const nonEnvoye = evenements.find(a => String(a.sql).includes('relance_not_sent'))
    expect(nonEnvoye).toBeTruthy()
    expect(JSON.parse(nonEnvoye.params[1]).email_sent).toBe(false)
  })

  test('exception du service d\'envoi : a_envoyer, jamais cancelled', async () => {
    const appels = brancherPool()
    sendCommercialEmail.mockRejectedValue(new Error('SMTP down'))

    const resultat = await processDueRelances()

    expect(resultat.sent).toBe(0)
    expect(resultat.not_sent).toBe(1)
    expect(appelsAvec(appels, 'cancelled')).toHaveLength(0)
    expect(appelsAvec(appels, "status='a_envoyer'")).toHaveLength(1)
  })

  test('succès explicite : relance marquée envoyée avec la trace de l\'envoi', async () => {
    const appels = brancherPool()
    sendCommercialEmail.mockResolvedValue({ success: true, provider: 'resend', id: 'msg-1' })

    const resultat = await processDueRelances()

    expect(resultat.sent).toBe(1)
    expect(resultat.not_sent).toBe(0)
    const maj = appelsAvec(appels, "status='sent'")
    expect(maj).toHaveLength(1)
    const evenement = appelsAvec(appels, 'devis_activity').find(a => String(a.sql).includes('relance_sent'))
    expect(evenement).toBeTruthy()
    expect(JSON.parse(evenement.params[1]).email_sent).toBe(true)
  })

  test('sans adresse e-mail, la relance est annulée sans envoi ni statut envoyé', async () => {
    const appels = brancherPool([{ ...RELANCE, client_email_cache: null }])

    const resultat = await processDueRelances()

    expect(resultat.sent).toBe(0)
    expect(appelsAvec(appels, 'cancelled')).toHaveLength(1)
    expect(appelsAvec(appels, "status='sent'")).toHaveLength(0)
    expect(sendCommercialEmail).not.toHaveBeenCalled()
  })
})
