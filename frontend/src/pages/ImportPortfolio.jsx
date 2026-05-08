import { useMemo, useState } from 'react'
import { Upload, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../api'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'

const FIELD_OPTIONS = [
  ['prenom', 'Prénom client'],
  ['nom', 'Nom client'],
  ['email', 'Email client'],
  ['telephone', 'Téléphone client'],
  ['adresse', 'Adresse'],
  ['code_postal', 'Code postal'],
  ['ville', 'Ville'],
  ['type_client', 'Type client'],
  ['societe', 'Société'],
  ['siret', 'SIRET'],
  ['type_contrat', 'Type contrat'],
  ['compagnie', 'Compagnie'],
  ['numero_contrat', 'Numéro contrat'],
  ['prime_annuelle', 'Prime annuelle'],
  ['date_effet', "Date d'effet"],
  ['date_echeance', "Date d'échéance"],
  ['statut_contrat', 'Statut contrat'],
  ['tache', 'Tâche'],
  ['date_rappel', 'Date rappel'],
]

export default function ImportPortfolio() {
  const [file, setFile] = useState(null)
  const [importJobId, setImportJobId] = useState(null)
  const [headers, setHeaders] = useState([])
  const [suggestedMapping, setSuggestedMapping] = useState({})
  const [previewRows, setPreviewRows] = useState([])
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const mappingEntries = useMemo(() => Object.entries(suggestedMapping || {}), [suggestedMapping])

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const res = await api.get('/imports/history')
      setHistory(res.data?.history || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Historique import indisponible.')
    } finally {
      setLoadingHistory(false)
    }
  }

  async function onPreview(selectedFile) {
    setError('')
    setResult(null)
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('file', selectedFile)

    setLoadingPreview(true)
    try {
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setImportJobId(res.data?.import_job_id || null)
      setHeaders(res.data?.headers || [])
      setSuggestedMapping(res.data?.suggested_mapping || {})
      setPreviewRows(res.data?.preview || [])
      setStats(res.data?.stats || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Prévisualisation impossible.')
    } finally {
      setLoadingPreview(false)
    }
  }

  function onFileChange(event) {
    const selected = event.target.files?.[0]
    setFile(selected || null)
    if (selected) onPreview(selected)
  }

  function updateMapping(field, header) {
    setSuggestedMapping((prev) => ({ ...prev, [field]: header }))
  }

  async function onCommitImport() {
    if (!importJobId) {
      setError("Prévisualisez d'abord un fichier.")
      return
    }
    setCommitting(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/imports/commit', {
        import_job_id: importJobId,
        mapping: suggestedMapping,
      })
      setResult(res.data?.summary || null)
      await loadHistory()
    } catch (err) {
      setError(err.response?.data?.message || 'Import final indisponible.')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div style={{ padding: '28px 22px 42px' }}>
      <AuroraPageHeader
        title="Import portefeuille V1"
        subtitle="CSV/XLSX, mapping colonnes, prévisualisation et commit sécurisé."
        badge="Données"
      />

      <div style={panel}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={title}>1. Fichier source</h3>
            <p style={caption}>Import non destructif avec détection des doublons et rapport final.</p>
          </div>
          <label style={uploadBtn}>
            <Upload size={14} /> Choisir un fichier CSV/XLSX
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={onFileChange} />
          </label>
        </div>
        {file && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
            Fichier sélectionné: <strong>{file.name}</strong>
          </p>
        )}
      </div>

      {error && (
        <div style={errorBox}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {(stats || loadingPreview) && (
        <div style={panel}>
          <h3 style={title}>2. Prévisualisation</h3>
          {loadingPreview ? (
            <p style={caption}>Analyse du fichier en cours...</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <Stat label="Lignes totales" value={stats?.total_rows ?? 0} />
                <Stat label="Valides (estim.)" value={stats?.valid_rows_estimate ?? 0} />
                <Stat label="Erreurs (estim.)" value={stats?.error_rows_estimate ?? 0} />
                <Stat label="Colonnes inconnues" value={(stats?.unknown_columns || []).length} />
              </div>

              <div style={{ marginTop: 14 }}>
                <h4 style={subTitle}>Mapping colonnes</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {FIELD_OPTIONS.map(([field, label]) => (
                    <div key={field} style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>{label}</span>
                      <select
                        value={suggestedMapping[field] || ''}
                        onChange={(e) => updateMapping(field, e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Non mappé</option>
                        {headers.map((h) => (
                          <option key={`${field}-${h}`} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <h4 style={subTitle}>Aperçu des lignes</h4>
                <div style={previewBox}>
                  {previewRows.map((row) => (
                    <div key={row.row_number} style={previewRow}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', marginBottom: 4 }}>Ligne {row.row_number}</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                        {JSON.stringify(row.mapped, null, 2)}
                      </pre>
                      {row.errors?.length > 0 && (
                        <div style={{ marginTop: 6, color: '#fecaca', fontSize: 11 }}>
                          {row.errors.join(' | ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {importJobId && (
        <div style={panel}>
          <h3 style={title}>3. Commit import</h3>
          <p style={caption}>
            L’import crée des clients/contrats/tâches selon les colonnes mappées. Aucune suppression automatique.
          </p>
          <button type="button" onClick={onCommitImport} disabled={committing} style={ctaBtn}>
            <Database size={14} />
            {committing ? 'Import en cours...' : 'Confirmer l’import'}
          </button>
        </div>
      )}

      {result && (
        <div style={panel}>
          <h3 style={title}>4. Résultat import</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <Stat label="Clients importés" value={result.imported_clients ?? 0} />
            <Stat label="Contrats importés" value={result.imported_contracts ?? 0} />
            <Stat label="Tâches importées" value={result.imported_tasks ?? 0} />
            <Stat label="Doublons" value={result.duplicate_rows ?? 0} />
            <Stat label="Erreurs" value={result.error_rows ?? 0} />
          </div>
        </div>
      )}

      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={title}>Historique imports</h3>
          <button type="button" onClick={loadHistory} style={refreshBtn}>
            <RefreshCw size={13} /> Rafraîchir
          </button>
        </div>
        {loadingHistory ? (
          <p style={caption}>Chargement...</p>
        ) : history.length === 0 ? (
          <p style={caption}>Aucun import enregistré pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((job) => (
              <div key={job.id} style={historyItem}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 12 }}>{job.filename}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Job #{job.id} — {job.status}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  {job.valid_rows}/{job.total_rows} valides
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      <div style={{ marginTop: 4, color: '#fff', fontWeight: 800, fontSize: 18 }}>{value}</div>
    </div>
  )
}

const panel = {
  marginTop: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 14,
}

const title = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
}

const subTitle = {
  margin: '0 0 8px',
  fontSize: 13,
  fontWeight: 700,
  color: '#fff',
}

const caption = {
  margin: '8px 0 0',
  fontSize: 12,
  color: 'rgba(255,255,255,0.65)',
}

const uploadBtn = {
  border: '1px solid rgba(255,255,255,0.24)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  borderRadius: 10,
  padding: '9px 12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
}

const errorBox = {
  marginTop: 14,
  border: '1px solid rgba(251,113,133,0.45)',
  background: 'rgba(127,29,29,0.36)',
  color: '#fecdd3',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
}

const statCard = {
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.02)',
}

const selectStyle = {
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  padding: '8px 10px',
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  fontSize: 12,
}

const previewBox = {
  display: 'grid',
  gap: 8,
  maxHeight: 260,
  overflow: 'auto',
}

const previewRow = {
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.2)',
  padding: '8px 10px',
}

const ctaBtn = {
  marginTop: 10,
  border: '1px solid rgba(34,197,94,0.6)',
  background: 'linear-gradient(135deg, rgba(5,150,105,0.85), rgba(37,99,235,0.85))',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const refreshBtn = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const historyItem = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: 10,
  padding: '9px 10px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'center',
}
