/**
 * jetonsEnBase.test.js — AUCUN JETON À USAGE UNIQUE N'EST STOCKÉ EN CLAIR.
 *
 * POURQUOI CE TEST (P3 SEC-027, mesuré en production le 20/09/2026)
 *   * `users.password_reset_token` était écrit EN CLAIR : une lecture de la base
 *     (sauvegarde, dump, accès d'un prestataire, injection SQL ailleurs) donnait
 *     le pouvoir de réinitialiser — donc de prendre — le mot de passe de
 *     n'importe quel compte pendant la durée de validité du jeton ;
 *   * `document_requests.token` (lien de collecte de pièces) était écrit en
 *     clair : une lecture de la base permettait de déposer des pièces dans le
 *     dossier d'un client au nom de ce client.
 *
 * Ce test verrouille les deux : ce qui est ÉCRIT est un hachage, ce qui est CHERCHÉ
 * est le hachage du jeton présenté, et le jeton en clair ne quitte le serveur que
 * par la réponse HTTP (jamais par une colonne).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const crypto = require('crypto')
const poolModule = require('../db')
const User = require('./User')
const { hachageJeton, estHachage, clauseJetonRecherche, LONGUEUR_JETON } = require('../lib/jetons')

const JETON = crypto.randomBytes(32).toString('hex') // 64 caractères, comme authController
const EMPREINTE = crypto.createHash('sha256').update(JETON, 'utf8').digest('hex')

function attendre(rows = [{ id: 1, email: 'a@b.test' }]) {
  const requetes = []
  poolModule.query.mockImplementation(async (sql, params) => {
    requetes.push({ sql: String(sql), params })
    return { rows, rowCount: rows.length, rowCount2: rows.length }
  })
  return requetes
}

describe('lib/jetons', () => {
  test('le hachage est déterministe, hexadécimal et de 64 caractères', () => {
    expect(hachageJeton(JETON)).toBe(EMPREINTE)
    expect(estHachage(EMPREINTE)).toBe(true)
    expect(hachageJeton('trop-court')).toBeNull()
    expect(hachageJeton('')).toBeNull()
    expect(JETON.length).toBeGreaterThanOrEqual(LONGUEUR_JETON)
  })

  test('clauseJetonRecherche cherche le HACHAGE (et tolère l’ancienne forme pour les liens déjà émis)', () => {
    const clause = clauseJetonRecherche('dr.token', JETON, 1)
    expect(clause.sql).toContain('dr.token = $1')
    expect(clause.params[0]).toBe(EMPREINTE)
    expect(clause.params[1]).toBe(JETON)
    // Un jeton non conforme ne peut pas correspondre à un jeton en clair stocké.
    const court = clauseJetonRecherche('dr.token', 'court', 1)
    expect(court.sql).toBe('dr.token = $1')
  })
})

describe('users.password_reset_token — stocké haché', () => {
  beforeEach(() => poolModule.query.mockReset())

  test('setResetToken écrit le HACHAGE, jamais le jeton', async () => {
    const requetes = attendre()
    await User.setResetToken('a@b.test', JETON, new Date(Date.now() + 3600_000))
    expect(requetes[0].params[0]).toBe(EMPREINTE)
    expect(requetes[0].params[0]).not.toBe(JETON)
    expect(requetes[0].sql).toContain('password_reset_token = $1')
  })

  test('setResetToken refuse un jeton trop court (entropie insuffisante)', async () => {
    attendre()
    await expect(User.setResetToken('a@b.test', 'abc', new Date())).rejects.toThrow(/invalide/)
  })

  test('findByResetToken compare le HACHAGE du jeton présenté', async () => {
    const requetes = attendre()
    await User.findByResetToken(JETON)
    expect(requetes[0].params[0]).toBe(EMPREINTE)
  })

  test('findByResetToken ne cherche rien pour un jeton non conforme (aucune requête)', async () => {
    const requetes = attendre()
    await expect(User.findByResetToken('x')).resolves.toBeNull()
    expect(requetes).toHaveLength(0)
  })

  test('resetPassword réinitialise sur le HACHAGE', async () => {
    const requetes = attendre()
    await User.resetPassword(JETON, 'NouveauMotDePasse!')
    expect(requetes[0].params[1]).toBe(EMPREINTE)
    expect(requetes[0].params[0]).not.toBe('NouveauMotDePasse!') // mot de passe haché (bcrypt)
  })

  test('aucune ligne du modèle ne stocke le jeton en clair', () => {
    const fs = require('fs')
    const path = require('path')
    const source = fs.readFileSync(path.join(__dirname, 'User.js'), 'utf8')
    // Aucun `[token,` ni `[..., token]` : le jeton est toujours haché avant usage.
    expect(source).not.toMatch(/\[token\]/)
    expect(source).toMatch(/hachageJeton\(token\)/)
  })
})

describe('document_requests.token — stocké haché', () => {
  beforeEach(() => poolModule.query.mockReset())

  test('la création écrit le HACHAGE et renvoie le jeton en clair pour construire le lien', async () => {
    const documentLinks = require('../services/documentLinks')
    const requetes = []
    poolModule.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      if (String(sql).includes('INSERT INTO document_requests')) {
        return { rows: [{ id: 12, status: 'pending', expires_at: new Date(), created_at: new Date() }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const demande = await documentLinks.createDocumentRequest({
      clientId: 5, brokerId: 7, requestedTypes: [], expiresInHours: 72,
    })

    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO document_requests'))
    expect(insertion).toBeTruthy()
    const jetonStocke = insertion.params[2]
    expect(jetonStocke).not.toBe(demande.token)          // rien en clair en base
    expect(jetonStocke).toBe(hachageJeton(demande.token)) // c'est bien son hachage
    expect(demande.token).toMatch(/^[A-Za-z0-9_-]+$/)     // jeton URL-safe en clair, côté réponse
    expect(demande.url).toContain(demande.token)
  })

  test('la validation d’un lien de collecte compare le hachage du jeton présenté', async () => {
    const documentLinks = require('../services/documentLinks')
    const jeton = 'A'.repeat(32)
    const requetes = []
    poolModule.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      return { rows: [], rowCount: 0 }
    })
    await documentLinks.validateToken(jeton)
    expect(requetes[0].params[0]).toBe(hachageJeton(jeton))
  })
})
