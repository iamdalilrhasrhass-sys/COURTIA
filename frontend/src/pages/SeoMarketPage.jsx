import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, Check, Globe, ShieldCheck } from 'lucide-react'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import { getSeoPageByPath } from '../seo/marketSeo'

function upsertMeta(selector, createTag, attrs) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = document.createElement(createTag)
    document.head.appendChild(node)
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
}

function applySeoMetadata(page) {
  document.title = page.title
  document.documentElement.lang = page.lang
  upsertMeta('meta[name="description"]', 'meta', { name: 'description', content: page.description })
  upsertMeta('meta[property="og:title"]', 'meta', { property: 'og:title', content: page.title })
  upsertMeta('meta[property="og:description"]', 'meta', { property: 'og:description', content: page.description })
  upsertMeta('meta[property="og:url"]', 'meta', { property: 'og:url', content: page.canonical })
  upsertMeta('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: page.title })
  upsertMeta('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: page.description })
  upsertMeta('link[rel="canonical"]', 'link', { rel: 'canonical', href: page.canonical })

  document.head.querySelectorAll('link[data-courtia-hreflang="true"]').forEach((node) => node.remove())
  Object.entries(page.hreflang).forEach(([hreflang, href]) => {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.hreflang = hreflang
    link.href = href
    link.dataset.courtiaHreflang = 'true'
    document.head.appendChild(link)
  })

  document.head.querySelectorAll('script[data-courtia-schema="market-page"]').forEach((node) => node.remove())
  page.schema.forEach((schema) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.courtiaSchema = 'market-page'
    script.textContent = JSON.stringify(schema)
    document.head.appendChild(script)
  })
}

export default function SeoMarketPage() {
  const { pathname } = useLocation()
  const page = getSeoPageByPath(pathname)

  useEffect(() => {
    if (page) applySeoMetadata(page)
  }, [page])

  if (!page) return <Navigate to="/" replace />

  return (
    <main className="min-h-screen bg-[#02040c] text-white">
      <section className="relative overflow-hidden px-5 py-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.16),transparent_28rem),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.18),transparent_30rem)]" />
        <div className="relative mx-auto max-w-6xl">
          <nav className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3" aria-label="COURTIA">
              <CourtiaMiniLogo size={34} />
              <span className="text-sm font-black tracking-[0.18em] text-white/70">COURTIA</span>
            </Link>
            <Link to="/register?plan=pro" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-white/90">
              Essai Pro
              <ArrowRight size={15} />
            </Link>
          </nav>

          <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">
                <Globe size={14} />
                {page.market.toUpperCase()}
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {page.h1}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                {page.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register?plan=pro" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 hover:bg-white/90">
                  Démarrer avec COURTIA
                  <ArrowRight size={16} />
                </Link>
                <Link to="/pricing" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-bold text-white hover:bg-white/10">
                  Voir les offres
                </Link>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <ShieldCheck className="h-9 w-9 text-emerald-200" />
              <h2 className="mt-5 text-2xl font-black">Pourquoi cette page existe</h2>
              <p className="mt-4 text-sm leading-7 text-white/65">{page.angle}</p>
              <div className="mt-6 grid gap-3">
                {page.sections.slice(0, 4).map((section) => (
                  <div key={section} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-200" />
                    <span className="text-sm font-semibold text-white/75">{section}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_0.28fr]">
          <article className="space-y-8">
            {page.sections.map((section, index) => (
              <section key={section} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <h2 className="text-2xl font-black">{section}</h2>
                <p className="mt-4 text-base leading-8 text-white/65">
                  {page.paragraphs[index % page.paragraphs.length]}
                </p>
              </section>
            ))}

            <section className="rounded-3xl border border-cyan-200/20 bg-cyan-300/[0.055] p-6">
              <h2 className="text-2xl font-black">FAQ</h2>
              <div className="mt-5 space-y-3">
                {page.faq.map(([question, answer]) => (
                  <details key={question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <summary className="cursor-pointer text-sm font-black text-white">{question}</summary>
                    <p className="mt-3 text-sm leading-7 text-white/65">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.035] p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">Pages liées</h2>
            <div className="mt-4 space-y-2">
              {page.internalLinks.map((path) => (
                <Link key={path} to={path} className="block rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                  {path}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
