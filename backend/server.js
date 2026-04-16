require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { subscriptionGuard } = require('./src/middleware/subscriptionGuard')
const dunningWorker = require('./src/services/dunningWorker')
const app = express()

// Initialize database pool
const pool = require('./src/db')
app.locals.pool = pool

app.use(cors({ origin: ['https://courtia.vercel.app', 'http://localhost:5173'], credentials: true }))

// ⚠️  ORDRE CRITIQUE : le webhook Stripe a besoin du body RAW (Buffer).
//     express.raw() sur cette route AVANT app.use(express.json()).
//     Si l'ordre est inversé, stripe.webhooks.constructEvent() rejette la signature.
const billingRouter = require('./src/routes/billing')
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingRouter.webhookHandler
)

// Toutes les autres routes utilisent le body JSON parsé
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

const authRouter       = require('./src/routes/auth')
const clientsRouter    = require('./src/routes/clients')
const contratsRouter   = require('./src/routes/contrats')
const dashboardRouter  = require('./src/routes/dashboard')
const tachesRouter     = require('./src/routes/taches')
const arkRouter        = require('./src/routes/ark')
const adminCostsRouter = require('./src/routes/adminCosts')
const onboardingRouter = require('./src/routes/onboarding')
const healthRouter     = require('./src/routes/health')
const statsRouter      = require('./src/routes/stats')
const plansRouter      = require('./src/routes/plans')
const portfolioRouter      = require('./src/routes/portfolio')
const adminSuperAdminRouter = require('./src/routes/adminSuperAdmin')
const financingRouter      = require('./src/routes/financing')
const financingToolsRouter = require('./src/routes/financingTools')
const impersonationContext  = require('./src/middleware/impersonationContext')

// Middleware d'impersonation — appliqué globalement après JSON parsing
// Transparent si JWT normal, active le contexte si JWT d'impersonation
app.use(impersonationContext)

// Routes sans subscriptionGuard (auth, billing, plans, admin, health — toujours accessibles)
app.use('/api/auth',    authRouter)
app.use('/api/billing', billingRouter)   // checkout, portal, status — pas de guard (doit rester accessible même suspendu)
app.use('/api/plans',   plansRouter)
app.use('/api/health',  healthRouter)
app.use('/api/admin',   adminCostsRouter)
app.use('/api/admin',   adminSuperAdminRouter)  // Super Admin : users, impersonate, analytics, IOBSP

// Routes métier — subscriptionGuard appliqué (bloque les comptes suspendus)
app.use('/api/clients',    subscriptionGuard, clientsRouter)
app.use('/api/contrats',   subscriptionGuard, contratsRouter)
app.use('/api/dashboard',  subscriptionGuard, dashboardRouter)
app.use('/api/taches',     subscriptionGuard, tachesRouter)
app.use('/api/ark',        subscriptionGuard, arkRateLimit, arkRouter)
app.use('/api/onboarding', subscriptionGuard, onboardingRouter)
app.use('/api/stats',      subscriptionGuard, statsRouter)
app.use('/api/portfolio',  subscriptionGuard, portfolioRouter)
app.use('/api/financing',       subscriptionGuard, financingRouter)
app.use('/api/financing/tools', subscriptionGuard, financingToolsRouter)

app.get('/', (req, res) => res.json({ status: 'ok', service: 'courtia-backend' }))

// Ping endpoint pour réveiller le serveur et prévenir cold start
app.get('/ping', (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() })
})

// 404 — route non trouvée
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl })
})

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.message)
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Erreur serveur', details: err.message })
})

// Démarrer le dunning worker — cron horaire, suspension des comptes en grâce expirée
dunningWorker.init()

// ─── Cron Portefeuille Vivant — 03h00 Europe/Paris ───────────────────────────
// Analyse nocturne de tous les courtiers actifs (non-suspendus).
// Protection double-exécution : analyzePortfolio vérifie dernière analyse < 6h.
const cron = require('node-cron')
const { analyzePortfolio } = require('./src/services/portfolioAnalyzer')

cron.schedule('0 3 * * *', async () => {
  console.log('[portfolioCron] Lancement analyse nocturne portefeuilles...')
  try {
    // Récupérer tous les courtiers actifs (non suspendus, abonnés)
    const usersRes = await pool.query(
      `SELECT id FROM users
       WHERE subscription_status IN ('active', 'trialing', 'grace_period')
         AND subscription_plan   IN ('start', 'pro', 'elite')
         AND role NOT IN ('super_admin')
       ORDER BY id`
    )
    const users = usersRes.rows
    console.log(`[portfolioCron] ${users.length} courtier(s) à analyser`)

    let done = 0, skipped = 0, errors = 0
    for (const user of users) {
      try {
        const result = await analyzePortfolio(user.id)
        if (result === null) { skipped++; }
        else                 { done++;    }
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

const PORT = process.env.PORT || 10000
console.log('⚡ COURTIA Backend — ARK Enabled with claude-haiku-4-5')
app.listen(PORT, () => console.log('COURTIA backend port ' + PORT))
