import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw } from 'lucide-react'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import { publicApiFetch } from '../lib/adminApi'

const statusLabels = {
  new: 'Nouveau',
  seen: 'Vu',
  resolved: 'Traité',
}

export default function AdminFeedback() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadFeedback() {
    setLoading(true)
    setError('')
    try {
      const res = await publicApiFetch('/admin/feedback')
      if (!res.ok) throw new Error('feedback_unavailable')
      const data = await res.json()
      setRows(Array.isArray(data.rows) ? data.rows : [])
    } catch {
      setError('Feedback indisponible.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    await publicApiFetch(`/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
    await loadFeedback()
  }

  useEffect(() => { loadFeedback() }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#fff' }}>Feedback utilisateurs</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.46)' }}>
            Bugs, idées, frictions et signaux des premiers cabinets.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFeedback}
          style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 10, padding: '9px 12px', display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.55)' }}>Chargement...</p>
      ) : error ? (
        <AuroraEmptyState icon={MessageCircle} title="Feedback indisponible" subtitle={error} />
      ) : rows.length === 0 ? (
        <AuroraEmptyState icon={MessageCircle} title="Aucun feedback pour le moment" subtitle="Les retours envoyés depuis l’app apparaîtront ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((item) => (
            <article key={item.id} className="courtia-depth-card" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ borderRadius: 999, background: 'rgba(34,211,238,0.12)', color: '#8eeaff', padding: '4px 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{item.type}</span>
                    <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>{item.page || 'Page inconnue'}</span>
                  </div>
                  <p style={{ margin: 0, color: '#fff', fontSize: 14, lineHeight: 1.55 }}>{item.message}</p>
                  <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>
                    {item.email || `Utilisateur #${item.user_id}`} · {new Date(item.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => updateStatus(item.id, e.target.value)}
                  style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(0,0,0,0.24)', color: '#fff', padding: '7px 9px', fontSize: 12 }}
                >
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
