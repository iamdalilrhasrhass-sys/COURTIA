#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const TARGET_URL = process.env.PREVIEW_URL || process.env.PROD_URL || process.argv[2]

if (!TARGET_URL) {
  console.error('Usage: PREVIEW_URL=https://... or PROD_URL=https://... node backend/scripts/preview-smoke-playwright.js')
  process.exit(2)
}

const RUN_MODE = process.env.PROD_URL ? 'prod' : 'preview'
const ENABLE_GROWTH_LEADS_SMOKE = String(process.env.SMOKE_GROWTH_LEADS || '').trim() === '1'

function parsePreviewInput(inputUrl) {
  const parsed = new URL(inputUrl)
  const hasBootstrapQuery =
    parsed.searchParams.has('_vercel_share') ||
    parsed.searchParams.has('x-vercel-protection-bypass') ||
    parsed.searchParams.has('x-vercel-set-bypass-cookie')
  const bypassSecret = (parsed.searchParams.get('x-vercel-protection-bypass') || process.env.VERCEL_PROTECTION_BYPASS || '').trim()
  const bypassCookieMode = (
    parsed.searchParams.get('x-vercel-set-bypass-cookie') ||
    process.env.VERCEL_SET_BYPASS_COOKIE ||
    (bypassSecret ? 'true' : '')
  ).trim()
  let bootstrapShareUrl = null
  if (hasBootstrapQuery || bypassSecret) {
    const bootstrap = new URL(inputUrl)
    if (bypassSecret && !bootstrap.searchParams.has('x-vercel-protection-bypass')) {
      bootstrap.searchParams.set('x-vercel-protection-bypass', bypassSecret)
    }
    if (bypassSecret && !bootstrap.searchParams.has('x-vercel-set-bypass-cookie')) {
      bootstrap.searchParams.set('x-vercel-set-bypass-cookie', bypassCookieMode || 'true')
    }
    bootstrapShareUrl = bootstrap.toString()
  }
  return {
    baseUrl: `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`,
    bootstrapShareUrl,
    bypassSecret,
    bypassCookieMode,
  }
}

const PREVIEW_CONFIG = parsePreviewInput(TARGET_URL)
const PREVIEW_BASE_URL = PREVIEW_CONFIG.baseUrl

const ACCOUNTS = {
  e2e: {
    email: process.env.E2E_EMAIL || 'e2e@courtia.fr',
    password: process.env.E2E_PASSWORD || 'courtia2026',
  },
  dalil: {
    email: process.env.DALIL_EMAIL || 'dalil@repairebrise.fr',
    password: process.env.DALIL_PASSWORD || 'pass123',
  },
}
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'owner', 'manager'])

const networkRequests = []
const networkResponses = []
const doubleApiRequests = []
const authMe429Responses = []
const authLogin429Responses = []
const consoleIssues = []
const findings = []
const routeChecks = []
const responsiveChecks = []

function normalizeBase(url) {
  return String(url || '').replace(/\/+$/, '')
}

function recordFailure(scope, message) {
  findings.push({ level: 'error', scope, message })
}

function recordInfo(scope, message) {
  findings.push({ level: 'info', scope, message })
}

function buildReport(base, startedAt) {
  const networkErrors = networkResponses.filter((r) => r.status >= 400)
  return {
    previewUrl: base,
    runMode: RUN_MODE,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary: {
      failures: findings.filter((f) => f.level === 'error').length,
      doubleApiRequests: doubleApiRequests.length,
      authMe429Responses: authMe429Responses.length,
      authLogin429Responses: authLogin429Responses.length,
      consoleIssues: consoleIssues.length,
      networkErrors: networkErrors.length,
    },
    findings,
    routeChecks,
    responsiveChecks,
    doubleApiRequests,
    authMe429Responses,
    authLogin429Responses,
    consoleIssues,
    networkErrors,
    sampledApiHosts: Array.from(new Set(networkRequests
      .map((r) => {
        try { return new URL(r.url).origin } catch { return null }
      })
      .filter(Boolean))),
  }
}

function writeReport(report) {
  const outDir = path.resolve(__dirname, '..', 'test-results')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `${RUN_MODE}-smoke-report.json`)
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2))
  return outFile
}

function attachObservers(page, scope) {
  page.on('request', (request) => {
    const url = request.url()
    networkRequests.push({ scope, method: request.method(), url })
    if (url.includes('/api/api')) {
      doubleApiRequests.push({ scope, method: request.method(), url })
    }
  })

  page.on('response', async (response) => {
    const req = response.request()
    const url = response.url()
    const status = response.status()
    networkResponses.push({
      scope,
      method: req.method(),
      url,
      status,
    })
    if (status === 429) {
      if (url.includes('/api/auth/me')) {
        authMe429Responses.push({ scope, method: req.method(), url, status })
      }
      if (url.includes('/api/auth/login')) {
        authLogin429Responses.push({ scope, method: req.method(), url, status })
      }
    }
  })

  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      consoleIssues.push({ scope, type, text: msg.text() })
    }
  })

  page.on('pageerror', (err) => {
    consoleIssues.push({ scope, type: 'pageerror', text: String(err?.message || err) })
  })
}

async function waitForAppIdle(page) {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 12000 })
  } catch {
    // Some pages keep background polling; DOM readiness is enough for smoke checks.
  }
}

async function login(page, accountKey) {
  const account = ACCOUNTS[accountKey]
  const scope = `login:${accountKey}`
  await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 30000 })
  await page.locator('input[type="email"]').fill(account.email)
  await page.locator('input[type="password"]').first().fill(account.password)

  const submit = page.getByRole('button', { name: /ouvrir mon cockpit|connexion|se connecter/i }).first()
  await Promise.all([
    submit.click(),
    page.waitForTimeout(1200),
  ])
  await waitForAppIdle(page)

  if (page.url().includes('/login')) {
    const errorText = await page.locator('.auth-error').first().textContent().catch(() => '')
    throw new Error(`Login failed (${accountKey}): ${errorText || 'still on /login'}`)
  }

  const token = await page.evaluate(() => localStorage.getItem('courtia_token') || localStorage.getItem('token'))
  if (!token) {
    throw new Error(`Login failed (${accountKey}): token missing in localStorage`)
  }

  recordInfo(scope, `Logged in at ${page.url()}`)
}

async function checkCurrentRole(page, accountKey) {
  const scope = `role:${accountKey}`
  const role = await page.evaluate(async () => {
    const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
    if (!token) return null
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const payload = await res.json()
      return String(payload?.role || '').toLowerCase()
    } catch {
      return null
    }
  })

  if (!role) {
    recordFailure(scope, 'Unable to resolve current role via /api/auth/me')
    return null
  }

  recordInfo(scope, `Resolved role: ${role}`)
  return role
}

async function checkRoute(page, route, expectedMarkers = [], options = {}) {
  const url = `${normalizeBase(PREVIEW_BASE_URL)}${route}`
  const check = { route, ok: true, details: '' }
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)

  if (options.failIfRedirectToDashboard && /\/dashboard(?:\?|$)/.test(new URL(page.url()).pathname)) {
    check.ok = false
    check.details = `Unexpected redirect to /dashboard from ${route}`
  }

  for (const marker of expectedMarkers) {
    const found = await page.getByText(marker, { exact: false }).first().isVisible().catch(() => false)
    if (!found) {
      check.ok = false
      check.details = `Marker not found on ${route}: "${marker}"`
      break
    }
  }

  if (options.forbiddenText) {
    const hasForbidden = await page.getByText(options.forbiddenText, { exact: false }).first().isVisible().catch(() => false)
    if (!hasForbidden) {
      check.ok = false
      check.details = `Expected forbidden message missing on ${route}`
    }
  }

  if (options.absentText) {
    const present = await page.getByText(options.absentText, { exact: false }).first().isVisible().catch(() => false)
    if (present) {
      check.ok = false
      check.details = `Unexpected error text on ${route}: "${options.absentText}"`
    }
  }

  routeChecks.push({ ...check, currentUrl: page.url() })
  if (!check.ok) {
    recordFailure(`route:${route}`, check.details)
  }
}

async function checkClientBubbleFlow(page) {
  const scope = 'clients:bubble-flow'
  await checkRoute(page, '/clients', ['Clients'])

  const bubbleSignal = page.getByText('Action ARK', { exact: false }).first()
  const hasBubble = await bubbleSignal.isVisible().catch(() => false)
  if (!hasBubble) {
    recordFailure(scope, 'No bubble card with "Action ARK" found')
    return
  }

  await bubbleSignal.click()
  await page.waitForURL(/\/(clients|client)\/\d+/, { timeout: 15000 }).catch(() => null)
  await waitForAppIdle(page)

  const currentPath = new URL(page.url()).pathname
  const onClientDetail = /\/(clients|client)\/\d+/.test(currentPath)
  if (!onClientDetail) {
    recordFailure(scope, `Bubble click did not navigate to client detail. Current URL: ${page.url()}`)
    return
  }

  const hasClientMissing = await page.getByText('Client introuvable', { exact: false }).first().isVisible().catch(() => false)
  if (hasClientMissing) {
    recordFailure(scope, 'Client detail shows "Client introuvable" after bubble click')
  } else {
    recordInfo(scope, `Client detail opened: ${page.url()}`)
  }

  const idMatch = currentPath.match(/\/(?:clients|client)\/(\d+)/)
  const clientId = idMatch ? idMatch[1] : null
  if (!clientId) {
    recordFailure(scope, 'Unable to extract client id from detail URL')
    return
  }

  await page.getByRole('button', { name: 'Contrats' }).first().click().catch(() => null)
  await waitForAppIdle(page)
  await page.getByRole('button', { name: 'Tâches' }).first().click().catch(() => null)
  await waitForAppIdle(page)

  const timelineErrorVisible = await page.getByText('Impossible de charger la timeline interactions', { exact: false }).first().isVisible().catch(() => false)
  if (timelineErrorVisible) {
    recordFailure(scope, 'Client timeline interactions failed to load')
  }
}

async function checkIntegrationsPanel(page) {
  const scope = 'integrations:panel'
  await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}/parametres`, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)

  const markers = ['Google Agenda', 'WhatsApp Business', 'Gmail', 'Outlook']
  for (const marker of markers) {
    const visible = await page.getByText(marker, { exact: false }).first().isVisible().catch(() => false)
    if (!visible) {
      recordFailure(scope, `Integration marker missing: ${marker}`)
      return
    }
  }

  const stateMarkers = ['Configuration requise', 'Non connecté', 'Connecté']
  let hasState = false
  for (const marker of stateMarkers) {
    const visible = await page.getByText(marker, { exact: false }).first().isVisible().catch(() => false)
    if (visible) {
      hasState = true
      break
    }
  }

  if (!hasState) {
    recordFailure(scope, 'No integration state label detected')
  }
}

async function classifyAdminAccess(page, route, accountKey) {
  await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}${route}`, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)

  const pathname = new URL(page.url()).pathname
  const redirectedToDashboard = pathname === '/dashboard'
  const forbidden =
    await page.getByText('Accès administrateur requis', { exact: false }).first().isVisible().catch(() => false) ||
    await page.getByText('Admin Center protégé', { exact: false }).first().isVisible().catch(() => false) ||
    await page.getByText('Accès refusé', { exact: false }).first().isVisible().catch(() => false)
  const expectedGrantMarkers = {
    '/admin': ['Vue d\'ensemble', 'MRR par plan', 'Administration'],
    '/admin/costs': ['Tableau de bord Coûts IA', 'Coûts IA ARK'],
    '/admin/growth-leads': ['Growth Leads', 'Leads total', 'Demandes de démo'],
  }
  const markers = expectedGrantMarkers[route] || []
  let grantMarkerVisible = false
  for (const marker of markers) {
    const visible = await page.getByText(marker, { exact: false }).first().isVisible().catch(() => false)
    if (visible) {
      grantMarkerVisible = true
      break
    }
  }

  const result = {
    route,
    account: accountKey,
    currentUrl: page.url(),
    redirectedToDashboard,
    forbidden,
    granted: pathname.startsWith(route) && !forbidden && grantMarkerVisible,
    grantMarkerVisible,
  }
  const unknown = !redirectedToDashboard && !forbidden && !result.granted
  routeChecks.push({
    route: `${route} (${accountKey})`,
    ok: !redirectedToDashboard && !unknown,
    details: redirectedToDashboard
      ? 'Unexpected redirect to /dashboard'
      : unknown
        ? `Unable to classify access on ${route}: no forbidden marker and no expected admin marker`
        : '',
    currentUrl: page.url(),
  })

  if (redirectedToDashboard) {
    recordFailure(`admin:${route}:${accountKey}`, 'Route redirects to /dashboard (should be explicit admin grant/deny)')
  } else if (unknown) {
    recordFailure(`admin:${route}:${accountKey}`, `Unknown access state on ${route}`)
  } else {
    recordInfo(`admin:${route}:${accountKey}`, `Outcome: ${forbidden ? 'forbidden' : 'granted'}`)
  }

  return result
}

async function logout(page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)

  let logoutBtn = page.locator('button[title="Déconnexion"]').first()
  let visible = await logoutBtn.isVisible().catch(() => false)

  if (!visible) {
    const burger = page.locator('button[aria-label="Ouvrir le menu"]').first()
    const burgerVisible = await burger.isVisible().catch(() => false)
    if (burgerVisible) {
      await burger.click().catch(() => null)
      await waitForAppIdle(page)
      logoutBtn = page.locator('button[title="Déconnexion"]').first()
      visible = await logoutBtn.isVisible().catch(() => false)
    }
  }

  if (!visible) {
    recordFailure('logout', 'Logout button not visible in sidebar')
    return
  }

  await logoutBtn.click()
  await page.waitForURL(/\/login(?:\?|$)/, { timeout: 15000 }).catch(() => null)
  const onLogin = /\/login(?:\?|$)/.test(new URL(page.url()).pathname + new URL(page.url()).search)
  if (!onLogin) {
    recordFailure('logout', `Logout did not redirect to /login. Current URL: ${page.url()}`)
  }
}

async function runResponsiveChecks(page) {
  const scenarios = [
    { label: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
    { label: 'laptop', viewport: { width: 1280, height: 800 }, mobile: false },
    { label: 'tablet', viewport: { width: 834, height: 1112 }, mobile: false },
    { label: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
  ]

  for (const scenario of scenarios) {
    await page.setViewportSize(scenario.viewport)
    await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}/dashboard`, { waitUntil: 'domcontentloaded' })
    await waitForAppIdle(page)

    if (scenario.mobile) {
      const burgerVisible = await page.locator('button[aria-label="Ouvrir le menu"]').first().isVisible().catch(() => false)
      if (!burgerVisible) {
        recordFailure(`responsive:${scenario.label}`, 'Mobile menu button not visible')
        responsiveChecks.push({ label: scenario.label, ok: false, currentUrl: page.url() })
        continue
      }
      await page.locator('button[aria-label="Ouvrir le menu"]').first().click()
      await page.getByRole('button', { name: 'Clients' }).first().click().catch(() => null)
      await page.waitForURL(/\/clients(?:\?|$)/, { timeout: 15000 }).catch(() => null)
    } else {
      const clientsNavVisible = await page.getByRole('button', { name: 'Clients' }).first().isVisible().catch(() => false)
      if (!clientsNavVisible) {
        recordFailure(`responsive:${scenario.label}`, 'Sidebar nav "Clients" not visible')
        responsiveChecks.push({ label: scenario.label, ok: false, currentUrl: page.url() })
        continue
      }
      await page.getByRole('button', { name: 'Clients' }).first().click()
      await page.waitForURL(/\/clients(?:\?|$)/, { timeout: 15000 }).catch(() => null)
    }

    const clientsReached = /\/clients(?:\/|$|\?)/.test(new URL(page.url()).pathname + new URL(page.url()).search)
    responsiveChecks.push({ label: scenario.label, ok: clientsReached, currentUrl: page.url() })
    if (!clientsReached) {
      recordFailure(`responsive:${scenario.label}`, 'Could not reach /clients via responsive navigation')
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const base = normalizeBase(PREVIEW_BASE_URL)
  const startedAt = new Date().toISOString()

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await desktop.newPage()
    attachObservers(page, 'desktop')
    if (PREVIEW_CONFIG.bypassSecret) {
      const origin = new URL(PREVIEW_BASE_URL).origin
      await page.route('**/*', async (route) => {
        const reqUrl = route.request().url()
        if (!reqUrl.startsWith(origin)) {
          await route.continue()
          return
        }
        await route.continue({
          headers: {
            ...route.request().headers(),
            'x-vercel-protection-bypass': PREVIEW_CONFIG.bypassSecret,
            'x-vercel-set-bypass-cookie': PREVIEW_CONFIG.bypassCookieMode || 'true',
          },
        })
      })
    }

    if (PREVIEW_CONFIG.bootstrapShareUrl) {
      await page.goto(PREVIEW_CONFIG.bootstrapShareUrl, { waitUntil: 'domcontentloaded' })
      await waitForAppIdle(page)
      recordInfo('vercel-share', 'Bootstrap URL visited with deployment protection bypass')
    }

    await checkRoute(page, '/', ['Le cockpit IA des courtiers en assurance', 'Demander une démo'])
    await checkRoute(page, '/demo', ['Réserver ma démo'])
    await checkRoute(page, '/tarifs', ['Tarifs COURTIA'])

    await login(page, 'e2e')

    await checkRoute(page, '/dashboard', ['Tableau de bord'])
    await checkRoute(page, '/clients', ['Clients'])
    await checkClientBubbleFlow(page)
    await checkRoute(page, '/rapports', ['Rapports'], { absentText: 'Impossible de charger les statistiques' })
    await checkRoute(page, '/morning-brief', ['Morning Brief'])
    await checkRoute(page, '/parametres', ['Paramètres', 'Intégrations'])
    await checkIntegrationsPanel(page)
    await checkRoute(page, '/taches', ['Tâches'])
    await checkRoute(page, '/contrats', ['Contrats'])
    await checkRoute(page, '/billing', ['Statut abonnement', 'Plans disponibles'])
    await checkRoute(page, '/onboarding', ['Onboarding cabinet'])
    await checkRoute(page, '/import', ['Import portefeuille V1'])
    await checkRoute(page, '/route-inconnue-courtia', ['Page introuvable'])

    await runResponsiveChecks(page)

    const e2eChecks = [
      await classifyAdminAccess(page, '/admin', 'e2e'),
      await classifyAdminAccess(page, '/admin/costs', 'e2e'),
    ]
    if (ENABLE_GROWTH_LEADS_SMOKE) {
      e2eChecks.push(await classifyAdminAccess(page, '/admin/growth-leads', 'e2e'))
    }
    for (const check of e2eChecks) {
      if (check && !check.forbidden) {
        recordFailure(`admin:${check.route}:e2e`, 'Expected non-admin forbidden access')
      }
    }
    await logout(page)
    let dalilLogged = false
    try {
      await login(page, 'dalil')
      dalilLogged = true
    } catch (err) {
      recordInfo('login:dalil', `Dalil login not validated in this run: ${err?.message || 'login failed'}`)
    }

    if (dalilLogged) {
      const dalilRole = await checkCurrentRole(page, 'dalil')
      if (!ADMIN_ROLES.has(String(dalilRole || '').toLowerCase())) {
        recordFailure('role:dalil', `Expected admin-level role, got "${dalilRole || 'unknown'}"`)
      }
      const dalilChecks = [
        await classifyAdminAccess(page, '/admin', 'dalil'),
        await classifyAdminAccess(page, '/admin/costs', 'dalil'),
      ]
      if (ENABLE_GROWTH_LEADS_SMOKE) {
        dalilChecks.push(await classifyAdminAccess(page, '/admin/growth-leads', 'dalil'))
      }
      for (const check of dalilChecks) {
        if (check && !check.granted) {
          recordFailure(`admin:${check.route}:dalil`, 'Expected admin-level granted access')
        }
      }
      await logout(page)
    } else {
      routeChecks.push({ route: '/admin (dalil)', ok: false, details: 'Skipped: dalil login failed', currentUrl: page.url() })
      routeChecks.push({ route: '/admin/costs (dalil)', ok: false, details: 'Skipped: dalil login failed', currentUrl: page.url() })
      if (ENABLE_GROWTH_LEADS_SMOKE) {
        routeChecks.push({ route: '/admin/growth-leads (dalil)', ok: false, details: 'Skipped: dalil login failed', currentUrl: page.url() })
      }
    }

    await desktop.close()

    if (doubleApiRequests.length > 0) {
      recordFailure('network', `Detected ${doubleApiRequests.length} request(s) containing /api/api`)
    } else {
      recordInfo('network', 'No /api/api request detected')
    }

    if (authMe429Responses.length > 0) {
      recordFailure('network:auth-me-429', `Detected ${authMe429Responses.length} 429 response(s) on /api/auth/me`)
    } else {
      recordInfo('network:auth-me-429', 'No 429 response detected on /api/auth/me')
    }

    if (authLogin429Responses.length > 0) {
      recordFailure('network:auth-login-429', `Detected ${authLogin429Responses.length} 429 response(s) on /api/auth/login`)
    } else {
      recordInfo('network:auth-login-429', 'No 429 response detected on /api/auth/login')
    }

    const criticalApiErrors = networkResponses.filter((entry) => {
      if (!entry || Number(entry.status) < 400) return false
      const url = String(entry.url || '')
      if (!url.includes('/api/')) return false
      if (entry.status === 401) return false
      if (entry.status === 403 && url.includes('/api/admin')) return false
      return true
    })
    if (criticalApiErrors.length > 0) {
      const sample = criticalApiErrors
        .slice(0, 3)
        .map((entry) => `${entry.status} ${entry.method} ${entry.url}`)
        .join(' | ')
      recordFailure('network:critical-api', `Detected ${criticalApiErrors.length} critical API error(s). Sample: ${sample}`)
    } else {
      recordInfo('network:critical-api', 'No critical API error response detected')
    }

    const report = buildReport(base, startedAt)
    const outFile = writeReport(report)

    console.log(JSON.stringify(report, null, 2))
    console.log(`\nReport saved: ${outFile}`)

    const hasFailures = report.summary.failures > 0
    process.exit(hasFailures ? 1 : 0)
  } catch (err) {
    recordFailure('smoke', err?.message || 'unexpected smoke failure')
    const report = buildReport(base, startedAt)
    const outFile = writeReport(report)
    console.error(JSON.stringify(report, null, 2))
    console.error(`\nReport saved: ${outFile}`)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

main()
