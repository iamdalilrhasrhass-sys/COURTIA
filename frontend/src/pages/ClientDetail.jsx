import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'
import { computeScores } from '../lib/scoring'
import { buildArkContext } from '../lib/ark/client'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('courtia_token') || localStorage.getItem('token') }
function fmt(v) { if (v === null || v === undefined || v === '') return '—'; return String(v) }
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }
function fmtEur(v) { if (!v && v !== 0) return '—'; return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v)) }

// ─── SCORE CARD ──────────────────────────────────────────────────────────────

function getScoreColor(score, inverse) {
  if (inverse) {
    if (score >= 80) return '#dc2626'
    if (score >= 60) return '#d97706'
    if (score >= 40) return '#2563eb'
    return '#16a34a'
  } else {
    if (score >= 80) return '#16a34a'
    if (score >= 60) return '#2563eb'
    if (score >= 40) return '#d97706'
    return '#dc2626'
  }
}

function getScoreLabel(score, type) {
  const labels = {
    risque:      ['Faible', 'Modéré', 'Élevé', 'Critique'],
    fidelite:    ['Faible', 'Fragile', 'Correcte', 'Forte'],
    opportunite: ['Faible', 'Modérée', 'Bonne', 'Forte'],
    retention:   ['Faible', 'Fragile', 'Correcte', 'Forte'],
    completude:  ['Incomplète', 'Partielle', 'Bonne', 'Excellente'],
  }
  const set = labels[type] || ['Faible', 'Modéré', 'Bon', 'Excellent']
  if (score >= 80) return set[3]
  if (score >= 60) return set[2]
  if (score >= 40) return set[1]
  return set[0]
}

function getScoreBg(score, inverse) {
  const c = getScoreColor(score, inverse)
  const map = {
    '#dc2626': '#fef2f2',
    '#d97706': '#fffbeb',
    '#2563eb': '#eff6ff',
    '#16a34a': '#dcfce7',
  }
  return map[c] || '#f3f4f6'
}

function ScoreCard({ label, score, inverse = false, type, description }) {
  const color = getScoreColor(score, inverse)
  const lbl = type ? getScoreLabel(score, type) : description || ''
  const bg = getScoreBg(score, inverse)

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 16, color: '#9ca3af', fontWeight: 600 }}>/100</span>
      </div>
      {/* Barre */}
      <div style={{ width: '100%', height: 5, background: '#f3f4f6', borderRadius: 2.5, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: score + '%',
          background: color,
          borderRadius: 2.5,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {lbl && (
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: bg, color,
          borderRadius: 20, padding: '4px 12px',
          textAlign: 'center',
          marginTop: 4,
          alignSelf: 'center'
        }}>{lbl}</span>
      )}
    </div>
  )
}

// Carte spéciale Valeur
function ValeurCard({ valeur, nbActifs }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
      border: '1px solid #3b82f6',
      borderRadius: 16,
      padding: '16px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      color: 'white',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 25px rgba(30,64,175,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeur</span>
      <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginTop: 4, marginBottom: 4 }}>{fmtEur(valeur)}</span>
      <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 20, padding: '4px 12px', marginTop: 2 }}>
        {nbActifs} contrat{nbActifs !== 1 ? 's' : ''} actif{nbActifs !== 1 ? 's' : ''}
      </span>
      <span style={{ fontSize: 10, color: '#60a5fa', letterSpacing: 0.4, marginTop: 2 }}>annuelle</span>
    </div>
  )
}

// buildPrompt → remplacé par buildArkContext (lib/ark/client.js)

// ─── ARK DRAWER ──────────────────────────────────────────────────────────────

function ArkDrawer({ client, scores, contrats, onClose, initialPrompt }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)
  const endRef = useRef(null)
  const didSendInitial = useRef(false)

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
      // Cache cockpit
      if (client?.id) {
        try {
          localStorage.setItem(`ark_cockpit_${client.id}`, JSON.stringify({ ts: Date.now(), summary: reply.substring(0, 200) }))
        } catch {}
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.code === 'ECONNABORTED' ? 'ARK se réveille... réessayez.' : 'ARK temporairement indisponible.' }])
    } finally {
      setLoading(false); clearTimeout(tid); setSlowWarning(false)
    }
  }

  useEffect(() => {
    if (initialPrompt && !didSendInitial.current) {
      didSendInitial.current = true
      send(initialPrompt)
    }
  }, [])

  const sins = scores?.sins ?? (Number(client.nb_sinistres_3ans) || 0)
  const bm = scores?.bm ?? (Number(client.bonus_malus) || 1)
  const nbActifs = scores?.nbActifs ?? 0
  const priorite = scores?.priorite ?? 'faible'
  const signaux = scores?.signaux ?? []
  const riskLabel = scores ? getScoreLabel(scores.risque, 'risque') : ''
  const activeC = contrats ? contrats.filter(c => (c.statut || c.status || '').toLowerCase() === 'actif') : []
  const types = activeC.map(c => c.type_contrat).filter(Boolean).join(', ') || 'aucun'
  const echeanceInfo = scores?.prochaineEcheanceDays !== null && scores?.prochaineEcheanceDays !== undefined
    ? `dans ${scores.prochaineEcheanceDays} jours`
    : 'non renseignée'

  const QUICK = scores ? [
    {
      label: 'Analyser les risques',
      prompt: `Risque ${scores.risque}/100 (${riskLabel}), BM: ${bm}, sinistres: ${sins}. Signaux: ${signaux.map(s => s.label).join(', ') || 'aucun'}. 3 points de vigilance max. Réponse courte.`
    },
    {
      label: 'Opportunités cross-sell',
      prompt: `Opportunité ${scores.opportunite}/100. Contrats: ${nbActifs} (${types}). Profession: ${client.profession || 'NC'}. 3 opportunités cross-sell concrètes. Réponse courte.`
    },
    {
      label: "Préparer l'appel",
      prompt: `Rétention ${scores.retention}/100, priorité ${priorite}, échéance ${echeanceInfo}. Guide appel : accroche + 3 questions + 2 offres. Format court.`
    },
    {
      label: 'Message de relance',
      prompt: `Rédige un message de relance pour ${client.nom} ${client.prenom}. Priorité ${priorite}. 80 mots max, ton courtier direct.`
    },
  ] : [
    { label: 'Analyser les risques', prompt: 'Risques principaux de ce client en 3 points. Réponse courte.' },
    { label: 'Opportunités cross-sell', prompt: '3 opportunités cross-sell pour ce client. Réponse courte.' },
    { label: 'Message de relance', prompt: 'Message de relance, 80 mots max, ton professionnel direct.' },
    { label: 'Risque résiliation', prompt: 'Risque résiliation sur 10 + 2 actions concrètes.' },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease'
      }}>
        <style>{`
          @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
          @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
          @keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.6}}
          @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
        `}</style>

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
                {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', animation: `dotBounce 1.2s ease ${i * 0.2}s infinite` }} />)}
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

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────

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

// ─── HELPERS UI ──────────────────────────────────────────────────────────────

function Stars({ score }) {
  const n = Math.round((Number(score) || 0) / 20)
  return (
    <span style={{ fontSize: 14, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ color: i <= n ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
    </span>
  )
}

function ScoreBar({ value, max = 100, color = '#2563eb', label }) {
  const pct = Math.min(100, Math.round((Number(value) || 0) / max * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{value || 0}/{max}</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function timeAgoFr(ts) {
  const diff = Date.now() - ts
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h >= 1) return `il y a ${h}h`
  if (m >= 1) return `il y a ${m}min`
  return "à l'instant"
}

// ─── COCKPIT COMPONENT ───────────────────────────────────────────────────────

function CockpitScoring({ scores, client, contrats, onOpenArk }) {
  const [showRaisons, setShowRaisons] = useState(false)
  const [arkCache, setArkCache] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`ark_cockpit_${client.id}`) || 'null') } catch { return null }
  })

  const cacheValid = arkCache && (Date.now() - arkCache.ts) < 4 * 3600 * 1000

  const riskLabel = getScoreLabel(scores.risque, 'risque')
  const fideliteLabel = getScoreLabel(scores.fidelite, 'fidelite')

  const staticSummary = [
    `Profil ${scores.priorite}`,
    `Risque ${riskLabel.toLowerCase()}`,
    `Fidélité ${fideliteLabel.toLowerCase()}`,
    `${scores.nbActifs} contrat${scores.nbActifs !== 1 ? 's' : ''}`,
    scores.valeur > 0 ? `${fmtEur(scores.valeur)}/an` : null,
  ].filter(Boolean).join(' · ')

  function handleArkBtn(goal) {
    const goalMap = {
      analyser: 'Analyse ce profil en JSON : résumé 2 lignes, 3 points clés, 3 recommandations.',
      appel: "Guide appel en JSON : accroche 1 phrase, 3 questions clés, 2 offres à proposer.",
      ameliorer: '3 actions JSON pour améliorer les scores faibles.',
      message: 'Message relance en JSON, 80 mots max.',
    }
    const ctx = buildArkContext(client, scores, contrats)
    onOpenArk(`${ctx}\nMission: ${goalMap[goal]}`)
  }

  return (
    <div style={{ padding: '0 32px 0 32px', marginBottom: 16 }}>

      {/* A — Priority Banner (haute uniquement) */}
      {scores.priorite === 'haute' && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          color: 'white',
          boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fef2f2', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>PRIORITÉ HAUTE</span>
            <p style={{ color: '#fecaca', fontSize: 12, margin: '2px 0 0', lineHeight: 1.5 }}>{scores.raisons.slice(0, 3).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* B — Row scorecards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
        <ScoreCard label="Risque" score={scores.risque} inverse={true} type="risque" />
        <ScoreCard label="Fidélité" score={scores.fidelite} inverse={false} type="fidelite" />
        <ScoreCard label="Opportunité" score={scores.opportunite} inverse={false} type="opportunite" />
        <ScoreCard label="Rétention" score={scores.retention} inverse={false} type="retention" />
        <ScoreCard label="Complétude" score={scores.completude} inverse={false} type="completude" />
        <ValeurCard valeur={scores.valeur} nbActifs={scores.nbActifs} />
      </div>

      {/* C — Signaux */}
      {scores.signaux.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 10 }}>SIGNAUX</span>
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
            {scores.signaux.map((s, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 700,
                background: s.bg, color: s.color,
                borderRadius: 20, padding: '3px 10px',
                border: `1px solid ${s.color}22`,
              }}>{s.label}</span>
            ))}
          </span>
        </div>
      )}

      {/* D — Pourquoi ces notes */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowRaisons(r => !r)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
            color: '#6b7280', fontFamily: 'Arial, sans-serif', padding: 0, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: showRaisons ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          Pourquoi ces notes ?
        </button>
        {showRaisons && (
          <div style={{
            marginTop: 8,
            background: '#fafaf8',
            borderRadius: 10,
            padding: '12px 16px',
            border: '0.5px solid #e8e6e0',
            animation: 'fadeIn 0.15s ease',
          }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {scores.raisons.map((r, i) => (
              <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                • {r}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* E — Cockpit ARK */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
        border: '1px solid #1e40af',
        borderRadius: 16,
        padding: '20px 24px',
        color: 'white',
        boxShadow: '0 8px 30px rgba(30,58,138,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulseDot 1.5s ease infinite' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>ARK Intelligence</span>
          <span style={{
            fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#93c5fd',
            borderRadius: 20, padding: '3px 9px', letterSpacing: 0.4,
          }}>IA • SUR DEMANDE</span>
        </div>

        {/* Résumé statique */}
        <p style={{ fontSize: 13, color: '#dbeafe', margin: '0 0 16px', lineHeight: 1.6 }}>
          {staticSummary}
        </p>

        {/* Cache ARK */}
        {cacheValid && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '0.5px solid #1e40af' }}>
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>Dernière analyse ARK : {timeAgoFr(arkCache.ts)}</span>
            <p style={{ fontSize: 12, color: '#60a5fa', margin: '4px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>"{arkCache.summary}..."</p>
          </div>
        )}

        {/* Boutons 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Analyser ce client', goal: 'analyser' },
            { label: 'Préparer mon appel', goal: 'appel' },
            { label: 'Comment améliorer ?', goal: 'ameliorer' },
            { label: 'Générer un message', goal: 'message' },
          ].map(b => (
            <button
              key={b.goal}
              onClick={() => handleArkBtn(b.goal)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #1e40af',
                borderRadius: 9,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                color: '#dbeafe',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showArk, setShowArk] = useState(false)
  const [arkInitialPrompt, setArkInitialPrompt] = useState(null)
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

  function openArk(prompt) {
    setArkInitialPrompt(prompt || null)
    setShowArk(true)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Chargement...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32, background: '#f9fafb', minHeight: '100vh' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16, padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Retour</button>
      <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', fontSize: 14 }}>{error}</div>
    </div>
  )

  if (!client) return null

  const scores = !loading ? computeScores(client, contrats) : null
  const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)' }

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.6}}
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '8px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
            ← Retour
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{fmt(client.nom)} {fmt(client.prenom)}</h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
              <StatusBadge status={client.statut} />
              <RiskScoreBadge score={scores?.risque} />
              <Stars score={scores?.fidelite} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowNote(true)}
            style={{ padding: '9px 18px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Note
          </button>
          <button onClick={() => setShowEdit(true)}
            style={{ padding: '9px 18px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Modifier
          </button>
        </div>
      </div>

      {/* ── COCKPIT SCORING (après topbar, avant identité) ── */}
      {scores !== null && (
        <div style={{ paddingTop: 24 }}>
          <CockpitScoring
            scores={scores}
            client={client}
            contrats={contrats}
            onOpenArk={openArk}
          />
        </div>
      )}

      <div style={{ padding: '0 32px 24px', maxWidth: 1100 }}>

        {/* Row 1: Identité + Profil assurance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Identité */}
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8, margin: '0 0 16px', textTransform: 'uppercase' }}>Identité</p>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8, margin: '0 0 16px', textTransform: 'uppercase' }}>Profil d'assurance</p>
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
                value={scores?.risque}
                color={(scores?.risque || 0) >= 70 ? '#dc2626' : (scores?.risque || 0) >= 40 ? '#f59e0b' : '#16a34a'}
              />
              <ScoreBar label="Score de fidélité" value={scores?.fidelite} color="#2563eb" />
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
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8, margin: '0 0 16px', textTransform: 'uppercase' }}>
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
      <button onClick={() => openArk(null)} style={{
        position: 'fixed', bottom: 28, right: 28, padding: '14px 22px',
        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
        color: 'white', border: 'none', borderRadius: 14,
        cursor: 'pointer', fontSize: 14, fontWeight: 600, zIndex: 998,
        boxShadow: '0 6px 25px rgba(37,99,235,0.4)',
        display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Arial, sans-serif',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(37,99,235,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(37,99,235,0.4)' }}
      >
        <div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', animation: 'pulse 1.5s ease infinite' }} />
        Demander à ARK
      </button>

      {showEdit && <EditModal client={client} onClose={() => setShowEdit(false)} onSaved={loadClient} />}
      {showArk && (
        <ArkDrawer
          client={client}
          scores={scores}
          contrats={contrats}
          onClose={() => { setShowArk(false); setArkInitialPrompt(null) }}
          initialPrompt={arkInitialPrompt}
        />
      )}
    </div>
  )
}
