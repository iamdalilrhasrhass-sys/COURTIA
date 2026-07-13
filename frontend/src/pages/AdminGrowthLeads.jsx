import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { buildApiUrl, getAuthToken } from '../api/sessionPolicy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const STATUS_OPTIONS = [
  { key: 'tous', label: 'Tous' },
  { key: 'a_contacter', label: 'À contacter' },
  { key: 'contacte', label: 'Contacté' },
  { key: 'demo_prevue', label: 'Démo prévue' },
  { key: 'gagne', label: 'Gagné' },
  { key: 'perdu', label: 'Perdu' },
]

const PRIORITY_OPTIONS = [
  { key: 'all', label: 'Toutes priorités' },
  { key: 'A', label: 'Priorité A' },
  { key: 'B', label: 'Priorité B' },
  { key: 'C', label: 'Priorité C' },
]

const MARKET_OPTIONS = [
  { key: 'all', label: 'Tous marchés' },
  { key: 'FR', label: 'France' },
  { key: 'CH', label: 'Suisse' },
]

function badge(status) {
  const map = {
    a_contacter: { bg: 'rgba(59,130,246,0.14)', color: '#93c5fd', label: 'À contacter' },
    contacte: { bg: 'rgba(245,158,11,0.14)', color: '#fcd34d', label: 'Contacté' },
    demo_prevue: { bg: 'rgba(124,58,237,0.14)', color: '#c4b5fd', label: 'Démo prévue' },
    gagne: { bg: 'rgba(16,185,129,0.14)', color: '#6ee7b7', label: 'Gagné' },
    perdu: { bg: 'rgba(239,68,68,0.14)', color: '#fca5a5', label: 'Perdu' },
  }
  return map[status] || { bg: 'rgba(148,163,184,0.14)', color: '#cbd5e1', label: status || 'Inconnu' }
}

function scoreColor(priority) {
  if (priority === 'A') return '#22c55e'
  if (priority === 'B') return '#f59e0b'
  return '#94a3b8'
}

export default function AdminGrowthLeads() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')
  const [refreshNonce, setRefreshNonce] = useState(0)

  const token = getAuthToken()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const params = new URLSearchParams()
        params.set('limit', '200')
        if (statusFilter !== 'tous') params.set('status', statusFilter)
        if (priorityFilter !== 'all') params.set('priority', priorityFilter)
        if (marketFilter !== 'all') params.set('market', marketFilter)

        const res = await fetch(buildApiUrl(`/leads/demo-requests?${params.toString()}`, API_URL), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (cancelled) return
        setRows(Array.isArray(json?.rows) ? json.rows : [])
        setError('')
      } catch (err) {
        if (cancelled) return
        setError('Impossible de charger les leads démo.')
        console.error('AdminGrowthLeads.load', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [statusFilter, priorityFilter, marketFilter, refreshNonce, token])

  const kpis = useMemo(() => {
    const total = rows.length
    const aContacter = rows.filter((r) => r.status === 'a_contacter').length
    const demos = rows.filter((r) => r.status === 'demo_prevue').length
    const won = rows.filter((r) => r.status === 'gagne').length
    const marketingOptIns = rows.filter((r) => r.marketing_consent && !r.opt_out).length
    return { total, aContacter, demos, won, marketingOptIns }
  }, [rows])

  async function updateStatus(id, nextStatus) {
    setSavingId(id)
    try {
      const res = await fetch(buildApiUrl(`/leads/demo-requests/${id}`, API_URL), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRows((prev) => prev.map((row) => row.id === id ? { ...row, status: nextStatus } : row))
    } catch (err) {
      console.error('AdminGrowthLeads.updateStatus', err)
      setError('Mise à jour du statut impossible.')
    } finally {
      setSavingId(null)
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(buildApiUrl('/leads/demo-requests/export', API_URL), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `courtia-demo-requests-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('AdminGrowthLeads.exportCsv', err)
      setError('Export CSV impossible pour le moment.')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#fff' }}>Growth Leads</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Demandes de démo landing, qualification A/B/C et suivi commercial.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setLoading(true)
              setRefreshNonce((v) => v + 1)
            }}
            style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.03)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Rafraîchir
          </button>
          <button
            onClick={exportCsv}
            style={{ border: '1px solid rgba(147,197,253,0.25)', background: 'rgba(37,99,235,0.25)', color: '#dbeafe', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Leads total', value: kpis.total },
          { label: 'À contacter', value: kpis.aContacter },
          { label: 'Démos prévues', value: kpis.demos },
          { label: 'Gagnés', value: kpis.won },
          { label: 'Opt-ins e-mail', value: kpis.marketingOptIns },
        ].map((item) => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ margin: '0 0 5px', fontSize: 11, color: 'rgba(255,255,255,0.46)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
            <p style={{ margin: 0, fontSize: 24, color: '#fff', fontWeight: 700 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 600 }}>
          <Filter size={13} /> Filtres
        </span>
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              setLoading(true)
              setStatusFilter(option.key)
            }}
            style={{ border: statusFilter === option.key ? '1px solid rgba(59,130,246,0.9)' : '1px solid rgba(255,255,255,0.12)', background: statusFilter === option.key ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.03)', color: '#fff', borderRadius: 999, padding: '6px 11px', fontSize: 12, cursor: 'pointer' }}
          >
            {option.label}
          </button>
        ))}
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              setLoading(true)
              setPriorityFilter(option.key)
            }}
            style={{ border: priorityFilter === option.key ? '1px solid rgba(16,185,129,0.9)' : '1px solid rgba(255,255,255,0.12)', background: priorityFilter === option.key ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)', color: '#fff', borderRadius: 999, padding: '6px 11px', fontSize: 12, cursor: 'pointer' }}
          >
            {option.label}
          </button>
        ))}
        {MARKET_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              setLoading(true)
              setMarketFilter(option.key)
            }}
            style={{ border: marketFilter === option.key ? '1px solid rgba(236,72,153,0.9)' : '1px solid rgba(255,255,255,0.12)', background: marketFilter === option.key ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.03)', color: '#fff', borderRadius: 999, padding: '6px 11px', fontSize: 12, cursor: 'pointer' }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1160 }}>
          <thead>
            <tr>
              {['Lead', 'Cabinet', 'Ville', 'Marché', 'Taille', 'Priorité', 'Opt-in e-mail', 'Source', 'Statut', 'Créé', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.52)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ padding: 18, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Chargement des leads…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: 22, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Aucun lead pour ces filtres.</td>
              </tr>
            ) : rows.map((row) => {
              const s = badge(row.status)
              return (
                <tr key={row.id}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{row.first_name} {row.last_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12 }}>{row.email}</div>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.88)', fontSize: 13 }}>{row.company_name || '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{row.city || '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: row.market === 'CH' ? '#f9a8d4' : '#93c5fd', fontSize: 12, fontWeight: 700 }}>{row.market || 'FR'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{row.team_size || '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: scoreColor(row.priority), fontWeight: 700, fontSize: 12 }}>{row.priority}</span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: row.marketing_consent && !row.opt_out ? '#6ee7b7' : 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700 }}>
                    {row.marketing_consent && !row.opt_out ? 'Oui' : 'Non'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{row.source || 'landing'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                    {row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['a_contacter', 'contacte', 'demo_prevue', 'gagne', 'perdu'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(row.id, status)}
                          disabled={savingId === row.id || row.status === status}
                          style={{
                            border: '1px solid rgba(255,255,255,0.14)',
                            background: row.status === status ? 'rgba(34,197,94,0.2)' : 'transparent',
                            color: '#fff',
                            borderRadius: 6,
                            fontSize: 10,
                            padding: '4px 6px',
                            cursor: row.status === status ? 'default' : 'pointer',
                            opacity: savingId === row.id && row.status !== status ? 0.5 : 1,
                          }}
                        >
                          {row.status === status ? <CheckCircle2 size={10} style={{ display: 'inline' }} /> : status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
