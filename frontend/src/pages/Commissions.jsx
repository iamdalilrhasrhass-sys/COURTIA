import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Building2, Download, Euro, FileUp, RefreshCw, Search, UploadCloud, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraButton from '../components/brand/AuroraButton'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import BubbleBackground from '../components/BubbleBackground'
import { formatCommissionCurrency, getCommissionStatusMeta, summarizeCommissions } from '../lib/commissions'
import '../styles/design-system.css'

const YEARS = [2026, 2025, 2024]

function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
        <Icon size={19} />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = getCommissionStatusMeta(status)
  const color = {
    success: 'rgba(93,227,161,0.18)',
    warning: 'rgba(255,199,106,0.18)',
    danger: 'rgba(255,111,140,0.18)',
    muted: 'rgba(255,255,255,0.10)',
    info: 'rgba(108,240,255,0.16)',
  }[meta.tone] || 'rgba(108,240,255,0.16)'
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-white/80" style={{ background: color }}>
      {meta.label}
    </span>
  )
}

function toCsv(rows) {
  const header = ['client', 'contrat', 'compagnie', 'periode', 'attendu_eur', 'recu_eur', 'statut', 'apporteur']
  const body = rows.map((row) => [
    `${row.client_prenom || ''} ${row.client_nom || ''}`.trim(),
    row.contract_number || row.contract_id,
    row.insurer,
    `${row.period_year}-${String(row.period_month).padStart(2, '0')}`,
    row.expected_amount_eur,
    row.received_amount_eur,
    row.status,
    row.broker_name || '',
  ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  return [header.join(','), ...body].join('\n')
}

export default function Commissions() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [manual, setManual] = useState({
    contractId: '',
    insurer: '',
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    expected_amount: '',
    received_amount: '',
    status: 'expected',
  })
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/commissions'),
        api.get(`/commissions/stats?year=${year}`),
      ])
      setRows(Array.isArray(listRes.data?.data) ? listRes.data.data : [])
      setStats(statsRes.data || null)
    } catch (err) {
      const status = err?.response?.status
      if (status === 403) {
        setError(err?.response?.data?.message || 'Le suivi commissions est désactivé pour ce cabinet.')
      } else {
        setError('Impossible de charger les commissions pour le moment.')
      }
      setRows([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [year])

  // Chargement initial contrôlé par bouton Actualiser; dette lint React 19 isolée sur cette ligne.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => [
      row.insurer,
      row.contract_number,
      row.client_nom,
      row.client_prenom,
      row.type_contrat,
      row.broker_name,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [rows, search])

  const summary = useMemo(() => summarizeCommissions(filteredRows), [filteredRows])

  const handleSaveManual = async (event) => {
    event.preventDefault()
    if (!manual.contractId || !manual.insurer || !manual.period) {
      toast.error('Contrat, compagnie et période sont requis.')
      return
    }
    try {
      await api.post(`/contracts/${manual.contractId}/commissions`, {
        insurer: manual.insurer,
        period: manual.period,
        expected_amount: manual.expected_amount,
        received_amount: manual.received_amount,
        status: manual.status,
      })
      toast.success('Commission enregistrée')
      setManual((prev) => ({ ...prev, expected_amount: '', received_amount: '' }))
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Enregistrement impossible')
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const csv = await file.text()
      const res = await api.post('/commissions/import', { csv })
      toast.success(`${res.data?.imported || 0} commission(s) importée(s)`)
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import impossible')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleExport = () => {
    const blob = new Blob([toCsv(filteredRows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `courtia-commissions-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="normal" />
      <main className="relative z-[1] p-4 md:p-8">
        <AuroraPageHeader
          dark
          badge="Commissions"
          title="Commissions courtier"
          subtitle="Pilotez les commissions attendues, encaissées, par compagnie et par apporteur."
          actions={
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl">
                <FileUp size={16} />
                {importing ? 'Import...' : 'Importer CSV'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
              </label>
              <AuroraButton variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleExport}>Export CSV</AuroraButton>
              <AuroraButton variant="primary" size="sm" icon={<RefreshCw size={16} />} onClick={load}>Actualiser</AuroraButton>
            </div>
          }
        />

        {error && (
          <div className="mb-5 rounded-3xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm font-semibold text-amber-100 backdrop-blur-xl">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard icon={Euro} label="Attendu" value={formatCommissionCurrency(stats?.totals?.expected_amount_eur ?? summary.expected)} subtitle={`${stats?.totals?.count ?? summary.count} ligne(s)`} />
          <StatCard icon={BarChart3} label="Encaissé" value={formatCommissionCurrency(stats?.totals?.received_amount_eur ?? summary.received)} subtitle="commissions reçues" />
          <StatCard icon={UploadCloud} label="À suivre" value={formatCommissionCurrency(summary.pending)} subtitle="reste théorique" />
          <StatCard icon={Users} label="Apporteurs" value={stats?.by_broker?.length || 0} subtitle="suivi par courtier" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-white/15 bg-[#080b1f]/80 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">Vue commissions</h2>
                <p className="text-sm text-white/55">Recherche, lecture par période et contrôle des encaissements.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client, compagnie, apporteur..." className="w-full rounded-xl border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 md:w-72" />
                </div>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none">
                  {YEARS.map((y) => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/10" />)}
              </div>
            ) : filteredRows.length === 0 ? (
              <AuroraEmptyState icon={<Euro size={34} />} title="Aucune commission suivie" description="Importez un CSV ou saisissez une première ligne depuis un contrat existant." dark />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.14em] text-white/45">
                      <th className="px-3 py-3">Période</th>
                      <th className="px-3 py-3">Client / contrat</th>
                      <th className="px-3 py-3">Compagnie</th>
                      <th className="px-3 py-3 text-right">Attendu</th>
                      <th className="px-3 py-3 text-right">Reçu</th>
                      <th className="px-3 py-3">Statut</th>
                      <th className="px-3 py-3">Apporteur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.04]">
                        <td className="px-3 py-4 font-bold text-white/80">{row.period_month}/{row.period_year}</td>
                        <td className="px-3 py-4">
                          <button onClick={() => row.client_id && navigate(`/clients/${row.client_id}`)} className="text-left">
                            <span className="block font-bold text-white">{[row.client_prenom, row.client_nom].filter(Boolean).join(' ') || 'Client'}</span>
                            <span className="text-xs text-white/45">{row.type_contrat || 'Contrat'} · {row.contract_number || `#${row.contract_id}`}</span>
                          </button>
                        </td>
                        <td className="px-3 py-4 text-white/70">{row.insurer}</td>
                        <td className="px-3 py-4 text-right font-bold text-white">{formatCommissionCurrency(row.expected_amount_eur)}</td>
                        <td className="px-3 py-4 text-right font-bold text-emerald-200">{formatCommissionCurrency(row.received_amount_eur)}</td>
                        <td className="px-3 py-4"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-4 text-white/55">{row.broker_name || 'Courtier'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-2xl">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-black"><Building2 size={18} /> Saisie rapide</h2>
            <p className="mb-5 text-sm text-white/55">Ajoutez une commission sur un contrat existant via son identifiant COURTIA ou son numéro côté import CSV.</p>
            <form className="space-y-3" onSubmit={handleSaveManual}>
              <input value={manual.contractId} onChange={(e) => setManual({ ...manual, contractId: e.target.value })} placeholder="ID contrat COURTIA" className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35" />
              <input value={manual.insurer} onChange={(e) => setManual({ ...manual, insurer: e.target.value })} placeholder="Compagnie" className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35" />
              <input value={manual.period} onChange={(e) => setManual({ ...manual, period: e.target.value })} placeholder="Période YYYY-MM" className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35" />
              <div className="grid grid-cols-2 gap-3">
                <input value={manual.expected_amount} onChange={(e) => setManual({ ...manual, expected_amount: e.target.value })} placeholder="Attendu €" className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35" />
                <input value={manual.received_amount} onChange={(e) => setManual({ ...manual, received_amount: e.target.value })} placeholder="Reçu €" className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35" />
              </div>
              <select value={manual.status} onChange={(e) => setManual({ ...manual, status: e.target.value })} className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none">
                <option value="expected" className="text-slate-900">Prévue</option>
                <option value="partial" className="text-slate-900">Partielle</option>
                <option value="paid" className="text-slate-900">Payée</option>
                <option value="overdue" className="text-slate-900">En retard</option>
                <option value="cancelled" className="text-slate-900">Annulée</option>
              </select>
              <AuroraButton variant="primary" size="sm" icon={<Euro size={16} />} type="submit">Enregistrer commission</AuroraButton>
            </form>

            <div className="mt-6 rounded-2xl border border-cyan-200/10 bg-cyan-200/10 p-4 text-sm text-cyan-50/80">
              Format CSV accepté : compagnie, contrat_ref, periode, montant_attendu, montant_recu, statut, notes.
            </div>
          </aside>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            ['Par mois', stats?.by_month || [], (row) => `Mois ${row.month}`, 'Suivi mensuel des encaissements.'],
            ['Par compagnie', stats?.by_insurer || [], (row) => row.insurer, 'Lecture portefeuille assureurs.'],
            ['Par apporteur', stats?.by_broker || [], (row) => row.broker_name || 'Courtier', 'Pilotage broker / apporteur.'],
          ].map(([title, data, getLabel, subtitle]) => (
            <div key={title} className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-2xl">
              <h3 className="text-base font-black text-white">{title}</h3>
              <p className="mb-4 mt-1 text-sm text-white/45">{subtitle}</p>
              {data.length === 0 ? (
                <p className="rounded-2xl bg-white/[0.05] p-4 text-sm text-white/45">Aucune donnée.</p>
              ) : (
                <div className="space-y-3">
                  {data.slice(0, 6).map((row, index) => (
                    <div key={`${title}-${index}`} className="rounded-2xl bg-[#05081a]/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-bold text-white/85">{getLabel(row)}</span>
                        <span className="text-sm font-black text-cyan-100">{formatCommissionCurrency(row.received_amount_eur)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                          style={{ width: `${Math.min(100, Math.max(6, ((row.received_amount_eur || 0) / Math.max(1, stats?.totals?.received_amount_eur || summary.received || 1)) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-white/35">{row.count || 0} ligne(s) · attendu {formatCommissionCurrency(row.expected_amount_eur)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
