import { useCallback, useEffect, useState } from 'react'
import api from '../api'

export default function ProspectionPanel() {
  const [prospects, setProspects] = useState([])
  const [messages, setMessages] = useState([])
  const [csv, setCsv] = useState('')
  const [sector, setSector] = useState('agents immobiliers indépendants')
  const [valueProp, setValueProp] = useState('Courtia centralise le suivi, les relances et le flywheel immobilier → crédit → assurance.')
  const [subject, setSubject] = useState('Question rapide sur votre suivi clients')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    try {
      const [prospectRes, messageRes] = await Promise.all([
        api.get('/ark/prospects'),
        api.get('/ark/prospects/messages?status=draft'),
      ])
      setProspects(prospectRes.data || [])
      setMessages(messageRes.data || [])
    } catch (error) {
      setErr(error.response?.data?.error || error.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const call = async (path, body) => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const response = await api.post(`/ark/${path}`, body)
      await load()
      return response.data
    } catch (error) {
      setErr(error.response?.data?.error || error.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const doImport = async () => {
    const result = await call('prospects/import', { csv })
    if (result) {
      setMsg(`${result.inserted} importés, ${result.skipped} ignorés.`)
      setCsv('')
    }
  }

  const launch = async () => {
    const prospectIds = prospects.filter((prospect) => prospect.status === 'new').map((prospect) => prospect.id)
    if (!prospectIds.length) {
      setErr('Aucun prospect nouveau à contacter.')
      return
    }
    const result = await call('prospects/campaign', { prospectIds, sector, valueProp, subject })
    if (result) setMsg(`Campagne préparée : ${result.messages} brouillon(s) pour ${result.prospects} prospect(s).`)
  }

  const approveDrafts = async () => {
    const messageIds = messages.map((message) => message.id)
    if (!messageIds.length) {
      setErr('Aucun brouillon à valider.')
      return
    }
    const result = await call('prospects/messages/approve', { messageIds })
    if (result) setMsg(`${result.approved} message(s) validé(s).`)
  }

  const send = async () => {
    const result = await call('prospects/send', { limit: 50 })
    if (result) setMsg(`${result.sent} envoyé(s), ${result.failed} échec(s).`)
  }

  const byStatus = (status) => prospects.filter((prospect) => prospect.status === status).length

  return (
    <div style={S.shell}>
      <div style={S.aA} />
      <div style={S.aB} />
      <main style={S.c}>
        <div style={S.kick}>ARK · Prospection</div>
        <h1 style={S.h1}>Machine de prospection</h1>
        <p style={S.sub}>Import CSV → ARK rédige → brouillons → validation → envoi Brevo conforme.</p>

        {err && <div style={S.err}>⚠ {err}</div>}
        {msg && <div style={S.ok}>{msg}</div>}

        <div style={S.stats}>
          <Stat n={byStatus('new')} l="nouveaux" />
          <Stat n={byStatus('queued')} l="en file" />
          <Stat n={byStatus('contacted')} l="contactés" />
          <Stat n={messages.length} l="brouillons" />
        </div>

        <section style={S.card}>
          <div style={S.lbl}>1 · Importer un CSV</div>
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={5}
            placeholder={'nom,email,societe,secteur\nJean Dupont,jean@agence.fr,Agence Dupont,immobilier'}
            style={S.ta}
          />
          <button type="button" onClick={doImport} disabled={busy || !csv.trim()} style={S.btn}>Importer</button>
        </section>

        <section style={S.card}>
          <div style={S.lbl}>2 · Préparer la campagne</div>
          <input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Secteur" style={S.in} />
          <input value={valueProp} onChange={(event) => setValueProp(event.target.value)} placeholder="Proposition de valeur" style={S.in} />
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Objet email" style={S.in} />
          <button type="button" onClick={launch} disabled={busy} style={S.btn}>ARK rédige les brouillons</button>
        </section>

        <section style={S.card}>
          <div style={S.lbl}>3 · Valider puis envoyer</div>
          <p style={S.hint}>{messages.length} brouillon(s) en attente. Rien ne part sans validation.</p>
          {messages.length > 0 && (
            <div style={S.drafts}>
              {messages.slice(0, 8).map((message) => (
                <article key={message.id} style={S.draft}>
                  <div style={S.draftTo}>{message.full_name || message.company || message.email}</div>
                  <div style={S.draftSubject}>{message.subject}</div>
                  <pre style={S.draftBody}>{message.body}</pre>
                </article>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={approveDrafts} disabled={busy || messages.length === 0} style={S.btn}>Valider les brouillons</button>
            <button type="button" onClick={send} disabled={busy} style={S.btn}>Envoyer les validés</button>
          </div>
        </section>
      </main>
    </div>
  )
}

function Stat({ n, l }) {
  return <div style={S.stat}><div style={S.statN}>{n}</div><div style={S.statL}>{l}</div></div>
}

const S = {
  shell: { position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'radial-gradient(120% 120% at 50% -10%, #15122b 0%, #0a0a12 55%, #07070d 100%)', color: '#e9e9f2', fontFamily: "'Inter', system-ui, sans-serif" },
  aA: { position: 'absolute', top: -130, right: '12%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,.3), transparent 65%)', filter: 'blur(46px)' },
  aB: { position: 'absolute', bottom: -160, left: -80, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,.16), transparent 65%)', filter: 'blur(50px)' },
  c: { position: 'relative', maxWidth: 720, margin: '0 auto', padding: '44px 20px 80px', zIndex: 1 },
  kick: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#8b86b8', fontWeight: 700 },
  h1: { fontSize: 32, fontWeight: 850, margin: '6px 0 4px' },
  sub: { fontSize: 14.5, color: '#b9b6d4', margin: 0 },
  err: { marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', color: '#ffb3c1', fontSize: 14 },
  ok: { marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(92,255,166,.08)', border: '1px solid rgba(92,255,166,.28)', color: '#8effbe', fontSize: 14 },
  stats: { display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' },
  stat: { flex: '1 1 130px', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)', textAlign: 'center' },
  statN: { fontSize: 24, fontWeight: 850, color: '#fff' },
  statL: { fontSize: 11.5, color: '#8b86b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { marginTop: 18, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' },
  lbl: { fontSize: 13, fontWeight: 800, color: '#22d3ee', marginBottom: 10 },
  ta: { width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 13px', color: '#e9e9f2', fontSize: 14, fontFamily: 'monospace' },
  in: { width: '100%', boxSizing: 'border-box', marginBottom: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 13px', color: '#e9e9f2', fontSize: 14 },
  btn: { marginTop: 10, background: 'linear-gradient(90deg,#22d3ee,#7c5cff)', color: '#06121a', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 850, cursor: 'pointer' },
  hint: { fontSize: 12.5, color: '#8b86b8', margin: '0 0 8px' },
  drafts: { display: 'flex', flexDirection: 'column', gap: 10, margin: '12px 0' },
  draft: { padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)' },
  draftTo: { fontSize: 12, color: '#22d3ee', fontWeight: 850 },
  draftSubject: { fontSize: 13.5, color: '#fff', fontWeight: 800, marginTop: 4 },
  draftBody: { whiteSpace: 'pre-wrap', margin: '8px 0 0', color: '#d9d7ea', fontSize: 12.5, lineHeight: 1.45, fontFamily: 'inherit' },
}
