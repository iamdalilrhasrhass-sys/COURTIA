/**
 * documents.offre-manquante.test.js — UNE PROPOSITION COMMERCIALE VIDE NE
 * S'ANNONCE PAS COMME GÉNÉRÉE.
 *
 * Défaut mesuré le 20/09/2026 (Red Team, P2 #9) : `POST /api/documents/generate`
 * avec `{"template":"proposition_commerciale","client_id":92}` répondait 201 et
 * écrivait un PDF de trois lignes — « Objet : Proposition d'assurance
 * personnalisée », sans produit, sans prime, sans garantie. Le courtier croyait
 * avoir produit une proposition pour son client. La route refuse maintenant en
 * 400 (`offre_manquante`) en nommant les champs attendus, sans rien écrire.
 *
 * Le second point verrouillé ici est l'absence de FAUX SUCCÈS inverse : une
 * proposition correctement renseignée n'est PAS bloquée par ce contrôle.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const router = require('./documents')

function gestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
}

describe('documents — proposition commerciale sans offre', () => {
  const requetes = []

  beforeEach(() => {
    requetes.length = 0
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      return { rows: [], rowCount: 0 }
    })
  })

  function requete(corps) {
    return {
      user: { id: 42, userId: 42 },
      body: corps,
      query: {},
      params: {},
      app: { locals: { pool } },
    }
  }

  test('aucune donnée d’offre : 400 offre_manquante, et AUCUNE écriture', async () => {
    const res = fausseReponse()
    await gestionnaire('post', '/generate')(requete({ template: 'proposition_commerciale', client_id: 92 }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('offre_manquante')
    expect(res.corps.champs_attendus).toEqual(['produit', 'prime_annuelle', 'garanties', 'description'])
    expect(requetes.some((r) => /INSERT INTO/i.test(r.sql))).toBe(false)
  })

  test('données d’offre vides (chaînes vides) : même refus', async () => {
    const res = fausseReponse()
    await gestionnaire('post', '/generate')(requete({
      template: 'proposition_commerciale',
      client_id: 92,
      data: { produit: '  ', prime_annuelle: '', garanties: '', description: '' },
    }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('offre_manquante')
  })

  test('offre renseignée : le contrôle ne bloque pas (le client est ensuite cherché)', async () => {
    const res = fausseReponse()
    await gestionnaire('post', '/generate')(requete({
      template: 'proposition_commerciale',
      client_id: 999999,
      data: { produit: 'Prévoyance 3a', prime_annuelle: 1200 },
    }), res)

    // Le refus n'est plus « offre_manquante » : la route est allée chercher le
    // client (introuvable dans ce pool simulé) — c'est exactement ce qu'on veut
    // prouver : une proposition renseignée n'est pas rejetée par cette garde.
    expect(res.corps?.error).not.toBe('offre_manquante')
    expect(requetes.some((r) => r.sql.includes('FROM clients'))).toBe(true)
  })

  test('la clé `type` est honorée sur les valeurs annoncées (message non contradictoire)', async () => {
    // Le message d'erreur annonçait « attestation_assurance,
    // proposition_commerciale, courrier_resiliation » alors que la route ne les
    // acceptait que sous la clé `template` : les valeurs annoncées étaient
    // exactement celles refusées. `type` (et `document_type`) fonctionnent
    // désormais, et le message d'un document inconnu liste les DEUX familles.
    const res = fausseReponse()
    await gestionnaire('post', '/generate')(requete({ type: 'attestation_assurance', client_id: 999999 }), res)

    expect(res.corps?.error).not.toBe('validation_error')
    expect(requetes.some((r) => r.sql.includes('FROM clients'))).toBe(true)

    const resInconnu = fausseReponse()
    await gestionnaire('post', '/generate')(requete({ type: 'document_inexistant', client_id: 1 }), resInconnu)
    expect(resInconnu.code).toBe(400)
    expect(resInconnu.corps.message).toContain('attestation_assurance')
    expect(resInconnu.corps.message).toContain('fic')
  })

  test('les autres modèles ne sont pas concernés par ce contrôle', async () => {
    const res = fausseReponse()
    await gestionnaire('post', '/generate')(requete({ template: 'attestation_assurance', client_id: 999999 }), res)

    expect(res.corps?.error).not.toBe('offre_manquante')
  })
})
