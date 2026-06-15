import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Copy, DollarSign, ExternalLink, TrendingUp, Users } from 'lucide-react'
import api from '../api'

function StatCard({ icon: Icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-xl bg-white/10 p-2">
          <Icon className="h-4 w-4 text-white/60" />
        </span>
        <span className="text-sm text-white/50">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/30">{sub}</div> : null}
    </div>
  )
}

function CommissionRow({ commission }) {
  const status = {
    paid: ['Payée', 'bg-emerald-300/10 text-emerald-300'],
    pending: ['En attente', 'bg-amber-300/10 text-amber-300'],
    clawed_back: ['Récupérée', 'bg-red-300/10 text-red-300'],
  }[commission.status] || ['Inconnue', 'bg-white/10 text-white/50']

  return (
    <div className="flex items-center justify-between border-b border-white/6 py-4 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status[1]}`}>{status[0]}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">
            {commission.commission_type === 'setup' ? 'Commission setup' : `MRR ${commission.period_month ? new Date(commission.period_month).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : ''}`}
          </div>
          <div className="text-xs text-white/30">{new Date(commission.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      <div className="text-sm font-bold text-white">{commission.currency} {Number(commission.amount).toFixed(2)}</div>
    </div>
  )
}

function DealCard({ deal }) {
  const active = deal.status === 'active'
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{deal.client_name}</h3>
          <p className="truncate text-sm text-white/40">{deal.client_email}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-emerald-300' : 'text-red-300'}`}>
          {active ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {deal.status}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/40">
        <span>{deal.currency} {deal.setup_fee} setup</span>
        <span>{deal.currency} {deal.monthly_fee}/mois</span>
        <span>{deal.mrr_months_left} mois MRR</span>
        <span className={deal.client_type === 'insurer' ? 'text-indigo-300' : 'text-sky-300'}>
          {deal.client_type === 'insurer' ? 'Carrier' : 'Broker'}
        </span>
      </div>
    </article>
  )
}

export default function CloserDashboard({ closerId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('deals')

  useEffect(() => {
    if (!closerId) return
    let cancelled = false
    setLoading(true)
    api.get(`/global/closers/${closerId}/dashboard`)
      .then(({ data: response }) => {
        if (!cancelled) setData(response)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [closerId])

  const copyLink = async () => {
    if (!data?.stats?.referralLink) return
    await navigator.clipboard.writeText(data.stats.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060712] text-white/40">
        Chargement du dashboard...
      </main>
    )
  }

  if (!data?.closer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060712] text-red-300">
        Closer introuvable.
      </main>
    )
  }

  const { closer, deals = [], commissions = [], stats } = data

  return (
    <main className="min-h-screen bg-[#060712] px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-white/40">Dashboard closer</p>
            <h1 className="mt-1 text-3xl font-bold">{closer.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-white/60">{closer.country_code}</span>
              {closer.us_segment ? <span className="rounded-full bg-indigo-300/10 px-2.5 py-1 text-indigo-200">{closer.us_segment}</span> : null}
              <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-emerald-200">{closer.status}</span>
            </div>
          </div>
          {closer.contract_pdf_url ? (
            <a href={closer.contract_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
              <ExternalLink className="h-4 w-4" />
              Contrat PDF
            </a>
          ) : null}
        </header>

        <section className="mt-7 rounded-3xl border border-amber-300/20 bg-amber-300/[0.08] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <ExternalLink className="h-4 w-4" />
            Lien de tracking unique
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-white/70">
              {stats.referralLink}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${copied ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-950 hover:bg-amber-200'}`}
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">Chaque visite avec ce lien peut être attribuée au closer pendant 30 jours via cookie.</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Clients actifs" value={stats.activeDeals} color="text-sky-300" />
          <StatCard icon={DollarSign} label="Payées" value={`${stats.currency} ${Number(stats.totalPaid || 0).toFixed(0)}`} color="text-emerald-300" />
          <StatCard icon={Clock} label="En attente" value={`${stats.currency} ${Number(stats.pendingAmount || 0).toFixed(0)}`} color="text-amber-300" />
          <StatCard icon={TrendingUp} label="Deals" value={stats.totalDeals} />
        </section>

        <div className="mt-7 inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {[
            ['deals', `Clients (${deals.length})`],
            ['commissions', `Commissions (${commissions.length})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? 'bg-white text-slate-950' : 'text-white/60 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'deals' ? (
          <section className="mt-5 space-y-3">
            {deals.length ? deals.map((deal) => <DealCard key={deal.id} deal={deal} />) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-10 text-center text-sm text-white/40">
                Aucun client signé pour l'instant. Partagez le lien de tracking pour démarrer.
              </div>
            )}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            {commissions.length ? commissions.map((commission) => <CommissionRow key={commission.id} commission={commission} />) : (
              <div className="p-8 text-center text-sm text-white/40">Aucune commission enregistrée.</div>
            )}
          </section>
        )}
      </section>
    </main>
  )
}
