import { useCallback, useEffect, useState } from 'react'
import { Fingerprint, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { formatDateTime } from '../../lib/salesProspecting'

export default function SalesAuditPanel() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [verification, setVerification] = useState(null)
  const load = useCallback(async () => { const response = await salesApi.audit({ action: search || undefined, limit: 100 }); setLogs(response.data.logs || []) }, [search])
  useEffect(() => {
    let active = true
    salesApi.audit({ limit: 100 }).then((response) => { if (active) setLogs(response.data.logs || []) }).catch(() => {})
    return () => { active = false }
  }, [])
  async function verify() { try { const response = await salesApi.verifyAudit(); setVerification(response.data); toast.success(response.data.valid ? 'Chaîne d’audit intacte' : 'Anomalie détectée') } catch { toast.error('Vérification impossible') } }
  return <section className="sales-panel sales-audit-panel"><header><div><span className="sales-kicker"><Fingerprint size={15} /> Append-only</span><h3>Journal complet des actions</h3><p>Chaque entrée est chaînée par SHA-256. Les mises à jour et suppressions sont interdites par la base.</p></div><button className="sales-button secondary" onClick={verify}><ShieldCheck size={16} /> Vérifier l’intégrité</button></header>{verification && <div className={`sales-audit-verification ${verification.valid ? 'is-valid' : 'is-broken'}`}>{verification.valid ? `Chaîne valide · ${verification.checked} entrées contrôlées` : `Chaîne rompue à l’entrée #${verification.broken_at}`}</div>}<div className="sales-filter-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer par action…" onKeyDown={(e) => e.key === 'Enter' && load()} /><button className="sales-button secondary" onClick={load}>Filtrer</button></div><div className="sales-audit-list">{logs.map((item) => <article key={item.id}><span className="sales-audit-hash">{item.entry_hash?.slice(0, 8)}</span><div><strong>{item.action}</strong><span>{item.username || item.email || 'Système'} · {item.cabinet_name || `${item.entity_type} #${item.entity_id || '—'}`}</span><small>{formatDateTime(item.created_at)} · {item.ip_address || 'IP non disponible'}</small></div></article>)}</div></section>
}
