import { describe, expect, it, vi } from 'vitest'
import {
  assertLeadCaptured,
  captureAcquisition,
  isHoneypotTripped,
  mergeAcquisition,
  postDemoRequest,
  readWindowContext,
  resolveLeadEndpoints,
  resolveRedirect,
} from './leadCapture'

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

  it('refuse un HTTP 200 HTML (rewrite SPA) au lieu de simuler un succès', () => {
    expect(() => assertLeadCaptured('<!doctype html><html></html>')).toThrow()
  })

  it('refuse un corps d\'erreur JSON', () => {
    expect(() => assertLeadCaptured({ error: 'demo_request_failed' })).toThrow()
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
