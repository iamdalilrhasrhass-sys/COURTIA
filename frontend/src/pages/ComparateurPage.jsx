import { useState, useEffect } from 'react'
import { Scale, TrendingUp, Zap, Loader2, Shield, Plus, Trash2, ChevronRight, Download, Send, CheckCircle2, Star, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://api.courtiark.fr'

export default function Comparateur() {
  const [clients, setClients] = useState([])
  const [partners, setPartners] = useState([])
  const [offers, setOffers] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [mode, setMode] = useState('list') // list | addOffer | compare

  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${API}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API}/api/partners`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ])
      setClients(cRes.data || cRes.clients || [])
      setPartners(pRes.partners || [])
    } catch (e) {
      console.error('Comparateur loadData', e)
    }
    setLoading(false)
  }

  async function loadOffers(clientId) {
    try {
      const res = await fetch(`${API}/api/comparator/runs?client_id=${clientId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      setOffers(res.offers || res.runs || [])
    } catch (e) { setOffers([]) }
  }

  async function runComparison() {
    if (!selectedClient) return
    setComparing(true)
    try {
      const res = await fetch(`${API}/api/comparator/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: selectedClient.id,
          produit: 'Auto',
          level: 'confort',
          profile: { age: 35, bonus_malus: 1.0, postal_code: '75001' }
        })
      })
      const d = await res.json()
      if (d.ok) {
        setComparisonResult(d)
        setMode('compare')
      }
    } catch (e) {
      console.error('Comparison failed', e)
    }
    setComparing(false)
  }

  const bestOffer = comparisonResult?.summary?.cheapest_provider
  const quotes = comparisonResult?.quotes || []

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 200, margin: 0, letterSpacing: -1 }}>Comparateur ARK</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 13 }}>
            Comparez les offres assureurs et obtenez la recommandation ARK
          </p>
        </div>
        {mode === 'compare' && comparisonResult && (
          <button onClick={() => { setMode('addOffer') }}
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Ajouter une offre manuelle
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
        </div>
      ) : mode === 'addOffer' ? (
        <AddOfferForm token={token} API={API} clients={clients} partners={partners}
          selectedClient={selectedClient} setSelectedClient={setSelectedClient}
          onDone={() => { setMode('list'); selectedClient && loadOffers(selectedClient.id) }} />
      ) : mode === 'compare' && comparisonResult ? (
        <ComparisonResult result={comparisonResult} bestOffer={bestOffer} quotes={quotes}
          onBack={() => setMode('list')} token={token} API={API} />
      ) : (
        <div>
          {/* Client selector + comparator trigger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 24 }}>
              <h3 style={{ fontWeight: 300, fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} style={{ color: '#8b5cf6' }} /> Client / Prospect
              </h3>
              <select value={selectedClient?.id || ''} onChange={e => {
                const c = clients.find(c => c.id === parseInt(e.target.value))
                setSelectedClient(c || null)
                if (c) loadOffers(c.id)
              }} style={selectStyle}>
                <option value="">Sélectionner un client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.status || 'prospect'}</option>
                ))}
              </select>
              {selectedClient && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {selectedClient.email && <div>Email: {selectedClient.email}</div>}
                  {selectedClient.phone && <div>Tél: {selectedClient.phone}</div>}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 24 }}>
              <h3 style={{ fontWeight: 300, fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={16} style={{ color: '#6366f1' }} /> Action
              </h3>
              <button onClick={runComparison} disabled={!selectedClient || comparing}
                style={{
                  ...btnPrimary, width: '100%', opacity: selectedClient ? 1 : 0.4,
                  justifyContent: 'center', padding: '14px 24px', fontSize: 14
                }}>
                {comparing ? <Loader2 size={18} /> : <Zap size={18} />}
                {comparing ? 'Comparaison en cours...' : 'Lancer la comparaison ARK'}
              </button>
              <button onClick={() => setMode('addOffer')} disabled={!selectedClient}
                style={{
                  ...btnSecondary, width: '100%', marginTop: 12,
                  opacity: selectedClient ? 1 : 0.4, justifyContent: 'center'
                }}>
                <Plus size={16} /> Saisir une offre manuelle
              </button>
            </div>
          </div>

          {/* Existing offers */}
          {selectedClient && offers.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 300, fontSize: 16, margin: '24px 0 12px' }}>
                Offres enregistrées ({offers.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {offers.map((o, i) => (
                  <div key={i} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{o.product_name || o.produit || 'Offre'}</span>
                      <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 16 }}>
                        {o.monthly_price || o.annual_price ? (o.monthly_price || Math.round((o.annual_price || 0) / 12)) + ' €/mois' : '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                      {o.partner_name && <span>Partenaire: {o.partner_name}</span>}
                      {o.franchise && <span> · Franchise: {o.franchise}€</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!selectedClient && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Scale size={48} style={{ color: 'rgba(139,92,246,0.2)', marginBottom: 16 }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Sélectionnez un client pour comparer les offres
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ComparisonResult({ result, bestOffer, quotes, onBack, token, API }) {
  if (!result) return null
  return (
    <div>
      {/* Best offer highlight */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.05))',
        border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: 28, marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Star size={24} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
              Recommandation ARK
            </div>
            <div style={{ fontSize: 20, fontWeight: 300 }}>{bestOffer || 'Meilleure offre'}</div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          {result.summary?.ark_explanation || 'ARK a analysé les offres disponibles et recommande cette solution pour le meilleur équilibre prix/garanties.'}
        </p>
      </div>

      {/* Comparison table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={16} style={{ color: '#8b5cf6' }} />
          <span style={{ fontWeight: 300, fontSize: 16 }}>Tableau comparatif</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={thStyle}>Compagnie</th>
              <th style={thStyle}>Prime/mois</th>
              <th style={thStyle}>Prime/an</th>
              <th style={thStyle}>Franchise</th>
              <th style={thStyle}>Garanties</th>
              <th style={thStyle}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={tdStyle}>{q.provider || q.compagnie || `Offre ${i + 1}`}</td>
                <td style={{ ...tdStyle, color: q.monthly_price ? '#22c55e' : 'inherit', fontWeight: 500 }}>
                  {q.monthly_price ? q.monthly_price + ' €' : '-'}
                </td>
                <td style={tdStyle}>{q.annual_price ? q.annual_price + ' €' : '-'}</td>
                <td style={tdStyle}>{q.deductible ? q.deductible + ' €' : '-'}</td>
                <td style={tdStyle}>
                  {q.guarantees && typeof q.guarantees === 'object' ? Object.keys(q.guarantees).join(', ') : '-'}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                    background: q.provider === bestOffer ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                    color: q.provider === bestOffer ? '#86efac' : 'rgba(255,255,255,0.5)',
                    border: '1px solid ' + (q.provider === bestOffer ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'),
                  }}>
                    {q.provider === bestOffer ? '★ Meilleur' : 'Alternative'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour
        </button>
      </div>
    </div>
  )
}

function AddOfferForm({ token, API, clients, partners, selectedClient, setSelectedClient, onDone }) {
  const [form, setForm] = useState({
    client_id: selectedClient?.id || '',
    partner_id: '', product_name: '', monthly_price: '', annual_price: '',
    fees: '', deductible: '', commission_rate: '', guarantees: '', notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch(`${API}/api/quote-offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: form.client_id,
          partner_id: form.partner_id || null,
          product_name: form.product_name,
          monthly_price: parseFloat(form.monthly_price) || null,
          annual_price: parseFloat(form.annual_price) || null,
          fees: parseFloat(form.fees) || null,
          deductible: parseFloat(form.deductible) || null,
          commission_rate: parseFloat(form.commission_rate) || null,
          guarantees: form.guarantees ? { description: form.guarantees } : {},
          notes: form.notes,
          source: 'manual', status: 'pending',
        })
      })
      onDone()
    } catch (e) { console.error(e) }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 28 }}>
      <h2 style={{ fontWeight: 300, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Plus size={18} style={{ color: '#8b5cf6' }} /> Saisir une offre manuelle
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '0 0 24px' }}>
        Saisissez les informations de l'offre obtenue auprès du partenaire. ARK comparera automatiquement.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Client</label>
          <select value={form.client_id} onChange={e => {
            setForm({ ...form, client_id: e.target.value })
            const c = clients.find(c => c.id === parseInt(e.target.value))
            if (c) setSelectedClient(c)
          }} style={selectStyle}>
            <option value="">Sélectionner...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Partenaire</label>
          <select value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })} style={selectStyle}>
            <option value="">Sélectionner un partenaire...</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.nom} ({p.type_partenaire || 'manuel'})</option>
            ))}
          </select>
        </div>
        <Field2 label="Produit" value={form.product_name} onChange={v => setForm({ ...form, product_name: v })} placeholder="Ex: Auto Tous Risques" />
        <Field2 label="Prix mensuel (€)" value={form.monthly_price} onChange={v => setForm({ ...form, monthly_price: v })} placeholder="45.90" type="number" />
        <Field2 label="Prix annuel (€)" value={form.annual_price} onChange={v => setForm({ ...form, annual_price: v })} placeholder="550" type="number" />
        <Field2 label="Frais (€)" value={form.fees} onChange={v => setForm({ ...form, fees: v })} placeholder="30" type="number" />
        <Field2 label="Franchise (€)" value={form.deductible} onChange={v => setForm({ ...form, deductible: v })} placeholder="250" type="number" />
        <Field2 label="Commission (%)" value={form.commission_rate} onChange={v => setForm({ ...form, commission_rate: v })} placeholder="15" type="number" />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Garanties</label>
          <textarea value={form.guarantees} onChange={e => setForm({ ...form, guarantees: e.target.value })}
            placeholder="RC, Défense Recours, Vol, Incendie, Bris de glace..."
            style={{ ...inputStyle2, minHeight: 60, resize: 'vertical' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes sur l'offre..."
            style={{ ...inputStyle2, minHeight: 50, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1 }}>
          {submitting ? <Loader2 size={14} /> : <Plus size={14} />} Enregistrer l'offre
        </button>
        <button type="button" onClick={onDone} style={btnSecondary}>Annuler</button>
      </div>
    </form>
  )
}

function Field2({ label, value, onChange, placeholder, type }) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle2} />
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }
const inputStyle2 = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const selectStyle = { ...inputStyle2, cursor: 'pointer' }
const cardStyle = { background: 'rgba(255,255,255,0.025)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 16 }
const thStyle = { padding: '12px 14px', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }
const tdStyle = { padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.7)' }
const btnPrimary = { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: '#fff', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }
const btnSecondary = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }
