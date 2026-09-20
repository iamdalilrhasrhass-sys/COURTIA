/**
 * secretsEntrants.test.js — UN SECRET NON CONFIGURÉ N'AUTORISE RIEN.
 *
 * POURQUOI CE TEST (défauts P2/P3 mesurés en production le 20/09/2026) :
 *   * POST /api/messaging/webhook/inbound  → 200 et message enregistré sans
 *     aucune authentification ;
 *   * GET  /api/whatsapp/webhook           → challenge renvoyé avec un jeton
 *     ÉCRIT EN DUR dans le dépôt ('courtia_whatsapp_verify') ;
 *   * POST /api/webhooks/incoming          → 200 et 3 lignes réellement insérées ;
 *   * webhook de téléphonie                → secret par défaut en dur
 *     ('courtia-default-secret' dans services/arkVoice.js).
 * Ce module est la règle unique appliquée aux quatre. Le test verrouille les
 * trois propriétés dont dépendent toutes les routes :
 *   1. aucun secret par défaut — y compris les gabarits publics connus ;
 *   2. la signature se vérifie sur les OCTETS reçus, jamais sur un JSON
 *      reconstruit (une signature recalculée après réécriture doit ÉCHOUER) ;
 *   3. un secret absent ⇒ 503 explicite.
 */
const {
  SECRETS,
  VALEURS_INTERDITES,
  lireSecret,
  secretConfigure,
  repondreSecretAbsent,
  egalConstant,
  signerHmac,
  verifierSecretSimple,
  verifierSignatureHmac,
} = require('./secretsEntrants')

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
}

const ENV = ['VAPI_WEBHOOK_SECRET', 'MESSAGING_INBOUND_SECRET', 'WEBHOOK_INBOUND_SECRET',
  'WEBHOOK_INCOMING_SECRET', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET']

describe('secrets des points d’entrée', () => {
  beforeEach(() => { ENV.forEach((n) => delete process.env[n]) })
  afterAll(() => { ENV.forEach((n) => delete process.env[n]) })

  test('secret absent : non configuré (aucune valeur par défaut)', () => {
    expect(lireSecret(SECRETS.voix)).toBeNull()
    expect(secretConfigure(SECRETS.messagerie)).toBe(false)
  })

  test('les gabarits publics connus sont REFUSÉS même s’ils sont configurés', () => {
    // Ce sont exactement les valeurs mesurées en production. Les accepter
    // reviendrait à publier le secret dans le dépôt.
    expect(VALEURS_INTERDITES).toContain('courtia-default-secret')
    expect(VALEURS_INTERDITES).toContain('courtia_whatsapp_verify')
    process.env.VAPI_WEBHOOK_SECRET = 'courtia-default-secret'
    expect(lireSecret(SECRETS.voix)).toBeNull()
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'courtia_whatsapp_verify'
    expect(lireSecret(SECRETS.whatsappVerification)).toBeNull()
  })

  test('un secret configuré est lu, une valeur vide ou blanche ne compte pas', () => {
    process.env.MESSAGING_INBOUND_SECRET = '  '
    expect(lireSecret(SECRETS.messagerie)).toBeNull()
    process.env.MESSAGING_INBOUND_SECRET = 'valeur-reelle-0123456789'
    expect(lireSecret(SECRETS.messagerie)).toBe('valeur-reelle-0123456789')
  })

  test('le second nom historique de WhatsApp reste accepté', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'jeton-meta-0123456789'
    expect(lireSecret(SECRETS.whatsappVerification)).toBe('jeton-meta-0123456789')
  })

  test('secret absent ⇒ réponse 503 « secret_non_configure »', () => {
    const res = fausseReponse()
    repondreSecretAbsent(res, 'vapi_webhook_secret', undefined)
    expect(res.code).toBe(503)
    expect(res.corps.error).toBe('secret_non_configure')
    expect(res.corps.code).toBe('vapi_webhook_secret')
    // La réponse nomme le secret à configurer, jamais sa valeur.
    expect(JSON.stringify(res.corps)).toMatch(/vapi_webhook_secret/)
  })

  test('comparaison à durée constante : jamais vraie sur une longueur différente', () => {
    expect(egalConstant('abc', 'abc')).toBe(true)
    expect(egalConstant('abc', 'abcd')).toBe(false)
    expect(egalConstant('', '')).toBe(true)
  })

  test('secret simple : faux si l’en-tête est absent, si le secret n’est pas configuré', () => {
    expect(verifierSecretSimple({ secret: null, fourni: 'x' })).toEqual({ configure: false, valide: false })
    expect(verifierSecretSimple({ secret: 'abc', fourni: undefined }).valide).toBe(false)
    expect(verifierSecretSimple({ secret: 'abc', fourni: 'abc' }).valide).toBe(true)
  })
})

describe('signature HMAC sur le corps BRUT', () => {
  const secret = 'secret-de-test-0123456789'

  test('une signature calculée sur les octets reçus est acceptée', () => {
    const corps = Buffer.from('{"a":1,"b":"é"}', 'utf8')
    const entete = signerHmac(secret, corps)
    expect(entete.startsWith('sha256=')).toBe(true)
    expect(verifierSignatureHmac({ rawBody: corps, enteteSignature: entete, secret }))
      .toMatchObject({ configure: true, valide: true })
  })

  test('une signature recalculée après réécriture du JSON est REFUSÉE', () => {
    // C'est le défaut mesuré : whatsappMetaService signait JSON.stringify(body).
    // Les deux écritures ci-dessous désignent le MÊME objet pour un humain, mais
    // pas les mêmes octets. La signature du corps reçu ne doit pas valider la
    // version réécrite — sinon l'appelant choisit sa mise en forme et échappe au
    // secret partagé.
    const recu = Buffer.from('{"b":"é", "a": 1}', 'utf8')
    const reecrit = Buffer.from(JSON.stringify(JSON.parse(recu.toString('utf8'))), 'utf8')
    expect(reecrit.equals(recu)).toBe(false)
    const entete = signerHmac(secret, recu)
    expect(verifierSignatureHmac({ rawBody: reecrit, enteteSignature: entete, secret }).valide).toBe(false)
    // Et symétriquement : la signature du corps réellement reçu est acceptée.
    expect(verifierSignatureHmac({ rawBody: recu, enteteSignature: entete, secret }).valide).toBe(true)
  })

  test('corps brut absent ⇒ refus nommé, jamais une acceptation silencieuse', () => {
    const v = verifierSignatureHmac({ rawBody: undefined, enteteSignature: signerHmac(secret, '{}'), secret })
    expect(v).toMatchObject({ configure: true, valide: false, raison: 'corps_brut_absent' })
  })

  test('secret non configuré ⇒ configure:false (la route répond 503)', () => {
    expect(verifierSignatureHmac({ rawBody: Buffer.from('{}'), enteteSignature: 'sha256=x', secret: null }))
      .toMatchObject({ configure: false, valide: false })
  })

  test('signature absente ⇒ refus nommé', () => {
    expect(verifierSignatureHmac({ rawBody: Buffer.from('{}'), enteteSignature: '', secret }))
      .toMatchObject({ valide: false, raison: 'signature_absente' })
  })
})
