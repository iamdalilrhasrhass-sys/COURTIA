/**
 * Tests de erreursPubliques.js — la classe « fuite d'erreur backend » (SEC-025).
 * Chaque cas correspond à un texte RÉELLEMENT observé dans les réponses de ce
 * backend, ou à un message natif du moteur/des dépendances.
 */
const {
  estTexteInterne,
  messagePublic,
  assainirCorps,
  assainirErreursInternes,
  repondreErreur,
  MESSAGE_INTERNE,
} = require('./erreursPubliques')

describe('estTexteInterne — textes d’infrastructure reconnus', () => {
  const internes = [
    '22P02', // SQLSTATE servi comme code d'erreur applicatif (Red Team RT4-09)
    '23505',
    '42501',
    'relation "quotes" does not exist',
    'column "filename" does not exist',
    'syntax error at or near "SELECT"',
    'duplicate key value violates unique constraint "contrats_reference_key"',
    'null value in column "filename" violates not-null constraint',
    'invalid input syntax for type integer: "abc"',
    'value too long for type character varying(100)',
    'ENOENT: no such file or directory, open \'/opt/render/project/src/backend/uploads/x.pdf\'',
    'Error: EACCES: permission denied, mkdir \'/srv/courtia/backend/uploads\'',
    'at Object.<anonymous> (/srv/courtia/backend/server.js:12:3)',
    'Cannot find module \'./services/devisPdfService\'',
    'TypeError: shortId is not a function',
    'connect ECONNREFUSED 127.0.0.1:5432',
    'password authentication failed for user "postgres"',
    'invalid x-api-key',
    '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011"}',
    'postgres://user:pass@host:5432/dbname',
    'permission denied for table clients',
  ]
  it.each(internes)('reconnaît : %s', (texte) => {
    expect(estTexteInterne(texte).interne).toBe(true)
  })

  it('reconnaît une pile d’appels multi-lignes', () => {
    expect(estTexteInterne('boom\n    at handler (/app/routes/x.js:10:2)').interne).toBe(true)
  })

  it('reconnaît un texte démesuré (dump)', () => {
    expect(estTexteInterne('x'.repeat(400)).interne).toBe(true)
  })
})

describe('estTexteInterne — les messages métier passent', () => {
  const legitimes = [
    'Devis introuvable.',
    'Client non trouvé',
    'Contrat introuvable.',
    'Clé d’API invalide', // jeton d’entrée : traité par analyserErreurEntree, pas ici
    'Dominique Müller',
    'Un des champs transmis dépasse la longueur maximale autorisée (100 caractères).',
  ]
  it.each(legitimes)('laisse passer : %s', (texte) => {
    expect(estTexteInterne(texte).interne).toBe(false)
  })
})

describe('messagePublic', () => {
  it('remplace un texte SQL par le message générique', () => {
    expect(messagePublic(new Error('relation "quotes" does not exist'))).toBe(MESSAGE_INTERNE)
  })

  it('remplace un chemin de fichier', () => {
    expect(messagePublic(new Error("ENOENT: open '/opt/render/project/src/backend/uploads/doc.pdf'")))
      .toBe(MESSAGE_INTERNE)
  })

  it('remplace la réponse brute du fournisseur d’IA', () => {
    expect(messagePublic(new Error('invalid x-api-key'))).toBe(MESSAGE_INTERNE)
  })

  it('produit un message français pour une entrée invalide (pas un générique)', () => {
    const message = messagePublic(new Error('value too long for type character varying(100)'))
    expect(message).not.toBe(MESSAGE_INTERNE)
    expect(message).toMatch(/longueur maximale/)
  })

  it('conserve un message explicitement public', () => {
    const err = new Error('Le barème de commission est incomplet pour cette compagnie.')
    err.expose = true
    expect(messagePublic(err)).toBe('Le barème de commission est incomplet pour cette compagnie.')
  })

  it('refuse un message « expose » qui contient de l’infrastructure', () => {
    const err = new Error('duplicate key value violates unique constraint "x_key"')
    err.expose = true
    // Le message produit par l'analyseur d'entrée est préféré : il est contrôlé,
    // en français, et ne cite JAMAIS le nom de la contrainte interne.
    const message = messagePublic(err)
    expect(message).not.toMatch(/x_key|unique constraint/)
    expect(message).toMatch(/existe déjà/)
  })

  it('refuse un message « expose » porteur d’un chemin serveur', () => {
    const err = new Error("ENOENT: open '/opt/render/project/src/backend/uploads/x.pdf'")
    err.expose = true
    expect(messagePublic(err)).toBe(MESSAGE_INTERNE)
  })

  it('accepte un défaut personnalisé', () => {
    expect(messagePublic(new Error('relation "x" does not exist'), 'Service indisponible.')).toBe('Service indisponible.')
  })
})

describe('assainirCorps', () => {
  it('ne touche pas un corps légitime (même objet)', () => {
    const corps = { error: 'not_found', message: 'Client introuvable.' }
    const resultat = assainirCorps(corps)
    expect(resultat.corps).toBe(corps)
    expect(resultat.remplacements).toEqual([])
  })

  it('nettoie error, message et details', () => {
    const resultat = assainirCorps({
      error: 'internal_error',
      message: 'syntax error at or near "FROM"',
      details: 'ENOENT: open \'/srv/courtia/backend/tmp/x.pdf\'',
    })
    expect(resultat.corps.message).toBe(MESSAGE_INTERNE)
    expect(resultat.corps.details).toBe(MESSAGE_INTERNE)
    expect(resultat.corps.error).toBe('internal_error')
    expect(resultat.remplacements).toHaveLength(2)
  })

  it('supprime les champs qui ne doivent jamais sortir', () => {
    const resultat = assainirCorps({ error: 'x', stack: 'Error: x\n at y', sql: 'SELECT 1', query: 'SELECT 1' })
    expect(resultat.corps.stack).toBeUndefined()
    expect(resultat.corps.sql).toBeUndefined()
    expect(resultat.corps.query).toBeUndefined()
  })

  it('explore un sous-objet de details', () => {
    const resultat = assainirCorps({ error: 'x', details: { cause: 'relation "devis" does not exist' } })
    expect(resultat.corps.details.cause).toBe(MESSAGE_INTERNE)
    expect(resultat.remplacements[0]).toMatch(/^details\./)
  })
})

/** Faux `res` Express suffisant pour le middleware. */
function fauxRes(statusCode = 500) {
  const res = {
    statusCode,
    corps: undefined,
    status(code) { res.statusCode = code; return res },
    json(corps) { res.corps = corps; return res },
    send(corps) { res.corps = corps; return res },
  }
  return res
}

describe('assainirErreursInternes (middleware)', () => {
  const req = { originalUrl: '/api/clients', method: 'GET' }
  it('nettoie une réponse 500 qui recopie err.message', () => {
    const res = fauxRes(500)
    assainirErreursInternes(req, res, () => {})
    res.json({ error: 'x', message: 'relation "clients" does not exist' })
    expect(res.corps.message).toBe(MESSAGE_INTERNE)
    expect(res.statusCode).toBe(500)
  })

  it('nettoie aussi un corps d’erreur servi en 200 (faux succès)', () => {
    const res = fauxRes(200)
    assainirErreursInternes(req, res, () => {})
    res.json({ success: false, error: 'column "filename" does not exist' })
    expect(res.corps.error).toBe(MESSAGE_INTERNE)
  })

  it('ne touche pas une charge utile métier 200', () => {
    const res = fauxRes(200)
    assainirErreursInternes(req, res, () => {})
    const charge = { clients: [{ nom: 'Müller' }], message: 'Sélectionnez un client' }
    res.json(charge)
    expect(res.corps).toBe(charge)
  })

  it('nettoie un texte brut envoyé en 500', () => {
    const res = fauxRes(500)
    assainirErreursInternes(req, res, () => {})
    res.send('Error: connect ECONNREFUSED 127.0.0.1:5432')
    expect(res.corps).toBe(MESSAGE_INTERNE)
  })

  // ── RÉGRESSION MESURÉE EN PRODUCTION LE 21/09/2026 ────────────────────────
  // Un motif « la chaîne ressemble à du JSON » avait été ajouté aux motifs
  // d'infrastructure. Il remplaçait le message métier de TOUTE route qui répond
  // une charge utile JSON en corps TEXTE : `POST /api/auth/login` avec un
  // mauvais mot de passe affichait « une erreur interne s'est produite » au lieu
  // de « Email ou mot de passe incorrect ». Ces deux tests figent les deux côtés.
  it('NE remplace PAS un message métier envoyé en corps texte (JSON légitime)', () => {
    const res = fauxRes(401)
    assainirErreursInternes(req, res, () => {})
    const corps = JSON.stringify({ error: 'Email ou mot de passe incorrect' })
    res.send(corps)
    expect(res.corps).toBe(corps)
  })

  it('NE remplace PAS un message métier court envoyé en corps texte', () => {
    const res = fauxRes(404)
    assainirErreursInternes(req, res, () => {})
    res.send('Client introuvable.')
    expect(res.corps).toBe('Client introuvable.')
  })

  it('remplace toujours la réponse brute d’un fournisseur', () => {
    const res = fauxRes(500)
    assainirErreursInternes(req, res, () => {})
    const brut = '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011"}'
    res.send(brut)
    expect(res.corps).toBe(MESSAGE_INTERNE)
  })

  // ── RÉGRESSION MESURÉE LE 25/09/2026 (production et recette locale) ────────
  // `res.json(corps)` appelle `res.send(<chaîne JSON>)`. Le filtre « texte brut »
  // relisait donc la sérialisation JSON comme un texte d'infrastructure dès
  // qu'elle dépassait 300 caractères (plafond de `estTexteInterne`) et
  // REMPLAÇAIT TOUT le corps par le message générique. Conséquence mesurée : le
  // 402 `trial_expired` (349 caractères) arrivait sans son code, donc l'écran ne
  // pouvait plus ouvrir le paywall ; le 403 `changement_mot_de_passe_requis`
  // subissait le même sort, donc plus de redirection vers Paramètres > Sécurité.
  // Ces tests figent l'invariant : une charge JSON déjà assainie arrive intacte.
  function fauxResJson(statusCode) {
    const res = fauxRes(statusCode)
    res.getHeader = () => res.typeCourant
    res.json = (corps) => {
      res.typeCourant = 'application/json; charset=utf-8'
      res.corps = corps
      return res.send(JSON.stringify(corps))
    }
    return res
  }

  it('NE remplace PAS un corps d’erreur JSON de plus de 300 caractères (402 trial_expired)', () => {
    const res = fauxResJson(402)
    assainirErreursInternes(req, res, () => {})
    const charge = {
      error: 'trial_expired',
      trial_state: 'TRIAL_EXPIRED',
      trial_end_at: '2026-10-02T15:00:00.000Z',
      raison: 'essai_expire',
      lecture_seule: true,
      impaye_depuis: null,
      delai_grace_jours: null,
      message: "Votre essai COURTIA de 7 jours est terminé. Vos données sont conservées et restent consultables : choisissez un abonnement pour reprendre les modifications.",
    }
    expect(JSON.stringify(charge).length).toBeGreaterThan(300)
    res.json(charge)
    expect(JSON.parse(res.corps).error).toBe('trial_expired')
    expect(JSON.parse(res.corps).lecture_seule).toBe(true)
  })

  it('NE remplace PAS un corps d’erreur JSON long (403 changement_mot_de_passe_requis)', () => {
    const res = fauxResJson(403)
    assainirErreursInternes(req, res, () => {})
    const charge = {
      success: false,
      error: 'changement_mot_de_passe_requis',
      code: 'changement_mot_de_passe_requis',
      must_change_password: true,
      message: 'Votre mot de passe temporaire doit être remplacé avant d’utiliser l’application. Rendez-vous dans Paramètres → Sécurité (aucune donnée n’est perdue).',
    }
    res.json(charge)
    expect(JSON.parse(res.corps).code).toBe('changement_mot_de_passe_requis')
  })

  it('nettoie TOUJOURS un message d’infrastructure glissé dans un corps long', () => {
    const res = fauxResJson(500)
    assainirErreursInternes(req, res, () => {})
    res.json({
      error: 'internal_error',
      message: 'relation "quotes" does not exist',
      details: 'x'.repeat(320),
    })
    const corps = JSON.parse(res.corps)
    expect(corps.message).toBe(MESSAGE_INTERNE)
    expect(corps.details).toBe(MESSAGE_INTERNE)
  })
})

describe('repondreErreur', () => {
  it('journalise et sert un message public avec le code métier', () => {
    const res = fauxRes(500)
    res.req = { originalUrl: '/api/devis', method: 'POST' }
    repondreErreur(res, new Error('relation "quotes" does not exist'), { code: 'internal_error', contexte: 'devis' })
    expect(res.statusCode).toBe(500)
    expect(res.corps).toEqual({ message: MESSAGE_INTERNE, error: 'internal_error' })
  })
})
