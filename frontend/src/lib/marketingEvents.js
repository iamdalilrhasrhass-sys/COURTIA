import { apiPost } from '../utils/api'

const ALLOWED = new Set([
  'click_demo_cta',
  'submit_demo_request',
  'click_pricing',
  'open_video',
])

export async function trackMarketingEvent(eventName, payload = {}) {
  if (!ALLOWED.has(eventName)) return

  const safePayload = {
    ...payload,
    ts: new Date().toISOString(),
  }

  try {
    await apiPost('/leads/events', {
      event_name: eventName,
      source: 'landing',
      page_path: typeof window !== 'undefined' ? window.location.pathname : '',
      payload: safePayload,
    })
  } catch {
    // keep marketing UX resilient even if analytics endpoint is temporarily unavailable
  }
}
