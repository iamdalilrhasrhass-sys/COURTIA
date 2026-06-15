import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRobotsTxt,
  buildSitemapXml,
  getSeoPageByPath,
  getSeoPages,
} from './marketSeo.js'

test('defines international money pages for France, Switzerland, UK and US', () => {
  const pages = getSeoPages()
  assert.equal(pages.length >= 12, true)

  for (const market of ['fr', 'ch-fr', 'ch-de', 'ch-it', 'uk', 'us']) {
    assert.equal(pages.some((page) => page.market === market), true, `missing market ${market}`)
  }

  for (const page of pages) {
    assert.match(page.path, /^\//)
    assert.equal(page.title.includes('COURTIA'), true, `${page.path} title should include COURTIA`)
    assert.equal(page.description.length >= 130, true, `${page.path} meta description too short`)
    assert.equal(page.canonical.endsWith(page.path), true, `${page.path} canonical mismatch`)
    assert.equal(Object.keys(page.hreflang).length >= 4, true, `${page.path} needs hreflang cluster`)
    assert.equal(page.sections.length >= 4, true, `${page.path} needs rich content sections`)
    assert.equal(page.faq.length >= 4, true, `${page.path} needs FAQ`)
    assert.equal(page.internalLinks.length >= 4, true, `${page.path} needs internal links`)
    assert.equal(page.schema.some((item) => item['@type'] === 'FAQPage'), true, `${page.path} missing FAQ schema`)
    assert.equal(page.schema.some((item) => item['@type'] === 'BreadcrumbList'), true, `${page.path} missing breadcrumb schema`)
  }
})

test('returns pages by path and emits sitemap plus robots entries', () => {
  const page = getSeoPageByPath('/us/insurance-agency-management-software')
  assert.equal(page.market, 'us')
  assert.match(page.h1, /insurance/i)

  const sitemap = buildSitemapXml()
  assert.match(sitemap, /<loc>https:\/\/courtia\.fr\/us\/insurance-agency-management-software<\/loc>/)
  assert.match(sitemap, /hreflang="fr"/)
  assert.match(sitemap, /hreflang="en-US"/)

  const robots = buildRobotsTxt()
  assert.match(robots, /User-agent: \*/)
  assert.match(robots, /Sitemap: https:\/\/courtia\.fr\/sitemap\.xml/)
})
