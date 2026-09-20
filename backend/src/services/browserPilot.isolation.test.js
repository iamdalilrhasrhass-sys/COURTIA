/**
 * browserPilot.isolation.test.js — LES SESSIONS DU BROWSER PILOT SONT PAR CABINET.
 *
 * POURQUOI CE TEST (P2 SEC-011, mesuré en production le 20/09/2026)
 * `routes/browserPilot.js` ne vérifiait QUE la présence d'un jeton
 * (`router.use(verifyToken)`), `listSessions()` renvoyait les sessions de TOUT le
 * serveur et `getSession()` n'avait aucun contrôle de propriétaire. Un cabinet
 * lisait donc les tâches, les journaux d'exécution et les captures d'écran des
 * autres cabinets — et pouvait approuver leur exécution.
 *
 * Ce test verrouille les quatre points de la correction :
 *   1. une session porte son PROPRIÉTAIRE ;
 *   2. la liste ne contient que les sessions de l'appelant ;
 *   3. la lecture d'une session d'autrui est impossible (404 côté route) ;
 *   4. l'approbation d'une session d'autrui est refusée ;
 * plus le cas fail-closed : un appel sans propriétaire ne renvoie RIEN (c'est
 * l'oubli qui avait produit la fuite).
 */
const service = require('../services/browserPilotService')

const A = 101
const B = 202

/** Lance une tâche en dry-run (aucun navigateur n'est ouvert). */
async function creerTache(userId, nom = 'x') {
  return service.runTask({ userId, actions: [{ type: 'navigate', url: 'https://www.courtiark.fr/' }], dryRun: true, name: nom })
}

describe('Browser Pilot — isolation des sessions par cabinet', () => {
  test('une session créée porte l’identifiant de son propriétaire', async () => {
    const session = await creerTache(A)
    expect(session.userId).toBe(A)
    const relue = service.getSession(session.taskId, A)
    expect(relue).not.toBeNull()
    expect(relue.userId).toBe(A)
  })

  test('la liste d’un cabinet ne contient JAMAIS la session d’un autre', async () => {
    const chezA = await creerTache(A)
    const chezB = await creerTache(B)

    const pourA = service.listSessions(50, A).map((s) => s.taskId)
    const pourB = service.listSessions(50, B).map((s) => s.taskId)

    expect(pourA).toContain(chezA.taskId)
    expect(pourA).not.toContain(chezB.taskId)
    expect(pourB).toContain(chezB.taskId)
    expect(pourB).not.toContain(chezA.taskId)
  })

  test('la lecture d’une session d’autrui échoue : la ressource n’existe pas pour l’appelant', async () => {
    const chezB = await creerTache(B)
    expect(service.getSession(chezB.taskId, A)).toBeNull()
    expect(service.getSession(chezB.taskId, B)).not.toBeNull()
  })

  test('l’approbation d’une session d’autrui est refusée', async () => {
    const chezB = await creerTache(B)
    await expect(service.approveAndRun(chezB.taskId, null, A)).rejects.toThrow(/introuvable/i)
    // Et la session de B n'a pas été consommée par la tentative.
    expect(service.getSession(chezB.taskId, B)).not.toBeNull()
  })

  test('fail-closed : sans propriétaire identifié, la liste est VIDE', async () => {
    await creerTache(A)
    expect(service.listSessions(50)).toEqual([])
    expect(service.listSessions(50, null)).toEqual([])
    expect(service.listSessions(50, 'pas-un-nombre')).toEqual([])
  })

  test('une session sans propriétaire n’est visible de personne', async () => {
    const orpheline = await service.runTask({ actions: [{ type: 'goto', url: 'https://exemple.test' }], dryRun: true })
    expect(orpheline.userId).toBeNull()
    expect(service.getSession(orpheline.taskId, A)).toBeNull()
    expect(service.getSession(orpheline.taskId, B)).toBeNull()
    expect(service.listSessions(50, A)).not.toContainEqual(expect.objectContaining({ taskId: orpheline.taskId }))
  })
})

describe('Browser Pilot — les routes transmettent le propriétaire', () => {
  const fs = require('fs')
  const path = require('path')
  const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'browserPilot.js'), 'utf8')

  test('aucune ligne de ce routeur n’appelle listSessions/getSession sans propriétaire', () => {
    // Énumération ligne par ligne : toute ligne qui consulte les sessions doit
    // porter l'identifiant de l'appelant. Une route ajoutée demain sans lui fait
    // échouer ce contrôle sans que personne n'ait à y penser.
    const lignes = source.split('\n')
      .map((l) => l.trim())
      // Les appels sont qualifiés (`browserPilotService.getSession(…)`) : le
      // préfixe `.` doit donc être accepté, sinon ce contrôle ne voit AUCUNE
      // ligne et passe à vide (constaté le 20/09/2026).
      .filter((l) => /(^|[\s.])(listSessions|getSession|approveAndRun|cancelSession)\(/.test(l))
    expect(lignes.length).toBeGreaterThan(0)
    const sansProprietaire = lignes.filter((l) => !/identifiantAppelant\(req\)|\buserId\b/.test(l))
    expect(sansProprietaire).toEqual([])
  })

  test('la route de capture d’écran contrôle la propriété de la session', () => {
    const bloc = source.slice(source.indexOf("'/screenshot/:taskId/:fileName'"))
    expect(bloc).toMatch(/getSession\(taskId, identifiantAppelant\(req\)\)/)
    expect(bloc).toMatch(/status\(404\)/)
  })
})
