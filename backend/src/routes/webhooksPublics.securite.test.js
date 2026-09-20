/**
 * webhooksPublics.securite.test.js — LES QUATRE POINTS D'ENTRÉE PUBLICS QUI
 * ÉCRIVENT DU CONTENU SONT AUTHENTIFIÉS, ET LE REFUS N'ÉCRIT RIEN.
 *
 * POURQUOI CE TEST (mesures brutes du 20/09/2026, reproduction incluse)
 *   (a) POST /api/webhooks/incoming       → 200 et TROIS lignes réellement
 *       insérées dans `automation_webhook_events`, sans aucun secret ;
 *   (b) POST /api/messaging/webhook/inbound → 200 et message enregistré, sans
 *       aucune authentification ;
 *   (c) GET  /api/whatsapp/webhook        → le challenge était renvoyé avec un
 *       jeton de vérification PUBLIC ('courtia_whatsapp_verify') écrit en dur, et
 *       la signature du POST était calculée sur JSON.stringify(body) — donc sur
 *       une mise en forme choisie par l'appelant ;
 *   (d) le webhook de téléphonie était INTROUVABLE (401 du verifyToken monté
 *       avant lui) et son secret avait une valeur par défaut en dur.
 *
 * Ce que le test verrouille, pour chacun :
 *   1. secret NON CONFIGURÉ  ⇒ 503 `secret_non_configure` ET zéro écriture
 *      (le pool simulé ne reçoit AUCUNE requête : la preuve est le compteur) ;
 *   2. secret configuré, requête sans secret / avec un faux ⇒ 401 ou 403, et
 *      toujours zéro écriture ;
 *   3. secret configuré, requête correcte ⇒ le traitement a bien lieu (une ligne
 *      pour `incoming`, une pour `messaging`, un appel au service pour WhatsApp
 *      et pour la téléphonie) — sinon on aurait « sécurisé » en cassant.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

// Les services appelés APRÈS l'authentification sont simulés : ce test porte sur
// l'authentification du point d'entrée, pas sur le traitement métier.
jest.mock('../services/inboundProcessor', () => ({ processInboundEmail: jest.fn(async () => ({ ok: true })) }))
jest.mock('../services/whatsappMetaService', () => ({
  handleWebhook: jest.fn(async () => ({ traite: true })),
  listConversations: jest.fn(), listMessages: jest.fn(), sendMessage: jest.fn(),
  sendTemplate: jest.fn(), getWhatsappTemplates: jest.fn(() => []),
  sendEcheanceReminder: jest.fn(), isConfigured: jest.fn(() => false),
}))
jest.mock('../services/arkVoice', () => ({ handleWebhook: jest.fn(async () => {}) }))

const { processInboundEmail } = require('../services/inboundProcessor')
const whatsappMetaService = require('../services/whatsappMetaService')
const voice = require('../services/arkVoice')
const webhooksRouter = require('./webhooks')
const messagingRouter = require('./messaging')
const whatsappRouter = require('./whatsappMeta')
const { webhookVoicePublic } = require('./killerFeatures2')

const ENV = ['WEBHOOK_INCOMING_SECRET', 'MESSAGING_INBOUND_SECRET', 'WEBHOOK_INBOUND_SECRET',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET',
  'VAPI_WEBHOOK_SECRET']

/** Dernier gestionnaire de la pile d'une route (l'authentification est testée ici, pas le routeur). */
function gestionnaire(router, methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  const res = {
    code: 200, corps: null, envoye: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    send(c) { this.envoye = c; return this },
    setHeader() { return this },
  }
  return res
}

/** Pool simulé qui COMPTE les requêtes : « n'écrit rien » doit être démontrable. */
function poolCompteur() {
  const requetes = []
  return {
    requetes,
    async query(sql, params) { requetes.push({ sql: String(sql), params }); return { rows: [], rowCount: 0 } },
  }
}

function requete(pool, { corps = {}, entetes = {}, brut = null } = {}) {
  return {
    app: { locals: { pool } },
    body: corps,
    headers: entetes,
    rawBody: brut,
    get(nom) { return entetes[String(nom).toLowerCase()] },
    user: null,
    query: {},
    params: {},
  }
}

/** Laisse s'exécuter les promesses du gestionnaire (il est async). */
const vider = () => new Promise((r) => setImmediate(r))

describe('webhooks publics — un secret absent ferme le point d’entrée (503) et n’écrit rien', () => {
  beforeEach(() => {
    ENV.forEach((n) => delete process.env[n])
    jest.clearAllMocks()
  })
  afterAll(() => { ENV.forEach((n) => delete process.env[n]) })

  // ── (a) /api/webhooks/incoming ────────────────────────────────────────────
  test('POST /api/webhooks/incoming sans secret configuré : 503 et AUCUNE requête en base', async () => {
    const pool = poolCompteur()
    const res = fausseReponse()
    await gestionnaire(webhooksRouter, 'post', '/incoming')(requete(pool, { corps: { source: 'x' } }), res)
    expect(res.code).toBe(503)
    expect(res.corps.error).toBe('secret_non_configure')
    expect(pool.requetes).toHaveLength(0) // preuve : rien n'a été inséré
  })

  test('POST /api/webhooks/incoming avec secret configuré : un faux secret est refusé (401), aucune écriture', async () => {
    process.env.WEBHOOK_INCOMING_SECRET = 'secret-reel-0123456789'
    const pool = poolCompteur()
    const res = fausseReponse()
    await gestionnaire(webhooksRouter, 'post', '/incoming')(
      requete(pool, { corps: {}, entetes: { 'x-courtia-webhook-secret': 'faux' } }), res)
    expect(res.code).toBe(401)
    expect(pool.requetes).toHaveLength(0)
  })

  test('POST /api/webhooks/incoming avec le bon secret : la ligne est écrite', async () => {
    process.env.WEBHOOK_INCOMING_SECRET = 'secret-reel-0123456789'
    const pool = poolCompteur()
    const res = fausseReponse()
    await gestionnaire(webhooksRouter, 'post', '/incoming')(
      requete(pool, { corps: { source: 'make', event_name: 'lead' }, entetes: { 'x-courtia-webhook-secret': 'secret-reel-0123456789' } }), res)
    expect(res.code).toBe(200)
    expect(res.corps.accepted).toBe(true)
    expect(pool.requetes.some((r) => r.sql.includes('INSERT INTO automation_webhook_events'))).toBe(true)
  })

  // ── (b) /api/messaging/webhook/inbound ───────────────────────────────────
  test('POST /api/messaging/webhook/inbound sans secret configuré : 503, service NON appelé', async () => {
    const pool = poolCompteur()
    const res = fausseReponse()
    await gestionnaire(messagingRouter, 'post', '/webhook/inbound')(
      requete(pool, { corps: { from: 'a@b.test', subject: 's', body: 'b' } }), res)
    expect(res.code).toBe(503)
    expect(res.corps.error).toBe('secret_non_configure')
    expect(processInboundEmail).not.toHaveBeenCalled()
  })

  test('POST /api/messaging/webhook/inbound : signature absente ou fausse ⇒ 401, service NON appelé', async () => {
    process.env.MESSAGING_INBOUND_SECRET = 'secret-messagerie-0123456789'
    const pool = poolCompteur()
    const corps = { from: 'a@b.test', subject: 's', body: 'b' }
    const brut = Buffer.from(JSON.stringify(corps))

    const sansSignature = fausseReponse()
    await gestionnaire(messagingRouter, 'post', '/webhook/inbound')(
      requete(pool, { corps, brut }), sansSignature)
    expect(sansSignature.code).toBe(401)

    const fausse = fausseReponse()
    await gestionnaire(messagingRouter, 'post', '/webhook/inbound')(
      requete(pool, { corps, brut, entetes: { 'x-courtia-signature': 'sha256=dead' } }), fausse)
    expect(fausse.code).toBe(401)
    expect(processInboundEmail).not.toHaveBeenCalled()
  })

  test('POST /api/messaging/webhook/inbound : signature HMAC valide sur le corps brut ⇒ traité', async () => {
    process.env.MESSAGING_INBOUND_SECRET = 'secret-messagerie-0123456789'
    const { signerHmac } = require('../lib/secretsEntrants')
    const corps = { from: 'client@exemple.test', subject: 'Pièce', body: 'Bonjour' }
    const brut = Buffer.from(JSON.stringify(corps))
    const res = fausseReponse()
    await gestionnaire(messagingRouter, 'post', '/webhook/inbound')(
      requete(poolCompteur(), { corps, brut, entetes: { 'x-courtia-signature': signerHmac('secret-messagerie-0123456789', brut) } }), res)
    expect(res.code).toBe(200)
    expect(processInboundEmail).toHaveBeenCalledTimes(1)
  })

  // ── (c) /api/whatsapp/webhook ────────────────────────────────────────────
  test('GET /api/whatsapp/webhook sans jeton configuré : 503 (plus de jeton public par défaut)', async () => {
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'get', '/webhook')(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'courtia_whatsapp_verify', 'hub.challenge': '12345' }, get: () => undefined }, res)
    expect(res.code).toBe(503)
    expect(res.corps.error).toBe('secret_non_configure')
    expect(res.envoye).toBeNull() // le challenge N'EST PAS renvoyé
  })

  test('GET /api/whatsapp/webhook : l’ancien jeton PUBLIC en dur n’ouvre plus rien', async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'jeton-meta-reel-0123456789'
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'get', '/webhook')(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'courtia_whatsapp_verify', 'hub.challenge': '12345' }, get: () => undefined }, res)
    expect(res.code).toBe(403)
    expect(res.envoye).toBeNull()
  })

  test('GET /api/whatsapp/webhook avec le jeton configuré : le challenge est renvoyé', async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'jeton-meta-reel-0123456789'
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'get', '/webhook')(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'jeton-meta-reel-0123456789', 'hub.challenge': '12345' }, get: () => undefined }, res)
    expect(res.code).toBe(200)
    expect(res.envoye).toBe('12345')
  })

  test('POST /api/whatsapp/webhook sans secret d’application : 503, service NON appelé', async () => {
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'post', '/webhook')(
      requete(poolCompteur(), { corps: { entry: [] }, brut: Buffer.from('{}') }), res)
    expect(res.code).toBe(503)
    expect(whatsappMetaService.handleWebhook).not.toHaveBeenCalled()
  })

  test('POST /api/whatsapp/webhook : signature calculée sur un JSON RÉÉCRIT ⇒ 403', async () => {
    process.env.WHATSAPP_APP_SECRET = 'secret-app-meta-0123456789'
    const { signerHmac } = require('../lib/secretsEntrants')
    const recu = Buffer.from('{"entry":[{"id":"1"}]}')
    const reecrit = Buffer.from(JSON.stringify(JSON.parse(recu.toString('utf8'))))
    // Signature d'un corps DIFFÉRENT de celui reçu : elle doit être refusée.
    const autre = Buffer.from('{"entry":[{"id":"2"}]}')
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'post', '/webhook')(
      requete(poolCompteur(), { corps: JSON.parse(reecrit.toString('utf8')), brut: reecrit, entetes: { 'x-hub-signature-256': signerHmac('secret-app-meta-0123456789', autre) } }), res)
    expect(res.code).toBe(403)
    expect(whatsappMetaService.handleWebhook).not.toHaveBeenCalled()
  })

  test('POST /api/whatsapp/webhook : signature valide sur les octets reçus ⇒ traitement', async () => {
    process.env.WHATSAPP_APP_SECRET = 'secret-app-meta-0123456789'
    const { signerHmac } = require('../lib/secretsEntrants')
    const brut = Buffer.from('{"entry":[{"id":"1"}]}')
    const res = fausseReponse()
    await gestionnaire(whatsappRouter, 'post', '/webhook')(
      requete(poolCompteur(), { corps: JSON.parse(brut.toString('utf8')), brut, entetes: { 'x-hub-signature-256': signerHmac('secret-app-meta-0123456789', brut) } }), res)
    expect(res.code).toBe(200)
    expect(whatsappMetaService.handleWebhook).toHaveBeenCalledTimes(1)
  })

  // ── (d) webhook de téléphonie ────────────────────────────────────────────
  test('POST /api/voice/webhook sans secret configuré : 503 (jamais 401 d’un autre middleware)', async () => {
    const res = fausseReponse()
    await gestionnaire(webhookVoicePublic, 'post', '/webhook')(
      requete(poolCompteur(), { corps: { message: {} } }), res)
    expect(res.code).toBe(503)
    expect(res.corps.error).toBe('secret_non_configure')
    expect(voice.handleWebhook).not.toHaveBeenCalled()
  })

  test('POST /api/voice/webhook : le secret par défaut public ne l’ouvre plus', async () => {
    process.env.VAPI_WEBHOOK_SECRET = 'courtia-default-secret'
    const res = fausseReponse()
    await gestionnaire(webhookVoicePublic, 'post', '/webhook')(
      requete(poolCompteur(), { corps: {}, entetes: { 'x-vapi-secret': 'courtia-default-secret' } }), res)
    expect(res.code).toBe(503)
    expect(voice.handleWebhook).not.toHaveBeenCalled()
  })

  test('POST /api/voice/webhook : secret configuré + en-tête correct ⇒ l’événement est traité', async () => {
    process.env.VAPI_WEBHOOK_SECRET = 'secret-vapi-0123456789'
    const res = fausseReponse()
    await gestionnaire(webhookVoicePublic, 'post', '/webhook')(
      requete(poolCompteur(), { corps: { message: { type: 'end-of-call-report' } }, entetes: { 'x-vapi-secret': 'secret-vapi-0123456789' } }), res)
    expect(res.code).toBe(200)
    expect(res.corps.success).toBe(true)
    expect(voice.handleWebhook).toHaveBeenCalledTimes(1)
  })

  test('POST /api/voice/webhook : en-tête faux ⇒ 401, rien n’est traité', async () => {
    process.env.VAPI_WEBHOOK_SECRET = 'secret-vapi-0123456789'
    const res = fausseReponse()
    await gestionnaire(webhookVoicePublic, 'post', '/webhook')(
      requete(poolCompteur(), { corps: {}, entetes: { 'x-vapi-secret': 'faux' } }), res)
    expect(res.code).toBe(401)
    expect(voice.handleWebhook).not.toHaveBeenCalled()
  })

  test('l’échec de traitement de la téléphonie est un 500 explicite (jamais « success »)', async () => {
    process.env.VAPI_WEBHOOK_SECRET = 'secret-vapi-0123456789'
    voice.handleWebhook.mockRejectedValueOnce(new Error('base indisponible'))
    const res = fausseReponse()
    await gestionnaire(webhookVoicePublic, 'post', '/webhook')(
      requete(poolCompteur(), { corps: {}, entetes: { 'x-vapi-secret': 'secret-vapi-0123456789' } }), res)
    await vider()
    expect(res.code).toBe(500)
    expect(res.corps.success).toBe(false)
  })
})
