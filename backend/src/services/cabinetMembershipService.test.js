const service = require('./cabinetMembershipService')

function createPoolMock() {
  const state = {
    memberships: [],
    invitations: [],
    onboarding: new Map(),
    cabinets: [],
    queries: [],
  }

  const pool = {
    state,
    async query(sql, params = []) {
      state.queries.push({ sql, params })
      const compact = sql.replace(/\s+/g, ' ').trim()

      if (compact.includes('FROM cabinet_members cm') && compact.includes('WHERE cm.user_id = $1')) {
        const userId = params[0]
        const row = state.memberships.find((m) => m.user_id === userId && !m.removed_at)
        if (!row) return { rows: [] }
        const cabinet = state.cabinets.find((c) => c.id === row.cabinet_id) || { name: 'Cabinet test' }
        return { rows: [{ ...row, cabinet_name: cabinet.name, orias_number: cabinet.orias_number || '' }] }
      }

      if (compact.startsWith('INSERT INTO cabinets')) {
        const id = `cab-${state.cabinets.length + 1}`
        const row = { id, name: params[0], created_by: params[1], orias_number: params[2] || '' }
        state.cabinets.push(row)
        return { rows: [row] }
      }

      if (compact.startsWith('INSERT INTO cabinet_members')) {
        const row = { id: `member-${state.memberships.length + 1}`, cabinet_id: params[0], user_id: params[1], role: params[2] }
        state.memberships.push(row)
        return { rows: [row] }
      }

      if (compact.includes('FROM cabinet_members') && compact.includes('WHERE user_id = $1') && compact.includes('cabinet_id = $2')) {
        const row = state.memberships.find((m) => m.user_id === params[0] && m.cabinet_id === params[1] && !m.removed_at)
        return { rows: row ? [row] : [] }
      }

      if (compact.startsWith('INSERT INTO cabinet_invitations')) {
        const row = { id: `invite-${state.invitations.length + 1}`, cabinet_id: params[0], email: params[1], role: params[2], token_hash: params[3], token_preview: params[4], invited_by: params[5], expires_at: params[6], accepted_at: null }
        state.invitations.push(row)
        return { rows: [row] }
      }

      if (compact.includes('FROM cabinet_invitations') && compact.includes('token_hash = $1')) {
        const row = state.invitations.find((i) => i.token_hash === params[0])
        return { rows: row ? [{ ...row, cabinet_name: 'Cabinet test' }] : [] }
      }

      if (compact.startsWith('UPDATE cabinet_invitations')) {
        const row = state.invitations.find((i) => i.id === params[1])
        if (row) row.accepted_at = new Date().toISOString()
        return { rows: row ? [row] : [] }
      }

      if (compact.includes('FROM cabinet_onboarding_progress') && compact.includes('cabinet_id = $1')) {
        const row = state.onboarding.get(params[0])
        return { rows: row ? [row] : [] }
      }

      if (compact.startsWith('INSERT INTO cabinet_onboarding_progress')) {
        const row = { cabinet_id: params[0], step_profile_done: false, step_import_done: false, step_google_done: false, step_first_client_done: false, step_first_brief_done: false, completed_at: null, updated_at: new Date().toISOString() }
        state.onboarding.set(params[0], row)
        return { rows: [row] }
      }

      if (compact.startsWith('UPDATE cabinet_onboarding_progress')) {
        const row = state.onboarding.get(params[0])
        const step = compact.match(/SET (step_[a-z_]+) = TRUE/)?.[1]
        if (!step) throw new Error(`Missing onboarding step in SQL: ${compact}`)
        row[step] = true
        row.updated_at = new Date().toISOString()
        if (row.step_profile_done && row.step_import_done && row.step_google_done && row.step_first_client_done && row.step_first_brief_done) {
          row.completed_at = new Date().toISOString()
        }
        return { rows: [row] }
      }

      throw new Error(`Unexpected SQL: ${compact}`)
    }
  }
  return pool
}

describe('cabinetMembershipService', () => {
  test('normalizes V1 roles and rejects unknown roles', () => {
    expect(service.normalizeCabinetRole('Owner')).toBe('owner')
    expect(service.normalizeCabinetRole('super_admin')).toBe('super_admin')
    expect(() => service.normalizeCabinetRole('pirate')).toThrow('invalid_role')
  })

  test('creates a default cabinet and owner membership for a user without membership', async () => {
    const pool = createPoolMock()
    const membership = await service.ensureUserCabinet(pool, 12, { cabinet: 'Cabinet Aurora', orias: '07000000' })
    expect(membership.role).toBe('owner')
    expect(membership.user_id).toBe(12)
    expect(membership.cabinet_name).toBe('Cabinet Aurora')
    expect(pool.state.cabinets).toHaveLength(1)
    expect(pool.state.memberships).toHaveLength(1)
  })

  test('allows owner to create invitation and returns only the raw token once', async () => {
    const pool = createPoolMock()
    await service.ensureUserCabinet(pool, 1, { cabinet: 'Cabinet test' })
    const invite = await service.createInvitation(pool, { actorUserId: 1, email: 'assistant@cabinet.fr', role: 'assistant', frontendUrl: 'https://app.courtiark.fr' })
    expect(invite.invitation.email).toBe('assistant@cabinet.fr')
    expect(invite.inviteLink).toContain('/invite/')
    expect(invite.rawToken).toHaveLength(64)
    expect(invite.invitation.token_hash).not.toBe(invite.rawToken)
  })

  test('rejects invitation creation for non-owner roles', async () => {
    const pool = createPoolMock()
    const owner = await service.ensureUserCabinet(pool, 1, { cabinet: 'Cabinet test' })
    pool.state.memberships.push({ id: 'member-2', cabinet_id: owner.cabinet_id, user_id: 2, role: 'manager' })
    await expect(service.createInvitation(pool, { actorUserId: 2, email: 'viewer@cabinet.fr', role: 'viewer', frontendUrl: 'https://app.courtiark.fr' })).rejects.toMatchObject({ code: 'FORBIDDEN_ROLE' })
  })

  test('accepts an invitation once and creates the target membership', async () => {
    const pool = createPoolMock()
    await service.ensureUserCabinet(pool, 1, { cabinet: 'Cabinet test' })
    const invite = await service.createInvitation(pool, { actorUserId: 1, email: 'broker@cabinet.fr', role: 'broker', frontendUrl: 'https://app.courtiark.fr' })
    const accepted = await service.acceptInvitation(pool, { token: invite.rawToken, userId: 42 })
    expect(accepted.membership.role).toBe('broker')
    expect(accepted.membership.user_id).toBe(42)
    await expect(service.acceptInvitation(pool, { token: invite.rawToken, userId: 42 })).rejects.toMatchObject({ code: 'INVITE_ALREADY_ACCEPTED' })
  })

  test('marks onboarding steps and completes when all V1 steps are done', async () => {
    const pool = createPoolMock()
    const membership = await service.ensureUserCabinet(pool, 1, { cabinet: 'Cabinet test' })
    let progress = await service.getOnboardingProgress(pool, membership.cabinet_id)
    expect(progress.completed_at).toBe(null)
    for (const step of service.ONBOARDING_STEPS) {
      progress = await service.markOnboardingStep(pool, membership.cabinet_id, step)
    }
    expect(progress.step_profile_done).toBe(true)
    expect(progress.step_first_brief_done).toBe(true)
    expect(progress.completed_at).toBeTruthy()
  })
})
