const {
  computeWebhookSignature,
  verifyWebhookSignature,
  mapWebhookStatus,
  extractSignatureRequestId,
  getConfigStatus,
} = require('./yousignService')

describe('yousignService', () => {
  it('verifies signed webhook payloads', () => {
    const body = Buffer.from(JSON.stringify({ id: 'evt_1', event_name: 'signature_request.done' }))
    const secret = 'test_secret'
    const signature = computeWebhookSignature(body, secret)
    expect(verifyWebhookSignature(body, `sha256=${signature}`, secret)).toBe(true)
    expect(verifyWebhookSignature(body, 'sha256=deadbeef', secret)).toBe(false)
  })

  it('maps Yousign webhook events to document statuses', () => {
    expect(mapWebhookStatus('signature_request.done')).toBe('signed')
    expect(mapWebhookStatus('signature_request.refused')).toBe('refused')
    expect(mapWebhookStatus('signature_request.expired')).toBe('expired')
    expect(mapWebhookStatus('signature_request.activated')).toBe('sent_to_sign')
  })

  it('extracts signature request ids from common webhook shapes', () => {
    expect(extractSignatureRequestId({ data: { signature_request: { id: 'sr_123' } } })).toBe('sr_123')
    expect(extractSignatureRequestId({ signature_request_id: 'sr_456' })).toBe('sr_456')
  })

  it('reports missing configuration without throwing', () => {
    const previousKey = process.env.YOUSIGN_API_KEY
    const previousSecret = process.env.YOUSIGN_WEBHOOK_SECRET
    delete process.env.YOUSIGN_API_KEY
    delete process.env.YOUSIGN_WEBHOOK_SECRET
    expect(getConfigStatus()).toMatchObject({ configured: false })
    if (previousKey === undefined) delete process.env.YOUSIGN_API_KEY
    else process.env.YOUSIGN_API_KEY = previousKey
    if (previousSecret === undefined) delete process.env.YOUSIGN_WEBHOOK_SECRET
    else process.env.YOUSIGN_WEBHOOK_SECRET = previousSecret
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Garde-fou ajouté le 19/09/2026.
  //
  // Constat : sans YOUSIGN_API_KEY, createSignatureRequest fabriquait un
  // identifiant `mock_<uuid>`, une URL de signature factice et un statut
  // 'sent_to_sign'. La demande était ensuite enregistrée en base comme
  // envoyée : le cabinet attendait une signature (mandat, DDA, IPID) qui
  // n'existerait jamais, et la preuve de conseil exigible en contrôle
  // était inexistante.
  // ─────────────────────────────────────────────────────────────────────────

  it('sans fournisseur configuré : aucune donnée de signature fabriquée', async () => {
    const previousKey = process.env.YOUSIGN_API_KEY
    const previousSecret = process.env.YOUSIGN_WEBHOOK_SECRET
    delete process.env.YOUSIGN_API_KEY
    delete process.env.YOUSIGN_WEBHOOK_SECRET

    const { createSignatureRequest } = require('./yousignService')
    const result = await createSignatureRequest(
      Buffer.from('%PDF-1.4 test'),
      'client@exemple.invalid',
      'Client Test',
      {}
    )

    expect(result.configured).toBe(false)
    expect(result.not_configured).toBe(true)
    expect(result.providerRequestId).toBeNull()
    expect(result.signatureUrl).toBeNull()
    expect(result.status).toBe('not_configured')
    expect(result.status).not.toBe('sent_to_sign')
    expect(JSON.stringify(result)).not.toMatch(/mock_/)
    expect(result.signatureUrl || '').not.toMatch(/yousign\.com/)

    if (previousKey === undefined) delete process.env.YOUSIGN_API_KEY
    else process.env.YOUSIGN_API_KEY = previousKey
    if (previousSecret === undefined) delete process.env.YOUSIGN_WEBHOOK_SECRET
    else process.env.YOUSIGN_WEBHOOK_SECRET = previousSecret
  })
})
