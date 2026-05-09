const pino = require('pino')
const { redactValue } = require('./redaction')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.access_token',
      '*.refresh_token',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    payload: redactValue,
  },
})

module.exports = logger
