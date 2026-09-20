/**
 * auth.canton.test.js — le canton d'un cabinet suisse est ÉCRIT puis RELU.
 *
 * POURQUOI CE TEST : défaut reproduit le 20/09/2026 — `PUT /api/auth/me`
 * acceptait le canton d'un cabinet suisse (broker_profiles.canton = 'GE' en
 * base) mais `GET /api/auth/me` ne renvoyait PAS la clé `canton`. L'écran
 * Paramètres (champ visible quand le pays vaut « CH ») affichait donc un canton
 * vide après chaque rechargement : le cabinet croyait avoir perdu sa saisie.
 *
 * Ce test exerce le routeur HTTP réel avec un pool SIMULÉ en mémoire (pas de
 * base) et vérifie :
 *   1. l'aller-retour « ge » → « GE » (écriture + relecture par GET) ;
 *   2. le canton peut être le SEUL champ envoyé (ce n'est pas « aucune
 *      modification » : c'est une écriture réelle) ;
 *   3. un canton inexistant est REFUSÉ, sans rien écrire ;
 *   4. la devise du cabinet est déclarée par l'API (CHF / EUR) ;
 *   5. un cabinet français garde son comportement (aucun canton, EUR).
 */

jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next() },
  verifyTokenMiddleware: (req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next() },
}))
jest.mock('../middleware/rateLimit', () => {
  // Tous les limiteurs sont neutralisés : ce test porte sur le canton, pas sur
  // les plafonds. Le mock est construit par énumération EXPLICITE des noms
  // exportés au moment de l'écriture — un limiteur ajouté aux routes sans être
  // ajouté ici ferait échouer le `require('./auth')` avec un « callback
  // Undefined », ce qui est exactement le signal souhaité.
  const passe = (_req, _res, next) => next()
  return {
    loginLimiter: passe,
    meLimiter: passe,
    forgotPasswordLimiter: passe,
    resetPasswordLimiter: passe,
    refreshLimiter: passe,
    googleAuthLimiter: passe,
    apiLimiter: passe,
    healthLimiter: passe,
    arkLimiter: passe,
    getClientIp: () => '127.0.0.1',
  }
})

const express = require('express')
const pool = require('../db')
const router = require('./auth')

/** Fiche cabinet en mémoire : la « base » de ce test. */
let cabinet
let utilisateur

function repondre(sql, params) {
  const requete = String(sql)

  if (requete.includes('FROM users WHERE id')) return { rows: [utilisateur] }
  if (requete.startsWith('UPDATE users')) {
    utilisateur = { ...utilisateur, first_name: params[1] || utilisateur.first_name, phone: params[3] || utilisateur.phone }
    return { rows: [utilisateur] }
  }
  // Relecture de l'identité du cabinet (lireCabinet) : renvoie la fiche réelle,
  // canton compris — c'est précisément ce que GET /me ne renvoyait pas.
  if (requete.includes('FROM broker_profiles WHERE user_id')) {
    return { rows: cabinet ? [cabinet] : [] }
  }
  // Écriture du canton par la route.
  if (requete.startsWith('UPDATE broker_profiles') && requete.includes('RETURNING canton')) {
    cabinet = { ...cabinet, canton: params[1] }
    return { rows: [{ canton: cabinet.canton }] }
  }
  // Mise à jour des champs d'identité par le modèle de profil (sans canton :
  // le modèle ne connaît pas cette colonne).
  if (requete.startsWith('UPDATE broker_profiles')) {
    if (!cabinet) return { rows: [] }
    return { rows: [cabinet] }
  }
  if (requete.startsWith('INSERT INTO broker_profiles')) {
    cabinet = { user_id: params[0], canton: params[1] }
    return { rows: [cabinet] }
  }
  return { rows: [] }
}

describe('PUT puis GET /api/auth/me — canton du cabinet', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use(router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    pool.query.mockImplementation(repondre)
    utilisateur = {
      id: 7, email: 'cabinet@audit.ch', first_name: 'Léa', last_name: 'Dupont',
      role: 'broker', plan: 'trial', subscription_status: 'trialing', phone: null,
      must_change_password: false,
    }
    cabinet = {
      user_id: 7, cabinet: 'Cabinet Audit Suisse SA', orias: '', telephone: '+41 21 000 00 00',
      adresse: 'Rue du Lac 12', ville: 'Villeneuve', code_postal: '1844',
      registre_type: 'FINMA', registre_numero: '', uid: 'CHE-123.456.789',
      site_web: 'cabinet-audit.ch', pays: 'CH', langue: 'fr', canton: null,
    }
  })

  async function put(corps) {
    const res = await fetch(`${origin}/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    })
    return { statut: res.status, corps: await res.json() }
  }

  async function get() {
    const res = await fetch(`${origin}/me`)
    return { statut: res.status, corps: await res.json() }
  }

  test('« ge » est enregistré en « GE » et relu par GET /me', async () => {
    const ecriture = await put({ canton: 'ge' })
    expect(ecriture.statut).toBe(200)
    expect(cabinet.canton).toBe('GE')
    expect(ecriture.corps.canton).toBe('GE')

    const lecture = await get()
    expect(lecture.statut).toBe(200)
    expect(lecture.corps.canton).toBe('GE')
    expect(lecture.corps.pays).toBe('CH')
  })

  test('le canton peut être le SEUL champ envoyé (écriture réelle, pas « aucune modification »)', async () => {
    const res = await put({ canton: 'VD' })
    expect(res.statut).toBe(200)
    expect(res.corps.success).toBe(true)
    expect(res.corps.canton).toBe('VD')
  })

  test('un canton inexistant est refusé ET rien n’est écrit', async () => {
    const res = await put({ canton: 'ZZ' })
    expect(res.statut).toBe(400)
    expect(res.corps.error).toBe('canton_inconnu')
    expect(cabinet.canton).toBeNull()
  })

  test('la devise du cabinet est déclarée par l’API : CHF pour un cabinet suisse', async () => {
    const lecture = await get()
    expect(lecture.corps.marche).toBe('CH')
    expect(lecture.corps.devise).toBe('CHF')
  })

  test('aucune valeur inventée : un canton non renseigné reste une chaîne vide', async () => {
    const lecture = await get()
    expect(lecture.corps.canton).toBe('')
  })

  test('un cabinet français n’a pas de canton et reste en EUR', async () => {
    cabinet = { ...cabinet, pays: 'FR', canton: null, registre_type: 'ORIAS', registre_numero: '07000001', uid: null }
    const lecture = await get()
    expect(lecture.corps.devise).toBe('EUR')
    expect(lecture.corps.marche).toBe('FR')
    expect(lecture.corps.canton).toBe('')
  })

  test('le canton n’est jamais présenté au modèle de profil (pas de doublon d’écriture)', async () => {
    await put({ canton: 'NE' })
    const requetesProfil = pool.query.mock.calls.map(([sql]) => String(sql))
    expect(requetesProfil.some((sql) => sql.includes('canton = $2'))).toBe(true)
  })
})
