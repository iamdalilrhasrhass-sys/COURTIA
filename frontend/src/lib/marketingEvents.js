const ALLOWED = new Set([
  'click_demo_cta',
  'submit_demo_request',
  'click_pricing',
  'open_video',
])

/* Capture publique : MÊME ORIGINE que le site public, comme la mesure
   (`lib/analytics.js` -> /api/leads/events). L'API du cockpit n'enregistre pas
   ces événements marketing : la base d'API du cockpit est réservée aux écrans
   privés, et l'y envoyer perdait la mesure du tunnel. */
const ENDPOINT_EVENTS = '/api/leads/events'

export async function trackMarketingEvent(eventName, payload = {}) {
  if (!ALLOWED.has(eventName)) return

  const safePayload = {
    ...payload,
    ts: new Date().toISOString(),
  }

  try {
    await fetch(ENDPOINT_EVENTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        source: 'landing',
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        payload: safePayload,
      }),
      keepalive: true,
    })
  } catch {
    // keep marketing UX resilient even if analytics endpoint is temporarily unavailable
  }
}
