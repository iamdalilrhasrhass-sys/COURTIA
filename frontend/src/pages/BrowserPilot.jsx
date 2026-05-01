import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Play, StopCircle, Clock, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Trash2, Eye, List, Plus, Settings, ArrowRight,
  MousePointer, Type, MousePointerClick, Camera, TextSelect,
  SendHorizontal, Download, ChevronDown, ChevronUp, Terminal,
  FileText, AlertCircle, Monitor, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useBrowserPilotStore from '../stores/browserPilotStore'

const ACTION_CONFIG = {
  navigate: { icon: Globe, label: 'Navigation', color: '#3B82F6' },
  click: { icon: MousePointerClick, label: 'Clic', color: '#F59E0B' },
  type: { icon: Type, label: 'Saisie', color: '#10B981' },
  select: { icon: ChevronDown, label: 'Sélection', color: '#8B5CF6' },
  screenshot: { icon: Camera, label: 'Capture', color: '#EC4899' },
  wait: { icon: Clock, label: 'Attente', color: '#6B7280' },
  extract: { icon: TextSelect, label: 'Extraction', color: '#14B8A6' },
  submit: { icon: SendHorizontal, label: 'Soumission', color: '#EF4444' },
}

const PRESETS = [
  {
    id: 'test-connexion',
    name: 'Test de connexion',
    description: 'Navigue vers COURTIA et vérifie le chargement',
    actions: [
      { type: 'navigate', url: 'https://courtia.vercel.app' },
      { type: 'wait', timeout: 3000 },
      { type: 'screenshot' },
      { type: 'extract' },
    ],
  },
  {
    id: 'recherche-google',
    name: 'Recherche Google',
    description: 'Effectue une recherche sur Google',
    actions: [
      { type: 'navigate', url: 'https://www.google.com' },
      { type: 'wait', timeout: 2000 },
      { type: 'type', selector: 'textarea[name="q"]', value: 'courtier assurance' },
      { type: 'submit', selector: 'input[name="btnK"]' },
      { type: 'wait', timeout: 3000 },
      { type: 'screenshot' },
    ],
  },
  {
    id: 'formulaire-test',
    name: 'Formulaire test',
    description: 'Remplit un formulaire de test (httpbin)',
    actions: [
      { type: 'navigate', url: 'https://httpbin.org/forms/post' },
      { type: 'wait', timeout: 2000 },
      { type: 'type', selector: 'input[name="custname"]', value: 'Client Test' },
      { type: 'type', selector: 'input[name="custtel"]', value: '0612345678' },
      { type: 'type', selector: 'input[name="custemail"]', value: 'test@courtia.fr' },
      { type: 'click', selector: 'input[value="medium"]' },
      { type: 'click', selector: 'button[type="submit"]' },
      { type: 'wait', timeout: 3000 },
      { type: 'screenshot' },
    ],
  },
]

const STATUS_CONFIG = {
  idle: { icon: Clock, color: '#6B7280', label: 'Inactif' },
  running: { icon: RefreshCw, color: '#3B82F6', label: 'En cours', spin: true },
  completed: { icon: CheckCircle, color: '#10B981', label: 'Terminé' },
  failed: { icon: XCircle, color: '#EF4444', label: 'Échec' },
  needs_approval: { icon: AlertTriangle, color: '#F59E0B', label: 'Approbation requise' },
}

function formatDuration(start, end) {
  if (!start || !end) return ''
  const ms = new Date(end) - new Date(start)
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function ActionForm({ action, index, onChange, onRemove }) {
  const config = ACTION_CONFIG[action.type] || ACTION_CONFIG.navigate
  const Icon = config.icon

  return (
    <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', width: 20 }}>#{index + 1}</span>
        <Icon size={14} style={{ color: config.color }} />
        <select value={action.type} onChange={e => onChange(index, { ...action, type: e.target.value })}
          style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, background: '#fff', outline: 'none' }}>
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <button onClick={() => onRemove(index)} style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}><XCircle size={14} /></button>
      </div>

      {(action.type === 'navigate') && (
        <div>
          <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>URL</label>
          <input value={action.url || ''} onChange={e => onChange(index, { ...action, url: e.target.value })}
            placeholder="https://example.com" style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
        </div>
      )}

      {(action.type === 'click' || action.type === 'type' || action.type === 'select' || action.type === 'wait') && action.type !== 'wait' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Sélecteur CSS</label>
            <input value={action.selector || ''} onChange={e => onChange(index, { ...action, selector: e.target.value })}
              placeholder=".classname, #id, input[name='x']" style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
          </div>
          {action.type === 'type' && (
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Valeur</label>
              <input value={action.value || ''} onChange={e => onChange(index, { ...action, value: e.target.value })}
                placeholder="Texte à saisir" style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
            </div>
          )}
        </div>
      )}

      {action.type === 'wait' && !action.selector && (
        <div>
          <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Durée (ms)</label>
          <input type="number" value={action.timeout || 1000} onChange={e => onChange(index, { ...action, timeout: parseInt(e.target.value) })}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
        </div>
      )}

      {action.type === 'wait' && action.selector && (
        <div>
          <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Sélecteur à attendre</label>
          <input value={action.selector} onChange={e => onChange(index, { ...action, selector: e.target.value })}
            placeholder=".loaded, #content" style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
        </div>
      )}

      {action.type === 'extract' && (
        <div>
          <label style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Sélecteur (optionnel, vide = page complète)</label>
          <input value={action.selector || ''} onChange={e => onChange(index, { ...action, selector: e.target.value })}
            placeholder=".content, #main" style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }} />
        </div>
      )}

      {action.type === 'screenshot' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280' }}>
          <input type="checkbox" checked={action.fullPage !== false} onChange={e => onChange(index, { ...action, fullPage: e.target.checked })} style={{ accentColor: '#5B4DF5' }} />
          Page complète
        </label>
      )}
    </div>
  )
}

export default function BrowserPilot() {
  const [activeMode, setActiveMode] = useState('builder')
  const [actions, setActions] = useState([
    { type: 'navigate', url: 'https://courtia.vercel.app' },
    { type: 'screenshot' },
  ])
  const [dryRun, setDryRun] = useState(true)
  const [showApproval, setShowApproval] = useState(null)
  const [expandedTask, setExpandedTask] = useState(null)

  const {
    tasks, currentTask, status, serviceStatus,
    createTask, fetchTasks, fetchTask, approveTask, fetchStatus,
    loading,
  } = useBrowserPilotStore()

  useEffect(() => {
    fetchTasks()
    fetchStatus()
  }, [])

  const addAction = () => {
    setActions([...actions, { type: 'navigate', url: '' }])
  }

  const updateAction = (index, updated) => {
    const newActions = [...actions]
    newActions[index] = updated
    setActions(newActions)
  }

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const moveAction = (index, dir) => {
    const newActions = [...actions]
    const target = index + dir
    if (target < 0 || target >= newActions.length) return
    ;[newActions[index], newActions[target]] = [newActions[target], newActions[index]]
    setActions(newActions)
  }

  const runTask = async () => {
    if (actions.length === 0) return toast.error('Ajoutez au moins une action')
    try {
      await createTask(actions, dryRun, true)
      toast.success('Tâche lancée')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleApprove = async (taskId) => {
    try {
      await approveTask(taskId)
      toast.success('Tâche exécutée !')
      setShowApproval(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const runPreset = async (preset) => {
    setActions(preset.actions)
    setActiveMode('builder')
    try {
      await createTask(preset.actions, true, true)
      toast.success(`Préréglage "${preset.name}" lancé`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Statut en temps réel
  useEffect(() => {
    if (status === 'running' && currentTask?.taskId) {
      const interval = setInterval(async () => {
        try {
          await fetchTask(currentTask.taskId)
        } catch {}
        if (status !== 'running') clearInterval(interval)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [status, currentTask?.taskId])

  const StatusIcon = STATUS_CONFIG[status]?.icon || Clock
  const statusColor = STATUS_CONFIG[status]?.color || '#6B7280'

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Monitor size={22} style={{ color: '#5B4DF5' }} /> ARK Browser Pilot
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Automatisation navigateur assistée par ARK — contrôlez et testez des sites web
        </p>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: `${statusColor}15`, fontSize: 12, fontWeight: 500, color: statusColor }}>
          <StatusIcon size={14} className={STATUS_CONFIG[status]?.spin ? 'animate-spin' : ''} style={STATUS_CONFIG[status]?.spin ? { animation: 'spin 1s linear infinite' } : {}} />
          {STATUS_CONFIG[status]?.label || 'Inactif'}
        </div>
        {serviceStatus && (
          <>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: '#F3F4F6', fontSize: 11, color: '#6B7280' }}>
              {serviceStatus.active || 0} actives
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: '#F3F4F6', fontSize: 11, color: '#6B7280' }}>
              {serviceStatus.completed || 0} terminées
            </div>
          </>
        )}
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E5E7EB', marginBottom: 20 }}>
        {[
          { key: 'builder', label: 'Nouvelle tâche', icon: Plus },
          { key: 'history', label: 'Historique', icon: List },
          { key: 'presets', label: 'Préréglages', icon: Sparkles },
        ].map(mode => (
          <button key={mode.key} onClick={() => setActiveMode(mode.key)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: activeMode === mode.key ? 600 : 500,
              color: activeMode === mode.key ? '#5B4DF5' : '#6B7280',
              border: 'none', borderBottom: activeMode === mode.key ? '2px solid #5B4DF5' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <mode.icon size={14} /> {mode.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* ── BUILDER ── */}
          {activeMode === 'builder' && (
            <div style={{ display: 'grid', gridTemplateColumns: actions.length > 0 ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Séquence d'actions</h2>
                  <button onClick={addAction}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: '#5B4DF5' }}>
                    <Plus size={12} /> Ajouter une étape
                  </button>
                </div>

                <AnimatePresence>
                  {actions.map((action, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                      <ActionForm action={action} index={i} onChange={updateAction} onRemove={removeAction} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {actions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                    <Terminal size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>Aucune action définie</p>
                    <p style={{ fontSize: 11, color: '#D1D5DB' }}>Ajoutez votre première étape ci-dessus</p>
                  </div>
                )}
              </div>

              {/* Side panel */}
              <div>
                {/* URl allowlist notice */}
                <div style={{ padding: 10, background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA', marginBottom: 12, fontSize: 11, color: '#9A3412', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Shield size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>URL limitées à la whitelist (exemple.com, google.com, courtia.vercel.app, ...)</span>
                </div>

                {/* Dry-run toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} style={{ accentColor: '#5B4DF5' }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#111', margin: 0 }}>Mode dry-run</p>
                    <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Simule les actions sans exécution réelle</p>
                  </div>
                </label>

                {/* Run button */}
                <button onClick={runTask} disabled={loading || actions.length === 0}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    background: loading ? '#9CA3AF' : '#5B4DF5', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                  {loading ? 'Exécution...' : `Lancer la tâche (${actions.length} actions)`}
                </button>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {activeMode === 'history' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#F9FAFB' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>ID</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Statut</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Début</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Durée</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Actions</th>
                    <th style={{ padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => {
                    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.idle
                    const Icon = cfg.icon
                    return (
                      <tr key={task.taskId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111', fontSize: 11, fontFamily: 'monospace' }}>{task.taskId.substring(0, 16)}...</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, background: `${cfg.color}15`, color: cfg.color, fontWeight: 500, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon size={10} /> {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 11 }}>{formatDate(task.startedAt)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: 11 }}>{formatDuration(task.startedAt, task.completedAt)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B7280' }}>{task.actionsCount}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => fetchTask(task.taskId).then(() => setActiveMode('builder'))}
                            style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#5B4DF5' }}>
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                  <List size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>Aucune tâche pour le moment</p>
                </div>
              )}
            </div>
          )}

          {/* ── PRESETS ── */}
          {activeMode === 'presets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {PRESETS.map(preset => (
                <div key={preset.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={16} style={{ color: '#5B4DF5' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>{preset.name}</h3>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>{preset.description}</p>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
                    {preset.actions.length} actions • Séquence prédéfinie
                  </div>
                  <button onClick={() => runPreset(preset)}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #5B4DF5', background: 'transparent', color: '#5B4DF5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Lancer
                  </button>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Résultat de la tâche en cours */}
      {currentTask && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 24, background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={14} style={{ color: '#5B4DF5' }} /> Résultat de la tâche
            </h3>
            <StatusIcon size={16} style={{ color: statusColor }} />
          </div>

          {/* Result summary */}
          {currentTask.result && (
            <div style={{ padding: '14px 18px', display: 'flex', gap: 16, borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ padding: '8px 14px', background: '#F0FDF4', borderRadius: 8 }}>
                <p style={{ fontSize: 10, color: '#065F46', fontWeight: 600, margin: 0 }}>Actions exécutées</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#065F46', margin: '4px 0 0' }}>{currentTask.result.actionsExecuted || 0}</p>
              </div>
              {currentTask.result.pageTitle && (
                <div style={{ padding: '8px 14px', background: '#EFF6FF', borderRadius: 8, flex: 1 }}>
                  <p style={{ fontSize: 10, color: '#1E40AF', fontWeight: 600, margin: 0 }}>Titre de la page</p>
                  <p style={{ fontSize: 12, color: '#1E40AF', margin: '4px 0 0' }}>{currentTask.result.pageTitle}</p>
                </div>
              )}
            </div>
          )}

          {/* Approval needed */}
          {currentTask.status === 'needs_approval' && (
            <div style={{ padding: '14px 18px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#9A3412', margin: 0 }}>Cette tâche nécessite votre approbation</p>
                <p style={{ fontSize: 11, color: '#92400E', margin: '2px 0 0' }}>Vérifiez les actions prévues ci-dessous avant de lancer l'exécution réelle.</p>
              </div>
              <button onClick={() => handleApprove(currentTask.taskId)} disabled={loading}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                {loading ? '...' : 'Approuver'}
              </button>
              <button onClick={() => useBrowserPilotStore.getState().clearCurrentTask()}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', color: '#6B7280', fontSize: 12, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          )}

          {/* Logs */}
          <div style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', margin: '0 0 8px' }}>Journal d'exécution</p>
            <div style={{ background: '#080808', borderRadius: 8, padding: 12, maxHeight: 300, overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 10, lineHeight: '1.7' }}>
              {(currentTask.logs || []).slice(-100).map((log, i) => (
                <div key={i} style={{ color: log.includes('ERREUR') ? '#EF4444' : log.includes('final') ? '#10B981' : log.includes('Navigation') ? '#60A5FA' : '#9CA3AF' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Extracted text */}
          {currentTask.lastExtracted && (
            <div style={{ padding: '0 18px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', margin: '0 0 8px' }}>Texte extrait</p>
              <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, fontSize: 11, color: '#374151', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {currentTask.lastExtracted.substring(0, 2000)}
              </div>
            </div>
          )}

          {/* Error */}
          {currentTask.error && (
            <div style={{ padding: '0 18px 14px' }}>
              <div style={{ background: '#FEF2F2', borderRadius: 8, padding: 10, color: '#991B1B', fontSize: 11, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{currentTask.error}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Shield icon for the URL safety notice
function Shield({ size, style }) {
  return (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
