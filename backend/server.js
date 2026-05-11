require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const app = express()
const logger = require('./src/lib/logger')
const { initSentry, captureException } = require('./src/sentry')

initSentry()

app.use(helmet({ contentSecurityPolicy: false }))

const trustProxyEnv = process.env.TRUST_PROXY
if (trustProxyEnv === undefined || trustProxyEnv === '') {
  app.set('trust proxy', 1)
} else if (trustProxyEnv === 'true') {
  app.set('trust proxy', true)
} else if (trustProxyEnv === 'false') {
  app.set('trust proxy', false)
} else {
  const trustProxyInt = Number.parseInt(trustProxyEnv, 10)
  app.set('trust proxy', Number.isFinite(trustProxyInt) ? trustProxyInt : 1)
}

const pool = require('./src/db')
app.locals.pool = pool

// Rate limiting
const { apiLimiter, healthLimiter, arkLimiter } = require('./src/middleware/rateLimit')
app.use('/api', apiLimiter)
app.use('/health', healthLimiter)
app.use('/api/health', healthLimiter)

const defaultCorsOrigins = ['https://app.courtiark.fr', 'https://courtiark.fr', 'https://www.courtiark.fr', 'http://localhost:3000', 'http://localhost:5173']
const envCorsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]))
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json({
  // We need the raw body for Stripe webhook verification
  verify: (req, res, buf) => {
    if (
      req.originalUrl.startsWith('/api/stripe/webhook') ||
      req.originalUrl.startsWith('/api/billing/webhook') ||
      req.originalUrl.startsWith('/api/billing/stripe-webhook') ||
      req.originalUrl.startsWith('/api/documents/yousign/webhook') ||
      req.originalUrl.startsWith('/api/integrations/whatsapp/webhook')
    ) {
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

if (String(process.env.LOG_HTTP_REQUESTS || '').toLowerCase() === 'true') {
  app.use((req, res, next) => {
    const startedAt = Date.now()
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt
      const status = res.statusCode
      logger.info({
        type: 'http_request',
        method: req.method,
        path: req.originalUrl,
        status,
        duration_ms: durationMs,
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
        at: new Date().toISOString(),
      })
    })
    next()
  })
}

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

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'ok',
      api: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      api: 'ok',
      db: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  }
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
    const { getEmailStatus } = require('./src/services/emailService')
    const { getSmsStatus } = require('./src/services/smsService')
    const stripeService = require('./src/services/stripeService')
    const whatsappConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
    const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    const yousignConfigured = Boolean(process.env.YOUSIGN_API_KEY)
    res.json({
      status: 'running',
      frontend: 'ready',
      api: 'ready',
      database: 'connected',
      timestamp: result.rows[0].now,
      uptime: process.uptime(),
      integrations: {
        email_transactional: getEmailStatus().status,
        sms: getSmsStatus().status,
        stripe: stripeService.isConfigured() ? 'configured' : 'configuration_required',
        google: googleConfigured ? 'configured' : 'configuration_required',
        whatsapp_business: whatsappConfigured ? 'configured' : 'configuration_required',
        yousign: yousignConfigured ? 'configured' : 'configuration_required',
      },
      maintenance: {
        active: String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true',
        message: process.env.MAINTENANCE_MESSAGE || null,
      },
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      frontend: 'ready',
      api: 'ready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      maintenance: {
        active: String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true',
        message: process.env.MAINTENANCE_MESSAGE || null,
      },
    })
  }
})

app.get('/', (req, res) => res.json({ status: 'ok', service: 'courtia-backend' }))

// ==================== STATIC FILES — Landing Page 3D ====================

const path = require('path')
app.use('/landing', express.static(path.join(__dirname, 'public/landing')))

// Fallback : /landing (sans slash) et /landing/ servent index.html
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public/landing/index.html')))

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
const adminSuperAdminRouter = require('./src/routes/adminSuperAdmin')
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
const billingRouter        = require('./src/routes/billing')
const plansRouter          = require('./src/routes/plans')
const messagingRoutes      = require('./src/routes/messaging')
const leadsRouter          = require('./src/routes/leads')
const { router: integrationsRouter } = require('./src/routes/integrations')
const importRouter         = require('./src/routes/import')
const importsRouter        = require('./src/routes/imports')
const reachRouter          = require('./src/routes/reach')
const academyRouter        = require('./src/routes/academy')
const documentInboxRouter  = require('./src/routes/documentInbox')
const browserPilotRouter   = require('./src/routes/browserPilot')
const extensionRouter      = require('./src/routes/extension')
const partnersRouter       = require('./src/routes/partners')
const notificationsRouter  = require('./src/routes/notifications')
const webhooksRouter       = require('./src/routes/webhooks')
const featureFlagsRouter   = require('./src/routes/featureFlags')
const cabinetMembersRouter = require('./src/routes/cabinetMembers')
const inviteRouter         = require('./src/routes/invite')
const { router: commissionsRouter } = require('./src/routes/commissions')
const contractsAliasRouter = require('./src/routes/contractsAlias')
const searchRouter         = require('./src/routes/search')
const templatesRouter      = require('./src/routes/templates')
const feedbackRouter       = require('./src/routes/feedback')
const adminFeedbackRouter  = require('./src/routes/adminFeedback')
const clientDocumentsRouter = require('./src/routes/clientDocuments')

// LOT 5 — Comparateur Multi-Compagnies
const insuranceProvidersRouter = require('./src/routes/insuranceProviders')
const quotesComparatorRouter   = require('./src/routes/quotesComparator')

// LOT 6 — Modules Métier avec IA
const devisRouter        = require('./src/routes/devis')
const relancesRouter     = require('./src/routes/relances')
const opportunitesRouter = require('./src/routes/opportunites')

// LOT 7 — ARK Watch (surveillance proactive)
const arkWatchRouter     = require('./src/routes/arkWatch')
const voiceRouter        = require('./src/routes/voice')

// LOT 8 — ARK Compose (génération documents conformité)
const composeRouter      = require('./src/routes/compose')

// LOT 10 — Document Vision (extraction automatique RIB, carte grise, etc.)
const docvisionRouter    = require('./src/routes/docvision')

// LOT 11 — Quote Intelligence (briefs personnalisés par compagnie)
const quoteIntelRouter   = require('./src/routes/quoteIntel')

// LOT 12 — Portail Client (espace self-service moderne)
const portailRouter       = require('./src/routes/portail')       // routes courtier
const portalClientRouter  = require('./src/routes/portalClient')  // routes client

// LOT 18 — Module Sinistres + Marketing Beta
const claimsRouter = require('./src/routes/claims')
const betaRouter   = require('./src/routes/beta')

// LOT 20 — Signature Électronique + Reporting + Calendrier
const signaturesRouter = require('./src/routes/signatures')
const reportingRouter  = require('./src/routes/reporting')
const calendarRouter   = require('./src/routes/calendar')

// LOT 21-22 — WhatsApp Business + ARK Chat + Commissions Auto + Comptabilité
const whatsappMetaRouter = require('./src/routes/whatsappMeta')
const arkChatRouter      = require('./src/routes/arkChat')
const accountingRouter   = require('./src/routes/accounting')

// LOT 23 — API Publique + Marketplace + Enterprise
const publicApiRouter    = require('./src/routes/publicApi')
const marketplaceRouter  = require('./src/routes/marketplace')
const enterpriseRouter   = require('./src/routes/enterprise')

// Public
app.use('/api/auth',   authRouter)
app.use('/api/health', healthRouter)
app.use('/api/stripe', stripeRouter) // Handles public webhook and protected checkout routes
app.use('/api/billing', billingRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/integrations', integrationsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/invite', inviteRouter)

// Protected
app.use('/api/dashboard',       verifyToken, dashboardRouter)
app.use('/api/clients',         verifyToken, clientsRouter)
app.use('/api/clients',         verifyToken, clientTagsRouter)
app.use('/api/contrats',        verifyToken, contratsRouter)
app.use('/api/contracts',       verifyToken, contractsAliasRouter)
app.use('/api/taches',          verifyToken, tachesRouter)
app.use('/api/ark',             verifyToken, arkRateLimit, arkRouter)
app.use('/api/admin',           verifyToken, adminCostsRouter)
// Routes Super Admin (back-office propriétaire COURTIA) — verifyToken + superAdminGuard inclus dans le routeur
app.use('/api/admin/super',    adminSuperAdminRouter)
app.use('/api/onboarding',      verifyToken, onboardingRouter)
app.use('/api/cabinet/members', verifyToken, cabinetMembersRouter)
app.use('/api/stats',           verifyToken, statsRouter)
app.use('/api/portfolio',       verifyToken, portfolioRouter)
app.use('/api/financing',       verifyToken, financingRouter)
app.use('/api/financing/tools', verifyToken, financingToolsRouter)
app.use('/api/tags',            verifyToken, tagsRouter)
app.use('/api/kanban',          verifyToken, kanbanRouter)
app.use('/api/email-templates', verifyToken, emailTemplatesRouter)
app.use('/api/automations',     verifyToken, automationsRouter)
app.use('/api/documents',       verifyToken, documentsRouter)
app.use('/api/commissions',     verifyToken, commissionsRouter)
app.use('/api/dda',             verifyToken, ddaQuizRouter)
app.use('/api/analytics',       verifyToken, analyticsRouter)
app.use('/api/plans',           verifyToken, plansRouter)
app.use('/api/feature-flags',   verifyToken, featureFlagsRouter)
app.use('/api/search',          verifyToken, searchRouter)
app.use('/api/templates',       verifyToken, templatesRouter)
app.use('/api/import',          verifyToken, importRouter)
app.use('/api/imports',         verifyToken, importsRouter)
app.use('/api/feedback',        verifyToken, feedbackRouter)
app.use('/api/reach',          verifyToken, reachRouter)
app.use('/api/academy',        verifyToken, academyRouter)
app.use('/api/document-inbox', verifyToken, documentInboxRouter)
app.use('/api/browser-pilot',  verifyToken, browserPilotRouter)
app.use('/api/extension',      verifyToken, extensionRouter)
app.use('/api/partners',       verifyToken, partnersRouter)
app.use('/api/notifications',  notificationsRouter)
app.use('/api/admin/feedback', verifyToken, adminFeedbackRouter)

// Client Documents (LOT 4) — auth gérée par route (routes publiques + protégées)
app.use('/api', clientDocumentsRouter)

// LOT 5 — Comparateur Multi-Compagnies (auth mixte: providers public, integrations protected)
app.use('/api', insuranceProvidersRouter)
app.use('/api/comparator', quotesComparatorRouter)

// LOT 6 — Modules Métier avec IA (protected)
app.use('/api/devis',        verifyToken, devisRouter)
app.use('/api/relances',     verifyToken, relancesRouter)
app.use('/api/opportunites', verifyToken, opportunitesRouter)

// LOT 7 — ARK Watch (surveillance proactive, protected)
app.use('/api/ark-watch',    verifyToken, arkWatchRouter)
app.use('/api/voice',        verifyToken, voiceRouter)

// LOT 8 — ARK Compose (génération documents conformité, protected)
app.use('/api/compose',      verifyToken, composeRouter)

// LOT 10 — Document Vision (extraction automatique RIB, carte grise, etc., protected)
app.use('/api/docvision',    verifyToken, docvisionRouter)

// LOT 11 — Quote Intelligence (briefs personnalisés par compagnie, protected)
app.use('/api/quote-intel',  verifyToken, quoteIntelRouter)

// LOT 12 — Portail Client (espace self-service moderne)
app.use('/api/portail',      verifyToken, portailRouter)      // routes courtier (protected)
app.use('/api/portal',       portalClientRouter)               // routes client (auth dans le router)

// LOT 18 — Module Sinistres + Marketing Beta
app.use('/api/claims',       verifyToken, claimsRouter)
app.use('/api/beta',         betaRouter)  // public (inscription beta)

// LOT 20 — Signature Électronique + Reporting + Calendrier
app.use('/api/signatures',   signaturesRouter)  // auth mixte (webhook public)
app.use('/api/reporting',    verifyToken, reportingRouter)
app.use('/api/calendar',     calendarRouter)    // auth mixte (callback public)

// LOT 21-22 — WhatsApp Business + ARK Chat + Commissions Auto + Comptabilité
app.use('/api/whatsapp',     whatsappMetaRouter) // auth mixte (webhook public)
app.use('/api/ark-chat',     arkChatRouter)      // auth client portail
app.use('/api/accounting',   verifyToken, accountingRouter)

// LOT 23 — API Publique + Marketplace + Enterprise
app.use('/api/v1',           publicApiRouter)     // auth via API key (dans le router)
app.use('/api/marketplace',  verifyToken, marketplaceRouter)
app.use('/api/enterprise',   verifyToken, enterpriseRouter)
app.use('/api/developer',    verifyToken, require('./src/routes/developer'))  // gestion clés API

app.use('/api/messaging',    messagingRoutes)

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

// ==================== WHATSAPP (Baileys) ====================

const whatsappService = require('./src/services/whatsappService');

(async () => {
  if (process.env.WHATSAPP_ENABLED === 'true') {
    console.log('📱 Initialisation WhatsApp (Baileys)...');
    whatsappService.connectWhatsApp().catch(err => {
      console.error('WhatsApp init error:', err.message);
    });
  } else {
    console.log('📱 WhatsApp désactivé (WHATSAPP_ENABLED != true)');
  }
})();

// ==================== IMAP WATCHER (Emails entrants) ====================

const { startIMAPWatcher } = require('./src/services/imapService');

if (process.env.IMAP_PASSWORD && process.env.IMAP_PASSWORD.length > 0) {
  console.log('📧 Démarrage watcher IMAP (emails entrants)...');
  startIMAPWatcher(pool, 5); // Vérifie toutes les 5 minutes
} else {
  console.log('📧 IMAP désactivé (IMAP_PASSWORD non configuré)');
}

// ==================== RELANCE SCHEDULER (09h00 Europe/Paris) ====================

const { startRelanceScheduler } = require('./src/jobs/relanceScheduler');

if (process.env.DISABLE_RELANCES !== 'true') {
  console.log('🔔 Démarrage scheduler relances...');
  startRelanceScheduler(pool);
} else {
  console.log('🔔 Relances désactivées (DISABLE_RELANCES=true)');
}

// ==================== REACH WORKER (Campagnes) ====================

const { startReachWorker } = require('./src/workers/reachWorker');
console.log('📬 Démarrage worker REACH...');
startReachWorker(pool);

// ==================== ERROR HANDLERS ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl })
})

app.use((err, req, res, next) => {
  logger.error({ err, path: req.originalUrl, method: req.method }, 'Erreur non gérée')
  captureException(err, { path: req.originalUrl, method: req.method, userId: req.user?.id || req.user?.userId })
  res.status(err.status || 500).json({ error: 'Erreur serveur', details: err.message })
})

// ==================== SERVER START ====================

const PORT = process.env.PORT || 10000
console.log('⚡ COURTIA Backend — ARK Enabled')
app.listen(PORT, () => console.log('COURTIA backend port ' + PORT))
