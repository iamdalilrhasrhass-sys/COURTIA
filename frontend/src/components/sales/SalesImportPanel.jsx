import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, RotateCcw, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { formatDateTime } from '../../lib/salesProspecting'

export default function SalesImportPanel({ onImported }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [source, setSource] = useState('SIRENE')
  const [preview, setPreview] = useState(null)
  const [imports, setImports] = useState([])
  const [mode, setMode] = useState('upsert')
  const [busy, setBusy] = useState(false)
  const [renderedAt] = useState(() => Date.now())

  const loadImports = async () => {
    const response = await salesApi.imports()
    setImports(response.data.imports || [])
  }
  useEffect(() => {
    let active = true
    salesApi.imports().then((response) => { if (active) setImports(response.data.imports || []) }).catch(() => {})
    return () => { active = false }
  }, [])

  async function previewFile() {
    if (!file || busy) return
    setBusy(true)
    try {
      const response = await salesApi.previewImport(file, source)
      setPreview(response.data)
      toast.success('Aperçu créé — aucune donnée n’a encore été importée')
      await loadImports()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Lecture du fichier impossible')
    } finally { setBusy(false) }
  }

  async function commit() {
    if (!preview?.job?.id || busy) return
    setBusy(true)
    try {
      const response = await salesApi.commitImport(preview.job.id, mode)
      toast.success(`${response.data.created} créés · ${response.data.updated} mis à jour`)
      setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ''
      await loadImports(); onImported?.()
    } catch (error) { toast.error(error?.response?.data?.error || 'Import impossible') }
    finally { setBusy(false) }
  }

  async function rollback(id) {
    if (!window.confirm('Annuler cet import récent ? Les cabinets déjà appelés ou modifiés après import seront conservés.')) return
    setBusy(true)
    try {
      const response = await salesApi.rollbackImport(id)
      toast.success(`${response.data.deleted} créations supprimées · ${response.data.restored} fiches restaurées`)
      await loadImports(); onImported?.()
    } catch (error) { toast.error(error?.response?.data?.error || 'Annulation impossible') }
    finally { setBusy(false) }
  }

  return <div className="sales-admin-grid">
    <section className="sales-panel sales-import-card">
      <header><div><span className="sales-kicker"><UploadCloud size={15} /> Base nationale</span><h3>Importer des cabinets</h3><p>SIRENE, ORIAS ou CSV légal — aperçu, validation et dédoublonnage avant écriture.</p></div></header>
      <div className="sales-import-drop" onClick={() => inputRef.current?.click()}>
        <FileSpreadsheet size={30} /><strong>{file ? file.name : 'Choisir un fichier CSV ou Excel'}</strong><span>15 Mo maximum · 20 000 lignes par lot</span>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null) }} />
      </div>
      <div className="sales-form-grid compact">
        <label>Source<select value={source} onChange={(event) => setSource(event.target.value)}><option value="SIRENE">SIRENE</option><option value="ORIAS">ORIAS</option><option value="data.gouv.fr">data.gouv.fr</option><option value="csv_interne">CSV interne</option></select></label>
        <label>Mode après aperçu<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="upsert">Créer + mettre à jour</option><option value="create_only">Créer uniquement</option><option value="update_only">Mettre à jour uniquement</option></select></label>
      </div>
      <button className="sales-button primary" disabled={!file || busy} onClick={previewFile}>{busy ? 'Analyse…' : 'Analyser avant import'}</button>

      {preview && <div className="sales-import-preview">
        <div className="sales-import-summary"><span><CheckCircle2 size={16} />{preview.job.valid_rows} lignes valides</span><span><AlertTriangle size={16} />{preview.job.error_rows} erreurs</span><span>{preview.duplicate_rows} doublons détectés</span></div>
        {preview.unknown_columns?.length > 0 && <p className="sales-import-warning">Colonnes non reconnues : {preview.unknown_columns.join(', ')}</p>}
        <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Ligne</th><th>Cabinet</th><th>SIREN</th><th>Ville</th><th>Action</th><th>Validation</th></tr></thead><tbody>{preview.preview_rows?.map((row) => <tr key={row.row_number}><td>{row.row_number}</td><td>{row.normalized_data.legal_name || '—'}</td><td>{row.normalized_data.siren || '—'}</td><td>{row.normalized_data.city || '—'}</td><td>{row.action}</td><td>{row.validation_errors?.length ? row.validation_errors.join(', ') : 'OK'}</td></tr>)}</tbody></table></div>
        <button className="sales-button primary" disabled={busy || !preview.job.valid_rows} onClick={commit}>{busy ? 'Import…' : `Confirmer l’import de ${preview.job.valid_rows} lignes`}</button>
      </div>}
    </section>

    <section className="sales-panel sales-import-history">
      <header><div><span className="sales-kicker"><RotateCcw size={15} /> Traçabilité</span><h3>Imports récents</h3></div></header>
      {!imports.length && <p className="sales-empty-small">Aucun import.</p>}
      {imports.map((item) => <article key={item.id}><div><strong>{item.file_name}</strong><span>{item.source} · {formatDateTime(item.created_at)} · @{item.username || item.email}</span><small>{item.created_rows} créés · {item.updated_rows} mis à jour · {item.error_rows} erreurs</small></div><em>{item.status}</em>{item.status === 'committed' && renderedAt - new Date(item.committed_at).getTime() < 86400000 && <button className="sales-icon-button danger" title="Annuler l’import" onClick={() => rollback(item.id)}><RotateCcw size={15} /></button>}</article>)}
    </section>
  </div>
}
