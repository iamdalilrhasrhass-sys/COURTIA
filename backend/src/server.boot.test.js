/**
 * server.boot.test.js — LE SERVEUR DÉMARRE-T-IL VRAIMENT ?
 *
 * POURQUOI CE TEST EXISTE (incident du 21/09/2026) : un `app.use(...)` monté
 * AVANT la déclaration de son `require` (zone morte temporelle de `const`) a
 * fait tomber le serveur au démarrage — « ReferenceError: Cannot access
 * 'assainirErreursInternes' before initialization ». Le déploiement Render est
 * passé en `update_failed` (sortie non nulle) AVANT toute requête, alors que
 * 1 343 tests backend étaient verts : aucun d'eux ne chargeait `server.js`.
 *
 * Ce test démarre le VRAI `server.js` dans un processus enfant, avec une base
 * injoignable (aucune requête n'est jouée) et vérifie :
 *   1. le processus ne meurt pas dans la seconde qui suit (pas d'erreur de
 *      chargement : référence, module manquant, syntaxe) ;
 *   2. il journalise son écoute (`COURTIA backend port <n>`), donc l'application
 *      est effectivement montée ;
 *   3. aucune trace de `ReferenceError` / `Cannot access` / `before
 *      initialization` / `Cannot find module` n'apparaît dans la sortie.
 *
 * Il ne teste PAS la base : le pool `pg` ne se connecte pas au chargement, et
 * les workers (IMAP, relances) sont désactivés par variables d'environnement.
 */
const { spawn } = require('child_process')
const path = require('path')

const RACINE = path.join(__dirname, '..')

function demarrer(env = {}) {
  return new Promise((resolve) => {
    const enfant = spawn(process.execPath, ['server.js'], {
      cwd: RACINE,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '0',
        HOST: '127.0.0.1',
        // Base volontairement injoignable : le chargement ne doit pas en dépendre.
        DATABASE_URL: 'postgres://ark:ark@127.0.0.1:5432/ark_boot_test_inexistante',
        JWT_SECRET: 'test-boot-uniquement-local',
        DISABLE_RELANCES: 'true',
        IMAP_PASSWORD: '',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let sortie = ''
    let termine = false
    const finir = (code, raison) => {
      if (termine) return
      termine = true
      try { enfant.kill('SIGKILL') } catch (_) { /* déjà mort */ }
      resolve({ code, sortie, raison })
    }
    enfant.stdout.on('data', (d) => {
      sortie += d.toString()
      if (/COURTIA backend port|⚡ COURTIA Backend/.test(sortie)) finir(0, 'ecoute')
    })
    enfant.stderr.on('data', (d) => { sortie += d.toString() })
    enfant.on('exit', (code) => finir(code, 'sortie'))
    setTimeout(() => finir(0, 'timeout-ok'), 12000)
  })
}

describe('server.js — démarrage réel', () => {
  jest.setTimeout(30000)

  test('le serveur se charge et se met à écouter (aucune erreur de chargement)', async () => {
    const { code, sortie, raison } = await demarrer()
    expect(sortie).not.toMatch(/ReferenceError|before initialization|Cannot find module|SyntaxError/)
    expect(sortie).toMatch(/COURTIA backend port|⚡ COURTIA Backend/)
    expect(code === 0 || raison === 'timeout-ok').toBe(true)
  })

  test('la garde des erreurs publiques est bien montée sur /api', async () => {
    // Contrôle de montage : la garde doit apparaître dans la source APRÈS sa
    // déclaration et AVANT le premier routeur — c'est la cause de l'incident.
    const fs = require('fs')
    const source = fs.readFileSync(path.join(RACINE, 'server.js'), 'utf8')
    const declaration = source.indexOf('assainirErreursInternes } = require')
    const montage = source.indexOf('app.use(assainirErreursInternes)')
    const premierRouteur = source.indexOf("app.use('/api/auth'")
    expect(declaration).toBeGreaterThan(-1)
    expect(montage).toBeGreaterThan(declaration)
    expect(premierRouteur).toBeGreaterThan(montage)
  })
})
