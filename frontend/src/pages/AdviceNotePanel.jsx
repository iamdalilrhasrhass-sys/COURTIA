import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileCheck2, ShieldCheck } from 'lucide-react'
import api from '../api'

function arrayValue(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function AdviceNotePanel({ dossierId }) {
  const params = useParams()
  const navigate = useNavigate()
  const resolvedDossierId = dossierId || params.id
  const [note, setNote] = useState(null)
  const [edit, setEdit] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const loadLatest = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.get(`/ark/dossiers/${resolvedDossierId}/advice-notes`)
      setNote((response.data || [])[0] || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Impossible de charger la note.')
    } finally {
      setLoading(false)
    }
  }, [resolvedDossierId])

  useEffect(() => {
    if (resolvedDossierId) loadLatest()
  }, [loadLatest, resolvedDossierId])

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await api.post(`/ark/dossiers/${resolvedDossierId}/advice-note`)
      setNote(response.data)
      setEdit({})
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Generation impossible.')
    } finally {
      setBusy(false)
    }
  }

  const validate = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await api.post(`/ark/advice-notes/${note.id}/validate`, edit)
      setNote(response.data)
      setEdit({})
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Validation impossible.')
    } finally {
      setBusy(false)
    }
  }

  const value = (field) => edit[field] ?? note?.[field] ?? ''
  const setValue = (field) => (event) => setEdit((current) => ({ ...current, [field]: event.target.value }))
  const validated = note?.status === 'validated'

  return (
    <div style={styles.shell}>
      <div style={styles.auroraA} />
      <div style={styles.auroraB} />
      <main style={styles.container}>
        <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Retour
        </button>

        <div style={styles.kicker}><FileCheck2 size={15} /> ARK · Devoir de conseil</div>
        <h1 style={styles.title}>Note de conseil</h1>
        <p style={styles.subtitle}>ARK prépare. Le courtier relit, corrige et valide. La preuve est archivée dans le journal immuable.</p>

        {error && <div style={styles.error}>⚠ {error}</div>}
        {loading && <div style={styles.empty}>Chargement…</div>}

        {!loading && !note && (
          <section style={styles.empty}>
            <p style={styles.muted}>Aucune note pour ce dossier.</p>
            <button type="button" onClick={generate} disabled={busy} style={styles.primary}>
              {busy ? 'Génération…' : 'Générer le brouillon'}
            </button>
            <p style={styles.hint}>Disponible uniquement quand le dossier est à l’état conseil.</p>
          </section>
        )}

        {note && (
          <section>
            {validated && (
              <div style={styles.validated}>
                <ShieldCheck size={16} /> Validée le {new Date(note.validated_at).toLocaleString('fr-FR')} · preuve DDA enregistrée
              </div>
            )}

            <Field label="Besoins et exigences" value={value('needs_summary')} onChange={setValue('needs_summary')} readOnly={validated} />
            <Field label="Situation du client" value={value('client_situation')} onChange={setValue('client_situation')} readOnly={validated} />

            <Block title="Options envisagées">
              {arrayValue(note.options_considered).map((option, index) => (
                <div key={`${option.name || 'option'}-${index}`} style={styles.option}>
                  <strong>{option.name}</strong>
                  {arrayValue(option.pros).length > 0 && <div style={styles.pro}>+ {arrayValue(option.pros).join(' · ')}</div>}
                  {arrayValue(option.cons).length > 0 && <div style={styles.con}>− {arrayValue(option.cons).join(' · ')}</div>}
                </div>
              ))}
            </Block>

            <Field label="Recommandation provisoire" value={value('recommendation')} onChange={setValue('recommendation')} readOnly={validated} />
            <Field label="Raisons de la recommandation" highlight value={value('recommendation_reasons')} onChange={setValue('recommendation_reasons')} readOnly={validated} />

            {arrayValue(note.missing_information).length > 0 && (
              <Block title="Informations manquantes">
                {arrayValue(note.missing_information).map((item, index) => <div key={index} style={styles.warn}>○ {item}</div>)}
              </Block>
            )}

            {arrayValue(note.warnings).length > 0 && (
              <Block title="Points de vigilance">
                {arrayValue(note.warnings).map((item, index) => <div key={index} style={styles.warn}>⚠ {item}</div>)}
              </Block>
            )}

            {!validated && (
              <div style={styles.actions}>
                <button type="button" onClick={validate} disabled={busy} style={styles.primary}>
                  {busy ? 'Validation…' : 'Valider la note'}
                </button>
                <button type="button" onClick={generate} disabled={busy} style={styles.ghost}>
                  Régénérer
                </button>
                <span style={styles.hint}>Impossible de valider sans besoins, recommandation et raisons.</span>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function Field({ label, value, onChange, readOnly, highlight = false }) {
  return (
    <div style={styles.field}>
      <label style={{ ...styles.label, color: highlight ? '#22d3ee' : '#9a96c0' }}>
        {label}{highlight ? ' · cœur DDA' : ''}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        rows={highlight ? 4 : 3}
        style={{ ...styles.textarea, ...(highlight ? styles.highlight : {}), ...(readOnly ? styles.readOnly : {}) }}
      />
    </div>
  )
}

function Block({ title, children }) {
  return (
    <div style={styles.field}>
      <div style={styles.label}>{title}</div>
      <div style={styles.block}>{children}</div>
    </div>
  )
}

const styles = {
  shell: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
    background: 'radial-gradient(120% 120% at 50% -10%, #15122b 0%, #0a0a12 55%, #07070d 100%)',
    color: '#e9e9f2',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  auroraA: {
    position: 'absolute',
    top: -130,
    right: '15%',
    width: 440,
    height: 440,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,92,255,.30), transparent 65%)',
    filter: 'blur(46px)',
  },
  auroraB: {
    position: 'absolute',
    bottom: -170,
    left: -80,
    width: 460,
    height: 460,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,.18), transparent 65%)',
    filter: 'blur(50px)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 760,
    margin: '0 auto',
    padding: '40px 20px 80px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid rgba(255,255,255,.14)',
    background: 'rgba(255,255,255,.06)',
    color: '#e9e9f2',
    borderRadius: 999,
    padding: '8px 13px',
    cursor: 'pointer',
    marginBottom: 26,
  },
  kicker: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#8b86b8',
    fontWeight: 700,
  },
  title: { fontSize: 34, lineHeight: 1.05, fontWeight: 850, margin: '8px 0 7px', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, color: '#b9b6d4', margin: 0, maxWidth: 620, lineHeight: 1.45 },
  error: {
    marginTop: 22,
    padding: '13px 16px',
    borderRadius: 13,
    background: 'rgba(255,77,109,.12)',
    border: '1px solid rgba(255,77,109,.3)',
    color: '#ffb3c1',
    fontSize: 14,
  },
  empty: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.1)',
    color: '#a9a5ca',
  },
  muted: { color: '#a9a5ca', marginTop: 0 },
  validated: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(92,255,166,.08)',
    border: '1px solid rgba(92,255,166,.28)',
    color: '#8effbe',
    fontSize: 13.5,
    fontWeight: 650,
  },
  field: { marginTop: 22 },
  label: { display: 'block', fontSize: 12, fontWeight: 800, color: '#9a96c0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7 },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 12,
    padding: '12px 14px',
    color: '#e9e9f2',
    fontSize: 14.5,
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },
  highlight: { border: '1px solid rgba(34,211,238,.42)', background: 'rgba(34,211,238,.05)' },
  readOnly: { opacity: 0.86, cursor: 'default', background: 'rgba(255,255,255,.025)' },
  block: { display: 'flex', flexDirection: 'column', gap: 8 },
  option: { padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)' },
  pro: { fontSize: 13, color: '#8effbe', marginTop: 5 },
  con: { fontSize: 13, color: '#ffb38f', marginTop: 4 },
  warn: { fontSize: 13.5, color: '#d8c9a8' },
  actions: { marginTop: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  primary: {
    background: 'linear-gradient(90deg,#22d3ee,#7c5cff)',
    color: '#06121a',
    border: 'none',
    borderRadius: 11,
    padding: '11px 22px',
    fontSize: 14,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(34,211,238,.3)',
  },
  ghost: { background: 'transparent', color: '#a9a5ca', border: '1px solid rgba(255,255,255,.14)', borderRadius: 11, padding: '11px 18px', fontSize: 14, cursor: 'pointer' },
  hint: { fontSize: 12.5, color: '#8580ad', flexBasis: '100%', marginTop: 4 },
}
