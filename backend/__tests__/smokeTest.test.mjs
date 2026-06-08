import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  REQUIRED_TABLES,
  collectConfig,
  evaluateConfig,
  normalizeBaseUrl,
  summarizeChecks,
} from '../scripts/smoke-test.mjs'

describe('production smoke gate helpers', () => {
  test('normalizes base URLs without trailing slash', () => {
    assert.equal(normalizeBaseUrl('http://localhost:8080/'), 'http://localhost:8080')
    assert.equal(normalizeBaseUrl('http://localhost:8080'), 'http://localhost:8080')
  })

  test('requires explicit write confirmation and staging inputs', () => {
    const config = collectConfig({})
    const checks = evaluateConfig(config)

    assert.equal(checks.some((check) => check.name === 'SMOKE_ALLOW_WRITES' && check.status === 'FAIL'), true)
    assert.equal(checks.some((check) => check.name === 'DATABASE_URL' && check.status === 'FAIL'), true)
    assert.equal(checks.some((check) => check.name === 'SMOKE_AUTH_TOKEN' && check.status === 'FAIL'), true)
  })

  test('reports optional providers as skip, not fail', () => {
    const config = collectConfig({
      DATABASE_URL: 'postgres://example',
      BASE_URL: 'http://localhost:8080',
      SMOKE_AUTH_TOKEN: 'token',
      SMOKE_TENANT_ID: 'tenant',
      SMOKE_CLIENT_ID: 'client',
      SMOKE_ALLOW_WRITES: '1',
    })
    const checks = evaluateConfig(config)

    assert.equal(checks.filter((check) => check.status === 'FAIL').length, 0)
    assert.equal(checks.some((check) => check.name === 'ANTHROPIC_API_KEY' && check.status === 'SKIP'), true)
    assert.equal(checks.some((check) => check.name === 'BREVO_API_KEY' && check.status === 'SKIP'), true)
  })

  test('tracks the expected ARK tables', () => {
    assert.deepEqual(REQUIRED_TABLES, [
      'events',
      'dossiers',
      'ai_actions',
      'ark_daily_briefs',
      'client_documents',
      'data_points',
      'inbound_events',
      'whatsapp_accounts',
      'dossier_links',
      'advice_notes',
      'prospects',
      'prospect_messages',
    ])
  })

  test('summarizes fail and skip checks into a no-go result', () => {
    const result = summarizeChecks([
      { status: 'PASS', name: 'ok' },
      { status: 'SKIP', name: 'optional' },
      { status: 'FAIL', name: 'broken' },
    ])

    assert.equal(result.go, false)
    assert.equal(result.failCount, 1)
    assert.equal(result.skipCount, 1)
  })
})
