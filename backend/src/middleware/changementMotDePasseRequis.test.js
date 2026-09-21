/**
 * changementMotDePasseRequis.test.js — LE MOT DE PASSE TEMPORAIRE N'OUVRE PAS
 * L'APPLICATION (défaut P2 SEC-017, mesuré le 21/09/2026).
 *
 * POURQUOI CE TEST : le mot de passe initial d'un cabinet est DÉRIVÉ DE SON NOM
 * (`lib/motDePasseInitial.js`) — donc devinable par quiconque voit une facture.
 * `users.must_change_password` valait `true` pour les deux cabinets pilotes
 * (utilisateurs 11 et 14) et AUCUN middleware ne refusait quoi que ce soit : le
 * compte d'essai utilisait l'application entière avec un mot de passe devinable.
 *
 * Ce que ce fichier fige :
 *   1. mot de passe temporaire + route métier → 403
 *      `changement_mot_de_passe_requis`, et la route n'est JAMAIS atteinte ;
 *   2. chaque exemption reste ouverte (changement de mot de passe, déconnexion,
 *      /api/auth/me, authentification, /api/billing/*, /api/health,
 *      /api/status) — et AUCUNE exemption ne paie la lecture en base ;
 *   3. la précision des exemptions : `/api/billing-x` n'est pas `/api/billing`,
 *      `/api/auth/me/extra` n'est pas `/api/auth/me` ;
 *   4. un mot de passe déjà changé (`must_change_password: false`), une requête
 *      SANS jeton (routes publiques) ou un jeton de PORTAIL client (aucun
 *      `id`/`userId` de `users`) passent sans être bloqués ;
 *   5. une panne de la lecture ne donne pas plus de droits : 503 explicite,
 *      route non atteinte ;
 *   6. STATIQUE : dans server.js, la garde est montée sur `/api` AVANT le
 *      premier routeur — une route ajoutée demain n'y échappe pas.
 */

jest.mock('../db', () => ({ query: jest.fn() }))

const fs = require('fs')
const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../utils/jwtSecret')
const {
  creerGardeChangementMotDePasse,
  estRouteExemptee,
  chargeRefus,
  CODE_REFUS,
  ROUTES_EXEMPTEES,
} = require('./changementMotDePasseRequis')

const UTILISATEUR_TEMPORAIRE = 11

function jeton(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' })
}

/** Pool simulé : seule la lecture de `users.must_change_password` est servie. */
function poolAvec(etat) {
  const requetes = []
  const pool = {
    requetes,
    async query(sql, params) {
      requetes.push({ sql: String(sql), params })
      if (String(sql).includes('must_change_password')) {
        if (etat.panne) throw new Error('connexion à la base perdue')
        if (etat.ligneAbsente) return { rows: [], rowCount: 0 }
        return { rows: [{ must_change_password: etat.valeur }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
  }
  return pool
}

describe('exemptions — la liste est EXPLICITE et bornée au chemin', () => {
  test('exactes : le changement de mot de passe, la déconnexion, son propre état', () => {
    expect(estRouteExemptee('POST', '/api/auth/change-password')).toBe(true)
    expect(estRouteExemptee('POST', '/api/auth/logout')).toBe(true)
    expect(estRouteExemptee('GET', '/api/auth/me')).toBe(true)
    // La barre finale et la chaîne de requête ne changent pas le verdict.
    expect(estRouteExemptee('GET', '/api/auth/me/?x=1')).toBe(true)
  })

  test('l’authentification (aucun chemin de retour fermé)', () => {
    for (const chemin of ['login', 'register', 'google', 'forgot-password', 'reset-password', 'refresh', 'verify']) {
      expect(estRouteExemptee('POST', `/api/auth/${chemin}`)).toBe(true)
    }
  })

  test('santé et facturation', () => {
    expect(estRouteExemptee('GET', '/api/health')).toBe(true)
    expect(estRouteExemptee('GET', '/api/status')).toBe(true)
    expect(estRouteExemptee('POST', '/api/billing/checkout')).toBe(true)
    expect(estRouteExemptee('POST', '/api/billing/webhook')).toBe(true)
    expect(estRouteExemptee('GET', '/api/billing')).toBe(true)
  })

  test('la borne de préfixe est RESPECTÉE : `/api/billing-x` n’est pas `/api/billing`', () => {
    expect(estRouteExemptee('POST', '/api/billingX/checkout')).toBe(false)
    expect(estRouteExemptee('POST', '/api/billing-mensonges')).toBe(false)
  })

  test('aucune exemption ne couvre une route MÉTIER', () => {
    expect(estRouteExemptee('GET', '/api/clients')).toBe(false)
    expect(estRouteExemptee('POST', '/api/clients')).toBe(false)
    expect(estRouteExemptee('GET', '/api/devis')).toBe(false)
    expect(estRouteExemptee('GET', '/api/auth/me/extra')).toBe(false)
    expect(estRouteExemptee('GET', '/api/billing-x')).toBe(false)
  })

  test('aucune exemption n’est un PRÉFIXE de famille : chaque entrée est nommée jusqu’au chemin', () => {
    const prefixes = ROUTES_EXEMPTEES.filter((regle) => regle.prefixe).map((regle) => regle.chemin)
    // Une seule exemption de préfixe, exigée par le produit : la facturation.
    expect(prefixes).toEqual(['/api/billing'])
  })
})

describe('garde montée sur /api — comportement HTTP', () => {
  let server
  let origin
  let etat = { valeur: true }
  let routesAtteintes = []
  let poolCourant = null

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api', (req, _res, next) => { req.__pool = poolCourant; next() })
    app.use('/api', (req, res, next) => creerGardeChangementMotDePasse(req.__pool)(req, res, next))
    app.use('/api', (req, res) => {
      routesAtteintes.push(`${req.method} ${String(req.originalUrl).split('?')[0]}`)
      res.json({ ok: true, atteint: true })
    })
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    etat = { valeur: true }
    routesAtteintes = []
    poolCourant = poolAvec({ valeur: true })
  })

  const appeler = (methode, chemin, entete) => fetch(`${origin}${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(entete ? { Authorization: `Bearer ${entete}` } : {}),
    },
    body: ['POST', 'PUT', 'PATCH'].includes(methode) ? JSON.stringify({}) : undefined,
  })

  test('mot de passe temporaire : une route MÉTIER répond 403 changement_mot_de_passe_requis', async () => {
    const res = await appeler('GET', '/api/clients', jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    const corps = await res.json()
    expect(res.status).toBe(403)
    expect(corps.error).toBe(CODE_REFUS)
    expect(corps.code).toBe(CODE_REFUS)
    expect(corps.must_change_password).toBe(true)
    expect(corps.message).toMatch(/mot de passe temporaire/i)
    // Le refus porte un message PRODUIT : aucune pile, aucun chemin, aucune SQL.
    expect(JSON.stringify(corps)).not.toMatch(/\/srv\/|node_modules|SELECT|at Object/)
    // La route métier n'a JAMAIS été atteinte.
    expect(routesAtteintes).toHaveLength(0)
  })

  test('mot de passe temporaire : les routes d’ÉCRITURE sont refusées aussi', async () => {
    const res = await appeler('POST', '/api/clients', jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    expect(res.status).toBe(403)
    expect(routesAtteintes).toHaveLength(0)
  })

  test.each([
    ['POST', '/api/auth/change-password'],
    ['POST', '/api/auth/logout'],
    ['GET', '/api/auth/me'],
    ['PUT', '/api/auth/me'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/forgot-password'],
    ['POST', '/api/auth/refresh'],
    ['POST', '/api/billing/checkout'],
    ['GET', '/api/health'],
    ['GET', '/api/status'],
  ])('exemption %s %s : la route est atteinte, sans lire la base', async (methode, chemin) => {
    poolCourant.requetes.length = 0
    const res = await appeler(methode, chemin, jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    expect(res.status).toBe(200)
    expect(routesAtteintes).toEqual([`${methode} ${chemin}`])
    // Aucune lecture `users` : la décision d'exemption est prise AVANT la base.
    expect(poolCourant.requetes).toHaveLength(0)
  })

  test('le mot de passe une fois changé (drapeau faux) : plus aucun refus', async () => {
    poolCourant = poolAvec({ valeur: false })
    const res = await appeler('GET', '/api/clients', jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    expect(res.status).toBe(200)
    expect(routesAtteintes).toEqual(['GET /api/clients'])
  })

  test('drapeau lu en texte (`"true"` renvoyé par PostgreSQL) : le refus s’applique', async () => {
    poolCourant = poolAvec({ valeur: 'true' })
    const res = await appeler('GET', '/api/clients', jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    expect(res.status).toBe(403)
  })

  test('sans jeton : les routes PUBLIQUES ne sont jamais bloquées', async () => {
    const res = await appeler('POST', '/api/invite/accept')
    expect(res.status).toBe(200)
    expect(poolCourant.requetes).toHaveLength(0)
  })

  test('jeton de PORTAIL client (ni id ni userId de users) : jamais bloqué', async () => {
    // Forme réelle du jeton de portail (services/portail/portalAuth.js) : il ne
    // désigne pas un compte de `users`, la garde n'a rien à évaluer.
    const jetonPortail = jeton({ portalAccountId: 3, clientId: UTILISATEUR_TEMPORAIRE, brokerId: 11, aud: 'client_portal' })
    const res = await appeler('GET', '/api/portal/espace', jetonPortail)
    expect(res.status).toBe(200)
    expect(poolCourant.requetes).toHaveLength(0)
  })

  test('jeton illisible : la garde s’efface (l’authentification répondra 401)', async () => {
    const res = await appeler('GET', '/api/clients', 'jeton.bidon.xxx')
    expect(res.status).toBe(200)
    expect(poolCourant.requetes).toHaveLength(0)
  })

  test('preflight OPTIONS : jamais refusé (sinon le 403 devient une erreur CORS opaque)', async () => {
    const res = await fetch(`${origin}/api/clients`, {
      method: 'OPTIONS',
      headers: { Authorization: `Bearer ${jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE })}` },
    })
    expect(res.status).toBe(200)
    expect(poolCourant.requetes).toHaveLength(0)
  })

  test('compte introuvable : la garde ne bloque pas (l’authentification tranchera)', async () => {
    poolCourant = poolAvec({ ligneAbsente: true })
    const res = await appeler('GET', '/api/clients', jeton({ id: 999999, userId: 999999 }))
    expect(res.status).toBe(200)
  })

  test('base injoignable : 503 explicite, JAMAIS un passage', async () => {
    poolCourant = poolAvec({ panne: true })
    const res = await appeler('GET', '/api/clients', jeton({ id: UTILISATEUR_TEMPORAIRE, userId: UTILISATEUR_TEMPORAIRE }))
    const corps = await res.json()
    expect(res.status).toBe(503)
    expect(corps.error).toBe('controle_mot_de_passe_indisponible')
    expect(routesAtteintes).toHaveLength(0)
  })

  test('la réponse de refus est stable (contrat exposé au frontal)', () => {
    expect(chargeRefus()).toEqual({
      success: false,
      error: CODE_REFUS,
      code: CODE_REFUS,
      must_change_password: true,
      message: expect.stringContaining('mot de passe temporaire'),
    })
  })
})

describe('server.js — la garde est montée AVANT les routeurs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8')

  test('la garde est montée sur le préfixe /api', () => {
    expect(source).toMatch(/app\.use\('\/api',\s*creerGardeChangementMotDePasse\(pool\)\)/)
  })

  test('elle est montée avant le premier routeur /api', () => {
    const positionGarde = source.indexOf('creerGardeChangementMotDePasse(pool)')
    expect(positionGarde).toBeGreaterThan(0)
    const positionPremierRouteur = source.indexOf("app.use('/api/auth'")
    expect(positionPremierRouteur).toBeGreaterThan(0)
    expect(positionGarde).toBeLessThan(positionPremierRouteur)
  })

  test('la garde de mot de passe temporaire PRÉCÈDE la garde de rôle (l’état du compte d’abord)', () => {
    expect(source.indexOf('creerGardeChangementMotDePasse(pool)'))
      .toBeLessThan(source.indexOf('creerGardeEcritureRole(pool)'))
  })
})
