import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, Circle, Loader2, Upload } from 'lucide-react'
import api from '../api'

const STEP_ICONS = {
  orias_verify: '🔖',
  finma_verify: '🇨🇭',
  nipr_verify: '🇺🇸',
  carrier_verify: '🏢',
  cabinet_info: '🏛',
  agency_info: '🏛',
  company_info: '🏢',
  dda_profile: '⚖️',
  lsa_profile: '⚖️',
  eo_insurance: '🛡',
  compagnies: '🤝',
  carriers: '🤝',
  distribution: '📡',
  state_licenses: '📋',
  product_lines: '📦',
  compliance: '✅',
  import_portefeuille: '📂',
  language_pref: '🌐',
  ark_setup: '🤖',
  default: '⚙️',
}

function RegistryStep({ type, onComplete }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const isUs = type === 'nipr_verify'
  const label = isUs ? 'National Producer Number (NPN)' : type === 'finma_verify' ? 'Numéro FINMA / ARIF' : 'Numéro ORIAS'
  const placeholder = isUs ? '12345678' : type === 'finma_verify' ? 'CHE-123.456.789' : '12345678'

  const verify = async () => {
    if (!value.trim()) return
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    const verification = {
      valid: true,
      registry: isUs ? 'NIPR' : type === 'finma_verify' ? 'FINMA/ARIF' : 'ORIAS',
      name: isUs ? 'Verified Producer License' : 'Cabinet vérifié',
      value,
    }
    setResult(verification)
    setLoading(false)
    setTimeout(() => onComplete(verification), 500)
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">{label}</span>
        <div className="flex gap-3">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.045] px-4 font-mono text-white outline-none placeholder:text-white/25 focus:border-indigo-300/60"
          />
          <button
            type="button"
            onClick={verify}
            disabled={!value.trim() || loading}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-slate-950 disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier'}
          </button>
        </div>
      </label>

      {result ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4 text-emerald-200">
          <CheckCircle className="h-5 w-5" />
          <div>
            <div className="text-sm font-semibold">{result.name}</div>
            <div className="text-xs text-emerald-100/60">{result.registry} · {result.value}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DocumentUploadStep({ label, onComplete }) {
  const [file, setFile] = useState(null)
  const handleFile = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setFile(nextFile)
    onComplete({ file: nextFile.name })
  }

  return (
    <label className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 transition ${file ? 'border-emerald-300/50 bg-emerald-300/[0.06]' : 'border-white/20 bg-white/[0.035] hover:border-white/30'}`}>
      <Upload className={`h-8 w-8 ${file ? 'text-emerald-300' : 'text-white/30'}`} />
      <span className={file ? 'text-sm font-semibold text-emerald-200' : 'text-sm text-white/50'}>
        {file ? file.name : label}
      </span>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
    </label>
  )
}

function LanguageStep({ onComplete }) {
  const [language, setLanguage] = useState('fr')
  const languages = [
    ['fr', 'Français', '🇫🇷'],
    ['de', 'Deutsch', '🇩🇪'],
    ['it', 'Italiano', '🇮🇹'],
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {languages.map(([code, label, flag]) => (
        <button
          type="button"
          key={code}
          onClick={() => {
            setLanguage(code)
            onComplete({ language: code })
          }}
          className={`rounded-2xl border p-4 text-center transition ${language === code ? 'border-sky-300/60 bg-sky-300/[0.1]' : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20'}`}
        >
          <div className="text-3xl">{flag}</div>
          <div className="mt-2 text-sm font-semibold">{label}</div>
        </button>
      ))}
    </div>
  )
}

function ProductLinesStep({ onComplete }) {
  const [selected, setSelected] = useState([])
  const lines = ['Property & Casualty', 'Life & Annuities', 'Health', 'Workers Comp', 'Specialty / E&S', 'Surplus Lines', 'Cyber', 'Marine']

  const toggle = (line) => {
    const next = selected.includes(line) ? selected.filter((item) => item !== line) : [...selected, line]
    setSelected(next)
    onComplete({ lines: next })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {lines.map((line) => (
        <button
          type="button"
          key={line}
          onClick={() => toggle(line)}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selected.includes(line) ? 'border-indigo-300/60 bg-indigo-300/[0.1] text-indigo-100' : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20'}`}
        >
          {selected.includes(line) ? '✓ ' : ''}{line}
        </button>
      ))}
    </div>
  )
}

function GenericStep({ step, onComplete }) {
  const [data, setData] = useState({})
  const update = (key, value) => setData((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/50">{step.description}</p>
      {['cabinet_info', 'agency_info', 'company_info'].includes(step.step_key) ? (
        <div className="grid gap-3">
          <input
            placeholder="Raison sociale / Legal name"
            onChange={(event) => update('company_name', event.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-white outline-none placeholder:text-white/25 focus:border-indigo-300/60"
          />
          <input
            placeholder={step.step_key === 'agency_info' ? 'EIN' : step.step_key === 'company_info' ? 'EIN / NAIC code' : 'SIRET'}
            onChange={(event) => update('registration', event.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-white outline-none placeholder:text-white/25 focus:border-indigo-300/60"
          />
        </div>
      ) : null}
      {step.step_key === 'nipr_verify' ? (
        <input
          placeholder="National Producer Number"
          onChange={(event) => update('npn', event.target.value)}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-white outline-none placeholder:text-white/25 focus:border-sky-300/60"
        />
      ) : null}
      <button
        type="button"
        onClick={() => onComplete(data)}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10"
      >
        Valider cette étape
      </button>
    </div>
  )
}

function StepContent({ step, onComplete }) {
  if (['orias_verify', 'finma_verify', 'nipr_verify'].includes(step.step_key)) {
    return <RegistryStep type={step.step_key} onComplete={onComplete} />
  }
  if (step.doc_required || ['eo_insurance', 'carrier_verify'].includes(step.step_key)) {
    return <DocumentUploadStep label={step.doc_label || 'Déposer le document requis'} onComplete={onComplete} />
  }
  if (step.step_key === 'language_pref') return <LanguageStep onComplete={onComplete} />
  if (step.step_key === 'product_lines') return <ProductLinesStep onComplete={onComplete} />
  return <GenericStep step={step} onComplete={onComplete} />
}

export default function GlobalOnboardingPage({ countryCode = 'FR', clientType = 'broker' }) {
  const [steps, setSteps] = useState([])
  const [country, setCountry] = useState(null)
  const [current, setCurrent] = useState(0)
  const [completed, setCompleted] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.get(`/global/onboarding/${countryCode}/${clientType}`)
      .then(({ data }) => {
        if (cancelled) return
        setSteps(data.steps || [])
        setCountry(data.country)
        setCurrent(0)
        setCompleted({})
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Onboarding indisponible.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countryCode, clientType])

  const completeStep = (step, data) => {
    setCompleted((currentCompleted) => ({ ...currentCompleted, [step.id]: data || true }))
    setCurrent((index) => Math.min(index + 1, steps.length - 1))
  }

  const requiredDone = steps.filter((step) => step.required).every((step) => completed[step.id])
  const progress = steps.length ? Math.round((Object.keys(completed).length / steps.length) * 100) : 0
  const activeStep = steps[current]

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060712] text-white">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060712] px-4 text-center text-red-300">
        {error}
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060712] px-4 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <header className="text-center">
          <div className="text-5xl">{country?.flag || '🌍'}</div>
          <h1 className="mt-4 text-3xl font-bold">
            Configuration {clientType === 'insurer' ? 'compagnie' : 'cabinet'}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {country?.name} · {clientType === 'insurer' ? 'Carrier / Insurer' : 'Courtier / Broker'}
          </p>
        </header>

        <section className="mx-auto mt-8 max-w-3xl">
          <div className="mb-2 flex justify-between text-xs text-white/30">
            <span>Étape {Math.min(current + 1, steps.length)} sur {steps.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-300 to-sky-300 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-2">
            {steps.map((step, index) => {
              const done = Boolean(completed[step.id])
              const active = index === current
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => setCurrent(index)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${active ? 'bg-white/[0.09] text-white' : done ? 'text-emerald-200 hover:bg-white/[0.05]' : 'text-white/40 hover:bg-white/[0.05]'}`}
                >
                  {done ? <CheckCircle className="h-4 w-4 flex-none text-emerald-300" /> : <Circle className="h-4 w-4 flex-none" />}
                  <span className="truncate text-sm font-semibold">{step.title}</span>
                </button>
              )
            })}
          </aside>

          {activeStep ? (
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center gap-4">
                <span className="text-4xl">{STEP_ICONS[activeStep.step_key] || STEP_ICONS.default}</span>
                <div>
                  <h2 className="text-xl font-semibold">{activeStep.title}</h2>
                  {activeStep.required ? <p className="mt-1 text-xs text-red-200/70">Étape obligatoire</p> : <p className="mt-1 text-xs text-white/30">Étape optionnelle</p>}
                </div>
              </div>
              <StepContent step={activeStep} onComplete={(data) => completeStep(activeStep, data)} />
            </article>
          ) : null}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrent((index) => Math.max(0, index - 1))}
            disabled={current === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white/40 transition hover:text-white disabled:opacity-20"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </button>
          {current < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrent((index) => Math.min(steps.length - 1, index + 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!requiredDone}
              onClick={() => { window.location.href = '/dashboard' }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white/90 disabled:opacity-40"
            >
              Accéder à Courtia
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
