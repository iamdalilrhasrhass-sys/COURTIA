#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PREVIEW_URL = process.env.PREVIEW_URL || process.argv[2]

if (!PREVIEW_URL) {
  console.error('Usage: PREVIEW_URL=https://... node backend/scripts/preview-smoke-playwright.js')
  process.exit(2)
}

function parsePreviewInput(inputUrl) {
  const parsed = new URL(inputUrl)
  const hasShareToken = parsed.searchParams.has('_vercel_share')
  return {
    baseUrl: `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`,
    bootstrapShareUrl: hasShareToken ? inputUrl : null,
  }
}

const PREVIEW_CONFIG = parsePreviewInput(PREVIEW_URL)
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

const networkRequests = []
const networkResponses = []
const doubleApiRequests = []
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
    networkResponses.push({
      scope,
      method: req.method(),
      url: response.url(),
      status: response.status(),
    })
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
  const costsVisible =
    await page.getByText('Tableau de bord Coûts IA', { exact: false }).first().isVisible().catch(() => false) ||
    await page.getByText('Coûts IA ARK', { exact: false }).first().isVisible().catch(() => false)

  const result = {
    route,
    account: accountKey,
    currentUrl: page.url(),
    redirectedToDashboard,
    forbidden,
    granted: costsVisible || (pathname.startsWith('/admin') && !forbidden),
  }

  routeChecks.push({ route: `${route} (${accountKey})`, ok: !redirectedToDashboard, details: redirectedToDashboard ? 'Unexpected redirect to /dashboard' : '', currentUrl: page.url() })

  if (redirectedToDashboard) {
    recordFailure(`admin:${route}:${accountKey}`, 'Route redirects to /dashboard (should be explicit admin grant/deny)')
  } else {
    recordInfo(`admin:${route}:${accountKey}`, `Outcome: ${forbidden ? 'forbidden' : result.granted ? 'granted' : 'unknown'}`)
  }
}

async function logout(page) {
  await page.goto(`${normalizeBase(PREVIEW_BASE_URL)}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)
  const logoutBtn = page.locator('button[title="Déconnexion"]').first()
  const visible = await logoutBtn.isVisible().catch(() => false)
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
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await desktop.newPage()
    attachObservers(page, 'desktop')

    if (PREVIEW_CONFIG.bootstrapShareUrl) {
      await page.goto(PREVIEW_CONFIG.bootstrapShareUrl, { waitUntil: 'domcontentloaded' })
      await waitForAppIdle(page)
      recordInfo('vercel-share', 'Bootstrap share URL visited to set auth cookie')
    }

    await login(page, 'e2e')

    await checkRoute(page, '/dashboard', ['Tableau de bord'])
    await checkRoute(page, '/clients', ['Clients'])
    await checkClientBubbleFlow(page)
    await checkRoute(page, '/rapports', ['Rapports'], { absentText: 'Impossible de charger les statistiques' })
    await checkRoute(page, '/morning-brief', ['Morning Brief'])
    await checkRoute(page, '/parametres', ['Paramètres'])
    await checkRoute(page, '/taches', ['Tâches'])
    await checkRoute(page, '/contrats', ['Contrats'])

    await runResponsiveChecks(page)

    await classifyAdminAccess(page, '/admin', 'e2e')
    await classifyAdminAccess(page, '/admin/costs', 'e2e')
    await logout(page)
    let dalilLogged = false
    try {
      await login(page, 'dalil')
      dalilLogged = true
    } catch (err) {
      recordFailure('login:dalil', err?.message || 'Dalil login failed')
    }

    if (dalilLogged) {
      await classifyAdminAccess(page, '/admin', 'dalil')
      await classifyAdminAccess(page, '/admin/costs', 'dalil')
    } else {
      routeChecks.push({ route: '/admin (dalil)', ok: false, details: 'Skipped: dalil login failed', currentUrl: page.url() })
      routeChecks.push({ route: '/admin/costs (dalil)', ok: false, details: 'Skipped: dalil login failed', currentUrl: page.url() })
    }

    await desktop.close()

    if (doubleApiRequests.length > 0) {
      recordFailure('network', `Detected ${doubleApiRequests.length} request(s) containing /api/api`)
    } else {
      recordInfo('network', 'No /api/api request detected')
    }

    const report = {
      previewUrl: base,
      startedAt,
      finishedAt: new Date().toISOString(),
      summary: {
        failures: findings.filter((f) => f.level === 'error').length,
        doubleApiRequests: doubleApiRequests.length,
        consoleIssues: consoleIssues.length,
        networkErrors: networkResponses.filter((r) => r.status >= 400).length,
      },
      findings,
      routeChecks,
      responsiveChecks,
      doubleApiRequests,
      consoleIssues,
      networkErrors: networkResponses.filter((r) => r.status >= 400),
      sampledApiHosts: Array.from(new Set(networkRequests
        .map((r) => {
          try { return new URL(r.url).origin } catch { return null }
        })
        .filter(Boolean))),
    }

    const outDir = path.resolve(__dirname, '..', 'test-results')
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, 'preview-smoke-report.json')
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2))

    console.log(JSON.stringify(report, null, 2))
    console.log(`\nReport saved: ${outFile}`)

    const hasFailures = report.summary.failures > 0
    process.exit(hasFailures ? 1 : 0)
  } catch (err) {
    console.error('Smoke run failed:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

main()
