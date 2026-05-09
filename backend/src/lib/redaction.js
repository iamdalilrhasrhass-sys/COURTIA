const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const PHONE_RE = /(?<!\d)(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g
const SECRET_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'secret',
  'api_key',
  'client_secret',
])

function redactString(value) {
  return String(value)
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(JWT_RE, '[JWT_REDACTED]')
    .replace(EMAIL_RE, (match) => {
      const [local, domain] = match.split('@')
      return `${local.slice(0, 2)}***@${domain}`
    })
    .replace(PHONE_RE, (match) => {
      const digits = match.replace(/\D/g, '')
      return `***${digits.slice(-4)}`
    })
}

function redactValue(value, depth = 0) {
  if (value == null) return value
  if (depth > 8) return '[REDACTED_DEPTH]'
  if (typeof value === 'string') return redactString(value)
  if (typeof value !== 'object') return value
  if (Buffer.isBuffer(value)) return '[BUFFER_REDACTED]'
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))

  return Object.entries(value).reduce((acc, [key, item]) => {
    const normalizedKey = key.toLowerCase()
    if ([...SECRET_KEYS].some((secretKey) => normalizedKey.includes(secretKey))) {
      acc[key] = '[REDACTED]'
      return acc
    }
    acc[key] = redactValue(item, depth + 1)
    return acc
  }, {})
}

module.exports = {
  redactString,
  redactValue,
}
