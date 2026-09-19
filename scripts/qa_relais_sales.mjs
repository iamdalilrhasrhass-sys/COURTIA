/**
 * QA du relais de lecture commerciale (api/sales/[...chemin].js).
 *
 * Pourquoi : cette fonction est le seul chemin par lequel l'application peut
 * lire les leads sans qu'un secret soit livré au navigateur. Elle n'avait
 * jamais été exécutée (son propre commentaire le disait) et, en production,
 * GET /api/sales/leads ne renvoyait aucun octet (ni en 8 s, ni en 25 s).
 *
 * Ce script exécute la fonction RÉELLE avec de faux objets req/res et prouve,
 * dans l'ordre :
 *   1. sans configuration : refus 503 (échec fermé, la lecture n'est pas ouverte) ;
 *   2. sans en-tête Authorization : refus 401 ;
 *   3. avec une validation de session MUETTE : refus 503 DANS LE DÉLAI imparti
 *      (c'est la correction du 19/09/2026 : plus d'attente infinie) ;
 *   4. avec une validation de session qui répond et un service de capture réel :
 *      la lecture aboutit (200) et renvoie de vrais leads.
 *
 * Usage : node scripts/qa_relais_sales.mjs [--capture http://127.0.0.1:8090]
 * Aucun secret n'est affiché : le jeton est lu depuis /etc/courtia/capture.env
 * uniquement pour ce test local, et n'est jamais imprimé.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
const capture = args.includes('--capture') ? args[args.indexOf('--capture') + 1] : 'http://127.0.0.1:8090'

const handler = require('../api/sales/[...chemin].js')

function faussesReponses() {
  const etat = { code: null, corps: null, entetes: {} }
  const res = {
    status(code) { etat.code = code; return res },
    setHeader(cle, valeur) { etat.entetes[cle] = valeur; return res },
    json(corps) { etat.corps = corps; return res },
    send(corps) { etat.corps = corps; return res },
  }
  return { res, etat }
}

async function appel({ url = '/api/sales/leads?limit=2', authorization, env = {} } = {}) {
  const sauvegarde = {}
  for (const cle of ['COURTIA_SALES_TOKEN', 'COURTIA_CAPTURE_ORIGIN', 'COURTIA_AUTH_VERIFY_URL']) {
    sauvegarde[cle] = process.env[cle]
    if (cle in env) { if (env[cle] === undefined) delete process.env[cle]; else process.env[cle] = env[cle] }
    else delete process.env[cle]
  }
  const { res, etat } = faussesReponses()
  const debut = Date.now()
  const req = { method: 'GET', url, headers: authorization ? { authorization } : {} }
  try {
    await handler(req, res)
  } finally {
    for (const [cle, valeur] of Object.entries(sauvegarde)) {
      if (valeur === undefined) delete process.env[cle]; else process.env[cle] = valeur
    }
  }
  return { ...etat, duree_ms: Date.now() - debut }
}

const resultats = []
function verifier(nom, condition, detail) {
  resultats.push({ nom, ok: Boolean(condition), detail })
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} — ${detail}`)
}

// 1. Aucune configuration : refus fermé.
{
  const r = await appel()
  verifier('sans configuration, la lecture est refusée',
    r.code === 503 && r.corps?.error === 'lecture_desactivee',
    `HTTP ${r.code} ${JSON.stringify(r.corps)}`)
}

// 2. Configuré mais appelant sans session : 401.
{
  const r = await appel({
    env: { COURTIA_SALES_TOKEN: 'jeton-de-test', COURTIA_CAPTURE_ORIGIN: capture, COURTIA_AUTH_VERIFY_URL: `${capture}/health` },
  })
  verifier('sans session, la lecture est refusée', r.code === 401 && r.corps?.error === 'jeton_absent',
    `HTTP ${r.code} ${JSON.stringify(r.corps)}`)
}

// 3. Validation de session muette : doit échouer DANS le délai, pas pendre.
{
  // 203.0.113.1 est réservé aux tests et ne répond pas : l'appel doit expirer.
  const r = await appel({
    authorization: 'Bearer session-de-test',
    env: {
      COURTIA_SALES_TOKEN: 'jeton-de-test',
      COURTIA_CAPTURE_ORIGIN: capture,
      COURTIA_AUTH_VERIFY_URL: 'http://203.0.113.1:81/api/auth/me',
    },
  })
  verifier('une vérification muette échoue dans le délai imparti',
    r.code === 503 && r.duree_ms < 9000,
    `HTTP ${r.code} en ${r.duree_ms} ms (attendu < 9000, plus d'attente infinie)`)
}

// 4. Chaîne réelle : validation OK + service de capture réel.
{
  let jeton = ''
  try {
    const env = readFileSync('/etc/courtia/capture.env', 'utf8')
    jeton = (env.match(/^COURTIA_SALES_TOKEN=(.*)$/m) || [])[1]?.trim() || ''
  } catch { /* pas de fichier : on saute l'étape */ }
  if (!jeton) {
    console.log('SKIP chaîne réelle — /etc/courtia/capture.env illisible sur cette machine')
  } else {
    const r = await appel({
      authorization: 'Bearer session-de-test',
      env: { COURTIA_SALES_TOKEN: jeton, COURTIA_CAPTURE_ORIGIN: capture, COURTIA_AUTH_VERIFY_URL: `${capture}/health` },
    })
    let corps = null
    try { corps = JSON.parse(r.corps) } catch { /* laissé tel quel */ }
    verifier('la lecture aboutit avec un service de capture réel',
      r.code === 200 && corps?.ok === true && Array.isArray(corps.leads),
      `HTTP ${r.code} total=${corps?.total} retournés=${corps?.leads?.length} limit=${corps?.limit}`)
  }
}

const echecs = resultats.filter((r) => !r.ok).length
console.log(`\n${resultats.length - echecs}/${resultats.length} vérifications OK`)
process.exit(echecs ? 1 : 0)
