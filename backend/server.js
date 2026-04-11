require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

// Initialize database pool
const pool = require('./src/db')
app.locals.pool = pool

app.use(cors({ origin: ['https://courtia.vercel.app', 'http://localhost:5173'], credentials: true }))
app.use(express.json())

// Headers de sécurité basiques
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// Rate limiting simple pour ARK (éviter abus API Anthropic)
const arkCallCount = new Map()
function arkRateLimit(req, res, next) {
  const userId = req.user?.id || 'anonymous'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxCalls = 20 // 20 appels par minute max

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

const authRouter = require('./src/routes/auth')
const clientsRouter = require('./src/routes/clients')
const contratsRouter = require('./src/routes/contrats')
const dashboardRouter = require('./src/routes/dashboard')
const tachesRouter = require('./src/routes/taches')
const arkRouter = require('./src/routes/ark')
const adminCostsRouter = require('./src/routes/adminCosts')
const onboardingRouter = require('./src/routes/onboarding')

app.use('/api/auth', authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/contrats', contratsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/taches', tachesRouter)
app.use('/api/ark', arkRateLimit, arkRouter)
app.use('/api/admin', adminCostsRouter)
app.use('/api/onboarding', onboardingRouter)

app.get('/', (req, res) => res.json({ status: 'ok', service: 'courtia-backend' }))

// Ping endpoint pour réveiller le serveur et prévenir cold start
app.get('/ping', (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() })
})

app.use((err, req, res, next) => { 
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur', details: err.message })
})

const PORT = process.env.PORT || 10000
console.log('⚡ COURTIA Backend — ARK Enabled with claude-3-haiku-20250305')
app.listen(PORT, () => console.log('COURTIA backend port ' + PORT))
