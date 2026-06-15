import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRobotsTxt, buildSitemapXml } from '../src/seo/marketSeo.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(root, 'public')

await mkdir(publicDir, { recursive: true })
await writeFile(resolve(publicDir, 'sitemap.xml'), buildSitemapXml(), 'utf8')
await writeFile(resolve(publicDir, 'robots.txt'), buildRobotsTxt(), 'utf8')
