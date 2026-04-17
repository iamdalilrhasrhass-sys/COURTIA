import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('courtia_token') || localStorage.getItem('token') }
function fmt(v) { if (v === null || v === undefined || v === '') return '—'; return String(v) }
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }
function fmtEur(v) { if (!v && v !== 0) return '—'; return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v)) }

function Stars({ score }) {
  const n = Math.round((Number(score) || 0) / 20)
  return (
    <span style={{ fontSize: 14, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= n ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
    </span>
  )
}

function ScoreBar({ value, max = 100, color = '#2563eb', label }) {
  const pct = Math.min(100, Math.round((Number(value) || 0) / max * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#0a0a0a', fontWeight: 600 }}>{value || 0}/{max}</span>
      </div>
      <div style={{ height: 5, background: '#f7f6f2', borderRadius: 3 }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ARK Drawer
function ArkDrawer({ client, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(msg) {
    if (!msg?.trim()) return
    const text = msg.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput(''); setLoading(true); setSlowWarning(false)
    const tid = setTimeout(() => setSlowWarning(true), 28000)
    try {
      const res = await axios.post(`${API_URL}/api/ark/chat`, {
        message: text, clientData: client, conversationHistory: messages.slice(-10)
      }, { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 90000 })
      const reply = res.data?.reply || res.data?.message || JSON.stringify(res.data)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.code === 'ECONNABORTED' ? 'ARK se réveille... réessayez.' : 'ARK temporairement indisponible.' }])
    } finally {
      setLoading(false); clearTimeout(tid); setSlowWarning(false)
    }
  }

  const QUICK = [
    { label: 'Analyser les risques', prompt: 'Analyse en détail le profil de risque de ce client. Points de vigilance ?' },
    { label: 'Opportunités cross-sell', prompt: 'Quelles sont les meilleures opportunités de cross-sell pour ce client ?' },
    { label: 'Email de relance', prompt: 'Rédige un email de relance professionnel pour ce client.' },
    { label: 'Risque résiliation', prompt: 'Évalue le risque de résiliation de ce client sur 10 et propose des actions.' },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease'
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>

        <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease infinite' }} />
            <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>ARK — {client.nom} {client.prenom}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderBottom: '0.5px solid #1a1a1a' }}>
          {QUICK.map(q => (
            <button key={q.label} onClick={() => send(q.prompt)}
              style={{ padding: '7px 10px', background: '#111', color: '#aaa', border: '0.5px solid #222', borderRadius: 7, cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'Arial, sans-serif' }}>
              {q.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 1.7 }}>
              Posez une question à ARK sur ce client ou utilisez une action rapide.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: '10px 13px', borderRadius: 10, maxWidth: '86%',
              background: m.role === 'user' ? '#1d4ed8' : '#1a1a1a',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              border: m.role === 'assistant' ? '0.5px solid #222' : 'none'
            }}>
              <p style={{ color: 'white', fontSize: 12, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{m.content}</p>
            </div>
          ))}
          {loading && (
            <div style={{ padding: '10px 14px', background: '#1a1a1a', borderRadius: 10, alignSelf: 'flex-start', border: '0.5px solid #222' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', animation: `dotBounce 1.2s ease ${i*0.2}s infinite` }} />)}
              </div>
              {slowWarning && <p style={{ color: '#555', fontSize: 11, margin: '5px 0 0' }}>Serveur en démarrage...</p>}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: 14, borderTop: '0.5px solid #1a1a1a', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Demandez à ARK..."
            style={{ flex: 1, padding: '10px 13px', background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 8, color: 'white', fontSize: 13, fontFamily: 'Arial, sans-serif' }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            style={{ padding: '10px 14px', background: !input.trim() || loading ? '#222' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: 16 }}>→</button>
        </div>
      </div>
    </>
  )
}

// Edit Modal
function EditModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({ ...client })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await axios.put(`${API_URL}/api/clients/${client.id}`, form, { headers: { Authorization: `Bearer ${getToken()}` } })
      toast.success('Client mis à jour ✓')
      onSaved(); onClose()
    } catch { toast.error('Erreur lors de la sauvegarde') }
    finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: 'white' }
  const labelStyle = { fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 600, letterSpacing: 0.3 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 640, maxHeight: '90vh', overflowY: 'auto', border: '0.5px solid #e8e6e0' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 500, color: '#0a0a0a' }}>Modifier {client.nom} {client.prenom}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['nom', 'NOM', 'text'], ['prenom', 'PRÉNOM', 'text'], ['email', 'EMAIL', 'email'],
            ['telephone', 'TÉLÉPHONE', 'text'], ['adresse', 'ADRESSE', 'text'], ['profession', 'PROFESSION', 'text'],
            ['bonus_malus', 'BONUS-MALUS', 'number'], ['annees_permis', 'ANNÉES PERMIS', 'number'], ['nb_sinistres_3ans', 'SINISTRES 3 ANS', 'number'],
          ].map(([key, lbl, type]) => (
            <div key={key}>
              <label style={labelStyle}>{lbl}</label>
              <input type={type} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          {[
            ['statut', 'STATUT', ['prospect', 'actif', 'résilié', 'perdu']],
            ['zone_geographique', 'ZONE', ['urbain', 'périurbain', 'rural']],
            ['situation_familiale', 'SITUATION', ['célibataire', 'marié', 'pacsé', 'divorcé', 'veuf']],
            ['segment', 'SEGMENT', ['particulier', 'professionnel', 'TPE', 'PME']],
          ].map(([key, lbl, opts]) => (
            <div key={key}>
              <label style={labelStyle}>{lbl}</label>
              <select value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>NOTES</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '0.5px solid #e8e6e0', borderRadius: 8, cursor: 'pointer', background: 'white', fontSize: 13 }}>Annuler</button>
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 20px', background: saving ? '#9ca3af' : '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
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
    } catch { setError('Client introuvable ou erreur serveur') }
    finally { setLoading(false) }
  }

  async function loadContrats() {
    try {
      const res = await axios.get(`${API_URL}/api/clients/${id}/contrats`, { headers })
      setContrats(Array.isArray(res.data) ? res.data : [])
    } catch {
      try {
        const res = await axios.get(`${API_URL}/api/contrats?client_id=${id}`, { headers })
        setContrats(Array.isArray(res.data) ? res.data : [])
      } catch { setContrats([]) }
    }
  }

  useEffect(() => { loadClient(); loadContrats() }, [id])

  async function saveNote() {
    if (!noteText.trim()) return
    try {
      const date = new Date().toLocaleDateString('fr-FR')
      const newNotes = `[${date}] ${noteText}\n${client.notes || ''}`
      await axios.put(`${API_URL}/api/clients/${id}`, { ...client, notes: newNotes }, { headers })
      toast.success('Note ajoutée ✓')
      setNoteText(''); setShowNote(false); loadClient()
    } catch { toast.error('Erreur ajout note') }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', background: '#f7f6f2' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Chargement...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32, background: '#f7f6f2', minHeight: '100vh' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16, padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Retour</button>
      <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', fontSize: 14 }}>{error}</div>
    </div>
  )

  if (!client) return null

  const card = { background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: 24 }

  return (
    <div style={{ background: '#f7f6f2', minHeight: '100vh' }}>

      {/* Topbar */}
      <div style={{ background: '#f7f6f2', borderBottom: '0.5px solid #e8e6e0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '7px 14px', background: 'white', color: '#0a0a0a', border: '0.5px solid #e8e6e0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
            ← Retour
          </button>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>{fmt(client.nom)} {fmt(client.prenom)}</h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
              <StatusBadge status={client.statut} />
              <RiskScoreBadge score={client.score_risque} />
              <Stars score={client.loyalty_score} />
            </div>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)}
          style={{ padding: '9px 18px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Arial, sans-serif' }}>
          Modifier
        </button>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>

        {/* Row 1: Identité + Profil assurance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Identité */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, margin: '0 0 16px', textTransform: 'uppercase' }}>Identité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Email', client.email],
                ['Téléphone', client.telephone],
                ['Adresse', client.adresse ? `${client.adresse}${client.postal_code ? ', ' + client.postal_code : ''}${client.city ? ' ' + client.city : ''}` : null],
                ['Profession', client.profession],
                ['Situation', client.situation_familiale],
                ['Segment', client.segment || client.type],
                ['Entreprise', client.company_name],
                ['Client depuis', fmtDate(client.created_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: '#0a0a0a', wordBreak: 'break-word' }}>{fmt(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Profil assurance */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, margin: '0 0 16px', textTransform: 'uppercase' }}>Profil d'assurance</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                ['Bonus-malus', client.bonus_malus !== null ? String(client.bonus_malus) : null],
                ['Années permis', client.annees_permis !== null ? client.annees_permis + ' ans' : null],
                ['Sinistres (3 ans)', client.nb_sinistres_3ans !== null ? String(client.nb_sinistres_3ans) : null],
                ['Zone', client.zone_geographique],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: '#0a0a0a' }}>{fmt(value)}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ScoreBar
                label="Score de risque"
                value={client.score_risque}
                color={(client.score_risque || 0) <= 30 ? '#dc2626' : (client.score_risque || 0) <= 60 ? '#f59e0b' : '#16a34a'}
              />
              <ScoreBar label="Score de fidélité" value={client.loyalty_score} color="#2563eb" />
            </div>
            {client.lifetime_value && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f7f6f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>VALEUR VIE CLIENT</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0a0a0a' }}>{fmtEur(client.lifetime_value)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contrats */}
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, margin: '0 0 16px', textTransform: 'uppercase' }}>
            Contrats ({contrats.length})
          </p>
          {contrats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
              Aucun contrat actif associé à ce client.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contrats.map(c => {
                const daysLeft = c.date_echeance ? Math.ceil((new Date(c.date_echeance) - new Date()) / 86400000) : null
                const urgent = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
                return (
                  <div key={c.id} style={{ padding: '12px 16px', background: urgent ? '#fffbeb' : '#fafaf8', border: `0.5px solid ${urgent ? '#fde68a' : '#e8e6e0'}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, margin: '0 0 3px', fontSize: 13, color: '#0a0a0a' }}>{c.type_contrat || '—'} — {c.compagnie || '—'}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                        Prime : {fmtEur(c.prime_annuelle)} · Échéance : {fmtDate(c.date_echeance)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {urgent && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>J-{daysLeft}</span>}
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: (c.status || c.statut || '').toLowerCase() === 'actif' ? '#dcfce7' : '#f3f4f6',
                        color: (c.status || c.statut || '').toLowerCase() === 'actif' ? '#166534' : '#6b7280'
                      }}>
                        {c.status || c.statut || '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, margin: 0, textTransform: 'uppercase' }}>Notes</p>
            <button onClick={() => setShowNote(!showNote)}
              style={{ padding: '6px 12px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: 'Arial, sans-serif' }}>
              + Note
            </button>
          </div>
          {showNote && (
            <div style={{ marginBottom: 14 }}>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Saisir une note..."
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: '#fafaf8' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={saveNote} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Enregistrer</button>
                <button onClick={() => { setShowNote(false); setNoteText('') }} style={{ padding: '8px 16px', background: '#f7f6f2', border: '0.5px solid #e8e6e0', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              </div>
            </div>
          )}
          {client.notes ? (
            <pre style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', background: '#fafaf8', padding: '12px 14px', borderRadius: 8, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7, border: '0.5px solid #e8e6e0' }}>
              {client.notes}
            </pre>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucune note.</p>
          )}
        </div>
      </div>

      {/* Bouton ARK fixe */}
      <button onClick={() => setShowArk(true)} style={{
        position: 'fixed', bottom: 28, right: 28, padding: '13px 20px',
        background: '#2563eb', color: 'white', border: 'none', borderRadius: 12,
        cursor: 'pointer', fontSize: 13, fontWeight: 600, zIndex: 998,
        boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ width: 7, height: 7, background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
        Demander à ARK
      </button>

      {showEdit && <EditModal client={client} onClose={() => setShowEdit(false)} onSaved={loadClient} />}
      {showArk && <ArkDrawer client={client} onClose={() => setShowArk(false)} />}
    </div>
  )
}
