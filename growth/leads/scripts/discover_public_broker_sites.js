#!/usr/bin/env node
/**
 * Script de découverte prudente: vérifie uniquement l'accessibilité publique
 * de robots.txt sur des sources déclarées manuellement.
 * Aucun scraping agressif, aucun contournement.
 */

const fs = require('fs')
const path = require('path')

const seedPath = process.argv[2] || path.resolve(__dirname, '../data/public_source_seeds.txt')

async function readSeeds() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Source seed file introuvable: ${seedPath}`)
  }

  return fs.readFileSync(seedPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

async function checkRobots(baseUrl) {
  try {
    const target = new URL('/robots.txt', baseUrl).toString()
    const res = await fetch(target, { method: 'GET', redirect: 'follow' })
    const text = await res.text()
    const disallowAll = /User-agent:\s*\*([\s\S]*?)Disallow:\s*\//i.test(text)

    return {
      baseUrl,
      robotsUrl: target,
      status: res.status,
      reachable: res.ok,
      disallowAll,
      preview: text.slice(0, 280),
    }
  } catch (err) {
    return {
      baseUrl,
      robotsUrl: new URL('/robots.txt', baseUrl).toString(),
      reachable: false,
      error: err.message,
      disallowAll: true,
      preview: '',
    }
  }
}

async function main() {
  const seeds = await readSeeds()
  const checks = []

  for (const seed of seeds) {
    checks.push(await checkRobots(seed))
  }

  const allowed = checks.filter((c) => c.reachable && !c.disallowAll)
  const blocked = checks.filter((c) => !c.reachable || c.disallowAll)

  console.log(JSON.stringify({
    checkedSources: checks.length,
    allowedSources: allowed.length,
    blockedSources: blocked.length,
    checks,
    policy: 'Aucun scraping automatique ne doit être exécuté sans validation juridique explicite.',
  }, null, 2))
}

main().catch((err) => {
  console.error('discover_public_broker_sites failed:', err.message)
  process.exit(1)
})
