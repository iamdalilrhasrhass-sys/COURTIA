import { describe, expect, it } from 'vitest'
import { readAuthResponse } from './authResponse'

describe('authentication response', () => {
  it('does not authenticate an HTML or incomplete success response', async () => {
    await expect(readAuthResponse(new Response('<html>fallback</html>'))).rejects.toThrow('invalide')
    await expect(readAuthResponse(Response.json({ success: true }))).rejects.toThrow('invalide')
  })
  it('preserves actionable validation errors and masks server internals', async () => {
    await expect(readAuthResponse(Response.json({ message: 'Adresse deja utilisee' }, { status: 409 }))).rejects.toThrow('Adresse deja utilisee')
    await expect(readAuthResponse(Response.json({ error: 'SQL internal error' }, { status: 500 }))).rejects.toThrow('indisponible')
  })
  it('accepts a real session', async () => {
    await expect(readAuthResponse(Response.json({ token: 'test-fixture', user: { id: 12 } }))).resolves.toEqual({ token: 'test-fixture', user: { id: 12 } })
  })
})
