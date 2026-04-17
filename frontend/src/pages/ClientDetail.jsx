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

// ─── SCORING ENGINE ─────────────────────────────────────────────────────────

function computeScores(client, contrats) {
  const sins = Number(client.nb_sinistres_3ans) || 0
  const bm = Number(client.bonus_malus) || 1
  const annees = Number(client.annees_permis) || 0
  const zone = (client.zone_geographique || '').toLowerCase()
  const statut = (client.statut || '').toLowerCase()
  const segment = (client.segment || '').toLowerCase()
  const profession = (client.profession || '').toLowerCase()
  const situation = (client.situation_familiale || '').toLowerCase()

  const activeContrats = contrats.filter(c => (c.statut || c.status || '').toLowerCase() === 'actif')
  const nbActifs = activeContrats.length
  const primeTotal = activeContrats.reduce((sum, c) => sum + (Number(c.prime_annuelle) || 0), 0)

  // Ancienneté
  const createdAt = client.created_at ? new Date(client.created_at) : null
  const nowMs = Date.now()
  const ancienneteMs = createdAt ? nowMs - createdAt.getTime() : 0
  const ancienneteAns = ancienneteMs / (365.25 * 24 * 3600 * 1000)

  // Prochaine échéance (jours)
  let prochaineEcheanceDays = null
  contrats.forEach(c => {
    if (!c.date_echeance) return
    const d = Math.ceil((new Date(c.date_echeance) - new Date()) / 86400000)
    if (d > 0 && (prochaineEcheanceDays === null || d < prochaineEcheanceDays)) {
      prochaineEcheanceDays = d
    }
  })

  // ── RISQUE (0-100, élevé = dangereux) ──
  let risque = 20
  risque += Math.min(45, sins * 18)
  if (bm > 2.5) risque += 30
  else if (bm > 1.5) risque += 20
  else if (bm > 1.1) risque += 10
  if (zone === 'urbain') risque += 12
  else if (zone === 'périurbain') risque += 6
  if (annees < 3 && annees > 0) risque += 15
  else if (annees < 5 && annees >= 3) risque += 8
  if (nbActifs === 0) risque += 10
  risque = Math.min(100, Math.max(0, Math.round(risque)))

  // ── FIDÉLITÉ (0-100, élevé = bon) ──
  let fidelite = 20
  if (ancienneteAns > 5) fidelite += 30
  else if (ancienneteAns > 3) fidelite += 20
  else if (ancienneteAns > 1) fidelite += 12
  else if (ancienneteAns > 0.5) fidelite += 6
  if (nbActifs > 2) fidelite += 20
  else if (nbActifs > 1) fidelite += 12
  else if (nbActifs === 1) fidelite += 6
  if (statut === 'actif') fidelite += 15
  if (sins === 0) fidelite += 15
  if (statut === 'résilié') fidelite = Math.max(0, fidelite - 30)
  fidelite = Math.min(100, Math.max(0, Math.round(fidelite)))

  // ── OPPORTUNITÉ (0-100) ──
  let opportunite = 25
  if (nbActifs === 1) opportunite += 20
  else if (nbActifs === 0) opportunite += 10
  const proKeywords = ['médecin', 'dentiste', 'avocat', 'notaire', 'architecte', 'chef', 'directeur', 'gérant', 'pharmacien', 'ingénieur']
  if (proKeywords.some(kw => profession.includes(kw))) opportunite += 18
  if (['professionnel', 'tpe', 'pme', 'entreprise'].includes(segment)) opportunite += 15
  if (['marié', 'pacsé'].includes(situation)) opportunite += 10
  if (statut === 'actif') opportunite += 8
  if (primeTotal > 2000) opportunite += 10
  else if (primeTotal > 1000) opportunite += 5
  opportunite = Math.min(100, Math.max(0, Math.round(opportunite)))

  // ── RÉTENTION (0-100) ──
  let retention = 40
  if (statut === 'résilié' || statut === 'perdu') {
    retention = 0
  } else {
    if (ancienneteAns > 3) retention += 20
    else if (ancienneteAns > 1) retention += 10
    if (nbActifs > 2) retention += 15
    else if (nbActifs > 1) retention += 8
    if (sins > 2) retention -= 20
    else if (sins > 1) retention -= 10
    if (bm > 2) retention -= 15
    if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) retention -= 20
    else if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 60) retention -= 10
    if (statut === 'actif') retention += 8
  }
  retention = Math.min(100, Math.max(0, Math.round(retention)))

  // ── COMPLÉTUDE (0-100) ──
  const champsCles = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'profession', 'situation_familiale', 'bonus_malus', 'annees_permis', 'nb_sinistres_3ans', 'zone_geographique', 'segment']
  const filled = champsCles.filter(k => client[k] !== null && client[k] !== undefined && String(client[k]).trim() !== '').length
  const completude = Math.round(filled / champsCles.length * 100)

  // ── VALEUR (€) ──
  let valeur = 0
  if (primeTotal > 0) valeur = primeTotal
  else if (client.lifetime_value) valeur = Number(client.lifetime_value) || 0

  // ── PRIORITÉ GLOBALE ──
  let priorite = 'faible'
  if (
    (retention < 45 && valeur > 500) ||
    (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) ||
    (opportunite > 75 && nbActifs <= 1)
  ) {
    priorite = 'haute'
  } else if (
    retention < 60 ||
    opportunite > 65 ||
    (sins > 1 && nbActifs > 0)
  ) {
    priorite = 'moyenne'
  }

  // ── SIGNAUX ──
  const signaux = []
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 30) {
    signaux.push({ label: `Échéance J-${prochaineEcheanceDays}`, color: '#dc2626', bg: '#fef2f2' })
  }
  if (completude < 70) {
    signaux.push({ label: 'Dossier incomplet', color: '#d97706', bg: '#fffbeb' })
  }
  if (retention < 45 && nbActifs > 0) {
    signaux.push({ label: 'À relancer', color: '#dc2626', bg: '#fef2f2' })
  }
  if (sins > 1) {
    signaux.push({ label: 'Historique instable', color: '#92400e', bg: '#fef3c7' })
  }
  if (risque > 70) {
    signaux.push({ label: 'Profil à risque', color: '#dc2626', bg: '#fef2f2' })
  }
  if (opportunite > 75) {
    signaux.push({ label: 'Potentiel élevé', color: '#16a34a', bg: '#dcfce7' })
  }
  if (nbActifs === 1) {
    signaux.push({ label: 'Multi-équipement possible', color: '#2563eb', bg: '#eff6ff' })
  }
  if (fidelite > 75) {
    signaux.push({ label: 'Client fidèle', color: '#16a34a', bg: '#dcfce7' })
  }

  // ── RAISONS ──
  const raisons = []
  if (sins > 0) raisons.push(`${sins} sinistre(s) sur 3 ans`)
  if (bm > 1.2) raisons.push(`Bonus-malus de ${bm}`)
  const ancAns = Math.round(ancienneteAns)
  if (ancAns > 0) raisons.push(`Client depuis ${ancAns} an(s)`)
  if (nbActifs > 0) raisons.push(`${nbActifs} contrat(s) actif(s)`)
  else raisons.push('Aucun contrat actif')
  if (prochaineEcheanceDays !== null && prochaineEcheanceDays <= 90) raisons.push(`Prochaine échéance dans ${prochaineEcheanceDays} jours`)
  if (completude < 80) raisons.push(`Dossier complété à ${completude}%`)
  if (opportunite > 70 && nbActifs === 1) raisons.push('Un seul contrat — potentiel cross-sell')

  return {
    risque, fidelite, opportunite, retention, completude, valeur,
    priorite, signaux, raisons,
    // helpers exposés
    nbActifs, primeTotal, prochaineEcheanceDays, sins, bm, ancienneteAns
  }
}

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
      border: '1px solid #e8e6e0',
      borderRadius: 14,
      padding: '18px 16px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
      <div>
        <span style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>/100</span>
      </div>
      {/* Barre */}
      <div style={{ width: '100%', height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: score + '%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {lbl && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: bg, color,
          borderRadius: 20, padding: '3px 10px',
          marginTop: 2,
        }}>{lbl}</span>
      )}
    </div>
  )
}

// Carte spéciale Valeur
function ValeurCard({ valeur, nbActifs }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e8e6e0',
      borderRadius: 14,
      padding: '18px 16px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>Valeur</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>{fmtEur(valeur)}</span>
      <span style={{ fontSize: 11, fontWeight: 700, background: '#f3f4f6', color: '#6b7280', borderRadius: 20, padding: '3px 10px', marginTop: 2 }}>
        {nbActifs} contrat{nbActifs !== 1 ? 's' : ''} actif{nbActifs !== 1 ? 's' : ''}
      </span>
      <span style={{ fontSize: 10, color: '#d1d5db', letterSpacing: 0.4 }}>annuelle</span>
    </div>
  )
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────

function buildPrompt(scores, client, contrats, goal) {
  const activeC = contrats.filter(c => (c.statut || c.status || '').toLowerCase() === 'actif')
  const types = activeC.map(c => c.type_contrat).filter(Boolean).join(', ') || 'aucun'
  return [
    `Client: ${client.prenom} ${client.nom}, ${client.profession || 'NC'}, ${client.segment || 'particulier'}`,
    `Scores: Risque ${scores.risque}/100, Fidélité ${scores.fidelite}/100, Opportunité ${scores.opportunite}/100, Rétention ${scores.retention}/100, Complétude ${scores.completude}%`,
    `Contrats actifs: ${activeC.length} (${types}), Prime totale: ${scores.valeur}€/an`,
    `Signaux: ${scores.signaux.map(s => s.label).join(', ') || 'aucun'}`,
    `Objectif: ${goal}`
  ].join('\n')
}

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
      prompt: `Analyse le profil de risque de ce client. Scores: Risque ${scores.risque}/100 (${riskLabel}), Fidélité ${scores.fidelite}/100, Sinistres: ${sins}, BM: ${bm}. Signaux: ${signaux.map(s => s.label).join(', ')}. Points de vigilance ?`
    },
    {
      label: 'Opportunités cross-sell',
      prompt: `Quelles opportunités de cross-sell pour ce client ? Opportunité: ${scores.opportunite}/100. Contrats actifs: ${nbActifs} (${types}). Profession: ${client.profession || 'NC'}.`
    },
    {
      label: "Préparer l'appel",
      prompt: `Prépare un guide d'appel pour ce client. Priorité: ${priorite}. Rétention: ${scores.retention}/100. Prochaine échéance: ${echeanceInfo}. Actions recommandées ?`
    },
    {
      label: 'Message de relance',
      prompt: `Rédige un message de relance professionnel. Client: ${client.nom} ${client.prenom}, ${client.profession || 'NC'}. Priorité: ${priorite}. Ton: professionnel et direct. 150 mots max.`
    },
  ] : [
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
      analyser: 'Donne une analyse complète du profil. Synthèse, risques, opportunités, recommandations.',
      appel: "Prépare un guide d'appel : objectif, accroche, questions clés, offres à présenter, conclusion.",
      ameliorer: 'Comment améliorer chaque score ? Plan d\'action concret pour passer à 80+.',
      message: 'Rédige un message de relance professionnel, 100 mots max, ton courtier-client.',
    }
    const prompt = buildPrompt(scores, client, contrats, goalMap[goal])
    onOpenArk(prompt)
  }

  const btnStyle = {
    background: 'white',
    border: '1px solid #bfdbfe',
    borderRadius: 9,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
    color: '#1e40af',
    textAlign: 'left',
    transition: 'background 0.15s ease',
  }

  return (
    <div style={{ padding: '0 32px 0 32px', marginBottom: 16 }}>

      {/* A — Priority Banner (haute uniquement) */}
      {scores.priorite === 'haute' && (
        <div style={{
          background: 'linear-gradient(135deg, #fff1f2, #fef2f2)',
          border: '1px solid #fecaca',
          borderRadius: 10,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />
          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>Priorité haute</span>
          <span style={{ color: '#6b7280', fontSize: 12 }}>·</span>
          <span style={{ color: '#374151', fontSize: 12, flex: 1 }}>{scores.raisons.slice(0, 3).join(' · ')}</span>
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
        background: 'linear-gradient(135deg, #f8faff, #eff6ff)',
        border: '1px solid #bfdbfe',
        borderRadius: 14,
        padding: '20px 24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulseDot 1.5s ease infinite' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>ARK Intelligence</span>
          <span style={{
            fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#2563eb',
            borderRadius: 20, padding: '2px 8px', letterSpacing: 0.4,
          }}>IA • Sur demande</span>
        </div>

        {/* Résumé statique */}
        <p style={{ fontSize: 12, color: '#4b5563', margin: '0 0 14px', lineHeight: 1.6 }}>
          {staticSummary}
        </p>

        {/* Cache ARK */}
        {cacheValid && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '0.5px solid #bfdbfe' }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Dernière analyse ARK : {timeAgoFr(arkCache.ts)}</span>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>"{arkCache.summary}..."</p>
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
              style={btnStyle}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
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

  const scores = !loading ? computeScores(client, contrats) : null
  const card = { background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: 24 }

  return (
    <div style={{ background: '#f7f6f2', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.6}}
      `}</style>

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
      <button onClick={() => openArk(null)} style={{
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
