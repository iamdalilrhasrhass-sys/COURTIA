function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
    document.head.appendChild(element)
  }
  return element
}

export function applySeo({ title, description, canonicalPath, ogTitle, ogDescription, ogType = 'website' }) {
  if (typeof document === 'undefined') return

  if (title) document.title = title

  const descValue = description || ''
  ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', descValue)
  ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', ogTitle || title || '')
  ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', ogDescription || descValue)
  ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', ogType)
  ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', `https://app.courtiark.fr${canonicalPath || '/'}`)
  ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', 'https://app.courtiark.fr/og-courtia.png?v=7')
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image')

  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', `https://app.courtiark.fr${canonicalPath || '/'}`)
}
