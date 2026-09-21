require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const app = express()
const logger = require('./src/lib/logger')
// ── POURQUOI CES REQUIRES SONT EN TÊTE ──────────────────────────────────────
// `assainirErreursInternes` est MONTÉ très haut dans ce fichier (avant tous les
// routeurs, c'est sa raison d'être) : sa déclaration doit donc précéder son
// usage. Placée plus bas (à côté du rate limiting), elle provoquait
// « ReferenceError: Cannot access 'assainirErreursInternes' before
// initialization » — le serveur ne démarrait plus DU TOUT. Constaté en
// production le 21/09/2026 : le déploiement Render est passé en
// `update_failed` (nonZeroExit 1) sur ce seul défaut, alors que 1 343 tests
// backend étaient verts — aucun test ne démarrait `server.js`. Le test de
// démarrage `src/server.boot.test.js` ferme cette classe.
const { messagePublic, assainirErreursInternes } = require('./src/lib/erreursPubliques')
const { initSentry, captureException } = require('./src/sentry')

initSentry()

app.use(helmet({ contentSecurityPolicy: false }))

// ─────────────────────────────────────────────────────────────────────────────
// SEC-026 — CSP, EN-TÊTES ET ORIGINES (mesure du 21/09/2026)
//
// Ce qui était constaté avant : `contentSecurityPolicy: false` (aucune CSP),
// aucune politique de référent, aucune Permissions-Policy, et surtout les
// origines LOCALES (`http://localhost:5173`) acceptées EN PRODUCTION — une page
// servie sur la machine du courtier pouvait donc appeler l'API de production
// avec l'identité du courtier. Aucun de ces trois points n'est une hypothèse :
// ils sont lus dans les en-têtes réels de la production (voir EVIDENCE/12-security).
//
// La CSP est construite sur les ressources RÉELLEMENT servies par ce backend :
//   • l'immense majorité des réponses est du JSON → aucune ressource à charger,
//     donc `default-src 'none'` (le réglage le plus strict possible) ;
//   • `/landing` sert une page HTML statique (style.css, deux modules ES, un
//     importmap inline) → politique dédiée, `'self'` + `'unsafe-inline'` pour le
//     seul importmap, sinon la page ne se charge plus.
// Le front principal est servi par Vercel : sa CSP est posée dans vercel.json,
// pas ici — poser une CSP arbitraire ici ne changerait rien pour le navigateur
// et risquerait de casser les ressources du front.
// ─────────────────────────────────────────────────────────────────────────────
const estProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production'

const CSP_API = [
  "default-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const CSP_LANDING = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join('; ')

app.use((req, res, next) => {
  const chemin = String(req.path || '')
  res.setHeader('Content-Security-Policy', chemin.startsWith('/landing') ? CSP_LANDING : CSP_API)
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), usb=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  next()
})

// ── SEC-025 : FILET UNIQUE CONTRE LA FUITE D'ERREUR ─────────────────────────
// 324 réponses d'erreur recopiaient `err.message` (60 routeurs). Le balayage a
// remplacé les citations, mais ce filet-ci ferme la CLASSE : il est monté avant
// tous les routeurs, donc une route écrite demain qui recopierait de nouveau un
// message brut de PostgreSQL, un chemin de fichier ou une réponse de fournisseur
// ne peut pas le servir. Le texte d'origine reste dans le journal serveur.
app.use(assainirErreursInternes)

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
// ── AUCUNE RÉPONSE D'API NE DOIT ÊTRE MISE EN CACHE (mesure du 21/09/2026) ──
// Aucune réponse ne portait `Cache-Control` : via le proxy Vercel, une réponse
// authentifiée ressortait avec `cache-control: public, max-age=0,
// must-revalidate`, donc stockable par un cache partagé qui ne distingue pas
// l'appelant. `no-store` est posé ici, avant tout routeur.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})
app.use('/api', apiLimiter)

app.use('/health', healthLimiter)
app.use('/api/health', healthLimiter)

// ── ORIGINES AUTORISÉES ─────────────────────────────────────────────────────
// En production, seules les origines réellement servies au courtier sont
// acceptées. Les origines locales ne sont ajoutées QUE hors production (ou si
// l'exploitant l'exige explicitement avec CORS_ALLOW_LOCALHOST=true, cas d'un
// frontal de développement pointé sur l'API de production).
const originesProduction = ['https://app.courtiark.fr', 'https://courtiark.fr', 'https://www.courtiark.fr']
const originesDeveloppement = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
const localhostAutorise = !estProduction || String(process.env.CORS_ALLOW_LOCALHOST || '').toLowerCase() === 'true'
const defaultCorsOrigins = localhostAutorise
  ? [...originesProduction, ...originesDeveloppement]
  : [...originesProduction]
const envCorsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]))
// ─────────────────────────────────────────────────────────────────────────────
// CORPS BRUT CONSERVÉ : la liste des points d'entrée qui vérifient une signature
// HMAC. Chaque entrée correspond à un `verifierSignatureHmac` réel dans le code.
// Un point d'entrée absent de cette liste ne peut PAS vérifier une signature de
// façon fiable — c'est pourquoi elle est énumérée ici, en un seul endroit.
// ─────────────────────────────────────────────────────────────────────────────
const CHEMIN_AVEC_CORPS_BRUT = Object.freeze([
  '/api/stripe/webhook',
  '/api/billing/webhook',
  '/api/billing/stripe-webhook',
  '/api/documents/yousign/webhook',
  '/api/integrations/whatsapp/webhook',
  // Mesure du 20/09/2026 : signature calculée sur du JSON reconstruit.
  '/api/whatsapp/webhook',
  // Point d'entrée public sans signature (secret partagé) mais qui doit, lui
  // aussi, pouvoir être authentifié sur les octets reçus.
  '/api/messaging/webhook/inbound',
  '/api/webhooks/incoming',
  '/api/voice/webhook',
])

app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json({
  // Le CORPS BRUT est nécessaire dès qu'un point d'entrée public vérifie une
  // signature HMAC : la signature porte sur les OCTETS reçus, jamais sur un
  // objet JSON reconstruit (JSON.stringify réordonne les clés, normalise les
  // espaces et l'échappement des accents — une signature calculée là-dessus
  // valide une mise en forme que l'appelant a choisie).
  //
  // POURQUOI cette liste a été ÉTENDUE (mesure du 20/09/2026) : le webhook
  // WhatsApp calculait sa signature sur `JSON.stringify(body)`
  // (services/whatsappMetaService.js:142) et `req.rawBody` n'était conservé que
  // pour quatre préfixes, dont AUCUN de ceux qui vérifient réellement une
  // signature. Les nouveaux points d'entrée (messagerie, WhatsApp, téléphonie,
  // webhooks génériques) sont donc ajoutés ici — sans quoi leur vérification de
  // signature serait impossible ou mensongère.
  verify: (req, res, buf) => {
    const chemin = String(req.originalUrl || '')
    if (
      CHEMIN_AVEC_CORPS_BRUT.some((prefixe) => chemin.startsWith(prefixe))
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

// ─────────────────────────────────────────────────────────────────────────────
// DEUX GARDES TRANSVERSALES, MONTÉES AVANT TOUT ROUTEUR /api
//
// 1. `traduireErreursEntree` : une entrée invalide qui faisait répondre 500 avec
//    le message brut de PostgreSQL (« value too long for type character
//    varying(100) », « invalid input syntax for type integer: "NaN" ») est
//    réécrite en 400 avec un message produit. Ferme la classe entière, pas les
//    quatre appels mesurés (Red Team P1 #4).
// 2. `creerGardeEcritureRole` : aucune ÉCRITURE pour un rôle de cabinet en
//    lecture seule (assistant / viewer) — y compris l'émission de clés d'API.
//    Trois routes l'oubliaient (objectifs/set, partners, developer/keys),
//    mesuré en production le 20/09/2026 (Red Team P1 #3).
// Montées sur le préfixe '/api' et avant les routeurs : aucune route ne peut
// les contourner, quelle que soit son authentification interne.
// ─────────────────────────────────────────────────────────────────────────────
const { traduireErreursEntree } = require('./src/middleware/erreursEntree')
const { creerGardeEcritureRole } = require('./src/middleware/gardeEcritureRole')
// 3. `creerGardeChangementMotDePasse` : tant que `users.must_change_password`
//    est vrai, le mot de passe est celui que COURTIA a remis — dérivé du NOM DU
//    CABINET (lib/motDePasseInitial.js), donc devinable. Les deux cabinets
//    pilotes sont dans cet état (utilisateurs 11 et 14, mesuré le 21/09/2026) et
//    utilisaient pourtant l'application entière : le drapeau n'était qu'une
//    invitation affichée à l'écran. Les routes MÉTIER répondent désormais 403
//    `changement_mot_de_passe_requis`, SAUF une liste d'exemptions EXPLICITE
//    (le changement de mot de passe, la déconnexion, /api/auth/me,
//    l'authentification, /api/billing/*, /api/health, /api/status) : le compte
//    reste utilisable pour se mettre en règle, rien d'autre. Montée sur « /api »
//    et avant les routeurs, comme les deux gardes ci-dessus : aucune route ne
//    peut la contourner, y compris une route ajoutée demain.
const { creerGardeChangementMotDePasse } = require('./src/middleware/changementMotDePasseRequis')
app.use('/api', traduireErreursEntree)
app.use('/api', creerGardeChangementMotDePasse(pool))
app.use('/api', creerGardeEcritureRole(pool))

// 4. `journaliserEcritures` : toutes les ÉCRITURES sous /api laissent une trace
//    dans `audit_logs` (append-only, garantie posée en base par la migration
//    119). Avant, `audit_logs` contenait 0 ligne et le middleware n'était monté
//    nulle part (P3 SEC-024, mesuré le 20/09/2026). Monté ici, il couvre toutes
//    les routes par construction : aucune route ajoutée demain n'y échappe.
const { journaliserEcritures } = require('./src/middleware/auditLogger')
app.use('/api', journaliserEcritures(pool))

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
      error: messagePublic(err, { statut: 503 }),
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

// ── /api/status — CE QU'UN POINT D'ENTRÉE PUBLIC PEUT DIRE ──────────────────
// Mesure du 20/09/2026 (SEC-026) : `/api/status` est public et annonçait, sans
// authentification, la liste des fournisseurs configurés (e-mail, SMS, Stripe,
// Google, WhatsApp, Yousign), la séquence de démarrage (`uptime`) et l'état du
// mode maintenance. Un appelant non authentifié apprenait ainsi quels services
// sont branchés — donc lesquels ne le sont pas. Ces informations ne servent
// qu'à l'exploitant : elles sont désormais servies par `/api/admin/status`,
// derrière une authentification. Ce qui reste public est ce qu'un client a
// besoin de savoir : le service répond, et la base est joignable.
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({
      status: 'running',
      api: 'ready',
      database: 'connected',
      timestamp: result.rows[0].now,
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      api: 'ready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    })
  }
})

// ── /api/admin/status — ÉTAT DÉTAILLÉ, AUTHENTIFIÉ ──────────────────────────
// Même mesure que ci-dessus, mais réservée à un rôle d'administration du
// cabinet (ou super_admin) : fournisseurs configurés, mode maintenance, uptime.
app.get('/api/admin/status', verifyToken, async (req, res) => {
  const { isAdminRole } = require('./src/constants/roles')
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ error: 'forbidden', message: 'Rôle insuffisant pour consulter l’état détaillé.' })
  }
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
    const riskScoreService = require('./src/services/riskScoreService')

    // Le client est résolu AVEC son cabinet : sans ce filtre, un cabinet
    // authentifié pouvait rafraîchir (donc RÉÉCRIRE) le score de risque du
    // client d'un autre cabinet — atteinte à l'intégrité, inter-cabinets.
    const scope = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1',
      [req.params.id, req.user.id || req.user.userId]
    )
    const client = scope.rows[0]
    if (!client) return res.status(404).json({ error: 'Client non trouvé' })

    const contractsRes = await pool.query('SELECT * FROM contracts WHERE client_id = $1', [client.id])
    client.contracts = contractsRes.rows

    const riskResult = await riskScoreService.calculateRiskScore(client)

    await pool.query(
      'UPDATE clients SET risk_score = $1, updated_at = NOW() WHERE id = $2 AND courtier_id = $3',
      [riskResult.score, client.id, req.user.id || req.user.userId]
    )

    res.json({ risk: riskResult })
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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

// LOT FEATURES KILLERS — F1..F6
const arkIntelligenceRouter = require('./src/routes/arkIntelligence')
const comparatorEngineRouter = require('./src/routes/comparatorEngine')
const objectifsAdvancedRouter = require('./src/routes/objectifsAdvanced')
const conformiteRouter = require('./src/routes/conformite')

// Public
// ==================== FIN D'ESSAI : LECTURE CONSERVÉE, ÉCRITURE SUSPENDUE =====
// Règle validée : essai de 7 jours, puis lecture seule (aucune donnée perdue)
// jusqu'à souscription. Monté AVANT les routeurs car il vérifie lui-même le
// jeton ; il ne concerne QUE les écritures des ressources du quotidien. Restent
// ouverts : authentification, facturation, onboarding, support, dépôt public de
// pièces et toutes les routes publiques.
const { requireActiveSubscription } = require('./src/middleware/subscriptionGuard')
const PREFIXES_ECRITURE_SOUS_ESSAI = [
  '/api/clients', '/api/taches', '/api/documents', '/api/document-inbox',
  '/api/contrats', '/api/contracts', '/api/devis', '/api/kanban',
  '/api/automations', '/api/commissions', '/api/signatures', '/api/reach',
  '/api/financing', '/api/objectifs',
]
const EXEMPTIONS_ECRITURE = ['/api/document-inbox/public']

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
  const chemin = String(req.originalUrl || '').split('?')[0]
  if (EXEMPTIONS_ECRITURE.some((p) => chemin.startsWith(p))) return next()
  const concerne = PREFIXES_ECRITURE_SOUS_ESSAI.some((p) => chemin === p || chemin.startsWith(p + '/'))
  if (!concerne) return next()
  return requireActiveSubscription(req, res, next)
})

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
// Les longueurs des champs clients sont contrôlées AVANT la base : une valeur
// trop longue répond 400 en nommant le champ, au lieu d'un 500 SQL
// « value too long for type character varying(100) » (Red Team P1 #4).
const { limiterLongueurs, LIMITES_CLIENTS } = require('./src/middleware/validationChamps')
app.use('/api/clients',         limiterLongueurs(LIMITES_CLIENTS), verifyToken, clientsRouter)
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
// Les routes /api/document-inbox/public/* doivent rester accessibles au CLIENT
// (lien d'upload envoyé par e-mail) : c'est le routeur qui protège le reste.
app.use('/api/document-inbox', documentInboxRouter)
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

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK PUBLIC DE TÉLÉPHONIE — MONTÉ **AVANT** LE PRÉFIXE PROTÉGÉ
//
// POURQUOI CETTE POSITION (P1 IA-018, mesuré en production le 20/09/2026)
// `app.use('/api/voice', verifyToken, voiceRouter)` capture TOUT `/api/voice/*`,
// y compris `/api/voice/webhook`, et répondait 401 « En-tête d'authentification
// manquant » à l'opérateur d'appels : le webhook public écrit dans
// killerFeatures2.js était INATTEIGNABLE (4 lignes plus bas, jamais exécutées).
// Express évalue les montages dans l'ordre de déclaration : celui du webhook est
// donc placé ici, avant le préfixe protégé. Sans secret configuré il répond 503
// (jamais un secret par défaut) ; avec un secret configuré, un en-tête faux
// répond 401.
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/voice/webhook', require('./src/routes/killerFeatures2').webhookVoicePublic)
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

// LOT FEATURES KILLERS — F1..F6 (auth gérée dans les routers)
app.use('/api/ark-intelligence',  arkIntelligenceRouter)
app.use('/api/comparator-engine', comparatorEngineRouter)
app.use('/api',                   objectifsAdvancedRouter)   // /objectifs/* + /commissions/dashboard
app.use('/api/conformite',        conformiteRouter)
app.use('/api',                 require('./src/routes/killerFeatures2'))  // Vague 2: Voice + Email + DDA

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
  // Chemin réfléchi BORNÉ (mesure du 21/09/2026) : au-delà d'environ 260
  // caractères, le corps JSON dépassait la longueur maximale admise par le
  // filtre anti-fuite, qui le remplaçait alors par le message générique — la
  // réponse perdait son contrat JSON sur une simple URL inconnue, et l'appelant
  // ne pouvait plus distinguer « route inconnue » d'une panne serveur.
  // On tronque donc ce qu'on renvoie, et on le dit.
  const complet = String(req.originalUrl || '')
  const borne = 180
  const corps = { error: 'Route non trouvée' }
  corps.path = complet.length > borne ? `${complet.slice(0, borne)}…` : complet
  if (complet.length > borne) corps.path_tronque = true
  res.status(404).json(corps)
})

app.use((err, req, res, next) => {
  // ── CORPS JSON MAL FORMÉ (mesure du 21/09/2026) ────────────────────────────
  // Express répondait `{"error":"Erreur serveur","details":"Expected property
  // name or '}' in JSON at position 1 (line 1 column 2)"}` : le bon code HTTP
  // (400) mais un message technique EN ANGLAIS, qui décrit l'analyseur interne.
  // Un corps illisible est une erreur de la DEMANDE : 400, message produit.
  if (err && err.type === 'entity.parse.failed') {
    logger.warn({ path: req.originalUrl, method: req.method }, 'corps JSON illisible')
    return res.status(400).json({
      error: 'corps_json_invalide',
      message: "Le corps de la requête n'est pas un JSON valide.",
    })
  }
  logger.error({ err, path: req.originalUrl, method: req.method }, 'Erreur non gérée')
  captureException(err, { path: req.originalUrl, method: req.method, userId: req.user?.id || req.user?.userId })
  res.status(err.status || 500).json({ error: 'Erreur serveur', details: messagePublic(err, { statut: err.status || 500 }) })
})

// ── DERNIER RECOURS : middleware/errorHandler.js (défaut P4 SEC-030b) ────────
// Mesure du 21/09/2026 : ce fichier existait depuis l'origine et n'était monté
// NULLE PART — tout passait par le gestionnaire global ci-dessus, ou par celui
// d'Express quand celui-ci ne répondait pas.
//
// POURQUOI ICI, ET PAS À LA PLACE DU GESTIONNAIRE GLOBAL : Express appelle les
// gestionnaires d'erreur DANS L'ORDRE de déclaration et s'arrête au premier qui
// répond. Monté après, ce gestionnaire ne masque donc AUCUN comportement
// existant : la traduction des erreurs d'entrée (`corps_json_invalide`), le
// message produit et le filtrage des messages d'infrastructure
// (`lib/erreursPubliques`) du gestionnaire global restent ceux qui répondent.
// Il ferme ce qui restait réellement ouvert : si le gestionnaire global lève à
// son tour (journal ou filtre en panne, écriture de réponse impossible), la
// requête tombait dans le gestionnaire PAR DÉFAUT d'Express — celui qui renvoie
// la pile d'appels et les chemins du serveur. Ici, la réponse reste un 500
// produit, sans pile ni chemin, et un en-tête déjà envoyé n'est jamais réécrit.
const errorHandler = require('./src/middleware/errorHandler')
app.use(errorHandler)

// ==================== SERVER START ====================

const PORT = process.env.PORT || 10000
console.log('⚡ COURTIA Backend — ARK Enabled')
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log('COURTIA backend port ' + PORT)
  // ─── Workers asynchrones LOT F3/F8 ────────────────────────────
  try {
    const { startWorker: startDevisRelances } = require('./src/services/devisRelanceService')
    startDevisRelances() // 1h
  } catch (e) { logger.warn({ err: e.message }, 'devis relance worker boot') }
  try {
    const { startWorker: startReachWorker } = require('./src/services/reachSequenceWorker')
    startReachWorker() // 15 min
  } catch (e) { logger.warn({ err: e.message }, 'reach sequence worker boot') }
})
