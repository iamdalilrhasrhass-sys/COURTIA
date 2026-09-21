/**
 * voice.portee-cabinet.test.js — la portée de GET /api/voice/intakes et DELETE /api/voice/intakes/:id est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : un « voice intake » est une note terrain prise pour un CLIENT : l'enregistrement
 * d'un collègue était invisible et la pièce jointe au dossier introuvable.
 *
 * Le middleware d'authentification est court-circuité (on appelle le gestionnaire
 * final, comme taches.cabinet.test.js) : ce qui est testé ici est la PORTÉE, pas
 * l'authentification. Les trois cas exigés sont couverts :
 *   (a) un collaborateur (`cabinet_members` actif, rôle broker) obtient la clause
 *       CABINET et non la clause « mes lignes » ;
 *   (b) un compte SANS cabinet garde exactement la clause historique
 *       `courtier_id` / `broker_id` / `user_id` = $1 ;
 *   (c) un rôle en LECTURE SEULE (assistant) ne peut pas écrire : 403, et AUCUNE
 *       requête d'écriture n'est envoyée à la base.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/voice/transcriber', () => ({
  isWhisperConfigured: () => true, saveAudioFile: jest.fn(), deleteAudioFile: jest.fn(),
  getAudioAbsolutePath: () => '/tmp/x',
}))
jest.mock('../services/voice/intakeProcessor', () => ({ processIntake: jest.fn(), reprocessIntake: jest.fn(), applyIntake: jest.fn(), getStats: jest.fn() }))
const pool = require('../db')
const router = require('./voice')

const routeur = router

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const CLAUSE_CABINET = /cabinet_id = ANY\(\$1::uuid\[\]\)/
const CLAUSE_PROPRIETAIRE = /(courtier_id|broker_id|user_id) = \$1/

function gestionnaire(methode, chemin) {
  const couche = routeur.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null, envoye: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    download() { this.envoye = 'download'; return this },
    setHeader() { return this },
  }
}

/**
 * Joue une route avec un pool simulé qui porte AUSSI BIEN la résolution de portée
 * (`cabinet_members`) que les requêtes métier — comme le pool `pg` réel.
 */
async function jouer(cible, appartenances = [], reponse = { rows: [{ count: '0' }], rowCount: 1 }, extra = {}) {
  const requetes = []
  const tracer = async (sql, params) => {
    requetes.push({ sql: String(sql), params })
    if (String(sql).includes('cabinet_members')) {
      return { rows: appartenances, rowCount: appartenances.length }
    }
    return reponse
  }
  pool.query.mockImplementation(tracer)
  const fakePool = { query: tracer }
  const req = {
    app: { locals: { pool: fakePool } },
    user: { id: 7, userId: 7 },
    headers: {}, query: {}, params: { id: '1' }, body: {},
    ...extra,
  }
  const res = fausseReponse()
  await cible(req, res)
  return { res, requetes }
}

/** Les requêtes MÉTIER : on exclut la SEULE résolution de portée (`cm.role`). */
const metier = (requetes) => requetes.filter((r) => !/cm\.role/.test(r.sql))
const sqlsDe = (requetes) => metier(requetes).map((r) => r.sql).join('\n---\n')
const ecritures = (requetes) => metier(requetes).filter((r) => /^\s*(INSERT|UPDATE|DELETE)/i.test(r.sql))

const LIRE = () => gestionnaire('get', '/intakes')
const SUPPRIMER = () => gestionnaire('delete', '/intakes/:id')

describe('voice — portée cabinet', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : la liste des intakes porte la clause CABINET', async () => {
    const { res, requetes } = await jouer(LIRE(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }])
    expect(res.code).toBe(200)
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(CLAUSE_CABINET)
    expect(sqls).not.toMatch(CLAUSE_PROPRIETAIRE)
    expect(sqls).toContain('FROM cabinet_members cm')
  })

  test('(b) compte SANS cabinet : clause historique sur le broker', async () => {
    const { res, requetes } = await jouer(LIRE(), [])
    expect(res.code).toBe(200)
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(/vi\.broker_id = \$1/)
    expect(sqls).not.toMatch(CLAUSE_CABINET)
  })

  test('(c) assistant : suppression d’un intake refusée (403), aucune écriture', async () => {
    const { res, requetes } = await jouer(SUPPRIMER(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [], rowCount: 0 }, { params: { id: '12' } })
    expect(res.code).toBe(403)
    expect(res.corps.error).toBe('lecture_seule')
    expect(ecritures(requetes)).toHaveLength(0)
  })
})
