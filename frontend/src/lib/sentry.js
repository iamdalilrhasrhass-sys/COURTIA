import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN_FRONTEND
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      if (event.request) {
        event.request.headers = {}
        event.request.cookies = '[REDACTED]'
      }
      return event
    },
  })
  return true
}
