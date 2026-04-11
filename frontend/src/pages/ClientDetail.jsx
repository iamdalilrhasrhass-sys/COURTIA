import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('token') }
function fmt(v) { if (v === null || v === undefined || v === '') return '—'; return String(v) }
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }
function fmtEur(v) { if (v === null || v === undefined) return '—'; return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v)) }

function Stars({ score }) {
  const stars = Math.round((Number(score) || 0) / 20)
  return (
    <span style={{ fontSize: 16, letterSpacing: 2 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= stars ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
    </span>
  )
}

function ScoreBar({ value, max = 100, color = '#3b82f6' }) {
  const pct = Math.min(100, Math.round((Number(value) || 0) / max * 100))
  return (
    <div>
      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'block' }}>{value || 0} / {max}</span>
    </div>
  )
}

// ARK Chat Drawer
function ArkDrawer({ client, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(msg) {
    if (!msg || !msg.trim()) return
    const text = msg.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    setSlowWarning(false)
    const timeout = setTimeout(() => setSlowWarning(true), 35000)
    try {
      const res = await axios.post(`${API_URL}/api/ark/chat`, {
        message: text,
        clientData: client,
        conversationHistory: messages.slice(-10)
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
        timeout: 90000
      })
      const reply = res.data?.reply || res.data?.message || JSON.stringify(res.data)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const errMsg = err.code === 'ECONNABORTED'
        ? 'ARK se réveille... encore quelques secondes. Réessayez.'
        : err.response?.data?.error || 'ARK temporairement indisponible.'
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    } finally {
      setLoading(false)
      clearTimeout(timeout)
      setSlowWarning(false)
    }
  }

  const QUICK = [
    { label: '🔍 Analyser les risques', prompt: 'Analyse en détail le profil de risque de ce client. Points de vigilance ?' },
    { label: '💡 Opportunités cross-sell', prompt: 'Quelles sont les opportunités de cross-sell ou up-sell les plus pertinentes pour ce client ?' },
    { label: '📧 Email de relance', prompt: 'Rédige un email de relance professionnel pour ce client en mentionnant les contrats proches de l\'échéance.' },
    { label: '⚠️ Risque résiliation', prompt: 'Évalue le risque de résiliation de ce client sur 10 et propose des actions préventives.' }
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>ARK — Assistant IA</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderBottom: '1px solid #1f2937' }}>
          {QUICK.map(q => (
            <button key={q.label} onClick={() => sendMessage(q.prompt)}
              style={{ padding: '8px 10px', background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
              Posez une question à ARK sur ce client...
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10, maxWidth: '85%',
              background: m.role === 'user' ? '#1d4ed8' : '#1f2937',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <p style={{ color: 'white', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</p>
            </div>
          ))}
          {loading && (
            <div style={{ padding: '10px 14px', background: '#1f2937', borderRadius: 10, alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#60a5fa',
                    animation: `dotBounce 1.2s ease ${i * 0.2}s infinite`
                  }} />
                ))}
                <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
              </div>
              {slowWarning && (
                <p style={{ color: '#9ca3af', fontSize: 11, margin: '6px 0 0' }}>ARK se réveille... encore quelques secondes</p>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px', borderTop: '1px solid #1f2937', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Demandez à ARK..."
            style={{ flex: 1, padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: 'white', fontSize: 14, outline: 'none' }} />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            style={{ padding: '10px 16px', background: loading || !input.trim() ? '#374151' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: 18 }}>
            →
          </button>
        </div>
      </div>
    </>
  )
}

// Modal modifier client
function EditModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({ ...client })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await axios.put(`${API_URL}/api/clients/${client.id}`, form, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      toast.success('Client mis à jour ✓')
      onSaved()
      onClose()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'nom', label: 'Nom', type: 'text' },
    { key: 'prenom', label: 'Prénom', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'telephone', label: 'Téléphone', type: 'text' },
    { key: 'adresse', label: 'Adresse', type: 'text' },
    { key: 'profession', label: 'Profession', type: 'text' },
    { key: 'bonus_malus', label: 'Bonus-malus', type: 'number' },
    { key: 'annees_permis', label: 'Années permis', type: 'number' },
    { key: 'nb_sinistres_3ans', label: 'Sinistres 3 ans', type: 'number' },
  ]
  const selects = [
    { key: 'statut', label: 'Statut', opts: ['prospect', 'actif', 'perdu'] },
    { key: 'zone_geographique', label: 'Zone', opts: ['urbain', 'périurbain', 'rural'] },
    { key: 'situation_familiale', label: 'Situation familiale', opts: ['célibataire', 'marié', 'pacsé', 'divorcé', 'veuf'] },
    { key: 'segment', label: 'Segment', opts: ['particulier', 'professionnel', 'TPE', 'PME'] }
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 32, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>Modifier {client.nom} {client.prenom}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
          {selects.map(s => (
            <div key={s.key}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{s.label}</label>
              <select value={form[s.key] || ''} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Sélectionner</option>
                {s.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: 'white' }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#93c5fd' : '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showArk, setShowArk] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNote, setShowNote] = useState(false)

  const headers = { Authorization: `Bearer ${getToken()}` }

  async function loadClient() {
    try {
      setLoading(true); setError(null)
      const res = await axios.get(`${API_URL}/api/clients/${id}`, { headers })
      setClient(res.data)
    } catch {
      setError('Client introuvable ou erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  async function loadContrats() {
    try {
      const res = await axios.get(`${API_URL}/api/contrats?client_id=${id}`, { headers })
      setContrats(Array.isArray(res.data) ? res.data : [])
    } catch { setContrats([]) }
  }

  useEffect(() => { loadClient(); loadContrats() }, [id])

  async function saveNote() {
    if (!noteText.trim()) return
    try {
      const date = new Date().toLocaleDateString('fr-FR')
      const newNotes = `[${date}] : ${noteText}\n${client.notes || ''}`
      await axios.put(`${API_URL}/api/clients/${id}`, { ...client, notes: newNotes }, { headers })
      toast.success('Note ajoutée ✓')
      setNoteText(''); setShowNote(false)
      loadClient()
    } catch { toast.error('Erreur ajout note') }
  }

  if (loading) return <LoadingSpinner message="Chargement du client..." />
  if (error) return (
    <div style={{ padding: 32 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16, padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Retour</button>
      <ErrorBanner message={error} onRetry={loadClient} />
    </div>
  )
  if (!client) return null

  const loyaltyStars = Math.round((Number(client.loyalty_score) || 0) / 20)

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

      {/* SECTION 1 — En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 4 }}>← Retour</button>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>{fmt(client.nom)} {fmt(client.prenom)}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={client.statut} />
              <RiskScoreBadge score={client.score_risque} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Stars score={client.loyalty_score} />
                <span style={{ fontSize: 12, color: '#6b7280' }}>fidélité</span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          ✏️ Modifier
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* SECTION 2 — Identité */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111' }}>👤 Identité</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Email', client.email],
              ['Téléphone', client.telephone],
              ['Mobile', client.mobile],
              ['Adresse', client.adresse ? `${client.adresse}${client.postal_code ? ', ' + client.postal_code : ''}${client.city ? ' ' + client.city : ''}` : null],
              ['Profession', client.profession],
              ['Situation familiale', client.situation_familiale],
              ['Type', client.segment || client.type],
              ['Entreprise', client.company_name],
              ['Client depuis', fmtDate(client.created_at)]
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '4px 0' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px', fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#111', wordBreak: 'break-word' }}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3 — Données assurance */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111' }}>🛡️ Profil d'assurance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              ['Bonus-malus', client.bonus_malus !== null ? String(client.bonus_malus) : null],
              ['Années permis', client.annees_permis !== null ? client.annees_permis + ' ans' : null],
              ['Sinistres (3 ans)', client.nb_sinistres_3ans !== null ? String(client.nb_sinistres_3ans) : null],
              ['Zone géographique', client.zone_geographique]
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '4px 0' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px', fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#111' }}>{fmt(value)}</p>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', fontWeight: 600 }}>Score de risque</p>
            <ScoreBar value={client.score_risque} max={100} color={
              (client.score_risque || 0) <= 30 ? '#dc2626' :
              (client.score_risque || 0) <= 60 ? '#f59e0b' :
              (client.score_risque || 0) <= 80 ? '#3b82f6' : '#16a34a'
            } />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', fontWeight: 600 }}>Score de fidélité</p>
            <ScoreBar value={client.loyalty_score} max={100} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* SECTION 4 — Contrats */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111' }}>📋 Contrats ({contrats.length})</h2>
        {contrats.length === 0 ? (
          <EmptyState icon="📄" title="Aucun contrat actif" subtitle="Ce client n'a pas encore de contrat associé." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contrats.map(c => {
              const ech = c.date_echeance ? new Date(c.date_echeance) : null
              const jours = ech ? Math.ceil((ech - new Date()) / 86400000) : null
              const urgent = jours !== null && jours <= 30
              return (
                <div key={c.id} style={{ padding: 14, background: urgent ? '#fff7ed' : '#f9fafb', border: `1px solid ${urgent ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: 14 }}>{c.type_contrat || '—'} — {c.compagnie || '—'}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>N° {c.numero || '—'} · Prime : {fmtEur(c.prime_annuelle)}/an</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Effet : {fmtDate(c.date_effet)} · Échéance : {fmtDate(c.date_echeance)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={c.statut} />
                      {urgent && <p style={{ fontSize: 11, color: '#ea580c', margin: '6px 0 0', fontWeight: 600 }}>⚠️ J-{jours}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION notes */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📝 Notes</h2>
          <button onClick={() => setShowNote(!showNote)} style={{ padding: '6px 12px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            + Note
          </button>
        </div>
        {showNote && (
          <div style={{ marginBottom: 16 }}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Saisir une note..."
              style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={saveNote} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Enregistrer</button>
              <button onClick={() => setShowNote(false)} style={{ padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        )}
        {client.notes ? (
          <pre style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', background: '#f9fafb', padding: 12, borderRadius: 8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            {client.notes}
          </pre>
        ) : (
          <p style={{ color: '#6b7280', fontSize: 13 }}>Aucune note — cliquez sur "+ Note" pour en ajouter une.</p>
        )}
      </div>

      {/* Bouton ARK fixe */}
      <button onClick={() => setShowArk(true)} style={{
        position: 'fixed', bottom: 28, right: 28, padding: '14px 20px',
        background: '#2563eb', color: 'white', border: 'none', borderRadius: 12,
        cursor: 'pointer', fontSize: 14, fontWeight: 700, zIndex: 999,
        boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
        Demander à ARK
      </button>

      {/* Modals */}
      {showEdit && <EditModal client={client} onClose={() => setShowEdit(false)} onSaved={loadClient} />}
      {showArk && <ArkDrawer client={client} onClose={() => setShowArk(false)} />}
    </div>
  )
}
