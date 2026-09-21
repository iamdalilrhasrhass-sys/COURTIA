/**
 * integrations.gmailSend.portee-cabinet.test.js — POST /api/integrations/gmail/send
 * (défaut P3 SEC-020, mesuré le 21/09/2026).
 *
 * DÉFAUT MESURÉ
 *   • le client était résolu par `SELECT id, email FROM clients WHERE id = $1` :
 *     AUCUNE condition de portée. Un appelant qui connaissait l'identifiant d'un
 *     client d'un AUTRE cabinet recevait son adresse e-mail (fuite) ;
 *   • le destinataire venait du corps (`to = to || client?.email`) : un e-mail
 *     partait de la boîte Gmail du cabinet vers une adresse choisie par
 *     l'appelant, et l'adresse libre était recopiée telle quelle dans l'en-tête
 *     MIME (injection d'en-tête possible).
 *
 * RÈGLE FIGÉE ICI : la fiche est résolue DANS la portée du cabinet
 * (`lib/porteeCabinet`) — hors portée = 404 sans divulgation — et le
 * destinataire est l'adresse ENREGISTRÉE SUR LA FICHE ; le corps ne peut pas
 * imposer une autre adresse.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: { id: 'msg-1', threadId: 'fil-1' } })) }))
jest.mock('../services/integrationsStore', () => {
  const reel = jest.requireActual('../services/integrationsStore')
  return {
    ...reel,
    getIntegrationSecrets: jest.fn(async () => ({
      provider: 'gmail',
      status: 'connected',
      external_account_email: 'cabinet@exemple.ch',
      access_token_encrypted: 'jeton-chiffre',
    })),
  }
})
jest.mock('../services/integrationSecrets', () => {
  const reel = jest.requireActual('../services/integrationSecrets')
  return { ...reel, hasEncryptionKey: () => true, decryptSecret: () => 'jeton-acces', encryptSecret: (v) => `chiffre:${v}` }
})

const axios = require('axios')
const router = require('./integrations')

const routeur = router.router

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const EMAIL_AUTRE_CABINET = 'fuite@cabinet-b.ch'
const EMAIL_CLIENT_A = 'client@cabinet-a.ch'

const CLAUSE_CABINET = /c\.cabinet_id = ANY\(\$1::uuid\[\]\)/
/** L'ANCIENNE requête, celle du défaut : identifiant seul, aucune portée. */
const REQUETE_SANS_PORTEE = /pool\.query\(\s*['"`]SELECT id, email FROM clients WHERE id\s*=\s*\$1/
/** Forme attendue : la fiche est filtrée par la portée résolue. */
const REQUETE_BORNEE = /WHERE c\.id = \$\$\{f\.suivant\} AND \$\{f\.sql\}/

function gestionnaire(methode, chemin) {
  const couche = routeur.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    setHeader() { return this },
  }
}

/**
 * Joue le gestionnaire avec un pool simulé qui porte AUSSI BIEN la résolution de
 * portée (`cabinet_members`) que les requêtes métier — comme le pool `pg` réel.
 * `clientTrouve` simule ce que la BASE répondrait : une fiche d'un AUTRE cabinet
 * n'est jamais renvoyée par une requête portant la clause de portée.
 */
async function jouer({ appartenances = [], clientTrouve = null, body = {}, userId = 7 } = {}) {
  const requetes = []
  const tracer = async (sql, params) => {
    const texte = String(sql)
    requetes.push({ sql: texte, params })
    if (texte.includes('cabinet_members')) {
      return { rows: appartenances, rowCount: appartenances.length }
    }
    if (/FROM clients c/.test(texte)) {
      return { rows: clientTrouve ? [clientTrouve] : [], rowCount: clientTrouve ? 1 : 0 }
    }
    return { rows: [{ id: 1 }], rowCount: 1 }
  }
  const fakePool = { query: tracer }
  const req = {
    app: { locals: { pool: fakePool } },
    user: { id: userId, userId },
    headers: {},
    query: {},
    params: {},
    body,
  }
  const res = fausseReponse()
  await gestionnaire('post', '/gmail/send')(req, res)
  return { res, requetes }
}

/** Les requêtes MÉTIER : on exclut la SEULE résolution de portée (`cm.role`). */
const metier = (requetes) => requetes.filter((r) => !/cm\.role/.test(r.sql))
const requetesClients = (requetes) => metier(requetes).filter((r) => /FROM clients c/.test(r.sql))

describe('gmail/send — la fiche client est résolue DANS la portée du cabinet', () => {
  beforeEach(() => axios.post.mockClear())

  test('la requête de résolution porte la clause CABINET, jamais un identifiant seul', async () => {
    const { requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      body: { client_id: 5, subject: 'Objet', body: 'Corps' },
    })
    const [resolution] = requetesClients(requetes)
    expect(resolution).toBeDefined()
    expect(resolution.sql).toMatch(CLAUSE_CABINET)
    // Le cabinet est passé en PARAMÈTRE, jamais recopié dans le SQL.
    expect(resolution.params[0]).toEqual([CAB_A])
    expect(resolution.params[1]).toBe(7)
    // L'ancienne forme du défaut n'existe plus dans le fichier joué.
    expect(resolution.sql).not.toMatch(REQUETE_SANS_PORTEE)
  })

  test('client hors cabinet : 404 client_not_found, AUCUNE adresse divulguée, AUCUN envoi', async () => {
    // La base ne renvoie rien : la clause de portée a écarté la fiche étrangère.
    const { res, requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: null,
      body: { client_id: 99, subject: 'Objet', body: 'Corps', to: EMAIL_AUTRE_CABINET },
    })
    expect(res.code).toBe(404)
    expect(res.corps.error).toBe('client_not_found')
    // Aucune fuite : ni l'adresse de l'autre cabinet, ni son identifiant.
    expect(JSON.stringify(res.corps)).not.toContain(EMAIL_AUTRE_CABINET)
    expect(axios.post).not.toHaveBeenCalled()
    expect(requetesClients(requetes)[0].sql).toMatch(CLAUSE_CABINET)
  })

  test('compte SANS cabinet : clause historique sur le propriétaire', async () => {
    const { requetes } = await jouer({
      appartenances: [],
      clientTrouve: { id: 5, email: EMAIL_CLIENT_A },
      body: { client_id: 5, subject: 'Objet', body: 'Corps' },
    })
    const [resolution] = requetesClients(requetes)
    expect(resolution.sql).toMatch(/c\.courtier_id = \$1/)
    expect(resolution.sql).not.toMatch(CLAUSE_CABINET)
  })
})

describe('gmail/send — le destinataire ne peut pas être imposé par le corps', () => {
  beforeEach(() => axios.post.mockClear())

  test('une adresse de remplacement est REFUSÉE (400), rien n’est envoyé', async () => {
    const { res } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: { id: 5, email: EMAIL_CLIENT_A },
      body: { client_id: 5, to: 'attaquant@ailleurs.invalid', subject: 'Objet', body: 'Corps' },
    })
    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('gmail_destinataire_non_autorise')
    expect(axios.post).not.toHaveBeenCalled()
  })

  test('la même adresse, à la casse près, est acceptée et c’est celle de la FICHE qui part', async () => {
    const { res } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: { id: 5, email: EMAIL_CLIENT_A },
      body: { client_id: 5, to: 'CLIENT@Cabinet-A.ch', subject: 'Objet', body: 'Corps' },
    })
    expect(res.code).toBe(200)
    expect(axios.post).toHaveBeenCalledTimes(1)
    const [, charge] = axios.post.mock.calls[0]
    const brut = Buffer.from(String(charge.raw).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    // L'en-tête MIME porte l'adresse de la FICHE, pas la chaîne du corps.
    expect(brut).toContain(`To: ${EMAIL_CLIENT_A}`)
    expect(brut).not.toContain('Cabinet-A.ch')
  })

  test('une adresse libre sans client_id est refusée, la résolution reste bornée au cabinet', async () => {
    // Aucune fiche du cabinet ne porte cette adresse : refus, même si
    // l'identifiant fourni correspond à un client d'un autre cabinet.
    const { res, requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: null,
      body: { to: EMAIL_AUTRE_CABINET, subject: 'Objet', body: 'Corps' },
    })
    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('gmail_destinataire_non_autorise')
    expect(axios.post).not.toHaveBeenCalled()
    const [resolution] = requetesClients(requetes)
    expect(resolution.sql).toMatch(CLAUSE_CABINET)
    expect(resolution.sql).toMatch(/LOWER\(c\.email\) = LOWER\(\$\d\)/)
    expect(resolution.params).toContain(EMAIL_AUTRE_CABINET)
  })

  test('sans adresse ni client_id : 400 gmail_destinataire_requis, rien n’est envoyé', async () => {
    const { res, requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      body: { subject: 'Objet', body: 'Corps' },
    })
    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('gmail_destinataire_requis')
    expect(axios.post).not.toHaveBeenCalled()
    expect(requetesClients(requetes)).toHaveLength(0)
  })

  test('fiche sans adresse : 400 explicite, jamais un envoi à une adresse du corps', async () => {
    const { res } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: { id: 5, email: null },
      body: { client_id: 5, to: 'attaquant@ailleurs.invalid', subject: 'Objet', body: 'Corps' },
    })
    expect(res.code).toBe(400)
    expect(axios.post).not.toHaveBeenCalled()
  })
})

describe('gmail/send — envoi nominal et traces', () => {
  beforeEach(() => axios.post.mockClear())

  test('client du cabinet : l’e-mail part vers l’adresse de la fiche et la trace porte SA fiche', async () => {
    const { res, requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: { id: 42, email: EMAIL_CLIENT_A },
      body: { client_id: 42, subject: 'Votre contrat', body: 'Bonjour' },
    })
    expect(res.code).toBe(200)
    expect(res.corps).toMatchObject({ success: true, provider: 'gmail', message_id: 'msg-1', thread_id: 'fil-1' })

    const [url, charge, config] = axios.post.mock.calls[0]
    expect(url).toMatch(/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send$/)
    expect(config.headers.Authorization).toBe('Bearer jeton-acces')
    expect(String(charge.raw)).not.toContain(' ')

    // Les traces d'interaction portent l'identifiant de la fiche RÉSOLUE.
    const traces = metier(requetes).filter((r) => /INSERT INTO (email_threads|client_interactions)/.test(r.sql))
    expect(traces).toHaveLength(2)
    expect(traces.every((r) => r.params.includes(42))).toBe(true)
  })

  test('aucune trace n’est écrite avec un identifiant de client hors portée', async () => {
    const { requetes } = await jouer({
      appartenances: [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      clientTrouve: null,
      body: { client_id: 99, subject: 'Objet', body: 'Corps' },
    })
    const ecritures = metier(requetes).filter((r) => /^INSERT/i.test(r.sql.trim()))
    // Aucune écriture du tout : rien n'est tracé pour un client hors portée.
    expect(ecritures).toHaveLength(0)
    expect(ecritures.some((r) => (r.params || []).includes(99))).toBe(false)
  })
})

describe('integrations.js — l’ancienne requête sans portée n’existe plus dans le fichier', () => {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(path.join(__dirname, 'integrations.js'), 'utf8')
  /** Le CODE, sans les commentaires : un commentaire qui cite le défaut n'est pas le défaut. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')

  test('aucune résolution de client par identifiant seul', () => {
    expect(source).not.toMatch(REQUETE_SANS_PORTEE)
  })

  test('chaque résolution de client sous /gmail/send passe par lib/porteeCabinet', () => {
    const debut = source.indexOf("router.post('/gmail/send'")
    const fin = source.indexOf("router.get('/outlook/status'")
    expect(debut).toBeGreaterThan(0)
    const bloc = source.slice(debut, fin)
    const blocCode = bloc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '')
    expect(blocCode).toMatch(/porteeCabinet\.resoudrePortee/)
    expect(blocCode).toMatch(/porteeCabinet\.fragment/)
    expect(blocCode).toMatch(REQUETE_BORNEE)
    // Le corps ne peut plus écraser le destinataire (forme du code, pas du commentaire).
    expect(blocCode).not.toMatch(/to\s*=\s*to\s*\|\|/)
    expect(code).not.toMatch(/to\s*=\s*to\s*\|\|/)
  })
})
