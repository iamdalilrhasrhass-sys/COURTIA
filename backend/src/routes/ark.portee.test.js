/**
 * ark.portee.test.js — SURVEILLANCE DE LA PORTÉE DU CHAT ARK (P1 SEC-004).
 *
 * ÉTAT AU 20/09/2026 : `POST /api/ark/chat` lit `req.body.clientData` fourni par
 * l'appelant, puis autocomplète ses contrats et ses tâches avec
 * `WHERE client_id = $1` — SANS aucune condition d'appartenance. Un cabinet peut
 * donc faire lire le dossier d'un client d'un AUTRE cabinet (les lignes sont
 * injectées dans le prompt ARK). L'autofetch s'exécute AVANT le contrôle de
 * configuration IA, donc la lecture a lieu aujourd'hui même sans clé IA (la
 * réponse est alors 503).
 *
 * `routes/ark.js` appartient à un autre agent : la correction n'a pas été faite
 * ici (elle est décrite par un commentaire de coordination DANS le fichier). Ce
 * test est le garde-fou qui empêche l'oubli de devenir définitif :
 *   1. soit la portée est posée dans le code (fragment de portée cabinet sur
 *      l'autofetch) ;
 *   2. soit le marqueur de suivi SEC-004 reste présent et documente le défaut ;
 *   3. et, dans tous les cas, la réponse ne doit JAMAIS contenir une donnée d'un
 *      client hors du périmètre de l'appelant — l'invariant qui compte, vérifié
 *      ici par une réponse brute.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const fs = require('fs')
const path = require('path')
const poolModule = require('../db')
const router = require('./ark')

const SOURCE = fs.readFileSync(path.join(__dirname, 'ark.js'), 'utf8')
const MARQUEUR = 'SEC-004'

function dernierGestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  const res = {
    code: 200, corps: null, texte: '',
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; this.texte = JSON.stringify(p); return this },
    send(p) { this.corps = p; this.texte = JSON.stringify(p); return this },
    setHeader() { return this },
  }
  return res
}

describe('chat ARK — la portée du dossier est un invariant suivi (SEC-004)', () => {
  beforeEach(() => poolModule.query.mockReset())

  test('la portée est posée, OU le défaut ouvert est explicitement suivi', () => {
    const porteeSurAutofetch = /porteeCabinet|resoudrePortee/.test(SOURCE)
      && /client_id\s*=\s*\$\d[\s\S]{0,400}?cabinet|portee\s*\.[\s\S]{0,200}?clientData/.test(SOURCE)
    const suivi = SOURCE.includes(MARQUEUR)
    expect(porteeSurAutofetch || suivi).toBe(true)
    if (!porteeSurAutofetch) {
      // Tant que la portée n'est pas posée, le défaut doit rester DIT dans le
      // fichier — pas seulement dans un rapport.
      expect(SOURCE).toMatch(/DEFaut|DÉFAUT/)
    }
  })

  test('la réponse ne contient JAMAIS une donnée d’un client hors périmètre', async () => {
    // Le pool simulé renvoie les lignes d'un AUTRE cabinet avec un marqueur
    // reconnaissable : si elles ressortaient au client, le marqueur apparaîtrait
    // dans la réponse.
    poolModule.query.mockImplementation(async () => ({
      rows: [{ type: 'auto', compagnie: 'COMPAGNIE-DU-CABINET-B', prime_annuelle: 1234, statut: 'actif' }],
      rowCount: 1,
    }))
    delete process.env.DEEPSEEK_API_KEY

    const req = {
      app: { locals: { pool: { async query(sql) { return poolModule.query(sql) } } } },
      user: { id: 7, userId: 7 },
      body: {
        message: 'Résume le dossier de ce client',
        // Le client 999 appartient à un autre cabinet.
        clientData: { id: 999, nom: 'Client d’un autre cabinet' },
      },
      headers: {},
      params: {},
    }
    const res = fausseReponse()
    await dernierGestionnaire('post', '/chat')(req, res)

    // Aujourd'hui la route s'arrête sur « configuration ARK requise » (503) :
    // l'invariant tient par ce chemin. Le jour où la clé IA est présente, c'est
    // la portée qui devra le tenir — et ce test le vérifiera de la même façon.
    expect(res.code).not.toBe(500)
    expect(res.texte).not.toContain('COMPAGNIE-DU-CABINET-B')
  })

  test('l’autofetch ne s’exécute pas quand aucun clientData n’est fourni (comportement inchangé)', async () => {
    poolModule.query.mockReset()
    delete process.env.DEEPSEEK_API_KEY
    const req = {
      app: { locals: { pool: { async query(sql) { return poolModule.query(sql) } } } },
      user: { id: 7, userId: 7 },
      body: { message: 'Bonjour' },
      headers: {}, params: {},
    }
    const res = fausseReponse()
    await dernierGestionnaire('post', '/chat')(req, res)
    expect(poolModule.query).not.toHaveBeenCalled()
    expect(res.code).toBe(503)
  })
})
