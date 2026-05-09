const Sentry = require('@sentry/node')
const { redactValue } = require('./lib/redaction')

function initSentry() {
  const dsn = process.env.SENTRY_DSN_BACKEND
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    beforeSend(event) {
      if (event.request) {
        event.request.headers = redactValue(event.request.headers || {})
        event.request.cookies = '[REDACTED]'
        event.request.data = redactValue(event.request.data || {})
      }
      event.extra = redactValue(event.extra || {})
      return event
    },
  })

  return true
}

function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN_BACKEND) return
  Sentry.withScope((scope) => {
    Object.entries(redactValue(context)).forEach(([key, value]) => scope.setExtra(key, value))
    Sentry.captureException(error)
  })
}

module.exports = {
  initSentry,
  captureException,
}
