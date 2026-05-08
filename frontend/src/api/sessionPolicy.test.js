import { describe, expect, it } from 'vitest'
import {
  buildApiUrl,
  getAuthToken,
  shouldClearSessionOnUnauthorized
} from './sessionPolicy'

describe('sessionPolicy', () => {
  it('clears the session for auth validation failures', () => {
    expect(shouldClearSessionOnUnauthorized('/auth/me', { error: 'Token expired' })).toBe(true)
    expect(shouldClearSessionOnUnauthorized('/api/auth/me', { error: 'Invalid token' })).toBe(true)
  })

  it('does not clear the session for secondary feature 401 responses', () => {
    expect(shouldClearSessionOnUnauthorized('/reach/prospects', { error: 'Acces refuse' })).toBe(false)
    expect(shouldClearSessionOnUnauthorized('/api/document-inbox/stats', { error: 'module_unavailable' })).toBe(false)
  })

  it('accepts both current and legacy token storage keys', () => {
    const storage = new Map([['courtia_token', 'new-token'], ['token', 'legacy-token']])

    expect(getAuthToken((key) => storage.get(key))).toBe('new-token')
    storage.delete('courtia_token')
    expect(getAuthToken((key) => storage.get(key))).toBe('legacy-token')
  })

  it('avoids duplicate api prefixes when building URLs', () => {
    expect(buildApiUrl('/api/document-inbox/stats', '/api')).toBe('/api/document-inbox/stats')
    expect(buildApiUrl('/document-inbox/stats', '/api')).toBe('/api/document-inbox/stats')
  })
})
