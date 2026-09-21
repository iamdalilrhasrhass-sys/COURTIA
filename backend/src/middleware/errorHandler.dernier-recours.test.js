/**
 * errorHandler.dernier-recours.test.js — LE GESTIONNAIRE D'ERREUR N'EST PLUS UN
 * FICHIER MORT (défaut P4 SEC-030b, mesuré le 21/09/2026).
 *
 * CE QUI ÉTAIT CONSTATÉ : `middleware/errorHandler.js` existait depuis l'origine
 * et n'était monté NULLE PART. Toute erreur passait par le gestionnaire global
 * de `server.js` — et, si celui-ci levait à son tour, par le gestionnaire PAR
 * DÉFAUT d'Express, celui qui renvoie la PILE D'APPELS et les chemins du
 * serveur à l'appelant.
 *
 * CE QUE CE FICHIER FIGE
 *   1. monté APRÈS le gestionnaire global, il ne le masque pas : quand celui-ci
 *      répond, c'est SA réponse qui part (comparaison stricte des corps) ;
 *   2. quand le gestionnaire global LÈVE, la réponse reste un 500 PRODUIT —
 *      aucune pile, aucun chemin, aucun message d'infrastructure ;
 *   3. une réponse DÉJÀ ENGAGÉE n'est jamais réécrite (il rend la main) ;
 *   4. le filtre de messages ne peut pas faire échouer le dernier recours ;
 *   5. STATIQUE : `server.js` l'exige et le monte APRÈS le gestionnaire global —
 *      dont le comportement (corps JSON illisible → 400, messages filtrés) est
 *      toujours là.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const fs = require('fs')
const path = require('path')
const express = require('express')
const errorHandler = require('./errorHandler')

const JETON_INTERNE = 'relation "clients_secret" does not exist'
const CHEMIN_INTERNE = '/srv/courtia/backend/src/routes/clients.js'

function lancer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }))
  })
}

describe('errorHandler monté en DERNIER RECOURS', () => {
  let server
  let origin
  let atteints = []

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    atteints = []

    // Route qui échoue, avec une erreur d'INFRASTRUCTURE (SQL + chemin).
    app.get('/api/explose', (_req, _res, next) => next(new Error(`${JETON_INTERNE} ${CHEMIN_INTERNE}`)))

    // Gestionnaire GLOBAL de server.js : ici il ÉCHOUE (`messagePublic` en
    // panne), ce que le code réel ne peut pas produire volontairement.
    app.use((err, _req, _res, _next) => { atteints.push('global'); throw new Error('journal indisponible') })

    // Dernier recours : le module monté par server.js.
    app.use((err, req, res, next) => { atteints.push('dernier_recours'); return errorHandler(err, req, res, next) })

    const demarre = await lancer(app)
    server = demarre.server
    origin = demarre.origin
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  test('le gestionnaire global qui lève ne fait plus tomber la requête sur le défaut d’Express', async () => {
    const res = await fetch(`${origin}/api/explose`)
    const corps = await res.json()
    expect(res.status).toBe(500)
    expect(atteints).toContain('dernier_recours')
    // Réponse PRODUITE : ni la pile d'appels, ni le SQL, ni le chemin serveur.
    expect(corps.success).toBe(false)
    expect(corps.error).toBe('InternalServerError')
    expect(JSON.stringify(corps)).not.toMatch(/does not exist|at Object\.|\/srv\/|node_modules/)
    expect(corps.message).toMatch(/erreur interne/i)
  })
})

describe('errorHandler ne masque pas le comportement actuel', () => {
  test('quand le gestionnaire global répond, c’est SA réponse qui part', async () => {
    const app = express()
    let dernierRecoursAppele = false

    app.get('/api/mesure', (_req, _res, next) => next(new Error('peu importe')))
    // Gestionnaire global : il répond lui-même (comportement actuel de server.js).
    app.use((_err, _req, res, _next) => res.status(400).json({ error: 'corps_json_invalide', message: 'Le corps de la requête n’est pas un JSON valide.' }))
    app.use((err, req, res, next) => { dernierRecoursAppele = true; return errorHandler(err, req, res, next) })

    const { server, origin } = await lancer(app)
    try {
      const res = await fetch(`${origin}/api/mesure`)
      const corps = await res.json()
      expect(res.status).toBe(400)
      expect(corps.error).toBe('corps_json_invalide')
      expect(dernierRecoursAppele).toBe(false)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })

  test('un corps JSON illisible reste un 400 produit (comportement du gestionnaire global, inchangé)', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/mesure', (_req, res) => res.json({ ok: true }))
    // Reproduit la branche `entity.parse.failed` du gestionnaire global.
    app.use((err, _req, res, _next) => {
      if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'corps_json_invalide', message: 'Le corps de la requête n’est pas un JSON valide.' })
      }
      return errorHandler(err, _req, res, _next)
    })

    const { server, origin } = await lancer(app)
    try {
      const res = await fetch(`${origin}/api/mesure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ceci n’est pas du json',
      })
      const corps = await res.json()
      expect(res.status).toBe(400)
      expect(corps.error).toBe('corps_json_invalide')
      expect(JSON.stringify(corps)).not.toMatch(/Expected property name|SyntaxError/)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})

describe('errorHandler — précautions du dernier recours', () => {
  function echanges() {
    return {
      req: { originalUrl: '/api/x', method: 'GET' },
      res: {
        headersSent: false,
        code: null,
        corps: null,
        status(c) { this.code = c; return this },
        json(p) { this.corps = p; return this },
      },
      next: jest.fn(),
    }
  }

  test('erreur portant un statut : message filtré, aucun texte d’infrastructure', (done) => {
    const { req, res, next } = echanges()
    errorHandler(Object.assign(new Error(`column foo ${CHEMIN_INTERNE}`), { status: 400, name: 'BadRequestError' }), req, res, next)
    expect(res.code).toBe(400)
    expect(JSON.stringify(res.corps)).not.toMatch(/\/srv\/|column foo/)
    expect(next).not.toHaveBeenCalled()
    done()
  })

  test('violation d’unicité : 409 avec un message produit', (done) => {
    const { req, res, next } = echanges()
    errorHandler(Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), { code: '23505', constraint: 'users_email_key' }), req, res, next)
    expect(res.code).toBe(409)
    expect(res.corps.error).toBe('ConflictError')
    expect(res.corps.message).toMatch(/déjà utilisée/i)
    done()
  })

  test('réponse déjà engagée : jamais réécrite, la main est rendue', (done) => {
    const { req, res, next } = echanges()
    res.headersSent = true
    errorHandler(new Error('trop tard'), req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.code).toBeNull()
    done()
  })

  test('le filtre de messages ne peut pas faire échouer le dernier recours', () => {
    const piege = { get message() { throw new Error('getter en panne') }, status: 400 }
    expect(() => errorHandler.messageSur(piege, { statut: 400 })).not.toThrow()
    expect(errorHandler.messageSur(piege, { statut: 400 })).toBe(errorHandler.MESSAGE_GENERIQUE)
  })

  test('erreur sans statut en test : message produit (jamais la pile)', (done) => {
    const { req, res, next } = echanges()
    const err = new Error(`${JETON_INTERNE}\n    at Object.<anonymous> (${CHEMIN_INTERNE}:12:3)`)
    errorHandler(err, req, res, next)
    expect(res.code).toBe(500)
    expect(JSON.stringify(res.corps)).not.toMatch(/does not exist|at Object\.|\/srv\//)
    done()
  })
})

describe('server.js — le gestionnaire est monté, et EN DERNIER', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8')

  test('il est exigé et monté', () => {
    expect(source).toMatch(/require\('\.\/src\/middleware\/errorHandler'\)/)
    expect(source).toMatch(/app\.use\(errorHandler\)/)
  })

  test('il est monté APRÈS le gestionnaire global (donc sans le masquer)', () => {
    const positionGlobale = source.indexOf("if (err && err.type === 'entity.parse.failed')")
    const positionDernierRecours = source.indexOf('app.use(errorHandler)')
    expect(positionGlobale).toBeGreaterThan(0)
    expect(positionDernierRecours).toBeGreaterThan(positionGlobale)
  })

  test('le comportement du gestionnaire global est intact (corps illisible, messages filtrés)', () => {
    expect(source).toMatch(/corps_json_invalide/)
    expect(source).toMatch(/messagePublic\(err, \{ statut: err\.status \|\| 500 \}\)/)
    // Le 404 et les journaux restent en place.
    expect(source).toMatch(/Route non trouvée/)
    expect(source).toMatch(/captureException\(err, \{ path: req\.originalUrl/)
  })
})
