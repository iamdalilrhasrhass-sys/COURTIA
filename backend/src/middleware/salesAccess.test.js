jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const { requireSalesAccess, requireSalesSuperAdmin } = require('./salesAccess')

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('salesAccess middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  test('rejects a valid JWT user when the current database role is not commercial', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 12, role: 'broker', status: 'active' }] })
    const req = { user: { id: 12, role: 'prospecteur' } }
    const res = response()
    const next = jest.fn()

    await requireSalesAccess(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'sales_access_forbidden' })
    expect(next).not.toHaveBeenCalled()
  })

  test('rejects suspended prospectors even if the token is still valid', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 8, role: 'prospecteur', status: 'active', suspended_at: new Date() }] })
    const res = response()
    await requireSalesAccess({ user: { userId: 8 } }, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'sales_user_suspended' })
  })

  test('attaches a current active prospector to the request', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 9, username: 'tarek', role: 'PROSPECTEUR', status: 'active' }] })
    const req = { user: { id: 9 } }
    const res = response()
    const next = jest.fn()
    await requireSalesAccess(req, res, next)
    expect(req.salesUser).toMatchObject({ id: 9, username: 'tarek', role: 'prospecteur' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  test('reserves administration endpoints for SUPER_ADMIN', () => {
    const res = response()
    requireSalesSuperAdmin({ salesUser: { role: 'prospecteur' } }, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'super_admin_required' })
  })
})
