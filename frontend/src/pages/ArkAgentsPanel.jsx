import { useEffect, useState } from 'react'
import api from '../api'

export default function ArkAgentsPanel() {
  const [agents, setAgents] = useState([])
  const [actif, setActif] = useState('')
  const [consigne, setConsigne] = useState('')
  const [resultat, setResultat] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    api.get('/ark/agents')
      .then((response) => {
        setAgents(response.data || [])
        setActif(response.data?.[0]?.cle || '')
      })
      .catch((err) => setErreur(err.response?.data?.error || err.message))
  }, [])

  const lancer = async () => {
    setOccupe(true)
    setErreur(null)
    setResultat(null)
    try {
      const response = await api.post(`/ark/agents/${actif}/run`, { consigne })
      setResultat(response.data)
    } catch (err) {
      setErreur(err.response?.data?.error || err.message)
    } finally {
      setOccupe(false)
    }
  }

  const courant = agents.find((agent) => agent.cle === actif)

  return (
    <div style={S.shell}>
      <div style={S.auroraA} />
      <div style={S.auroraB} />
      <main style={S.container}>
        <div style={S.kicker}>ARK · Agents</div>
        <h1 style={S.h1}>Les agents ARK</h1>
        <p style={S.sub}>Marketing, visibilité, prospection, finances, juridique, recrutement, accueil — tous gouvernés par le même moteur.</p>

        {erreur && <div style={S.error}>⚠ {erreur}</div>}

        <div style={S.tabs}>
          {agents.map((agent) => (
            <button
              key={agent.cle}
              type="button"
              onClick={() => { setActif(agent.cle); setResultat(null) }}
              style={{ ...S.tab, ...(agent.cle === actif ? S.tabOn : {}) }}
            >
              {agent.nom}
            </button>
          ))}
        </div>

        {courant && (
          <div style={S.roleCard}>
            <div style={S.role}>{courant.role}</div>
            {courant.branchement_requis && <div style={S.integ}>⚙️ {courant.branchement_requis}</div>}
          </div>
        )}

        <textarea
          value={consigne}
          onChange={(event) => setConsigne(event.target.value)}
          rows={5}
          placeholder="Ex : Prépare 3 posts LinkedIn pour vendre Courtia à des agents immobiliers indépendants."
          style={S.textarea}
        />

        <button type="button" onClick={lancer} disabled={occupe || !actif || !consigne.trim()} style={S.primary}>
          {occupe ? 'ARK travaille…' : 'Lancer l’agent'}
        </button>

        {resultat && (
          <div style={S.output}>
            <Donnees data={resultat.sortie} />
            {resultat.actions?.length > 0 && (
              <div style={S.actionsNote}>✓ {resultat.actions.length} action(s) préparée(s), en attente de validation.</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Donnees({ data }) {
  if (data == null) return null
  if (Array.isArray(data)) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{data.map((item, index) => <div key={index} style={S.item}><Donnees data={item} /></div>)}</div>
  }
  if (typeof data === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <div style={S.fieldLabel}>{key.replace(/_/g, ' ')}</div>
            <div style={S.fieldVal}><Donnees data={value} /></div>
          </div>
        ))}
      </div>
    )
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{String(data)}</span>
}

const S = {
  shell: { position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'radial-gradient(120% 120% at 50% -10%, #15122b 0%, #0a0a12 55%, #07070d 100%)', color: '#e9e9f2', fontFamily: "'Inter', system-ui, sans-serif" },
  auroraA: { position: 'absolute', top: -130, right: '12%', width: 430, height: 430, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,.32), transparent 65%)', filter: 'blur(46px)' },
  auroraB: { position: 'absolute', bottom: -170, left: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,.18), transparent 65%)', filter: 'blur(50px)' },
  container: { position: 'relative', maxWidth: 760, margin: '0 auto', padding: '44px 20px 80px', zIndex: 1 },
  kicker: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#8b86b8', fontWeight: 700 },
  h1: { fontSize: 32, fontWeight: 850, margin: '6px 0 4px', letterSpacing: -0.5 },
  sub: { fontSize: 14.5, color: '#b9b6d4', margin: 0, maxWidth: 620, lineHeight: 1.45 },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 },
  tab: { background: 'rgba(255,255,255,.04)', color: '#b9b6d4', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  tabOn: { background: 'linear-gradient(90deg,rgba(34,211,238,.18),rgba(124,92,255,.18))', color: '#fff', border: '1px solid rgba(124,92,255,.5)' },
  roleCard: { marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)' },
  role: { fontSize: 14, color: '#e9e9f2' },
  integ: { fontSize: 12.5, color: '#d8c9a8', marginTop: 6 },
  textarea: { width: '100%', boxSizing: 'border-box', marginTop: 16, resize: 'vertical', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', color: '#e9e9f2', fontSize: 14.5, lineHeight: 1.5, fontFamily: 'inherit' },
  primary: { marginTop: 12, background: 'linear-gradient(90deg,#22d3ee,#7c5cff)', color: '#06121a', border: 'none', borderRadius: 11, padding: '11px 22px', fontSize: 14, fontWeight: 850, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,211,238,.3)' },
  error: { marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', color: '#ffb3c1', fontSize: 14 },
  output: { marginTop: 24, padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' },
  fieldLabel: { fontSize: 12, fontWeight: 800, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  fieldVal: { fontSize: 14.5, color: '#e9e9f2', lineHeight: 1.55 },
  item: { padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' },
  actionsNote: { marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(92,255,166,.08)', border: '1px solid rgba(92,255,166,.28)', color: '#8effbe', fontSize: 13.5, fontWeight: 700 },
}
