import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, FileText, Globe, Loader2, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api'
import { countryOptions } from '../config/countries'

function CommissionPreview({ countryCode, usSegment }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!countryCode) {
      setPreview(null)
      return
    }

    let cancelled = false
    setLoading(true)
    api.get(`/global/countries/${countryCode}/commission-preview`, {
      params: { client_type: countryCode === 'US' ? usSegment : 'broker' },
    })
      .then(({ data }) => {
        if (!cancelled) setPreview(data)
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countryCode, usSegment])

  if (!countryCode) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-white/40">
        Sélectionnez un pays pour voir le potentiel de commission.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-500/[0.07] p-8 text-center text-sm text-red-200">
        Impossible de charger la preview commission.
      </div>
    )
  }

  return (
    <aside className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.08] p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <TrendingUp className="h-4 w-4" />
        Potentiel de gains · {preview.country}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.055] p-4 text-center">
          <div className="text-xs text-white/40">Setup</div>
          <div className="mt-1 text-2xl font-bold text-white">{preview.currencySym} {preview.setupCommission}</div>
          <div className="text-xs text-white/30">40% par signature</div>
        </div>
        <div className="rounded-2xl bg-white/[0.055] p-4 text-center">
          <div className="text-xs text-white/40">MRR</div>
          <div className="mt-1 text-2xl font-bold text-white">{preview.currencySym} {preview.mrrCommission}</div>
          <div className="text-xs text-white/30">15% x {preview.mrrMonths} mois</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.09] p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/60">Total/client</div>
        <div className="mt-1 text-4xl font-bold text-amber-100">{preview.currencySym} {preview.totalPotential}</div>
      </div>

      <div className="mt-5 space-y-2">
        {Object.values(preview.example || {}).map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-white/50">{item.label}</span>
            <span className="font-semibold text-white">{preview.currencySym} {Math.round(item.total).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default function CloserSignupPage() {
  const options = useMemo(countryOptions, [])
  const [form, setForm] = useState({
    country_code: 'FR',
    full_name: '',
    email: '',
    phone: '',
    us_segment: 'broker',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (!form.country_code || !form.full_name || !form.email) {
      setError('Pays, nom complet et email sont requis.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        us_segment: form.country_code === 'US' ? form.us_segment : null,
      }
      const { data } = await api.post('/global/closers', payload)
      setSuccess(data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Inscription impossible.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060712] px-4 py-12 text-white">
        <section className="w-full max-w-lg text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="mt-5 text-3xl font-bold">Bienvenue chez Courtia</h1>
          <p className="mt-3 text-white/50">Votre compte closer est créé et votre contrat PDF a été généré automatiquement.</p>

          <div className="mt-7 space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left">
            <div className="flex items-center gap-3 text-sm text-emerald-300">
              <CheckCircle className="h-4 w-4" />
              Compte closer créé
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-300">
              <CheckCircle className="h-4 w-4" />
              Contrat généré
            </div>
            <div className="flex items-center gap-3 text-sm text-sky-300">
            <Globe className="h-4 w-4" />
              Code : <code className="rounded bg-white/10 px-2 py-1 font-mono text-white">{success.referral_code}</code>
            </div>
            <p className="break-all text-xs text-white/40">{success.referral_link}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={success.contract_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10"
            >
              <FileText className="h-4 w-4" />
              Voir contrat
            </a>
            <Link
              to={`/closers/${success.id}/dashboard`}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950 hover:bg-white/90"
            >
              Ouvrir dashboard
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060712] px-4 py-12 text-white sm:py-16">
      <section className="mx-auto max-w-5xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Devenez closer Courtia</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/50">
            Commission setup 40% + récurrente 15% sur 12 mois, avec contrat automatique adapté au pays.
          </p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold">Votre profil</h2>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Pays d'activité</label>
              <div className="grid grid-cols-3 gap-2">
                {options.map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => setForm((current) => ({ ...current, country_code: item.code }))}
                    className={`h-11 rounded-xl text-sm font-semibold transition ${form.country_code === item.code ? 'bg-white text-slate-950' : 'border border-white/10 text-white/60 hover:bg-white/[0.07]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {form.country_code === 'US' ? (
              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Segment US</label>
                <div className="grid grid-cols-3 gap-2">
                  {['broker', 'insurer', 'both'].map((segment) => (
                    <button
                      type="button"
                      key={segment}
                      onClick={() => setForm((current) => ({ ...current, us_segment: segment }))}
                      className={`h-11 rounded-xl text-sm font-semibold capitalize transition ${form.us_segment === segment ? 'bg-indigo-500 text-white' : 'border border-white/10 text-white/60 hover:bg-white/[0.07]'}`}
                    >
                      {segment}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              {[
                ['full_name', 'Nom complet', 'Jean Dupont', 'text'],
                ['email', 'Email professionnel', 'jean@cabinet.fr', 'email'],
                ['phone', 'Téléphone', '+33 6 00 00 00 00', 'tel'],
              ].map(([key, label, placeholder, type]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
                  <input
                    type={type}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-white outline-none placeholder:text-white/25 focus:border-indigo-300/60"
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Notes</span>
                <textarea
                  value={form.notes}
                  placeholder="Marché, expérience, réseau existant..."
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-indigo-300/60"
                />
              </label>
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-950 transition hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Création...' : 'Rejoindre le programme closer'}
            </button>
            <p className="mt-3 text-center text-xs text-white/30">
              En soumettant, vous acceptez le contrat closer généré selon votre pays.
            </p>
          </form>

          <CommissionPreview countryCode={form.country_code} usSegment={form.us_segment} />
        </div>
      </section>
    </main>
  )
}
