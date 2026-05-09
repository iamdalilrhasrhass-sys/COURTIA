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
const outDir = path.resolve(__dirname, '../assets/screenshots')

async function capture(page, route, viewport, filename) {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({
    path: path.join(outDir, filename),
    fullPage: true,
  })
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await capture(page, '/', { width: 1600, height: 1000 }, 'landing-desktop.png')
    await capture(page, '/', { width: 390, height: 844 }, 'landing-mobile.png')
    await capture(page, '/tarifs', { width: 1600, height: 1000 }, 'pricing-desktop.png')
    await capture(page, '/demo', { width: 1600, height: 1000 }, 'demo-form-desktop.png')

    console.log(JSON.stringify({
      success: true,
      outputDirectory: outDir,
      files: [
        'landing-desktop.png',
        'landing-mobile.png',
        'pricing-desktop.png',
        'demo-form-desktop.png',
      ],
    }, null, 2))
  } catch (err) {
    console.error('capture-landing-screenshots failed:', err.message)
    process.exitCode = 1
  } finally {
    await page.close()
    await browser.close()
  }
}

main()
