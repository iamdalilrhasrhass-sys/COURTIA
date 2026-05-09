#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function loadPlaywright() {
  try {
    return require('playwright')
  } catch {
    const fallback = path.resolve(__dirname, '../../../backend/node_modules/playwright')
    return require(fallback)
  }
}

const { chromium } = loadPlaywright()

const BASE_URL = String(
  process.env.COURTIA_URL ||
  process.env.PREVIEW_URL ||
  process.env.PROD_URL ||
  'https://courtia.vercel.app'
).replace(/\/+$/, '')

const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e@courtia.fr'
const DALIL_EMAIL = process.env.DALIL_EMAIL || 'dalil@repairebrise.fr'
const DALIL_PASSWORD = process.env.DALIL_PASSWORD || 'pass123'

const outDir = path.resolve(__dirname, '../assets/screenshots')

const CAPTURE_PRESETS = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'mobile', width: 390, height: 844 },
  { key: 'vertical', width: 1080, height: 1920 },
]

function uniqueCredentials(candidates) {
  const seen = new Set()
  return candidates.filter(({ email, password }) => {
    const key = `${email}::${password}`
    if (!email || !password || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const E2E_CREDENTIAL_CANDIDATES = uniqueCredentials([
  { email: E2E_EMAIL, password: process.env.E2E_PASSWORD },
  { email: E2E_EMAIL, password: 'Password123!' },
  { email: E2E_EMAIL, password: 'courtia2026' },
  { email: E2E_EMAIL, password: 'TestE2E2026!' },
])

async function waitForAppIdle(page) {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  } catch {
    // Some pages continue polling; domcontentloaded is enough for captures.
  }
}

async function gotoRoute(page, route) {
  const url = route.startsWith('http') ? route : `${BASE_URL}${route}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForAppIdle(page)
  await page.waitForTimeout(600)
}

async function capturePreset(page, baseName, preset, files) {
  await page.setViewportSize({ width: preset.width, height: preset.height })
  await page.waitForTimeout(250)

  const fileName = `${baseName}-${preset.key}.png`
  const filePath = path.join(outDir, fileName)

  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: 'disabled',
  })

  files.push(fileName)

  if (preset.key === 'vertical') {
    const canonicalPath = path.join(outDir, `${baseName}.png`)
    fs.copyFileSync(filePath, canonicalPath)
    files.push(`${baseName}.png`)
  }
}

async function captureAllFormats(page, baseName, files) {
  for (const preset of CAPTURE_PRESETS) {
    await capturePreset(page, baseName, preset, files)
  }
}

async function login(page, email, password) {
  await gotoRoute(page, '/login')
  await page.waitForSelector('input[type="email"]', { timeout: 30000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  const submit = page.getByRole('button', { name: /ouvrir mon cockpit|connexion|se connecter/i }).first()
  await submit.click()
  await page.waitForTimeout(1200)

  const deadline = Date.now() + 25000
  while (Date.now() < deadline) {
    const pathname = new URL(page.url()).pathname
    if (pathname !== '/login') break
    await page.waitForTimeout(300)
  }

  if (page.url().includes('/login')) {
    const errorText = await page.locator('.auth-error').first().textContent().catch(() => '')
    throw new Error(`Login failed for ${email}: ${errorText || 'still on /login'}`)
  }
}

async function loginWithFallback(page, credentials) {
  let lastError = null
  for (const credential of credentials) {
    try {
      await login(page, credential.email, credential.password)
      return credential
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('No credential worked')
}

async function logout(page) {
  const logoutButton = page.locator('button[title="Déconnexion"]').first()
  if (await logoutButton.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/login/i, { timeout: 12000 }).catch(() => null),
      logoutButton.click(),
    ])
    await page.waitForTimeout(400)
  }
}

async function openFirstClientDetail(page) {
  await gotoRoute(page, '/clients')

  const bubbleAction = page.getByText('Action ARK', { exact: false }).first()
  if (await bubbleAction.isVisible().catch(() => false)) {
    await bubbleAction.click().catch(() => null)
    await page.waitForURL(/\/(clients|client)\/\d+/, { timeout: 12000 }).catch(() => null)
  }

  let pathname = new URL(page.url()).pathname
  if (!/\/(clients|client)\/\d+/.test(pathname)) {
    const firstClientLink = page.locator('a[href*="/clients/"]').first()
    if (await firstClientLink.isVisible().catch(() => false)) {
      await firstClientLink.click().catch(() => null)
      await page.waitForURL(/\/clients\/\d+/, { timeout: 10000 }).catch(() => null)
    }
  }

  pathname = new URL(page.url()).pathname
  if (!/\/(clients|client)\/\d+/.test(pathname)) {
    await gotoRoute(page, '/clients/40')
  }

  await waitForAppIdle(page)
}

async function openIntegrationsSection(page) {
  await gotoRoute(page, '/parametres/integrations')

  const inIntegrationsRoute = /\/parametres(?:\/integrations)?/.test(new URL(page.url()).pathname)
  if (!inIntegrationsRoute) {
    await gotoRoute(page, '/parametres')
  }

  const anchor = page.getByText(/google agenda|google calendar|whats ?app|gmail|outlook|intégrations/i).first()
  if (await anchor.isVisible().catch(() => false)) {
    await anchor.scrollIntoViewIfNeeded().catch(() => null)
    await page.waitForTimeout(400)
  }
}

async function captureRoute(page, route, baseName, files) {
  await gotoRoute(page, route)
  await captureAllFormats(page, baseName, files)
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })

  const files = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  let e2eCredential = null

  try {
    await captureRoute(page, '/', 'landing-home', files)
    await captureRoute(page, '/login', 'login', files)

    e2eCredential = await loginWithFallback(page, E2E_CREDENTIAL_CANDIDATES)

    await captureRoute(page, '/dashboard', 'dashboard', files)
    await captureRoute(page, '/clients', 'clients', files)

    await openFirstClientDetail(page)
    await captureAllFormats(page, 'client-detail', files)

    await captureRoute(page, '/contrats', 'contrats', files)
    await captureRoute(page, '/taches', 'taches', files)
    await captureRoute(page, '/rapports', 'rapports', files)
    await captureRoute(page, '/morning-brief', 'morning-brief', files)
    await captureRoute(page, '/parametres', 'parametres', files)

    await openIntegrationsSection(page)
    await captureAllFormats(page, 'integrations', files)

    await logout(page)

    await login(page, DALIL_EMAIL, DALIL_PASSWORD)
    await captureRoute(page, '/admin', 'admin', files)
    await captureRoute(page, '/admin/costs', 'admin-costs', files)
    await logout(page)

    console.log(JSON.stringify({
      success: true,
      baseUrl: BASE_URL,
      outputDirectory: outDir,
      e2eCredentialUsed: e2eCredential,
      files: Array.from(new Set(files)).sort(),
    }, null, 2))
  } catch (err) {
    console.error('capture-app-screenshots failed:', err.message)
    process.exitCode = 1
  } finally {
    await context.close()
    await browser.close()
  }
}

main()
