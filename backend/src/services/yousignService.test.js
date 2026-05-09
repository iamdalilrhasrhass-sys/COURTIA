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
})
