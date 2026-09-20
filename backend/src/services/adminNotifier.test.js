/**
 * Notifications opérationnelles : l'adresse administrateur est UNE variable
 * (COURTIA_ADMIN_EMAIL), et une notification qui échoue ne casse jamais le
 * produit — elle le dit.
 */
jest.mock('./emailService', () => ({
  sendEmail: jest.fn(),
  isEmailEnabled: jest.fn(),
  getEmailStatus: jest.fn(),
}))

const emailService = require('./emailService')
const { notifierAdmin, notifierAdminSansBloquer, etatConfiguration, adresseAdmin } = require('./adminNotifier')

describe('adminNotifier — notification admin sans casse produit', () => {
  const envInitial = process.env.COURTIA_ADMIN_EMAIL

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.COURTIA_ADMIN_EMAIL
    emailService.isEmailEnabled.mockReturnValue(true)
    emailService.getEmailStatus.mockReturnValue({ provider: 'resend', configured: true, missing: [] })
  })

  afterAll(() => {
    if (envInitial === undefined) delete process.env.COURTIA_ADMIN_EMAIL
    else process.env.COURTIA_ADMIN_EMAIL = envInitial
  })

  test('sans COURTIA_ADMIN_EMAIL : aucune tentative d’envoi, aucune exception', async () => {
    const r = await notifierAdmin({ evenement: 'test', sujet: 's', lignes: ['l'] })
    expect(r).toEqual({ envoye: false, raison: 'configuration_required' })
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  test('adresse invalide = non configurée (jamais d’envoi à une adresse douteuse)', () => {
    process.env.COURTIA_ADMIN_EMAIL = 'pas-une-adresse'
    expect(adresseAdmin()).toBeNull()
    process.env.COURTIA_ADMIN_EMAIL = '   '
    expect(adresseAdmin()).toBeNull()
  })

  test('adresse valide : envoi à CETTE adresse, statut rapporté honnêtement', async () => {
    process.env.COURTIA_ADMIN_EMAIL = 'Arkcourtia@Gmail.com'
    emailService.sendEmail.mockResolvedValue({ success: true, provider: 'resend' })
    const r = await notifierAdmin({ evenement: 'nouvelle_inscription', sujet: 'COURTIA — test', lignes: ['a', 'b'] })
    expect(r).toEqual({ envoye: true, provider: 'resend' })
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)
    const args = emailService.sendEmail.mock.calls[0][0]
    expect(args.to).toBe('arkcourtia@gmail.com')
    expect(args.subject).toContain('COURTIA')
    expect(args.text).toContain('a')
  })

  test('fournisseur en échec : jamais « envoyé »', async () => {
    process.env.COURTIA_ADMIN_EMAIL = 'arkcourtia@gmail.com'
    emailService.sendEmail.mockResolvedValue({ success: false, error: 'configuration_required', skipped: true })
    expect(await notifierAdmin({ evenement: 'x', sujet: 's' })).toEqual({ envoye: false, raison: 'configuration_required' })
    emailService.sendEmail.mockResolvedValue({ success: false, error: 'send_failed' })
    expect(await notifierAdmin({ evenement: 'x', sujet: 's' })).toEqual({ envoye: false, raison: 'send_failed' })
  })

  test('exception du fournisseur : absorbée, jamais propagée', async () => {
    process.env.COURTIA_ADMIN_EMAIL = 'arkcourtia@gmail.com'
    emailService.sendEmail.mockRejectedValue(new Error('réseau coupé'))
    expect(await notifierAdmin({ evenement: 'x', sujet: 's' })).toEqual({ envoye: false, raison: 'exception' })
  })

  test('notifierAdminSansBloquer ne bloque pas et n’émet aucune exception', () => {
    process.env.COURTIA_ADMIN_EMAIL = 'arkcourtia@gmail.com'
    emailService.sendEmail.mockImplementation(() => { throw new Error('boom') })
    expect(() => notifierAdminSansBloquer({ evenement: 'x', sujet: 's' })).not.toThrow()
  })

  test('etatConfiguration expose la variable et la disponibilité, sans secret', () => {
    delete process.env.COURTIA_ADMIN_EMAIL
    expect(etatConfiguration()).toMatchObject({ variable: 'COURTIA_ADMIN_EMAIL', configuree: false, adresse: null })
    process.env.COURTIA_ADMIN_EMAIL = 'arkcourtia@gmail.com'
    expect(etatConfiguration()).toMatchObject({ configuree: true, adresse: 'arkcourtia@gmail.com', fournisseur_pret: true })
  })
})
