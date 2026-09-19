/* ============================================================================
   COURTIA — relais de LECTURE commerciale (production Vercel)
   ----------------------------------------------------------------------------
   Le navigateur appelle /api/sales/leads (même origine) SANS jeton : un secret
   livré au navigateur n'est plus un secret. C'est cette fonction qui ajoute le
   jeton côté serveur, puis relaie vers le service de capture.

   Variables d'environnement à définir sur Vercel (jamais dans le dépôt) :
     COURTIA_SALES_TOKEN     jeton de lecture du service de capture
     COURTIA_CAPTURE_ORIGIN  origine du service de capture (tunnel HTTPS),
                             ex. https://xxxx.trycloudflare.com
     COURTIA_AUTH_VERIFY_URL (recommandé) URL qui valide une session COURTIA,
                             ex. https://<api-applicative>/api/auth/me
                             — reçoit l'en-tête Authorization du visiteur.

   ÉCHEC FERMÉ : sans jeton, sans origine, ou sans validation de session
   configurée, la fonction REFUSE (503 / 401). Elle n'ouvre jamais la lecture
   des leads au public.

   LECTURE SEULE : seules les méthodes GET sont relayées.

   ⚠ ÉTAT DE VÉRIFICATION : cette fonction n'a PAS pu être exécutée ni déployée
   depuis le VPS (aucun accès Vercel). Elle est donc livrée NON VÉRIFIÉE : la
   vérification de bout en bout en production reste à faire. En local, le relais
   équivalent (et lui, testé) est /root/ark/courtia_demo/serveur_reel.py.
   ========================================================================== */

const ROUTES_AUTORISEES = new Set([
  '/api/sales/leads',
  '/api/sales/funnel',
  '/api/sales/events',
  '/api/sales/summary',
])

function refus(res, code, corps) {
  res.status(code).json(corps)
}

/* Bornes de temps (19/09/2026) : mesuré en production, GET /api/sales/leads
   ne renvoyait aucun octet, ni en 8 s ni en 25 s — la page restait sur « Lecture… »
   sans jamais dire pourquoi. Chaque appel amont est désormais borné et un
   dépassement devient une erreur explicite. */
const DELAI_VALIDATION_MS = 5000
const DELAI_LECTURE_MS = 8000

async function avecDelai(url, options, ms) {
  const controleur = new AbortController()
  const minuteur = setTimeout(() => controleur.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controleur.signal })
  } finally {
    clearTimeout(minuteur)
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return refus(res, 405, { error: 'methode_non_autorisee' })
  }

  const chemin = String(req.url || '').split('?')[0]
  if (!ROUTES_AUTORISEES.has(chemin)) {
    return refus(res, 404, { error: 'route_inconnue', routes: [...ROUTES_AUTORISEES] })
  }

  const jeton = (process.env.COURTIA_SALES_TOKEN || '').trim()
  const origine = (process.env.COURTIA_CAPTURE_ORIGIN || '').trim().replace(/\/$/, '')
  if (!jeton || !origine) {
    return refus(res, 503, {
      error: 'lecture_desactivee',
      raison: "COURTIA_SALES_TOKEN et/ou COURTIA_CAPTURE_ORIGIN ne sont pas définis côté serveur",
    })
  }

  // La lecture est une donnée commerciale : elle exige une session COURTIA
  // valide. Sans point de vérification configuré, on refuse plutôt que d'ouvrir.
  const validation = (process.env.COURTIA_AUTH_VERIFY_URL || '').trim()
  const autorisation = req.headers.authorization || ''
  if (!validation) {
    return refus(res, 503, {
      error: 'lecture_desactivee',
      raison: "COURTIA_AUTH_VERIFY_URL n'est pas défini : impossible de valider la session de l'appelant",
    })
  }
  if (!autorisation.startsWith('Bearer ')) {
    return refus(res, 401, { error: 'jeton_absent' })
  }
  try {
    const controle = await avecDelai(validation, { headers: { Authorization: autorisation } }, DELAI_VALIDATION_MS)
    if (!controle.ok) {
      return refus(res, 401, { error: 'jeton_invalide', statut_verification: controle.status })
    }
  } catch (e) {
    return refus(res, 503, { error: 'verification_indisponible' })
  }

  const cible = origine + req.url
  try {
    const reponse = await avecDelai(cible, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${jeton}` },
    }, DELAI_LECTURE_MS)
    const corps = await reponse.text()
    res.status(reponse.status)
    res.setHeader('Content-Type', reponse.headers.get('content-type') || 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.send(corps)
  } catch (e) {
    return refus(res, 502, { error: 'capture_injoignable' })
  }
}
