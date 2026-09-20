/**
 * rateLimit.securite.test.js — LES LIMITEURS NE SONT PLUS CONTOURNABLES PAR UN
 * EN-TÊTE FOURNI PAR L'APPELANT, ET LES ROUTES SENSIBLES SONT BORNÉES.
 *
 * POURQUOI CE TEST (P3 SEC-018 / P4 SEC-031, mesuré en production le 20/09/2026)
 *   * `getClientIp` renvoyait la PREMIÈRE entrée de `X-Forwarded-For`. Cet
 *     en-tête vient du client : `X-Forwarded-For: 1.2.3.4` changeait la clé de
 *     comptage à chaque requête, donc TOUS les limiteurs fondés sur l'IP
 *     (connexion, mot de passe oublié, inscription) étaient contournables ;
 *   * quatre routes d'authentification n'avaient aucun limiteur :
 *     forgot-password, reset-password, refresh et google — cette dernière créant
 *     un compte sans passer par l'inscription.
 */
const express = require('express')
const {
  getClientIp,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  refreshLimiter,
  googleAuthLimiter,
  loginLimiter,
  meLimiter,
  apiLimiter,
} = require('./rateLimit')

describe('adresse de l’appelant — non falsifiable', () => {
  test('un X-Forwarded-For forgé par le client est IGNORÉ', () => {
    // Express (trust proxy) a déjà calculé `req.ip` à partir des proxys de
    // confiance : c'est cette valeur qui compte, pas l'en-tête brut.
    expect(getClientIp({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' } })).toBe('203.0.113.9')
  })

  test('sans req.ip, on retombe sur le socket, jamais sur l’en-tête client', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4' }, socket: { remoteAddress: '10.0.0.5' } })).toBe('10.0.0.5')
    expect(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4' } })).toBe('0.0.0.0')
  })

  test('deux en-têtes forgés différents ne créent pas deux clés distinctes', () => {
    const a = getClientIp({ ip: '198.51.100.7', headers: { 'x-forwarded-for': '1.1.1.1' } })
    const b = getClientIp({ ip: '198.51.100.7', headers: { 'x-forwarded-for': '2.2.2.2' } })
    expect(a).toBe(b)
  })
})

describe('les quatre routes sensibles sont bornées', () => {
  test.each([
    ['forgotPasswordLimiter', forgotPasswordLimiter],
    ['resetPasswordLimiter', resetPasswordLimiter],
    ['refreshLimiter', refreshLimiter],
    ['googleAuthLimiter', googleAuthLimiter],
  ])('%s est exporté et utilisable comme middleware', (_nom, limiteur) => {
    expect(typeof limiteur).toBe('function')
  })

  test('mot de passe oublié : 6e demande de la même IP pour le même e-mail ⇒ 429', async () => {
    const app = express()
    app.use(express.json())
    app.use('/f', forgotPasswordLimiter, (req, res) => res.json({ ok: true }))
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const origin = `http://127.0.0.1:${server.address().port}`
    try {
      const codes = []
      for (let i = 0; i < 6; i += 1) {
        const res = await fetch(`${origin}/f`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'meme@adresse.test' }),
        })
        codes.push(res.status)
      }
      expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true)
      expect(codes[5]).toBe(429)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })

  test('mot de passe oublié : une AUTRE adresse e-mail n’est pas bloquée par la première', async () => {
    const app = express()
    app.use(express.json())
    app.use('/f', forgotPasswordLimiter, (req, res) => res.json({ ok: true }))
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const origin = `http://127.0.0.1:${server.address().port}`
    try {
      for (let i = 0; i < 5; i += 1) {
        await fetch(`${origin}/f`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'premier@adresse.test' }) })
      }
      const res = await fetch(`${origin}/f`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'second@adresse.test' }) })
      expect(res.status).toBe(200)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })

  test('rafraîchissement : la même IP sans jeton est bornée', async () => {
    const app = express()
    app.use(express.json())
    app.use('/r', refreshLimiter, (req, res) => res.json({ ok: true }))
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const origin = `http://127.0.0.1:${server.address().port}`
    try {
      let dernier = 0
      for (let i = 0; i < 61; i += 1) {
        const res = await fetch(`${origin}/r`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        dernier = res.status
      }
      expect(dernier).toBe(429)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})

describe('server.js — le proxy de confiance est déclaré (sans quoi req.ip mentirait)', () => {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8')

  test('trust proxy est configuré avant l’usage des limiteurs', () => {
    expect(source).toMatch(/app\.set\('trust proxy'/)
    expect(source.indexOf("app.set('trust proxy'")).toBeLessThan(source.indexOf("require('./src/middleware/rateLimit')"))
  })

  test('les limiteurs d’authentification sont exportés et montés', () => {
    expect(typeof loginLimiter).toBe('function')
    expect(typeof meLimiter).toBe('function')
    expect(typeof apiLimiter).toBe('function')
    const auth = fs.readFileSync(path.join(__dirname, '..', 'routes', 'auth.js'), 'utf8')
    for (const nom of ['forgotPasswordLimiter', 'resetPasswordLimiter', 'refreshLimiter', 'googleAuthLimiter']) {
      expect(auth).toContain(nom)
    }
  })
})
