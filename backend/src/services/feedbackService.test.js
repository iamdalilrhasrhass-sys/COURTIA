jest.mock('../db', () => ({ query: jest.fn() }))

describe('feedbackService', () => {
  beforeEach(() => {
    jest.resetModules()
    require('../db').query.mockReset()
  })

  it('validates and stores user feedback with a safe status', async () => {
    const pool = require('../db')
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 12,
        user_id: 4,
        type: 'bug',
        page: '/dashboard',
        message: 'Le bouton import est difficile à trouver',
        status: 'new',
      }],
    })

    const feedbackService = require('./feedbackService')
    const result = await feedbackService.createFeedback({
      userId: 4,
      type: 'bug',
      page: '/dashboard',
      message: 'Le bouton import est difficile à trouver',
      metadata: { viewport: 'desktop' },
    })

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO feedback_items'), [
      4,
      'bug',
      '/dashboard',
      'Le bouton import est difficile à trouver',
      JSON.stringify({ viewport: 'desktop' }),
    ])
    expect(result).toMatchObject({ id: 12, status: 'new' })
  })

  it('rejects empty feedback messages', async () => {
    const feedbackService = require('./feedbackService')
    await expect(feedbackService.createFeedback({
      userId: 4,
      type: 'idea',
      page: '/dashboard',
      message: ' ',
    })).rejects.toMatchObject({ code: 'FEEDBACK_MESSAGE_REQUIRED', status: 400 })
  })
})
