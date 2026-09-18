/**
 * Gestion des métadonnées publiques (title, description, canonical, OG, hreflang).
 *
 * Correction SEO du 2026-09-18 : le domaine canonique était codé en dur sur
 * `https://app.courtiark.fr` alors que le site public, `robots.txt`, `sitemap.xml`
 * et les pages `/fr/*` servent `https://courtiark.fr`. Toute page publique
 * utilisant applySeo déclarait donc un canonical vers un autre hôte.
 * Le domaine est désormais paramétrable via VITE_SITE_ORIGIN, avec
 * `https://courtiark.fr` comme valeur par défaut.
 */

export const SITE_ORIGIN = String(
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_ORIGIN) ||
    'https://courtiark.fr',
).replace(/\/+$/, '')

/** Retire le slash final (sauf racine) pour garantir un canonical unique. */
export function normalizePath(pathOrUrl = '/') {
  const raw = String(pathOrUrl || '/')
  if (/^https?:\/\//i.test(raw)) return `${raw.replace(/\/+$/, '')}`
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/'
}

/** Construit une URL absolue sur le domaine public. */
export function absoluteUrl(pathOrUrl = '/') {
  const value = String(pathOrUrl || '/')
  if (/^https?:\/\//i.test(value)) return value
  const path = normalizePath(value)
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`
}

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
    document.head.appendChild(element)
  }
  return element
}

function ensureLink(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('link')
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
    document.head.appendChild(element)
  }
  return element
}

const ALTERNATE_ATTR = 'data-courtia-alternate'

/**
 * Déclare les alternances de langue (hreflang).
 * `alternates: [{ hreflang: 'fr-CH', href: '/ch' }, { hreflang: 'x-default', href: '/' }]`
 * Les balises posées par un appel précédent sont retirées pour éviter qu'elles
 * ne « bavent » d'une route à l'autre pendant la navigation SPA.
 */
function applyAlternates(alternates = []) {
  document.head.querySelectorAll(`link[${ALTERNATE_ATTR}]`).forEach((node) => node.remove())
  alternates.forEach((alt, index) => {
    if (!alt || !alt.hreflang || !alt.href) return
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', alt.hreflang)
    link.setAttribute('href', absoluteUrl(alt.href))
    link.setAttribute(ALTERNATE_ATTR, String(index))
    document.head.appendChild(link)
  })
}

/** JSON-LD idempotent, identifié par `id` (remplace le bloc existant s'il existe). */
export function setJsonLd(id, data) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  if (!data) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = id
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

export function applySeo({
  title,
  description,
  canonicalPath,
  canonicalUrl,
  robots,
  locale = 'fr_FR',
  ogTitle,
  ogDescription,
  ogType = 'website',
  ogImage,
  alternates,
}) {
  if (typeof document === 'undefined') return

  const canonical = absoluteUrl(canonicalUrl || canonicalPath || '/')

  if (title) document.title = title

  const descValue = description || ''
  ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', descValue)
  ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', ogTitle || title || '')
  ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', ogDescription || descValue)
  ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', ogType)
  ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical)
  ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', ogImage || `${SITE_ORIGIN}/og-courtia.png`)
  ensureMeta('meta[property="og:locale"]', { property: 'og:locale' }).setAttribute('content', locale)
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image')

  // Directives robots : par défaut on réaffirme la consigne indexable du shell.
  ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', robots || 'index, follow')

  ensureLink('link[rel="canonical"]', { rel: 'canonical' }).setAttribute('href', canonical)

  if (Array.isArray(alternates)) applyAlternates(alternates)
}
