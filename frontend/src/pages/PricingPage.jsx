import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Globe, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  MARKET_OPTIONS,
  formatMarketPrice,
  getDetectedGeoCountry,
  getMarketPricing,
  parseMarketFromSearch,
  persistMarketOverride,
  readStoredMarketOverride,
  resolveMarketContext,
} from '../market/marketContext'

function initialMarketContext() {
  if (typeof window === 'undefined') return resolveMarketContext()
  return resolveMarketContext({
    geoCountry: getDetectedGeoCountry(),
    storedOverride: readStoredMarketOverride(),
    queryMarket: parseMarketFromSearch(window.location.search),
  })
}

function MarketToggle({ market, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl">
      {MARKET_OPTIONS.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
            market === item.code
              ? 'bg-white text-slate-950 shadow-lg shadow-cyan-950/20'
              : 'text-white/58 hover:bg-white/[0.07] hover:text-white'
          }`}
          aria-pressed={market === item.code}
        >
          {item.flag} {item.label}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ plan, market }) {
  return (
    <article className={`relative flex min-h-[460px] flex-col rounded-2xl border p-6 transition-all ${
      plan.highlighted
        ? 'border-cyan-200/50 bg-cyan-200/[0.10] shadow-2xl shadow-cyan-950/30'
        : 'border-white/10 bg-white/[0.035] hover:border-white/20'
    }`}>
      {plan.highlighted ? (
        <div className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
          Recommandé
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-black text-white">{plan.name}</h2>
        <p className="mt-2 min-h-[40px] text-sm leading-5 text-white/55">{plan.description}</p>
        <div className="mt-6">
          {plan.monthly ? (
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{formatMarketPrice(plan.monthly, market).replace(` ${market === 'CH' ? 'CHF' : '€'}`, '')}</span>
              <span className="pb-2 text-lg font-bold text-white/62">{market === 'CH' ? 'CHF' : '€'}</span>
              <span className="pb-2 text-sm text-white/42">/mois</span>
            </div>
          ) : (
            <span className="text-3xl font-black text-white/78">Sur devis</span>
          )}
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-cyan-100/82">
            {plan.setup > 0 ? `${plan.setupPrefix ? `${plan.setupPrefix} ` : ''}${formatMarketPrice(plan.setup, market)} setup` : plan.setupLabel}
          </p>
        </div>
      </div>

      <ul className="mt-7 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-white/70">
            <Check className="mt-1 h-4 w-4 flex-none text-emerald-300" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to={plan.monthly ? `/onboarding?plan=${plan.code}&market=${market}` : `/demo?market=${market}&plan=${plan.code}`}
        className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl text-sm font-black transition-all ${
          plan.highlighted
            ? 'bg-white text-slate-950 hover:bg-white/90'
            : 'border border-white/20 text-white hover:bg-white/10'
        }`}
      >
        {plan.monthly ? (market === 'CH' ? 'Réserver une démo' : 'Démarrer maintenant') : 'Nous contacter'}
      </Link>
    </article>
  )
}

export default function PricingPage() {
  const [context, setContext] = useState(initialMarketContext)
  const market = context.market
  const pricing = useMemo(() => getMarketPricing(market), [market])

  useEffect(() => {
    document.documentElement.lang = pricing.locale
    document.documentElement.dataset.market = market
  }, [market, pricing.locale])

  function changeMarket(nextMarket) {
    const stored = persistMarketOverride(nextMarket)
    setContext(resolveMarketContext({
      geoCountry: getDetectedGeoCountry(),
      storedOverride: stored,
    }))
  }

  const geoMismatch = context.geoCountry === 'CH' && market === 'FR'

  return (
    <main className="min-h-screen bg-[#050510] px-4 py-10 text-white sm:py-16">
      <section className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/62">
            <Globe className="h-4 w-4" />
            Marché actif : {pricing.country} · {pricing.currency} · {pricing.compliance}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
            Tarifs Courtiark, marché par marché.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/62">
            France et Suisse vivent côte à côte : EUR + DDA/ORIAS pour la France, CHF + LSA/nLPD pour la Suisse. Votre choix reste mémorisé.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <MarketToggle market={market} onChange={changeMarket} />
        </div>

        {geoMismatch ? (
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.08] p-4 text-sm text-cyan-50/82 sm:flex-row sm:items-center sm:justify-between">
            <span>Vous semblez être en Suisse. Les tarifs CHF sont disponibles immédiatement.</span>
            <button type="button" onClick={() => changeMarket('CH')} className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 font-black text-slate-950">
              Voir Suisse
            </button>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-white/50">Frais d’inscription</p>
              <p className="mt-1 text-2xl font-black text-white">
                {market === 'CH' ? 'Facturés one-shot à l’activation' : 'Aucun setup imposé sur le produit France'}
              </p>
              <p className="mt-2 text-sm text-white/50">{pricing.taxNote}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-white/58">
              {market === 'CH' ? <ShieldCheck className="h-4 w-4 text-cyan-200" /> : <Building2 className="h-4 w-4 text-fuchsia-200" />}
              {pricing.compliance}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <PlanCard key={plan.code} plan={plan} market={market} />
          ))}
        </div>

        {market === 'CH' ? (
          <section className="mt-10 rounded-3xl border border-fuchsia-200/15 bg-fuchsia-200/[0.065] p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Module Fiduciaire inclus dans la trajectoire Suisse</h2>
                <p className="mt-3 max-w-3xl text-white/62">
                  Mandats, TVA suisse, salaires/AVS, échéanciers cantonaux, GED hashée et ARK Fiduciaire sont prévus dans le contexte CH sans toucher au produit France.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-fuchsia-100">
                <Sparkles className="h-4 w-4" />
                Fiduciaire · LSA · nLPD
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
