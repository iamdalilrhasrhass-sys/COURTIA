import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Clock, X, Trash2, Edit, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'

// ─── DATA & CONFIG ────────────────────────────────────────────────────────────────
const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire', headerBg: 'bg-gray-50', borderColor: 'border-gray-300' },
  { id: 'en_cours', title: 'En cours', headerBg: 'bg-amber-50', borderColor: 'border-amber-400' },
  { id: 'terminee', title: 'Terminé', headerBg: 'bg-emerald-50', borderColor: 'border-emerald-400' },
]
const PRIORITIES = {
  haute:   { label: 'Haute', classes: 'bg-red-50 text-red-600 border border-red-100' },
  normale: { label: 'Normale', classes: 'bg-blue-50 text-blue-600 border border-blue-100' },
  basse:   { label: 'Basse', classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : null
const getHash = (str) => { let hash=0; for (let i=0; i<(str||'').length; i++) hash = str.charCodeAt(i) + ((hash<<5)-hash); return hash }
const getGradient = (str) => `linear-gradient(135deg, hsl(${getHash(str)%360}, 60%, 80%) 0%, hsl(${(getHash(str)+60)%360}, 70%, 65%) 100%)`

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 24 }) => {
  const getInitials = (n) => { const parts = (n||'').trim().split(' ').filter(Boolean); return parts.length > 1 ? (parts[0][0] + parts[parts.length-1][0]) : (parts[0] || '?').substring(0,2) }
  return <div className="rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ width: size, height: size, fontSize: size/2.2, background: getGradient(name) }}>{getInitials(name).toUpperCase()}</div>
}

function TaskCard({ task, onEdit, onDelete }) {
  const priority = PRIORITIES[task.priorite] || PRIORITIES.basse
  const clientName = task.client_nom ? `${task.client_nom} ${task.client_prenom || ''}`.trim() : null
  const echeance = task.echeance ? new Date(task.echeance) : null
  const isOverdue = echeance && (new Date()).setHours(0,0,0,0) > echeance.setHours(0,0,0,0)

  return (
    <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer group transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5" onClick={() => onEdit(task)}>
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-gray-900 flex-1 pr-2">{task.titre}</p>
        <div className="relative">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priority.classes}`}>{priority.label}</span>
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); alert('Menu a implementer')}} className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"><MoreHorizontal size={14} /></button>
          </div>
        </div>
      </div>
      {(clientName || echeance) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          {clientName ? (<div className="flex items-center gap-2"><Avatar name={clientName} size={24} /><span className="text-xs text-gray-500 font-medium">{clientName}</span></div>) : <div />}
          {echeance && (<span className={`flex items-center gap-1.5 text-xs font-semibold ${isOverdue ? 'bg-red-50 text-red-500 px-1.5 py-0.5 rounded' : 'text-gray-400'}`}><Clock size={12} />{fmtDate(echeance)}</span>)}
        </div>
      )}
      <div className="flex items-center justify-end mt-2 -mb-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(task) }} className="p-2 text-gray-400 hover:text-gray-700"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} className="p-2 text-gray-400 hover:text-gray-700"><Trash2 size={16} /></button>
      </div>
    </motion.div>
  )
}

function TaskModal({ task, clients, onSave, onClose }) {
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire', priorite: 'normale' })
  useEffect(() => { if (task) setForm({ ...task, client_id: task.client_id || '', echeance: task.echeance ? task.echeance.split('T')[0] : '' }) }, [task])
  
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...form, id: task?.id }); }
  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:border-[#2563eb] outline-none transition-all"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative">
        <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la' : 'Créer une'} tâche</h2><button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div><label htmlFor="titre" className={labelClass}>Titre *</label><input id="titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required className={inputClass} /></div>
            <div><label htmlFor="description" className={labelClass}>Description</label><textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} min-h-[80px]`} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="statut" className={labelClass}>Statut</label><select id="statut" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className={inputClass}>{KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
              <div><label htmlFor="priorite" className={labelClass}>Priorité</label><select id="priorite" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className={inputClass}>{Object.entries(PRIORITIES).map(([id,p]) => <option key={id} value={id}>{p.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="echeance" className={labelClass}>Échéance</label><input id="echeance" type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className={inputClass} /></div>
              <div><label htmlFor="client" className={labelClass}>Client</label><select id="client" value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value || null })} className={inputClass}><option value="">— Aucun —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/70 border-t border-gray-100 rounded-b-xl flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Annuler</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm">Créer la tâche</button></div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────────
export default function Taches() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [tasksRes, clientsRes] = await Promise.all([api.get('/api/taches'), api.get('/api/clients')])
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.data || []))
    } catch { toast.error('Impossible de charger les données.') } 
    finally { setLoading(false) }
  }

  async function handleSave(formData) {
    try {
      const payload = { ...formData, client_id: formData.client_id === '' ? null : Number(formData.client_id) }
      if (payload.id) {
        const { data } = await api.put(`/api/taches/${payload.id}`, payload)
        setTasks(tasks.map(t => t.id === payload.id ? data : t))
        toast.success('Tâche modifiée ✓')
      } else {
        const { data } = await api.post('/api/taches', payload)
        setTasks([...tasks, data])
        toast.success('Tâche créée ✓')
      }
      setShowModal(false); setSelectedTask(null)
    } catch { toast.error('Erreur lors de la sauvegarde.') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return
    try {
      await api.delete(`/api/taches/${id}`)
      setTasks(t => t.filter(x => x.id !== id))
      toast.success('Tâche supprimée.')
    } catch { toast.error('Erreur de suppression.') }
  }

  const tasksByStatus = useMemo(() => KANBAN_COLUMNS.reduce((acc, col) => ({...acc, [col.id]: tasks.filter(t => t.statut === col.id)}), {}), [tasks])

  const openModal = (task = null) => { setSelectedTask(task); setShowModal(true) }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="p-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Tâches</h1>
            <p className="text-sm text-gray-400 mt-1">Gérez vos actions et rappels.</p>
          </div>
          <button onClick={() => openModal()} className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ease-out shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]"><Plus size={16} />Nouvelle tâche</button>
        </header>

        <div className="mt-4 mb-6 flex items-center gap-4">
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm"><span className="text-blue-600 font-black mr-2">{tasksByStatus['a_faire']?.length || 0}</span><span className="text-sm font-semibold text-gray-600">À faire</span></div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm"><span className="text-amber-500 font-black mr-2">{tasksByStatus['en_cours']?.length || 0}</span><span className="text-sm font-semibold text-gray-600">En cours</span></div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm"><span className="text-emerald-600 font-black mr-2">{tasksByStatus['terminee']?.length || 0}</span><span className="text-sm font-semibold text-gray-600">Terminées</span></div>
        </div>

        {loading ? <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>
          : <div className="flex flex-1 gap-5">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.id} className="flex-1">
                  <div className={`rounded-t-xl p-4 border-t-4 ${col.headerBg} ${col.borderColor}`}>
                    <h2 className="text-base font-bold text-gray-800">{col.title}</h2>
                  </div>
                  <div className="bg-gray-50/50 rounded-b-xl p-4 space-y-3 min-h-[400px]">
                    <AnimatePresence>
                      {tasksByStatus[col.id].map(task => <TaskCard key={task.id} task={task} onEdit={openModal} onDelete={handleDelete} />)}
                    </AnimatePresence>
                    {!tasksByStatus[col.id]?.length && <div className="text-center pt-10 text-xs text-gray-400">Aucune tâche ici.</div>}
                  </div>
                </div>
              ))}
            </div>
        }
      </main>
      <AnimatePresence>{showModal && <TaskModal task={selectedTask} clients={clients} onSave={handleSave} onClose={() => setShowModal(false)} />}</AnimatePresence>
      <footer className="text-center mt-8 pb-8">
        <p className="text-xs text-gray-300">Rhasrhass®</p>
      </footer>
    </div>
  )
}
