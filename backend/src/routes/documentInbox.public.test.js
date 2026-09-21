/**
 * documentInbox.public.test.js — LE LIEN PUBLIC DE COLLECTE DE PIÈCES RÉPOND-IL
 * UN 404 PROPRE (et non un 500) QUAND LE JETON EST INVALIDE ?
 *
 * DÉFAUT MESURÉ EN PRODUCTION LE 21/09/2026 : `GET
 * /api/document-inbox/public/request/:token` renvoyait 500 avec le message
 * générique d'erreur interne, pour TOUT jeton. Cause racine : le handler
 * appelait `clauseJetonRecherche` sans l'importer (ReferenceError), donc le
 * `catch` du handler transformait la panne en 500. Huit entrées
 * `[GET /api/document-inbox/public/request/:token] clauseJetonRecherche is not
 * defined` ont été relevées dans les journaux Render.
 *
 * Ce test monte le VRAI routeur avec un pool simulé (aucune base requise) :
 * - jeton inconnu → 404 `not_found` (le comportement produit attendu) ;
 * - il échoue si l'identifiant redevient non déclaré (500) ;
 * - il vérifie aussi qu'un jeton manifestement trop long ne fait pas échouer la
 *   requête : le refus doit rester un refus produit.
 */
const express = require('express')

// La base n'est pas sollicitée : le pool est simulé et le module `../db` est
// remplacé avant tout require du routeur. Aucun test ne dépend d'une base
// réelle (et `../db` n'arrête plus le processus au chargement, voir src/db.js).
jest.mock('../db', () => ({ query: jest.fn(async () => ({ rows: [] })), pool: {} }))

function application(pool) {
  const app = express()
  app.use(express.json())
  app.locals.pool = pool
  app.use('/api/document-inbox', require('./documentInbox'))
  return app
}

async function appel(app, chemin) {
  const serveur = app.listen(0, '127.0.0.1')
  await new Promise((r) => serveur.once('listening', r))
  const port = serveur.address().port
  try {
    const reponse = await fetch(`http://127.0.0.1:${port}${chemin}`)
    const corps = await reponse.json().catch(() => ({}))
    return { statut: reponse.status, corps }
  } finally {
    serveur.close()
  }
}

describe('GET /api/document-inbox/public/request/:token — refus produit', () => {
  test('un jeton inconnu répond 404 not_found (jamais 500)', async () => {
    const pool = { query: async () => ({ rows: [] }) }
    const { statut, corps } = await appel(application(pool), '/api/document-inbox/public/request/jeton-invalide')
    expect(statut).toBe(404)
    expect(corps.error).toBe('not_found')
  })

  test('un jeton très long reste un refus produit', async () => {
    const pool = { query: async () => ({ rows: [] }) }
    const { statut } = await appel(application(pool), `/api/document-inbox/public/request/${'a'.repeat(4096)}`)
    expect(statut).toBe(404)
  })

  test('aucune réponse ne contient de texte d’infrastructure', async () => {
    const pool = { query: async () => ({ rows: [] }) }
    const { corps } = await appel(application(pool), '/api/document-inbox/public/request/jeton-invalide')
    const texte = JSON.stringify(corps)
    expect(texte).not.toMatch(/is not defined|ReferenceError|SELECT|FROM document_requests|at Object\./)
  })
})
