/**
 * gardeEcritureRole.test.js — un rôle en LECTURE SEULE ne peut rien écrire.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P1 #3), un
 * compte de cabinet `assistant` ÉCRIVAIT vraiment en base sur trois routes sans
 * garde — dont l'émission de clés d'API permanentes. Ce test fige la règle :
 *   1. assistant / viewer → 403 `lecture_seule` sur POST, PUT, PATCH et DELETE ;
 *   2. owner / manager / broker et compte SANS cabinet → la requête passe ;
 *   3. les LECTURES (GET) restent ouvertes au rôle en lecture seule ;
 *   4. jeton absent, jeton illisible ou super_admin → la garde s'efface (la
 *      route répond elle-même : 401 pour un jeton absent, exécution pour un
 *      super_admin) ;
 *   5. les points d'entrée publics (webhooks fournisseurs, paiement, portail
 *      client) ne sont jamais bloqués par un rôle de cabinet ;
 *   6. STATIQUE : dans server.js, la garde est montée AVANT le premier routeur
 *      protégé — sans quoi une route ajoutée plus haut échapperait à la règle.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const fs = require('fs')
const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const poolModule = require('../db')
const { getJwtSecret } = require('../utils/jwtSecret')
const {
  creerGardeEcritureRole,
  estPrefixePublic,
  PREFIXES_PUBLICS,
} = require('./gardeEcritureRole')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

/** Pool simulé : seule `cabinet_members` est interrogée par la portée. */
function poolAvec(appartenances) {
  return {
    async query(sql) {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    },
  }
}

function jeton(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' })
}

describe('garde d’écriture — rôle et méthode', () => {
  let server
  let origin
  let appartenances = []
  let routesAtteintes = []

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api', (req, _res, next) => { req.__pool = poolAvec(appartenances); next() })
    // La garde reçoit un pool SIMULÉ (aucune base réelle n'est touchée).
    app.use('/api', (req, res, next) => creerGardeEcritureRole(req.__pool)(req, res, next))
    app.use('/api', (req, res) => {
      routesAtteintes.push(`${req.method} ${req.path}`)
      res.json({ ok: true, atteint: true })
    })
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    routesAtteintes = []
    appartenances = []
    poolModule.query.mockReset()
  })

  const appeler = (methode, chemin, corps, entete) => fetch(`${origin}/api${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(entete ? { Authorization: `Bearer ${entete}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  })

  test.each([
    ['assistant', 'POST'],
    ['assistant', 'PUT'],
    ['assistant', 'PATCH'],
    ['assistant', 'DELETE'],
    ['viewer', 'POST'],
    ['viewer', 'DELETE'],
  ])('%s : %s est refusé en 403 lecture_seule', async (role, methode) => {
    appartenances = [{ cabinet_id: CAB_A, role }]
    const res = await appeler(methode, '/objectifs/set', { ca_target_cents: 1000 }, jeton({ id: 7, userId: 7, role: 'broker' }))
    const corps = await res.json()
    expect(res.status).toBe(403)
    expect(corps.error).toBe('lecture_seule')
    expect(corps.message).toMatch(/lecture/i)
    expect(routesAtteintes).toHaveLength(0)
  })

  test.each([
    ['owner', 'POST'],
    ['manager', 'POST'],
    ['broker', 'POST'],
  ])('%s : l’écriture passe', async (role, methode) => {
    appartenances = [{ cabinet_id: CAB_A, role }]
    const res = await appeler(methode, '/objectifs/set', { ca_target_cents: 1000 }, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(200)
    expect(routesAtteintes).toEqual(['POST /objectifs/set'])
  })

  test('un compte SANS cabinet garde le comportement historique (il écrit)', async () => {
    appartenances = []
    const res = await appeler('POST', '/partners', { nom: 'X' }, jeton({ id: 9, userId: 9 }))
    expect(res.status).toBe(200)
  })

  test('la LECTURE reste ouverte au rôle en lecture seule', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await appeler('GET', '/clients', null, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(200)
  })

  test('émission de clés d’API : refusée en lecture seule, permise au broker', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const refus = await appeler('POST', '/developer/keys', { name: 'cle' }, jeton({ id: 7, userId: 7 }))
    expect(refus.status).toBe(403)
    expect((await refus.json()).error).toBe('lecture_seule')

    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }]
    const ok = await appeler('POST', '/developer/keys', { name: 'cle' }, jeton({ id: 7, userId: 7 }))
    expect(ok.status).toBe(200)
  })

  test('sans jeton : la garde s’efface (la route décide, 401 en général)', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await appeler('POST', '/objectifs/set', { ca_target_cents: 1 })
    expect(res.status).toBe(200)
  })

  test('jeton illisible : la garde s’efface (l’authentification répondra 401)', async () => {
    const res = await appeler('POST', '/objectifs/set', { ca_target_cents: 1 }, 'jeton.invalide.xxx')
    expect(res.status).toBe(200)
    expect(routesAtteintes).toHaveLength(1)
  })

  test('super_admin : jamais bloqué par un rôle de cabinet', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await appeler('POST', '/admin/quelquechose', {}, jeton({ id: 1, userId: 1, role: 'super_admin' }))
    expect(res.status).toBe(200)
  })

  test.each(PREFIXES_PUBLICS)('le préfixe public %s n’est jamais bloqué', async (prefixe) => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    // Ici le chemin est COMPLET (`/api/...`) : on n'ajoute pas le préfixe.
    const res = await fetch(`${origin}${prefixe}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton({ id: 7, userId: 7 })}` },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    expect(estPrefixePublic(`${prefixe}/action`)).toBe(true)
  })
})

describe('server.js — la garde est montée avant les routeurs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8')

  test('la garde d’écriture est montée sur /api', () => {
    expect(source).toMatch(/app\.use\('\/api',\s*creerGardeEcritureRole\(pool\)\)/)
  })

  test('AUCUN routeur /api n’est monté avant la garde (énumération automatique)', () => {
    const positionGarde = source.indexOf('creerGardeEcritureRole(pool)')
    expect(positionGarde).toBeGreaterThan(0)

    // Tous les ROUTEURS montés sous un chemin précis (`app.use('/api/clients', …)`)
    // réellement présents dans server.js : la liste n'est pas écrite à la main,
    // donc une route AJOUTÉE demain au mauvais endroit fait échouer ce test.
    // Les montages sur '/api' nu (limiteur de débit, gardes transversales,
    // garde-fou d'abonnement) sont légitimement placés avant la garde : ils ne
    // portent aucune route métier.
    // Seule exception, documentée : `/api/health` est monté AVANT la garde avec
    // un simple limiteur de débit (aucune donnée métier, aucune écriture).
    const AVANT_GARDE_SANS_METIER = ['/api/health']
    const montages = [...source.matchAll(/app\.use\('(\/api\/[^']*)'/g)].map((m) => m[1])
    expect(montages.length).toBeGreaterThan(30)
    const avantLaGarde = montages
      .filter((chemin) => !AVANT_GARDE_SANS_METIER.includes(chemin))
      .filter((chemin) => source.indexOf(`app.use('${chemin}'`) < positionGarde)
    expect(avantLaGarde).toEqual([])
  })

  test('la traduction des erreurs d’entrée est montée avant la garde de rôle', () => {
    expect(source.indexOf('traduireErreursEntree'))
      .toBeLessThan(source.indexOf('creerGardeEcritureRole(pool)'))
  })
})
