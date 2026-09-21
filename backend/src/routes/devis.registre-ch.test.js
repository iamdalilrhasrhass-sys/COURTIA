/**
 * devis.registre-ch.test.js — LE DOCUMENT CLIENT D'UN CABINET SUISSE PORTE SON
 * REGISTRE RÉEL, ET JAMAIS LE MOT « ORIAS ».
 *
 * DÉFAUT MESURÉ EN PRODUCTION (Red Team, 4e passe — 21/09/2026, P1)
 * Cabinet `pays=CH`, `registre_type=FINMA`, `registre_numero`/`uid = CHE-123.456.789`,
 * canton VD : `POST /api/devis/50/send {"dry_run":true}` répondait 200 avec
 * `registre_imprime: null` et un HTML client SANS aucune ligne de registre —
 * alors que le PDF du même cabinet porte « FINMA CHE-… ». Causes : la lecture ne
 * regardait que `cabinets.orias_number` / `broker_profiles.orias` (un registre
 * suisse y est structurellement absent) et le libellé « ORIAS » était écrit en dur.
 *
 * CE QUE CE TEST VERROUILLE
 *   1. marché CH → l'e-mail porte l'identifiant du cabinet avec le libellé réel
 *      (`FINMA : CHE-123.456.789`) ;
 *   2. marché CH → le mot « ORIAS » n'apparaît nulle part (ni un numéro français) ;
 *   3. marché CH sans identifiant renseigné → aucune mention, aucune invention ;
 *   4. marché FR → comportement inchangé (« ORIAS 07000000 »).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: false, skipped: true, error: 'email_non_configure' })),
  sendEmail: jest.fn(async () => ({ success: false, skipped: true })),
}))
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => {}),
  cancelPendingRelancesForDevis: jest.fn(async () => {}),
  processDueRelances: jest.fn(async () => ({ sent: 0, not_sent: 0, scanned: 0 })),
}))

const express = require('express')
const pool = require('../db')
const router = require('./devis')

const CAB_CH = 'b723b44c-5a31-4de8-b30c-dd1c76705147'
const CAB_FR = '05489d07-2005-4c1e-8f93-2685e512bc9d'

const DEVIS_CH = {
  id: 50, user_id: 165, cabinet_id: CAB_CH, product: 'prévoyance', status: 'ready',
  reference: 'DV-RT4CH', cabinet_name_cache: 'RT4 Helvetia Cabinet', validity_days: 30,
  client_email_cache: 'client@exemple.invalid', client_name_cache: 'Léa Dupont',
}

describe('POST /api/devis/:id/send — registre du cabinet dans le message client', () => {
  let server
  let origin

  /** Pool simulé piloté par le CONTENU de la requête (premier motif qui matche). */
  function mockSql(demandes = []) {
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      for (const [motif, reponse] of demandes) {
        if (texte.includes(motif)) return typeof reponse === 'function' ? reponse(texte) : reponse
      }
      return { rows: [], rowCount: 0 }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 165, userId: 165, role: 'owner' }; next() })
    app.use('/api/devis', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })
  beforeEach(() => pool.query.mockReset())

  const apercu = (id = 50) => fetch(`${origin}/api/devis/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: true }),
  })

  test('cabinet suisse : l’identifiant FINMA du cabinet est imprimé avec son libellé', async () => {
    mockSql([
      ['cabinet_members', { rows: [{ cabinet_id: CAB_CH, role: 'owner', retire: false }] }],
      ['FROM devis_wizard', { rows: [DEVIS_CH] }],
      // Cabinet suisse : registre porté par `cabinets` (migration 117).
      ['FROM cabinets', {
        rows: [{
          id: CAB_CH, name: 'RT4 Helvetia Cabinet', country: 'CH', registre_type: 'FINMA',
          registre_numero: 'CHE-123.456.789', uid: 'CHE-123.456.789', canton: 'VD',
          orias_number: null,
        }],
      }],
      // Aucun ORIAS nulle part : ni sur le cabinet, ni sur le profil de l'auteur.
      ['broker_profiles', { rows: [{ orias: null, registre: null, pays: 'CH', registre_type: 'FINMA', registre_numero: 'CHE-123.456.789', uid: 'CHE-123.456.789' }] }],
    ])

    const res = await apercu()
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.dry_run).toBe(true)
    expect(corps.html).toContain('FINMA : CHE-123.456.789')
    expect(corps.html).not.toMatch(/ORIAS/i)
    expect(corps.registre_imprime).toBe('CHE-123.456.789')
    expect(corps.registre_libelle).toBe('FINMA')
    expect(corps.registre_mention).toBe('FINMA : CHE-123.456.789')
  })

  test('cabinet suisse sans IDE renseigné : aucune mention inventée', async () => {
    mockSql([
      ['cabinet_members', { rows: [{ cabinet_id: CAB_CH, role: 'owner', retire: false }] }],
      ['FROM devis_wizard', { rows: [{ ...DEVIS_CH, id: 51 }] }],
      ['FROM cabinets', {
        rows: [{ id: CAB_CH, name: 'RT4 Helvetia Cabinet', country: 'CH', registre_type: null, registre_numero: null, uid: null, orias_number: null }],
      }],
      ['broker_profiles', { rows: [{ orias: null, registre: null, pays: 'CH' }] }],
    ])

    const res = await apercu(51)
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.html).toContain('Validité 30 jours')
    expect(corps.html).not.toMatch(/ORIAS/i)
    expect(corps.html).not.toContain('CHE-')
    expect(corps.registre_imprime).toBeNull()
    expect(corps.registre_libelle).toBeNull()
  })

  test('cabinet suisse : l’IDE (UID) est imprimé quand le registre n’a que l’UID', async () => {
    mockSql([
      ['cabinet_members', { rows: [{ cabinet_id: CAB_CH, role: 'owner', retire: false }] }],
      ['FROM devis_wizard', { rows: [{ ...DEVIS_CH, id: 52 }] }],
      ['FROM cabinets', {
        rows: [{ id: CAB_CH, name: 'RT4 Helvetia Cabinet', country: 'CH', registre_type: 'FINMA', registre_numero: null, uid: 'CHE-415.337.574', orias_number: null }],
      }],
      ['broker_profiles', { rows: [{ orias: null, registre: null, pays: 'CH' }] }],
    ])

    const res = await apercu(52)
    const corps = await res.json()

    expect(corps.html).toContain('IDE (UID) : CHE-415.337.574')
    expect(corps.html).not.toMatch(/ORIAS/i)
    expect(corps.registre_imprime).toBe('CHE-415.337.574')
  })

  test('cabinet français : la forme historique « ORIAS <numéro> » est conservée', async () => {
    mockSql([
      ['cabinet_members', { rows: [{ cabinet_id: CAB_FR, role: 'owner', retire: false }] }],
      ['FROM devis_wizard', { rows: [{ ...DEVIS_CH, id: 53, user_id: 163, cabinet_id: CAB_FR, cabinet_name_cache: 'RT4 Alpha Cabinet' }] }],
      ['FROM cabinets', {
        rows: [{ id: CAB_FR, name: 'RT4 Alpha Cabinet', country: 'FR', registre_type: 'ORIAS', registre_numero: '07001234', uid: null, orias_number: '07001234' }],
      }],
      // Lecture française : ORIAS du cabinet, sinon celui du courtier.
      ['broker_profiles', { rows: [{ orias: '07000000', registre: '07000000' }] }],
    ])

    const res = await apercu(53)
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.html).toContain('ORIAS 07000000')
    expect(corps.registre_imprime).toBe('07000000')
    expect(corps.registre_libelle).toBe('ORIAS')
  })
})
