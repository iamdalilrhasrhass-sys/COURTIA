import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Shield, Globe, Wrench, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff, Key, Link2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://api.courtiark.fr'

export default function Partenaires() {
  const [partners, setPartners] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('list') // list | add | edit | credentials

  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [pRes, provRes] = await Promise.all([
        fetch(`${API}/api/partners`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API}/api/insurance-providers`).then(r => r.json()),
      ])
      setPartners(pRes.partners || [])
      setProviders(provRes.providers || [])
    } catch (e) {
      console.error('loadData', e)
      setPartners([])
      setProviders([])
    }
    setLoading(false)
  }

  const typeIcon = { api: <Key size={14} />, extranet: <Globe size={14} />, manual: <Wrench size={14} /> }
  const typeLabel = { api: 'API', extranet: 'Extranet', manual: 'Manuel' }
  const statusColor = { connecte: '#22c55e', a_tester: '#f59e0b', manuel: '#8b5cf6', invalide: '#ef4444', to_check: '#f59e0b', A_contacter: '#64748b', En_cours: '#3b82f6', Actif: '#22c55e' }

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 200, margin: 0, letterSpacing: -1 }}>Partenaires & Accès</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 13 }}>
            Gérez vos partenaires assureurs et leurs accès
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setMode('add')} style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            border: 'none', color: '#fff', borderRadius: 12,
            padding: '10px 20px', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={16} /> Ajouter un partenaire
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
        </div>
      ) : mode === 'add' ? (
        <AddPartnerForm token={token} API={API} onDone={() => { setMode('list'); loadData() }} />
      ) : mode === 'edit' && selected ? (
        <EditPartnerForm token={token} API={API} partner={selected} onDone={() => { setMode('list'); setSelected(null); loadData() }} />
      ) : mode === 'credentials' && selected ? (
        <CredentialsForm token={token} API={API} partner={selected} onDone={() => { setMode('list'); setSelected(null); loadData() }} />
      ) : partners.length === 0 ? (
        <EmptyState onAdd={() => setMode('add')} />
      ) : (
        <div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {[{ label: 'Partenaires', value: partners.length, color: '#8b5cf6' },
              { label: 'Actifs', value: partners.filter(p => p.statut === 'Actif' || p.status === 'active').length, color: '#22c55e' },
              { label: 'À tester', value: partners.filter(p => p.statut === 'A_tester' || p.statut === 'to_check').length, color: '#f59e0b' },
              { label: 'Manuels', value: partners.filter(p => p.type_partenaire === 'manuel' || p.access_type === 'manual').length, color: '#6366f1' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '16px 24px', flex: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Partners grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {partners.map(p => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.025)', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.06)', padding: 24,
                transition: 'all 0.2s', cursor: 'pointer',
              }} onClick={() => setSelected(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {typeIcon[p.type_partenaire || p.access_type] || <Shield size={16} style={{ color: '#8b5cf6' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{p.nom || p.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {p.categorie || p.supported_lines?.join(', ') || p.insurance_type || 'Non catégorisé'}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 10,
                    background: (statusColor[p.statut || p.status] || '#64748b') + '22',
                    color: statusColor[p.statut || p.status] || '#64748b',
                    border: '1px solid ' + (statusColor[p.statut || p.status] || '#64748b') + '33',
                    fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase'
                  }}>
                    {typeLabel[p.type_partenaire || p.access_type] || p.type_partenaire || p.access_type || 'manuel'}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12, display: 'flex', gap: 16 }}>
                  {p.statut && <span>● {(p.statut || '').replace(/_/g, ' ')}</span>}
                  {p.commission && <span>Commission: {p.commission}</span>}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                  <ActionBtn icon={<Eye size={13} />} label="Voir" onClick={(e) => { e.stopPropagation(); setSelected(p) }} />
                  <ActionBtn icon={<Edit3 size={13} />} label="Modifier" onClick={(e) => { e.stopPropagation(); setSelected(p); setMode('edit') }} />
                  <ActionBtn icon={<Key size={13} />} label="Accès" onClick={(e) => { e.stopPropagation(); setSelected(p); setMode('credentials') }} highlight />
                </div>
              </div>
            ))}
          </div>

          {/* Selected partner detail */}
          {selected && mode === 'list' && (
            <PartnerDetail partner={selected} onClose={() => setSelected(null)}
              onEdit={() => setMode('edit')}
              onCredentials={() => setMode('credentials')}
              token={token} API={API} onDelete={() => { setSelected(null); loadData() }} />
          )}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, highlight }) {
  return (
    <button onClick={onClick} style={{
      background: highlight ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
      border: '1px solid ' + (highlight ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'),
      color: highlight ? '#a78bfa' : 'rgba(255,255,255,0.5)',
      borderRadius: 10, padding: '6px 14px', cursor: 'pointer',
      fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
      transition: 'all 0.2s',
    }}>
      {icon}{label}
    </button>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Shield size={48} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 16 }} />
      <h3 style={{ fontWeight: 300, fontSize: 20, margin: '0 0 8px' }}>Aucun partenaire</h3>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 24px' }}>
        Ajoutez vos partenaires assureurs pour commencer à comparer les offres
      </p>
      <button onClick={onAdd} style={{
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        border: 'none', color: '#fff', borderRadius: 12,
        padding: '10px 24px', cursor: 'pointer', fontSize: 13,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <Plus size={16} /> Premier partenaire
      </button>
    </div>
  )
}

function PartnerDetail({ partner, onClose, onEdit, onCredentials, token, API, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      setTestResult(d.success ? 'ok' : (d.error || 'Échec'))
    } catch (e) {
      setTestResult('Réseau indisponible')
    }
    setTesting(false)
  }
  async function handleDelete() {
    if (!confirm(`Supprimer ${partner.nom || partner.name} ?`)) return
    setDeleting(true)
    await fetch(`${API}/api/partners/${partner.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    })
    onDelete()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: '#0f0f23', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', padding: 32, maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ fontWeight: 300, margin: '0 0 24px', fontSize: 22 }}>{partner.nom || partner.name}</h2>
        <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
          <Row label="Type" value={partner.type_partenaire || partner.access_type || '-'} />
          <Row label="Catégorie" value={partner.categorie || '-'} />
          <Row label="Statut" value={(partner.statut || partner.status || '-').replace(/_/g, ' ')} />
          <Row label="URL Extranet" value={partner.extranet_url || '-'} />
          <Row label="Login" value={partner.masked_login || partner.extranet_login ? '••••••••' : '-'} />
          <Row label="Produit" value={partner.produit_principal || '-'} />
          <Row label="Commission" value={partner.commission || '-'} />
          <Row label="Code courtage" value={partner.code_courtage || '-'} />
          {partner.notes && <Row label="Notes" value={partner.notes} />}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16, flexWrap: 'wrap' }}>
          <button onClick={() => { onClose(); onCredentials() }} style={btnStyle('#8b5cf6')}><Key size={14} /> Accès</button>
          <button onClick={() => { onClose(); onEdit() }} style={btnStyle('#6366f1')}><Edit3 size={14} /> Modifier</button>
          <button onClick={handleTestConnection} disabled={testing} style={btnStyle(testResult === 'ok' ? '#22c55e' : '#f59e0b')}>
            {testing ? <Loader2 size={14} /> : <Globe size={14} />}
            {testing ? 'Test...' : testResult === 'ok' ? '✓ Connecté' : testResult ? '✗ ' + testResult : 'Tester connexion'}
          </button>
          <button onClick={handleDelete} disabled={deleting} style={btnStyle('#ef4444')}>
            {deleting ? <Loader2 size={14} /> : <Trash2 size={14} />} Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

function AddPartnerForm({ token, API, onDone }) {
  const [form, setForm] = useState({ nom: '', type_partenaire: 'manual', categorie: '', extranet_url: '', extranet_login: '', commission: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) return setError('Le nom est requis')
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, statut: 'A_contacter' })
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error || 'Erreur serveur')
      onDone()
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 520, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 28 }}>
      <h2 style={{ fontWeight: 300, margin: '0 0 24px' }}>Ajouter un partenaire</h2>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#fca5a5' }}>{error}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nom du partenaire *" value={form.nom} onChange={v => setForm({ ...form, nom: v })} placeholder="Ex: April, Alptis, Solly Azar..." />
        <div>
          <label style={labelStyle}>Type</label>
          <select value={form.type_partenaire} onChange={e => setForm({ ...form, type_partenaire: e.target.value })} style={selectStyle}>
            <option value="manual">Manuel</option>
            <option value="extranet">Extranet</option>
            <option value="api">API</option>
          </select>
        </div>
        <Field label="Catégorie / Branche" value={form.categorie} onChange={v => setForm({ ...form, categorie: v })} placeholder="Auto, Santé, Pro, MRH..." />
        <Field label="URL Extranet" value={form.extranet_url} onChange={v => setForm({ ...form, extranet_url: v })} placeholder="https://..." />
        <Field label="Identifiant (masqué)" value={form.extranet_login} onChange={v => setForm({ ...form, extranet_login: v })} placeholder="Login extranet" />
        <Field label="Commission" value={form.commission} onChange={v => setForm({ ...form, commission: v })} placeholder="Ex: 15%" />
        <Field label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Notes internes..." isArea />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" disabled={submitting} style={{ ...btnStyle('#8b5cf6'), flex: 1 }}>
          {submitting ? <Loader2 size={14} /> : <Plus size={14} />} Ajouter
        </button>
        <button type="button" onClick={onDone} style={btnStyle('transparent', 'rgba(255,255,255,0.15)')}>Annuler</button>
      </div>
    </form>
  )
}

function EditPartnerForm({ token, API, partner, onDone }) {
  const [form, setForm] = useState({
    nom: partner.nom || '', type_partenaire: partner.type_partenaire || 'manual',
    categorie: partner.categorie || '', extranet_url: partner.extranet_url || '',
    extranet_login: partner.extranet_login || '', commission: partner.commission || '',
    notes: partner.notes || '', statut: partner.statut || 'A_contacter'
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    await fetch(`${API}/api/partners/${partner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 520, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 28 }}>
      <h2 style={{ fontWeight: 300, margin: '0 0 24px' }}>Modifier {partner.nom}</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v })} />
        <div>
          <label style={labelStyle}>Type</label>
          <select value={form.type_partenaire} onChange={e => setForm({ ...form, type_partenaire: e.target.value })} style={selectStyle}>
            <option value="manual">Manuel</option>
            <option value="extranet">Extranet</option>
            <option value="api">API</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Statut</label>
          <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} style={selectStyle}>
            <option value="A_contacter">À contacter</option>
            <option value="En_cours">En cours</option>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
          </select>
        </div>
        <Field label="Catégorie" value={form.categorie} onChange={v => setForm({ ...form, categorie: v })} />
        <Field label="URL Extranet" value={form.extranet_url} onChange={v => setForm({ ...form, extranet_url: v })} />
        <Field label="Commission" value={form.commission} onChange={v => setForm({ ...form, commission: v })} />
        <Field label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} isArea />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" disabled={submitting} style={{ ...btnStyle('#8b5cf6'), flex: 1 }}>Enregistrer</button>
        <button type="button" onClick={onDone} style={btnStyle('transparent', 'rgba(255,255,255,0.15)')}>Annuler</button>
      </div>
    </form>
  )
}

function CredentialsForm({ token, API, partner, onDone }) {
  const [form, setForm] = useState({ encrypted_password: '', encrypted_api_key: '', encrypted_broker_code: '' })
  const [showPass, setShowPass] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/test-connection`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      setTestResult(d.success ? '✅ Connexion vérifiée' : '❌ ' + (d.error || 'Échec'))
    } catch (e) {
      setTestResult('❌ ' + e.message)
    }
    setTesting(false)
  }

  return (
    <div style={{ maxWidth: 520, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Shield size={20} style={{ color: '#8b5cf6' }} />
        <h2 style={{ fontWeight: 300, margin: 0 }}>Accès {partner.nom}</h2>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>
        Les identifiants sont chiffrés (AES-256-GCM). Jamais stockés en clair.
        {partner.type_partenaire === 'manuel' && ' Ce partenaire est en mode manuel — les champs sont optionnels.'}
      </p>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={labelStyle}>Mot de passe</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type={showPass ? 'text' : 'password'} value={form.encrypted_password}
              onChange={e => setForm({ ...form, encrypted_password: e.target.value })}
              placeholder="Mot de passe extranet / API"
              style={inputStyle} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ ...btnStyle('transparent', 'rgba(255,255,255,0.06)'), padding: '8px 12px' }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <Field label="Clé API" value={form.encrypted_api_key} onChange={v => setForm({ ...form, encrypted_api_key: v })}
          placeholder="sk-..." type="password" />
        <Field label="Code courtier" value={form.encrypted_broker_code} onChange={v => setForm({ ...form, encrypted_broker_code: v })}
          placeholder="Code courtage" />
      </div>

      {testResult && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, fontSize: 13,
          background: testResult.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: '1px solid ' + (testResult.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'),
          color: testResult.startsWith('✅') ? '#86efac' : '#fca5a5' }}>
          {testResult}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={handleTest} disabled={testing} style={btnStyle('#f59e0b')}>
          {testing ? <Loader2 size={14} /> : <Link2 size={14} />} Tester la connexion
        </button>
        <button onClick={onDone} style={{ ...btnStyle('#8b5cf6'), marginLeft: 'auto' }}>Fermer</button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 12, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, isArea, type }) {
  const Comp = isArea ? 'textarea' : 'input'
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <Comp type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, ...(isArea ? { minHeight: 80, resize: 'vertical' } : {}) }} />
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const btnStyle = (bg, border) => ({
  background: bg === 'transparent' ? 'transparent' : bg,
  border: `1px solid ${border || 'rgba(255,255,255,0.08)'}`,
  color: bg === 'transparent' ? 'rgba(255,255,255,0.5)' : '#fff',
  borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 12,
  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
  justifyContent: 'center',
})
