/**
 * auditLogger.test.js — LE JOURNAL D'AUDIT EXISTE, COUVRE LES ÉCRITURES ET NE
 * PEUT PAS ÊTRE RÉÉCRIT.
 *
 * POURQUOI CE TEST (P3 SEC-024, mesuré en production le 20/09/2026)
 *   * `audit_logs` contenait 0 ligne : le middleware qui l'alimente
 *     (`src/middleware/auditLogger.js`) n'était monté NULLE PART, et aucune
 *     action sensible ne laissait de trace exploitable ;
 *   * et rien n'empêchait de modifier ou d'effacer une ligne : un journal
 *     réinscriptible ne prouve rien (celui qui veut effacer sa trace commence
 *     par réécrire le journal). La garantie est désormais posée dans la BASE
 *     (trigger `audit_logs_append_only`, migration 119).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const poolModule = require('../db')
const {
  journaliserEcritures,
  saveAuditLog,
  sanitizeForAudit,
  assurerAppendOnly,
  SQL_APPEND_ONLY,
  ressourceDepuisChemin,
  actionDepuisMethode,
} = require('./auditLogger')

function fausseReponse() {
  const ecouteurs = {}
  return {
    statusCode: 200,
    on(ev, fn) { (ecouteurs[ev] = ecouteurs[ev] || []).push(fn); return this },
    declencher(ev) { (ecouteurs[ev] || []).forEach((f) => f()) },
    status(c) { this.statusCode = c; return this },
  }
}

function poolJournal() {
  const requetes = []
  return {
    requetes,
    async query(sql, params) { requetes.push({ sql: String(sql), params }); return { rows: [], rowCount: 1 } },
  }
}

function requete(methode, chemin, { corps = null, user = { id: 7, userId: 7 } } = {}) {
  return {
    method: methode,
    originalUrl: chemin,
    url: chemin,
    body: corps,
    user,
    params: {},
    headers: { 'user-agent': 'jest' },
    ip: '1.2.3.4',
  }
}

const vider = () => new Promise((r) => setImmediate(r))

describe('journal des écritures', () => {
  beforeEach(() => poolModule.query.mockReset())

  test('une écriture réussie laisse une ligne (POST /api/clients → clients.create)', async () => {
    const pool = poolJournal()
    const middleware = journaliserEcritures(pool)
    const res = fausseReponse()
    let suivant = false
    middleware(requete('POST', '/api/clients', { corps: { nom: 'Dupont' } }), res, () => { suivant = true })
    expect(suivant).toBe(true)
    res.declencher('finish')
    await vider()

    const insertion = pool.requetes.find((r) => r.sql.includes('INSERT INTO audit_logs'))
    expect(insertion).toBeTruthy()
    expect(insertion.params[1]).toBe('clients.create')
    expect(insertion.params[0]).toBe(7)
    expect(insertion.params[3]).toBe(null) // resource_id absent → null, jamais 'undefined'
  })

  test('une écriture REFUSÉE (403/500) n’est pas journalisée comme un succès', async () => {
    const pool = poolJournal()
    const res = fausseReponse()
    journaliserEcritures(pool)(requete('POST', '/api/clients', { corps: {} }), res, () => {})
    res.status(403)
    res.declencher('finish')
    await vider()
    expect(pool.requetes).toHaveLength(0)
  })

  test('les LECTURES ne produisent aucune ligne', async () => {
    const pool = poolJournal()
    const res = fausseReponse()
    journaliserEcritures(pool)(requete('GET', '/api/clients'), res, () => {})
    res.declencher('finish')
    await vider()
    expect(pool.requetes).toHaveLength(0)
  })

  test('les points d’entrée de fournisseurs et l’authentification sont exclus', async () => {
    const pool = poolJournal()
    for (const chemin of ['/api/auth/login', '/api/webhooks/incoming', '/api/stripe/webhook', '/api/voice/webhook', '/api/document-inbox/public/upload/t']) {
      const res = fausseReponse()
      journaliserEcritures(pool)(requete('POST', chemin, { corps: {} }), res, () => {})
      res.declencher('finish')
    }
    await vider()
    expect(pool.requetes).toHaveLength(0)
  })

  test('une modification et une suppression sont nommées comme telles', () => {
    expect(actionDepuisMethode('PUT')).toBe('update')
    expect(actionDepuisMethode('PATCH')).toBe('update')
    expect(actionDepuisMethode('DELETE')).toBe('delete')
    expect(ressourceDepuisChemin('/api/clients/12')).toBe('clients')
    expect(ressourceDepuisChemin('/api/onboarding/step')).toBe('onboarding')
  })

  test('un échec du journal ne fait JAMAIS échouer la requête métier', async () => {
    const pool = { async query() { throw new Error('base indisponible') } }
    const res = fausseReponse()
    journaliserEcritures(pool)(requete('POST', '/api/clients', { corps: {} }), res, () => {})
    res.declencher('finish')
    await vider() // aucune exception ne doit remonter
    expect(true).toBe(true)
  })

  test('les secrets ne sont jamais écrits dans le journal', async () => {
    const expurge = sanitizeForAudit({
      password: 'secret-en-clair', token: 'jeton', nested: { api_key: 'k', ok: 'visible' },
    })
    expect(expurge.password).toBe('[REDACTED]')
    expect(expurge.token).toBe('[REDACTED]')
    expect(expurge.nested.api_key).toBe('[REDACTED]')
    expect(expurge.nested.ok).toBe('visible')

    const pool = poolJournal()
    const res = fausseReponse()
    journaliserEcritures(pool)(requete('POST', '/api/clients', { corps: { password: 'secret-en-clair', nom: 'X' } }), res, () => {})
    res.declencher('finish')
    await vider()
    const insertion = pool.requetes[0]
    expect(insertion.params[5]).not.toContain('secret-en-clair')
    expect(insertion.params[5]).toContain('REDACTED')
  })

  test('saveAuditLog écrit une entrée complète', async () => {
    const pool = poolJournal()
    await saveAuditLog({ userId: 3, action: 'clients.create', resourceType: 'clients', resourceId: 9, newValues: { a: 1 } }, pool)
    expect(pool.requetes[0].sql).toContain('INSERT INTO audit_logs')
    expect(pool.requetes[0].params[3]).toBe('9')
  })
})

describe('journal append-only', () => {
  test('la garantie est posée dans la BASE (UPDATE et DELETE refusés par trigger)', () => {
    expect(SQL_APPEND_ONLY).toMatch(/BEFORE UPDATE OR DELETE ON audit_logs/)
    expect(SQL_APPEND_ONLY).toMatch(/RAISE EXCEPTION/)
    expect(SQL_APPEND_ONLY).toMatch(/DROP TRIGGER IF EXISTS trg_audit_logs_append_only/)
  })

  test('assurerAppendOnly applique le SQL et ne casse rien si la base refuse', async () => {
    const pool = poolJournal()
    await expect(assurerAppendOnly(pool)).resolves.toBe(true)
    expect(pool.requetes[0].sql).toContain('audit_logs_append_only')

    const enPanne = { async query() { throw new Error('droits insuffisants') } }
    await expect(assurerAppendOnly(enPanne)).resolves.toBe(false)
  })
})
