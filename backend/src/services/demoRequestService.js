function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
}

function normalizeString(value, max = 255) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  return normalized.slice(0, max)
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    return lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'on'
  }
  if (typeof value === 'number') return value === 1
  return false
}

function sanitizeDemoRequestPayload(body = {}) {
  return {
    first_name: normalizeString(body.first_name, 120),
    last_name: normalizeString(body.last_name, 120),
    company_name: normalizeString(body.company_name, 180),
    email: normalizeString(body.email, 190).toLowerCase(),
    phone: normalizeString(body.phone, 50),
    city: normalizeString(body.city, 120),
    team_size: normalizeString(body.team_size, 80),
    current_tools: normalizeString(body.current_tools, 250),
    wants_google_calendar: normalizeBoolean(body.wants_google_calendar),
    wants_whatsapp: normalizeBoolean(body.wants_whatsapp),
    wants_email_sync: normalizeBoolean(body.wants_email_sync),
    message: normalizeString(body.message, 2000),
    consent: normalizeBoolean(body.consent),
    source: normalizeString(body.source || 'landing', 120) || 'landing',
    // Attribution : identifiant de visite, premier et dernier contact (calculés côté site par
    // /js/mesure.js, sans cookie tiers). Sans ces champs, une demande de démo ne peut pas être
    // rattachée à son origine — c'était le cas avant le 26/09/2026.
    session_id: normalizeString(body.session_id, 64),
    first_touch_source: normalizeString(body.first_touch_source, 120),
    first_touch_medium: normalizeString(body.first_touch_medium, 120),
    first_touch_campaign: normalizeString(body.first_touch_campaign, 160),
    first_touch_landing: normalizeString(body.first_touch_landing, 255),
    first_touch_referrer: normalizeString(body.first_touch_referrer, 255),
    last_touch_source: normalizeString(body.last_touch_source, 120),
    last_touch_medium: normalizeString(body.last_touch_medium, 120),
    last_touch_landing: normalizeString(body.last_touch_landing, 255),
  }
}

function validateDemoRequestPayload(payload = {}) {
  const errors = []

  if (!payload.first_name) errors.push('first_name_missing')
  if (!payload.last_name) errors.push('last_name_missing')
  if (!payload.company_name) errors.push('company_name_missing')
  if (!payload.email) errors.push('email_missing')
  if (payload.email && !isValidEmail(payload.email)) errors.push('email_invalid')
  if (!payload.consent) errors.push('consent_required')

  return {
    valid: errors.length === 0,
    errors,
  }
}

module.exports = {
  isValidEmail,
  normalizeString,
  normalizeBoolean,
  sanitizeDemoRequestPayload,
  validateDemoRequestPayload,
}
