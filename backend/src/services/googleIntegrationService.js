const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar']
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
]
const GOOGLE_PROFILE_SCOPES = ['openid', 'email', 'profile']
const GOOGLE_COMBINED_SCOPES = Array.from(new Set([
  ...GOOGLE_PROFILE_SCOPES,
  ...GOOGLE_CALENDAR_SCOPES,
  ...GMAIL_SCOPES,
]))

function getGoogleConfig(provider = 'google') {
  const normalized = String(provider || 'google').toLowerCase()
  const fallbackRedirect = process.env.GOOGLE_REDIRECT_URI || ''
  let redirectUri = fallbackRedirect

  if (normalized === 'google_calendar') {
    redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || fallbackRedirect
  } else if (normalized === 'gmail') {
    redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || fallbackRedirect
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri,
  }
}

function isGoogleConfigured(provider = 'google') {
  const conf = getGoogleConfig(provider)
  return Boolean(conf.clientId && conf.clientSecret && conf.redirectUri)
}

function encodeHeader(value = '') {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`
}

function encodeGmailRawMessage({ to, from, subject, body }) {
  const lines = [
    `To: ${String(to || '').trim()}`,
    from ? `From: ${String(from).trim()}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    `Subject: ${encodeHeader(subject || '')}`,
    '',
    String(body || ''),
  ].filter((line) => line !== null)

  return Buffer.from(lines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeBase64Url(value = '') {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

function findHeader(headers = [], name = '') {
  const target = String(name).toLowerCase()
  const match = headers.find((header) => String(header?.name || '').toLowerCase() === target)
  return match?.value || ''
}

function extractGmailMessageSummary(message = {}) {
  const headers = message.payload?.headers || []
  return {
    messageId: message.id || null,
    threadId: message.threadId || null,
    from: findHeader(headers, 'from'),
    to: findHeader(headers, 'to'),
    subject: findHeader(headers, 'subject') || '(Sans objet)',
    sentAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
    snippet: message.snippet || '',
  }
}

module.exports = {
  GOOGLE_CALENDAR_SCOPES,
  GMAIL_SCOPES,
  GOOGLE_COMBINED_SCOPES,
  getGoogleConfig,
  isGoogleConfigured,
  encodeGmailRawMessage,
  decodeBase64Url,
  extractGmailMessageSummary,
}
