import { describe, expect, it, vi } from 'vitest'
import {
  assertLeadCaptured,
  captureAcquisition,
  identifiantLead,
  isHoneypotTripped,
  mergeAcquisition,
  messageConfirmation,
  postDemoRequest,
  readWindowContext,
  redirectionAutomatique,
  resolveLeadEndpoints,
  resolveRedirect,
} from './leadCapture'

/* ---------------------------------------------------------------------------
   CONTRAT DE LA CAPTURE — P0 mesuré le 21/09/2026 sur /demo-public.

   La demande était bien ENREGISTRÉE (HTTP 201, ligne en base) mais le prospect
   lisait « Votre demande n'a pas pu être enregistrée. Le service de capture n'a
   pas confirmé l'enregistrement. », n'était pas redirigé, et la visite
   journalisait `demo_request_failure` sur un succès réel.

   Cause : le backend répondait {success:true, lead:{...}, message:'...'} tandis
   que `assertLeadCaptured` n'acceptait que {ok:true} ou {lead_id}.

   La garde est BONNE (« on ne fait jamais semblant d'avoir capturé un lead ») :
   ces tests verrouillent le contrat des DEUX côtés — la vraie réponse du
   backend est ACCEPTÉE, et toute réponse ambiguë reste REFUSÉE.
   --------------------------------------------------------------------------- */

/** Corps RÉELLEMENT renvoyé par POST /api/leads/demo-request (201) AVANT ce
 *  correctif — rejoué sur la vraie route, notification interne non partie
 *  (aucune clé e-mail côté serveur). C'est ce corps que `assertLeadCaptured`
 *  traitait comme un ÉCHEC alors que la demande était bien enregistrée. */
const REPONSE_BACKEND_AVANT_P0 = {
  success: true,
  lead: { id: 77, first_name: 'Léa', company_name: 'Garage du Pont', status: 'a_contacter' },
  notification_interne: { envoye: false, raison: 'configuration_required', canal: 'email' },
  configuration_required: true,
  message:
    "Votre demande de démo est enregistrée et visible dans l'espace COURTIARK, mais la notification "
    + "interne n'a pas pu partir (configuration_required). Prévenez l'équipe COURTIARK par un autre canal "
    + 'si votre demande est urgente.',
}

/** APRÈS correctif : `ok` et `lead_id` s'ajoutent au corps ci-dessus. Des champs
 *  ADDITIFS — `success` et `lead` restent, aucun autre consommateur ne casse. */
const REPONSE_BACKEND_APRES_P0 = { ok: true, lead_id: 77, ...REPONSE_BACKEND_AVANT_P0 }

/** Fausse réponse HTTP minimale. Un corps non JSON fait échouer .json() comme le ferait le navigateur. */
function reponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (typeof body === 'string') throw new SyntaxError('Unexpected token < in JSON')
      return body
    },
  }
}

describe('captureAcquisition', () => {
  it('sans UTM : source = direct et landing_page = chemin courant', () => {
    const acquisition = captureAcquisition({ search: '', referrer: '', pathname: '/demo-public' })
    expect(acquisition.source).toBe('direct')
    expect(acquisition.medium).toBe('')
    expect(acquisition.campaign).toBe('')
    expect(acquisition.landing_page).toBe('/demo-public')
  })

  it('avec UTM : utm_source/medium/campaign sont conservés', () => {
    const acquisition = captureAcquisition({
      search: '?utm_source=linkedin&utm_medium=social&utm_campaign=lancement-courtia',
      referrer: 'https://www.google.com/',
      pathname: '/contact',
    })
    expect(acquisition).toEqual({
      source: 'linkedin',
      medium: 'social',
      campaign: 'lancement-courtia',
      referrer: 'https://www.google.com/',
      landing_page: '/contact',
    })
  })

  it('lit document.referrer et window.location depuis un objet window', () => {
    const context = readWindowContext({
      location: { search: '?utm_source=newsletter', pathname: '/demo-public' },
      document: { referrer: 'https://newsletter.courtiark.fr/' },
    })
    expect(captureAcquisition(context)).toMatchObject({
      source: 'newsletter',
      referrer: 'https://newsletter.courtiark.fr/',
      landing_page: '/demo-public',
    })
  })

  it('sans window (SSR) : source = direct, aucune exception', () => {
    expect(captureAcquisition(readWindowContext(undefined)).source).toBe('direct')
  })
})

describe('mergeAcquisition', () => {
  it('complète les champs absents sans écraser ceux déjà remplis', () => {
    const payload = mergeAcquisition(
      { first_name: 'Dalil', source: 'campagne-interne' },
      { source: 'linkedin', medium: 'social', landing_page: '/contact' }
    )
    expect(payload.source).toBe('campagne-interne')
    expect(payload.medium).toBe('social')
    expect(payload.landing_page).toBe('/contact')
  })
})

describe('isHoneypotTripped', () => {
  it('non déclenché pour un humain (champ vide ou absent)', () => {
    expect(isHoneypotTripped({ website: '' })).toBe(false)
    expect(isHoneypotTripped({})).toBe(false)
  })

  it('déclenché dès qu\'un robot remplit website', () => {
    expect(isHoneypotTripped({ website: 'http://spam.example' })).toBe(true)
    expect(isHoneypotTripped({ website: '  x  ' })).toBe(true)
  })
})

describe('assertLeadCaptured', () => {
  it('accepte la réponse réelle du service {ok, lead_id, redirect}', () => {
    expect(assertLeadCaptured({ ok: true, lead_id: 12, redirect: '/demo' }).lead_id).toBe(12)
  })

  it('accepte une réponse sans lead_id mais ok:true', () => {
    expect(assertLeadCaptured({ ok: true }).ok).toBe(true)
  })

  /* --- le P0 : la réponse réelle du backend Courtia doit être ACCEPTÉE --- */

  it('accepte le corps réel d’AVANT correctif {success, lead:{id}} : un succès n’est plus un échec', () => {
    const confirme = assertLeadCaptured(REPONSE_BACKEND_AVANT_P0)
    expect(confirme).toBe(REPONSE_BACKEND_AVANT_P0)
    expect(identifiantLead(confirme)).toBe(77)
  })

  it('accepte le corps APRÈS correctif (ok et lead_id additifs)', () => {
    expect(assertLeadCaptured(REPONSE_BACKEND_APRES_P0).lead_id).toBe(77)
  })

  it('accepte {success:true, lead:{id}} même sans les champs additifs ok/lead_id', () => {
    expect(assertLeadCaptured({ success: true, lead: { id: 2 } }).lead.id).toBe(2)
  })

  /* --- toute réponse ambiguë reste REFUSÉE (la garde ne s'assouplit pas) --- */

  it('refuse {success:true} sans lead : aucun enregistrement n’est prouvé', () => {
    expect(() => assertLeadCaptured({ success: true })).toThrow()
  })

  it('refuse un objet vide et un tableau', () => {
    expect(() => assertLeadCaptured({})).toThrow()
    expect(() => assertLeadCaptured([])).toThrow()
  })

  it('refuse un lead sans identifiant exploitable', () => {
    expect(() => assertLeadCaptured({ success: true, lead: { email: 'a@b.test' } })).toThrow()
    expect(() => assertLeadCaptured({ success: true, lead: {} })).toThrow()
    expect(() => assertLeadCaptured({ success: true, lead: null })).toThrow()
    expect(() => assertLeadCaptured({ success: true, lead: { id: 0 } })).toThrow()
  })

  it('refuse un identifiant qui n’en est pas un (jamais d’id inventé)', () => {
    expect(() => assertLeadCaptured({ lead_id: 'abc' })).toThrow()
    expect(() => assertLeadCaptured({ lead_id: 0 })).toThrow()
    expect(() => assertLeadCaptured({ lead_id: null })).toThrow()
  })

  it('refuse un refus EXPLICITE du serveur, même accompagné d’un identifiant', () => {
    expect(() => assertLeadCaptured({ ok: false, lead_id: 3 })).toThrow()
    expect(() => assertLeadCaptured({ success: false, lead: { id: 3 } })).toThrow()
  })

  it('refuse un HTTP 200 HTML (rewrite SPA) au lieu de simuler un succès', () => {
    expect(() => assertLeadCaptured('<!doctype html><html></html>')).toThrow()
  })

  it('refuse un corps d\'erreur JSON', () => {
    expect(() => assertLeadCaptured({ error: 'demo_request_failed' })).toThrow()
  })
})

describe('messageConfirmation', () => {
  it('rend le message RÉEL du serveur (état de la demande et de la notification)', () => {
    expect(messageConfirmation(REPONSE_BACKEND_AVANT_P0)).toBe(REPONSE_BACKEND_AVANT_P0.message)
  })

  it('n’invente rien quand le serveur n’a rien dit', () => {
    expect(messageConfirmation({ success: true, lead: { id: 2 } })).toBe('')
    expect(messageConfirmation({ message: '   ' })).toBe('')
    expect(messageConfirmation({ message: 42 })).toBe('')
    expect(messageConfirmation(null)).toBe('')
  })

  it('accepte un repli explicite, jamais un mensonge', () => {
    expect(messageConfirmation({}, 'repli')).toBe('repli')
  })
})

describe('redirectionAutomatique', () => {
  it('redirige aussitôt dans le cas normal (service de capture, notification partie)', () => {
    expect(redirectionAutomatique({ ok: true, lead_id: 12 })).toBe(true)
    expect(redirectionAutomatique({
      ...REPONSE_BACKEND_AVANT_P0,
      notification_interne: { envoye: true, raison: null },
      configuration_required: false,
    })).toBe(true)
  })

  it('retient la redirection quand la notification interne n’est pas partie : le message doit être lu', () => {
    expect(redirectionAutomatique(REPONSE_BACKEND_AVANT_P0)).toBe(false)
    expect(redirectionAutomatique({ ok: true, lead_id: 12, notification_interne: { envoye: false } })).toBe(false)
  })

  it('redirige par défaut quand le serveur ne dit rien de la notification', () => {
    expect(redirectionAutomatique(null)).toBe(true)
    expect(redirectionAutomatique('html')).toBe(true)
  })
})

describe('resolveRedirect', () => {
  it('utilise la redirection du service', () => {
    expect(resolveRedirect({ redirect: '/demo' })).toBe('/demo')
  })

  it('retombe sur /demo si la redirection est absente ou externe', () => {
    expect(resolveRedirect({})).toBe('/demo')
    expect(resolveRedirect({ redirect: 'https://evil.example' })).toBe('/demo')
    expect(resolveRedirect({ redirect: '//evil.example' })).toBe('/demo')
  })
})

describe('resolveLeadEndpoints', () => {
  it('sans configuration : même origine, convention du site public', () => {
    expect(resolveLeadEndpoints({})).toEqual(['/api/leads/demo-request'])
  })

  it('ajoute la base VITE_API_URL absolue en repli (jamais l\'URL cockpit en premier)', () => {
    expect(resolveLeadEndpoints({ VITE_API_URL: 'https://courtia.onrender.com' })).toEqual([
      '/api/leads/demo-request',
      'https://courtia.onrender.com/api/leads/demo-request',
    ])
  })

  it('ignore une base relative /api (déjà couverte par la même origine)', () => {
    expect(resolveLeadEndpoints({ VITE_API_URL: '/api' })).toEqual(['/api/leads/demo-request'])
  })

  it('VITE_LEADS_API_URL force une base dédiée et unique (suffixe /api toléré)', () => {
    expect(resolveLeadEndpoints({ VITE_LEADS_API_URL: 'https://api.courtiark.fr/api/', VITE_API_URL: 'https://courtia.onrender.com' }))
      .toEqual(['https://api.courtiark.fr/api/leads/demo-request'])
  })
})

describe('postDemoRequest', () => {
  it('enregistre sur la même origine et renvoie la réponse du service', async () => {
    const fetchImpl = vi.fn(async () => reponse(201, { ok: true, lead_id: 42, redirect: '/demo' }))
    const data = await postDemoRequest({ first_name: 'Dalil' }, { endpoints: ['/api/leads/demo-request'], fetchImpl })

    expect(data).toEqual({ ok: true, lead_id: 42, redirect: '/demo' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/leads/demo-request')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body).first_name).toBe('Dalil')
  })

  it('replie sur le candidat suivant si l\'origine sert du HTML (rewrite SPA) au lieu de l\'API', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(reponse(200, '<!doctype html><html></html>'))
      .mockResolvedValueOnce(reponse(201, { ok: true, lead_id: 7, redirect: '/demo' }))

    const data = await postDemoRequest({}, { endpoints: ['/api/leads/demo-request', 'https://api.exemple.fr/api/leads/demo-request'], fetchImpl })

    expect(data.lead_id).toBe(7)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('replie aussi si l\'origine est injoignable (erreur réseau)', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(reponse(201, { ok: true, lead_id: 8 }))

    const data = await postDemoRequest({}, { endpoints: ['/api/leads/demo-request', 'https://api.exemple.fr/api/leads/demo-request'], fetchImpl })
    expect(data.lead_id).toBe(8)
  })

  it('n\'essaye AUCUN autre candidat quand le service répond une vraie erreur', async () => {
    const fetchImpl = vi.fn(async () => reponse(500, { error: 'demo_request_failed' }))
    await expect(
      postDemoRequest({}, { endpoints: ['/api/leads/demo-request', 'https://courtia.onrender.com/api/leads/demo-request'], fetchImpl })
    ).rejects.toThrow('demo_request_failed')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('accepte la réponse RÉELLE du backend Courtia (P0 /demo-public) et retient le lead', async () => {
    // Les DEUX corps réels : celui d'avant correctif (success/lead) et celui
    // d'après (ok/lead_id additifs). Aucun ne doit être lu comme un échec.
    for (const corps of [REPONSE_BACKEND_AVANT_P0, REPONSE_BACKEND_APRES_P0]) {
      const fetchImpl = vi.fn(async () => reponse(201, corps))

      const data = await postDemoRequest(
        { first_name: 'Léa' },
        { endpoints: ['/api/leads/demo-request'], fetchImpl }
      )

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(data.success).toBe(true)
      expect(identifiantLead(data)).toBe(77)
      expect(resolveRedirect(data)).toBe('/demo')
    }
  })

  it('échoue vraiment quand aucun candidat ne répond en service de capture', async () => {
    const fetchImpl = vi.fn(async () => reponse(404, { error: 'not_found' }))
    await expect(
      postDemoRequest({}, { endpoints: ['/api/leads/demo-request', 'https://api.exemple.fr/api/leads/demo-request'], fetchImpl })
    ).rejects.toThrow(/Service de capture absent/)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('message explicite quand toutes les origines sont injoignables', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(postDemoRequest({}, { endpoints: ['/api/leads/demo-request'], fetchImpl }))
      .rejects.toThrow('Le service de capture est injoignable.')
  })
})
