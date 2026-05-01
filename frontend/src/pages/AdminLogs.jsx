import { useState, useEffect } from 'react'
import { FileText, Shield, Clock } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import { adminFetch } from '../lib/adminApi'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminFetch(`/impersonation/logs?page=${page}&limit=20`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page])

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Journaux d'activité</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Historique des actions administratives • {total} entrée{total !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><CourtiaLogoLoader size={32} /></div>
      ) : logs.length === 0 ? (
        <AuroraEmptyState icon={FileText} title="Aucun journal disponible" subtitle="Les actions administratives apparaîtront ici lorsqu'elles seront enregistrées." />
      ) : (
        <>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Admin</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Courtier cible</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Raison</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Durée</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const duration = log.started_at && log.ended_at
                    ? Math.round((new Date(log.ended_at) - new Date(log.started_at)) / 60000)
                    : null
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.5)', fontSize: 11.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {log.started_at ? new Date(log.started_at).toLocaleString('fr-FR') : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#fff', fontSize: 12 }}>{log.admin_email || '—'}</td>
                      <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                        {log.target_first_name} {log.target_last_name}
                        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>{log.target_email}</div>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.45)', fontSize: 11.5, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.reason || '—'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                        {duration !== null ? `${duration} min` : 'En cours'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        {log.actions_count || 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                    background: page === i + 1 ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: page === i + 1 ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, cursor: 'pointer', fontWeight: page === i + 1 ? 600 : 400,
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Shield size={14} style={{ color: 'rgba(255,255,255,0.3)', marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
          Les journaux d'impersonation sont conservés de manière immuable pour la traçabilité légale.
          Chaque action administrative est horodatée et rattachée à l'administrateur qui l'a effectuée.
        </span>
      </div>
    </div>
  )
}
