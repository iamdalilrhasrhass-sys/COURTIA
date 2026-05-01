import { useState, useEffect } from 'react'
import { Activity, Server, Database, Globe, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'

const API_URL = import.meta.env.VITE_API_URL || ''
const VPS_BACKEND = 'https://api.courtiark.fr'

export default function AdminSystem() {
  const [checks, setChecks] = useState(null)
  const [loading, setLoading] = useState(true)

  const runChecks = async () => {
    setLoading(true)
    const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
    const results = {}

    // API health
    try {
      const r = await fetch(`${API_URL}/api/health`, { headers: { Authorization: `Bearer ${token}` } })
      results.api = r.ok ? { ok: true, data: await r.json() } : { ok: false, status: r.status }
    } catch { results.api = { ok: false, error: 'Inaccessible' } }

    // DB check via admin analytics (requires DB)
    try {
      const r = await fetch(`${API_URL}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      results.db = r.ok ? { ok: true } : { ok: false, status: r.status }
    } catch { results.db = { ok: false, error: 'Inaccessible' } }

    // Frontend visible
    try {
      const r = await fetch('https://courtiark.fr', { mode: 'no-cors' })
      results.frontend = { ok: true, url: 'courtiark.fr' }
    } catch { results.frontend = { ok: false, error: 'Inaccessible' } }

    // VPS reachable (indirect — via API)
    results.vps = results.api.ok ? { ok: true, note: 'API répond depuis le VPS' } : { ok: false, note: 'API KO' }

    setChecks(results)
    setLoading(false)
  }

  useEffect(() => { runChecks() }, [])

  const checksList = [
    { key: 'api', icon: Server, label: 'API Backend', detail: checks?.api },
    { key: 'db', icon: Database, label: 'Base de données', detail: checks?.db },
    { key: 'frontend', icon: Globe, label: 'Frontend', detail: checks?.frontend },
    { key: 'vps', icon: Activity, label: 'VPS', detail: checks?.vps },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Santé système</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Surveillance en temps réel de l'infrastructure COURTIA</p>
        </div>
        <button onClick={runChecks}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#fff', fontSize: 12.5, cursor: 'pointer', fontWeight: 500,
          }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><CourtiaLogoLoader size={32} text="Vérification..." /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {checksList.map(({ key, icon: Icon, label, detail }) => (
            <div key={key} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: 22,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</span>
                </div>
                {detail?.ok === true ? (
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                ) : (
                  <XCircle size={16} style={{ color: '#ef4444' }} />
                )}
              </div>
              {detail?.ok === true ? (
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  {detail.data && <div>Version : {detail.data.version || detail.data.api || '—'}</div>}
                  {detail.data?.timestamp && <div>Horodatage : {new Date(detail.data.timestamp).toLocaleString('fr-FR')}</div>}
                  {detail.url && <div>URL : {detail.url}</div>}
                  {detail.note && <div>{detail.note}</div>}
                  <div style={{ marginTop: 6, color: '#10b981', fontWeight: 500 }}>✓ Opérationnel</div>
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: '#fca5a5', lineHeight: 1.6 }}>
                  <div>Status : {detail?.status || detail?.error || 'Erreur'}</div>
                  <div style={{ marginTop: 6, color: '#ef4444', fontWeight: 500 }}>✗ Défaillant</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Environment info */}
      <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Environnement</h3>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 2 }}>
          <div>Frontend : Vercel (courtiark.fr)</div>
          <div>Backend API : VPS 72.62.187.63 (PM2, Nginx, Certbot)</div>
          <div>Base de données : PostgreSQL (VPS local)</div>
          <div>API externe : {VPS_BACKEND}</div>
          <div>Mode : Production</div>
          <div>Gateway AI : DeepSeek v4 Pro</div>
        </div>
      </div>
    </div>
  )
}
