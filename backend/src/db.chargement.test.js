/**
 * db.chargement.test.js — IMPORTER `db` NE DOIT JAMAIS TUER LE PROCESSUS
 *
 * POURQUOI CE TEST EXISTE (mesure du 21/09/2026) : `src/db.js` appelait
 * `process.exit(1)` à son CHARGEMENT quand DATABASE_URL était absente. Comme
 * `db` est importé transitivement par des services testés avec un pool factice
 * (claimsService, détecteurs ARK Watch…), la CI backend était rouge par
 * construction : « Jest worker encountered 4 child process exceptions,
 * exceeding retry limit … process.exit called with "1" » — 4 suites, 50 tests,
 * alors qu'AUCUNE de ces suites n'a besoin d'une base (201/201 suites vertes
 * avec une DATABASE_URL injoignable).
 *
 * CONTRAT FIGÉ ICI :
 *   1. `require('src/db')` sans DATABASE_URL → le processus se termine
 *      NORMALEMENT (code 0), sans message d'arrêt ;
 *   2. le contrôle de démarrage reste disponible et reste fatal quand il est
 *      appelé explicitement par un point d'entrée
 *      (`verifierConfigurationBase()` → message + code 1) ;
 *   3. avec DATABASE_URL, le même appel ne fait rien et rend `true`.
 *
 * Ces trois points sont mesurés sur de VRAIS processus enfants : un
 * `process.exit` ne s'observe pas depuis le processus Jest lui-même.
 */
const { spawnSync } = require('child_process')
const path = require('path')

const RACINE = path.join(__dirname, '..')
const MESSAGE_ARRET = 'DATABASE_URL environment variable is not set'
const URL_BIDON = 'postgres://jest:jest@127.0.0.1:5432/jest_inexistante'

/**
 * Exécute un bout de code dans un processus Node neuf.
 * `env` : variables à ajouter ; DATABASE_URL est TOUJOURS retirée de
 * l'environnement hérité sauf si elle est fournie explicitement.
 */
function dansUnProcessusNeuf(code, env = {}) {
  const environnement = { ...process.env }
  delete environnement.DATABASE_URL
  Object.assign(environnement, env)
  return spawnSync(process.execPath, ['-e', code], {
    cwd: RACINE,
    env: environnement,
    encoding: 'utf8',
    timeout: 20000,
  })
}

describe('src/db — chargement sans DATABASE_URL (le module ne tue plus le worker)', () => {
  test('(1) require() sans DATABASE_URL : sortie normale (code 0), aucun arrêt', () => {
    const r = dansUnProcessusNeuf("require('./src/db'); console.log('CHARGE')")

    expect(r.stderr || '').not.toContain(MESSAGE_ARRET)
    expect(r.stdout || '').toContain('CHARGE')
    expect(r.status).toBe(0)
  })

  test('(2) verifierConfigurationBase() sans DATABASE_URL : arrêt fatal, message inchangé', () => {
    const r = dansUnProcessusNeuf("require('./src/db').verifierConfigurationBase()")

    expect(r.status).toBe(1)
    expect(r.stderr || '').toContain(MESSAGE_ARRET)
  })

  test('(3) avec DATABASE_URL : verifierConfigurationBase() ne fait rien et rend true', () => {
    const r = dansUnProcessusNeuf(
      "console.log('OK', require('./src/db').verifierConfigurationBase())",
      { DATABASE_URL: URL_BIDON }
    )

    expect(r.status).toBe(0)
    expect(r.stdout || '').toContain('OK true')
  })
})
