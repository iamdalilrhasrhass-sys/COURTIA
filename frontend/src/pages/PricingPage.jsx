import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Globe, Shield, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { COUNTRIES, formatCountryPrice } from '../config/countries'

function getBrowserCountry() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  if (timeZone.startsWith('America/')) return 'US'
  if (timeZone.includes('Zurich') || timeZone.includes('Geneva')) return 'CH'
  return 'FR'
}

function PlanCard({ plan, country, annual, segment }) {
  const discount = annual ? 0.17 : 0
  const displayPrice = plan.price ? Math.round(plan.price * (1 - discount)) : null
  const search = new URLSearchParams({ plan: plan.key, country: country.code })
  if (segment) search.set('segment', segment)

  return (
    <article className={`relative flex min-h-[420px] flex-col rounded-2xl border p-6 transition-all ${plan.popular ? 'border-indigo-400/60 bg-indigo-500/[0.13] shadow-2xl shadow-indigo-950/30' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}>
      {plan.popular ? (
        <div className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
          Plus populaire
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold text-white">{plan.label}</h2>
        <div className="mt-5 flex items-end gap-2">
          {displayPrice ? (
            <>
              <span className="text-5xl font-bold tracking-tight text-white">
                {country.currencySym === '$' ? `$${displayPrice}` : displayPrice}
              </span>
              {country.currencySym !== '$' ? <span className="pb-2 text-lg text-white/60">{country.currencySym}</span> : null}
              <span className="pb-2 text-sm text-white/40">/mois</span>
            </>
          ) : (
            <span className="text-3xl font-bold text-white/75">{plan.priceLabel}</span>
          )}
        </div>
        {annual && plan.price ? (
          <p className="mt-2 text-sm text-emerald-300">
            Economie annuelle : {formatCountryPrice(Math.round(plan.price * discount * 12), country.code)}
          </p>
        ) : null}
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
        to={`/demo?${search.toString()}`}
        className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-all ${plan.popular ? 'bg-white text-slate-950 hover:bg-white/90' : 'border border-white/20 text-white hover:bg-white/10'}`}
      >
        {plan.price ? 'Démarrer maintenant' : 'Nous contacter'}
      </Link>
    </article>
  )
}

export default function PricingPage() {
  const [countryCode, setCountryCode] = useState('FR')
  const [usSegment, setUsSegment] = useState('broker')
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    setCountryCode(getBrowserCountry())
  }, [])

  const country = COUNTRIES[countryCode]
  const activeMarket = countryCode === 'US' ? country.segments[usSegment] : country
  const plans = activeMarket.plans
  const setupFee = activeMarket.setupFee

  const closerPotential = useMemo(() => {
    if (countryCode === 'US' && usSegment === 'insurer') return '$1,838'
    if (countryCode === 'US') return '$738'
    if (countryCode === 'CH') return 'CHF 824'
    return '478€'
  }, [countryCode, usSegment])

  return (
    <main className="min-h-screen bg-[#060712] px-4 py-10 text-white sm:py-16">
      <section className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">
            <Globe className="h-4 w-4" />
            France · Suisse · United States
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            Tarifs simples, marché par marché.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
            Courtia adapte son prix, son onboarding et sa conformité au pays du cabinet, avec une offre dédiée aux carriers US.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {Object.values(COUNTRIES).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setCountryCode(item.code)}
              className={`h-11 rounded-xl px-4 text-sm font-semibold transition-all ${countryCode === item.code ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.035] text-white/60 hover:bg-white/[0.07]'}`}
            >
              {item.flag} {item.name}
            </button>
          ))}
        </div>

        {countryCode === 'US' ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setUsSegment('broker')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${usSegment === 'broker' ? 'bg-sky-500 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <Shield className="h-4 w-4" />
                Brokers
              </button>
              <button
                type="button"
                onClick={() => setUsSegment('insurer')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${usSegment === 'insurer' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <Building2 className="h-4 w-4" />
                Carriers
              </button>
            </div>
            <p className="text-sm text-white/40">{activeMarket.label}</p>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-4">
          <span className={`text-sm ${annual ? 'text-white/40' : 'text-white'}`}>Mensuel</span>
          <button
            type="button"
            onClick={() => setAnnual((value) => !value)}
            className={`relative h-7 w-14 rounded-full transition-colors ${annual ? 'bg-emerald-400' : 'bg-white/20'}`}
            aria-label="Basculer facturation annuelle"
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${annual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-white' : 'text-white/40'}`}>
            Annuel <span className="ml-1 text-emerald-300">2 mois offerts</span>
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-white/50">Frais de mise en place one-shot</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatCountryPrice(setupFee, countryCode)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Sparkles className="h-4 w-4 text-amber-300" />
              {activeMarket.badge || country.badge}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} country={country} annual={annual} segment={countryCode === 'US' ? usSegment : null} />
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-amber-300/20 bg-amber-300/[0.08] p-7 text-center">
          <h2 className="text-2xl font-bold text-white">Vous êtes commercial freelance ?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">
            Rejoignez le programme closer Courtia et gagnez jusqu'à <span className="font-semibold text-amber-200">{closerPotential} par client signé</span>, avec 40% du setup et 15% du MRR pendant 12 mois.
          </p>
          <Link
            to="/closers/rejoindre"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-amber-300 px-7 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
          >
            Devenir closer Courtia
          </Link>
        </section>
      </section>
    </main>
  )
}
