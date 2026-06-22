import { describe, expect, it } from 'vitest'
import {
  buildRobotsTxt,
  buildSitemapXml,
  getSeoPageByPath,
  getSeoPages,
} from './marketSeo.js'

describe('market SEO pages', () => {
  it('defines international money pages for France, Switzerland, UK and US', () => {
    const pages = getSeoPages()
    expect(pages.length).toBeGreaterThanOrEqual(12)

    for (const market of ['fr', 'ch-fr', 'ch-de', 'ch-it', 'uk', 'us']) {
      expect(pages.some((page) => page.market === market), `missing market ${market}`).toBe(true)
    }

    for (const page of pages) {
      expect(page.path).toMatch(/^\//)
      expect(page.title.includes('COURTIA'), `${page.path} title should include COURTIA`).toBe(true)
      expect(page.description.length, `${page.path} meta description too short`).toBeGreaterThanOrEqual(130)
      expect(page.canonical.endsWith(page.path), `${page.path} canonical mismatch`).toBe(true)
      expect(Object.keys(page.hreflang).length, `${page.path} needs hreflang cluster`).toBeGreaterThanOrEqual(4)
      expect(page.sections.length, `${page.path} needs rich content sections`).toBeGreaterThanOrEqual(4)
      expect(page.faq.length, `${page.path} needs FAQ`).toBeGreaterThanOrEqual(4)
      expect(page.internalLinks.length, `${page.path} needs internal links`).toBeGreaterThanOrEqual(4)
      expect(page.schema.some((item) => item['@type'] === 'FAQPage'), `${page.path} missing FAQ schema`).toBe(true)
      expect(page.schema.some((item) => item['@type'] === 'BreadcrumbList'), `${page.path} missing breadcrumb schema`).toBe(true)
    }
  })

  it('returns pages by path and emits sitemap plus robots entries', () => {
    const page = getSeoPageByPath('/us/insurance-agency-management-software')
    expect(page.market).toBe('us')
    expect(page.h1).toMatch(/insurance/i)

    const sitemap = buildSitemapXml()
    expect(sitemap).toMatch(/<loc>https:\/\/courtiark\.fr\/us\/insurance-agency-management-software<\/loc>/)
    expect(sitemap).toMatch(/hreflang="fr"/)
    expect(sitemap).toMatch(/hreflang="en-US"/)

    const robots = buildRobotsTxt()
    expect(robots).toMatch(/User-agent: \*/)
    expect(robots).toMatch(/Sitemap: https:\/\/courtiark\.fr\/sitemap\.xml/)
  })
})
