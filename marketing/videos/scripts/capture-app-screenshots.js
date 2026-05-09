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

const BASE_URL = process.env.PROD_URL || 'https://courtia.vercel.app'
const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e@courtia.fr'
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'courtia2026'
const DALIL_EMAIL = process.env.DALIL_EMAIL || 'dalil@repairebrise.fr'
const DALIL_PASSWORD = process.env.DALIL_PASSWORD || 'pass123'

const outDir = path.resolve(__dirname, '../assets/screenshots')

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 30000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  const submit = page.getByRole('button', {
    name: /ouvrir mon cockpit|connexion|se connecter/i,
  }).first()

  await submit.click()
  await page.waitForTimeout(1400)

  const deadline = Date.now() + 25000
  while (Date.now() < deadline) {
    const pathname = new URL(page.url()).pathname
    if (pathname !== '/login') break
    await page.waitForTimeout(350)
  }

  if (page.url().includes('/login')) {
    const errorText = await page.locator('.auth-error').first().textContent().catch(() => '')
    throw new Error(`Login failed: ${errorText || 'still on /login'}`)
  }
}

async function loginWithFallback(page, candidates) {
  let lastError = null
  for (const candidate of candidates) {
    try {
      await login(page, candidate.email, candidate.password)
      return candidate
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('No login candidate succeeded')
}

async function logout(page) {
  const logoutButton = page.locator('button[title="Déconnexion"]').first()
  if (await logoutButton.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/login/i, { timeout: 15000 }),
      logoutButton.click(),
    ])
  }
}

async function screenshot(page, targetPath, filename) {
  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.waitForTimeout(1200)
  await page.screenshot({
    path: path.join(outDir, filename),
    fullPage: true,
  })
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const primarySession = await loginWithFallback(page, [
      { key: 'e2e', email: E2E_EMAIL, password: E2E_PASSWORD },
      { key: 'dalil', email: DALIL_EMAIL, password: DALIL_PASSWORD },
    ])
    await screenshot(page, '/dashboard', 'dashboard.png')
    await screenshot(page, '/clients', 'clients.png')

    await page.goto(`${BASE_URL}/clients`, { waitUntil: 'networkidle' })
    let capturedClientDetail = false

    const bubbleAction = page.getByText('Action ARK', { exact: false }).first()
    if (await bubbleAction.isVisible().catch(() => false)) {
      await bubbleAction.click().catch(() => null)
      await page.waitForURL(/\/clients\/\d+/i, { timeout: 12000 }).catch(() => null)
      if (/\/clients\/\d+/.test(new URL(page.url()).pathname)) {
        await page.waitForTimeout(900)
        await page.screenshot({ path: path.join(outDir, 'client-detail.png'), fullPage: true })
        capturedClientDetail = true
      }
    }

    if (!capturedClientDetail) {
      await screenshot(page, '/clients/40', 'client-detail.png')
    }

    await screenshot(page, '/morning-brief', 'morning-brief.png')
    if (primarySession.key !== 'dalil') {
      await logout(page)
      await login(page, DALIL_EMAIL, DALIL_PASSWORD)
    }
    await screenshot(page, '/admin/costs', 'admin-costs.png')
    await logout(page)

    console.log(JSON.stringify({
      success: true,
      outputDirectory: outDir,
      files: [
        'dashboard.png',
        'clients.png',
        'client-detail.png',
        'morning-brief.png',
        'admin-costs.png',
      ],
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
