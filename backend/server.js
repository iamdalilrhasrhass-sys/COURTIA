require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

const pool = require('./src/db')
app.locals.pool = pool

app.use(cors({ origin: ['https://courtia.vercel.app', 'http://localhost:5173'], credentials: true }))
app.use(express.json({
  // We need the raw body for Stripe webhook verification
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/stripe/webhook')) {
      req.rawBody = buf
    }
  }
}))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// ==================== AUTH MIDDLEWARE ====================

const verifyToken = require('./src/middleware/authMiddleware')

// ==================== ARK RATE LIMITING ====================

const arkCallCount = new Map()
function arkRateLimit(req, res, next) {
  const userId = req.user?.id || 'anonymous'
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxCalls = 20

  if (!arkCallCount.has(userId)) {
    arkCallCount.set(userId, [])
  }

  const calls = arkCallCount.get(userId).filter(t => now - t < windowMs)
  calls.push(now)
  arkCallCount.set(userId, calls)

  if (calls.length > maxCalls) {
    return res.status(429).json({
      error: 'Trop de requêtes ARK',
      details: `Limite : ${maxCalls} appels par minute. Réessayez dans quelques instants.`
    })
  }

  next()
}

// ==================== HEALTH (public) ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-assurance-backend', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api: 'crm-assurance-backend', version: '1.0.0', timestamp: new Date().toISOString() })
})

app.get('/ping', (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() })
})

app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ status: 'running', database: 'connected', timestamp: result.rows[0].now, uptime: process.uptime() })
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

app.get('/', (req, res) => res.json({ status: 'ok', service: 'courtia-backend' }))

// ==================== SCORE REFRESH (Batch 1 — POST only, no GET writes) ====================

app.post('/api/clients/:id/score/refresh', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client')
    const riskScoreService = require('./src/services/riskScoreService')

    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const contractsRes = await pool.query('SELECT * FROM contracts WHERE client_id = $1', [client.id])
    client.contracts = contractsRes.rows

    const riskResult = await riskScoreService.calculateRiskScore(client)

    await pool.query(
      'UPDATE clients SET risk_score = $1, updated_at = NOW() WHERE id = $2',
      [riskResult.score, client.id]
    )

    res.json({ risk: riskResult })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==================== ROUTES ====================

const authRouter           = require('./src/routes/auth')
const clientsRouter        = require('./src/routes/clients')
const contratsRouter       = require('./src/routes/contrats')
const dashboardRouter      = require('./src/routes/dashboard')
const tachesRouter         = require('./src/routes/taches')
const arkRouter            = require('./src/routes/ark')
const adminCostsRouter     = require('./src/routes/adminCosts')
const onboardingRouter     = require('./src/routes/onboarding')
const healthRouter         = require('./src/routes/health')
const statsRouter          = require('./src/routes/stats')
const portfolioRouter      = require('./src/routes/portfolio')
const financingRouter      = require('./src/routes/financing')
const financingToolsRouter = require('./src/routes/financingTools')
const { router: tagsRouter, clientTagsRouter } = require('./src/routes/tags')
const kanbanRouter         = require('./src/routes/kanban')
const emailTemplatesRouter = require('./src/routes/emailTemplates')
const automationsRouter    = require('./src/routes/automations')
const documentsRouter      = require('./src/routes/documents')
const ddaQuizRouter        = require('./src/routes/ddaQuiz')
const analyticsRouter      = require('./src/routes/analytics')
const stripeRouter         = require('./src/routes/stripe')
const plansRouter          = require('./src/routes/plans')

// Public
app.use('/api/auth',   authRouter)
app.use('/api/health', healthRouter)
app.use('/api/stripe', stripeRouter) // Handles public webhook and protected checkout routes

// Protected
app.use('/api/dashboard',       verifyToken, dashboardRouter)
app.use('/api/clients',         verifyToken, clientsRouter)
app.use('/api/clients',         verifyToken, clientTagsRouter)
app.use('/api/contrats',        verifyToken, contratsRouter)
app.use('/api/taches',          verifyToken, tachesRouter)
app.use('/api/ark',             verifyToken, arkRateLimit, arkRouter)
app.use('/api/admin',           verifyToken, adminCostsRouter)
app.use('/api/onboarding',      verifyToken, onboardingRouter)
app.use('/api/stats',           verifyToken, statsRouter)
app.use('/api/portfolio',       verifyToken, portfolioRouter)
app.use('/api/financing',       verifyToken, financingRouter)
app.use('/api/financing/tools', verifyToken, financingToolsRouter)
app.use('/api/tags',            verifyToken, tagsRouter)
app.use('/api/kanban',          verifyToken, kanbanRouter)
app.use('/api/email-templates', verifyToken, emailTemplatesRouter)
app.use('/api/automations',     verifyToken, automationsRouter)
app.use('/api/documents',       verifyToken, documentsRouter)
app.use('/api/dda',             verifyToken, ddaQuizRouter)
app.use('/api/analytics',       verifyToken, analyticsRouter)
app.use('/api/plans',           verifyToken, plansRouter)

// ==================== PORTFOLIO CRON (03h00 Europe/Paris) ====================

const cron = require('node-cron')
const { analyzePortfolio } = require('./src/services/portfolioAnalyzer')

cron.schedule('0 3 * * *', async () => {
  console.log('[portfolioCron] Lancement analyse nocturne portefeuilles...')
  try {
    const usersRes = await pool.query(
      `SELECT id FROM users ORDER BY id`
    )
    const users = usersRes.rows
    console.log(`[portfolioCron] ${users.length} courtier(s) à analyser`)

    let done = 0, skipped = 0, errors = 0
    for (const user of users) {
      try {
        const result = await analyzePortfolio(user.id)
        if (result === null) { skipped++ } else { done++ }
      } catch (err) {
        errors++
        console.error(`[portfolioCron] Erreur user ${user.id}:`, err.message)
      }
    }
    console.log(`[portfolioCron] Terminé — analysés: ${done}, sautés: ${skipped}, erreurs: ${errors}`)
  } catch (err) {
    console.error('[portfolioCron] Erreur critique:', err.message)
  }
}, { timezone: 'Europe/Paris' })

// ==================== ERROR HANDLERS ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl })
})

app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.message)
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Erreur serveur', details: err.message })
})

// ==================== SERVER START ====================

const PORT = process.env.PORT || 10000
console.log('⚡ COURTIA Backend — ARK Enabled')
app.listen(PORT, () => console.log('COURTIA backend port ' + PORT))
