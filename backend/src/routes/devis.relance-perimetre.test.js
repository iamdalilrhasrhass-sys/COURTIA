/**
 * devis.relance-perimetre.test.js — LA RELANCE FORCÉE RESTE DANS LE PÉRIMÈTRE
 * DE L'APPELANT (constat SEC-029, vérifié le 21/09/2026).
 *
 * DÉFAUT : `POST /api/devis/:id/relance` vérifiait bien l'appartenance du devis
 * demandé, puis appelait `processDueRelances()` SANS argument — le traitement
 * parcourt alors TOUTES les relances échues de la base, tous cabinets confondus :
 * un utilisateur déclenchait des envois d'e-mails, des écritures et un coût pour
 * des cabinets qui ne sont pas le sien.
 *
 * CE QUE CE TEST VERROUILLE (la CLAUSE SQL réellement émise, pas le code HTTP) :
 *   1. la requête de traitement porte `r.devis_id = $1` (CE devis) ET la clause
 *      de cabinet `d.cabinet_id = ANY($n::uuid[]) OR d.user_id = $m` ;
 *   2. un compte SANS cabinet garde la clause historique `d.user_id = $n` (aucun
 *      élargissement) ;
 *   3. la preuve par l'effet : le pool simulé ne rend une relance d'un AUTRE
 *      cabinet QUE si la requête est non bornée. Aucun e-mail ne part, et rien
 *      n'est « scanné » — alors que ce serait le cas si le traitement global
 *      était revenu.
 *   4. le worker planifié (`processDueRelances()` sans argument) garde son
 *      traitement global : c'est le cron de la plateforme.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: true, provider: 'test' })),
  sendEmail: jest.fn(async () => ({ success: true })),
}))

const express = require('express')
const pool = require('../db')
const { sendCommercialEmail } = require('../services/emailService')
const { processDueRelances } = require('../services/devisRelanceService')
const router = require('./devis')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

/** Relance échue d'un AUTRE cabinet : elle ne doit jamais être traitée. */
const RELANCE_AUTRE_CABINET = {
  relance_id: 900, template_key: 'J3', devis_id: 777, status: 'sent',
  product: 'auto', reference: 'DV-AUTRECAB', client_email_cache: 'autre@exemple.invalid',
  client_name_cache: 'Client Autre Cabinet', cabinet_name_cache: 'Cabinet B', pdf_path: null,
}

describe('POST /api/devis/:id/relance — périmètre du traitement déclenché', () => {
  let server
  let origin
  let requetes
  let appartenances

  function brancherPool() {
    pool.query.mockImplementation(async (sql, params) => {
      const texte = String(sql)
      requetes.push({ sql: texte, params })
      if (texte.includes('cabinet_members')) return { rows: appartenances, rowCount: appartenances.length }
      if (texte.includes('FROM devis_relances r')) {
        // La base ne rend la relance de l'autre cabinet QUE si la requête n'est
        // pas bornée : c'est exactement ce que SEC-029 reproche.
        const bornee = /r\.devis_id = \$\d+/.test(texte) && /d\.cabinet_id = ANY\(\$\d+::uuid\[\]\)/.test(texte)
        return { rows: bornee ? [] : [RELANCE_AUTRE_CABINET], rowCount: 0 }
      }
      if (texte.includes('FROM devis_wizard d')) {
        return { rows: [{ id: 50, status: 'sent', client_id: 184 }], rowCount: 1 }
      }
      return { rows: [], rowCount: 1 }
    })
  }

  const relancer = (id = 50, userId = 11) => fetch(`${origin}/api/devis/${id}/relance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-user': String(userId) },
    body: JSON.stringify({ template: 'J7' }),
  })

  const requeteRelances = () => requetes.find((r) => r.sql.includes('FROM devis_relances r'))

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use((req, _res, next) => {
      req.user = { id: Number(req.headers['x-test-user'] || 11), userId: Number(req.headers['x-test-user'] || 11), role: 'owner' }
      next()
    })
    app.use('/api/devis', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_A, role: 'owner', retire: false }]
    pool.query.mockReset()
    sendCommercialEmail.mockReset()
    sendCommercialEmail.mockResolvedValue({ success: true, provider: 'test' })
    brancherPool()
  })

  test('le traitement est borné à CE devis ET au cabinet de l’appelant', async () => {
    const res = await relancer(50)
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.ok).toBe(true)
    expect(corps.devis_type).toBe('wizard')

    const requete = requeteRelances()
    expect(requete).toBeTruthy()
    expect(requete.sql).toContain('r.devis_id = $1')
    expect(requete.sql).toContain('d.cabinet_id = ANY($2::uuid[]) OR d.user_id = $3')
    expect(requete.params).toEqual([50, [CAB_A], 11])
    // Les conditions historiques du worker sont conservées.
    expect(requete.sql).toContain("r.status = 'scheduled'")
    expect(requete.sql).toContain("d.status IN ('sent', 'opened')")
  })

  test('aucune relance d’un AUTRE cabinet n’est traitée (aucun e-mail envoyé)', async () => {
    const res = await relancer(50)
    const corps = await res.json()

    // Le pool aurait rendu la relance de l'autre cabinet si la requête n'était
    // pas bornée : elle ne l'est pas, donc rien n'est scanné ni envoyé.
    expect(corps.scanned).toBe(0)
    expect(corps.sent).toBe(0)
    expect(sendCommercialEmail).not.toHaveBeenCalled()
    expect(requetes.some((r) => /status='sent'/.test(r.sql) && r.sql.includes('devis_relances'))).toBe(false)
    // La relance créée est celle du devis demandé, dans le cabinet de l'appelant.
    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO devis_relances'))
    expect(insertion.params[0]).toBe(50)
  })

  test('compte SANS cabinet : la clause historique porte sur l’utilisateur, rien de plus', async () => {
    appartenances = []
    const res = await relancer(50, 11)
    expect(res.status).toBe(200)

    const requete = requeteRelances()
    expect(requete.sql).toContain('r.devis_id = $1')
    expect(requete.sql).toContain('d.user_id = $2')
    expect(requete.sql).not.toContain('ANY(')
    expect(requete.params).toEqual([50, 11])
  })

  test('un devis hors périmètre répond 404 et ne déclenche AUCUN traitement', async () => {
    pool.query.mockImplementation(async (sql) => {
      requetes.push({ sql: String(sql), params: undefined })
      if (String(sql).includes('cabinet_members')) return { rows: appartenances, rowCount: 1 }
      return { rows: [], rowCount: 0 }   // le devis n'est pas dans la portée
    })

    const res = await relancer(777)
    expect(res.status).toBe(404)
    expect(requetes.some((r) => r.sql.includes('FROM devis_relances r'))).toBe(false)
    expect(sendCommercialEmail).not.toHaveBeenCalled()
  })

  test('le worker planifié garde le traitement GLOBAL (sans argument)', async () => {
    // Sans périmètre, la requête ne porte ni `devis_id` ni clause de cabinet :
    // c'est le cron de la plateforme, seule autorité globale.
    const resultat = await processDueRelances()
    const requete = requeteRelances()
    expect(resultat.scanned).toBe(1)          // la relance « autre cabinet » est due
    expect(requete.sql).not.toContain('r.devis_id = $')
    expect(requete.sql).not.toContain('d.cabinet_id = ANY(')
    expect(requete.params).toEqual([])
  })
})
