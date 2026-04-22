import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Clock, X, Trash2, Edit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'

const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire', color: 'bg-blue-500', pillBg: 'bg-blue-100', pillText: 'text-blue-600' },
  { id: 'en_cours', title: 'En cours', color: 'bg-amber-500', pillBg: 'bg-amber-100', pillText: 'text-amber-600' },
  { id: 'terminee', title: 'Terminé', color: 'bg-emerald-500', pillBg: 'bg-emerald-100', pillText: 'text-emerald-600' },
]

const PRIORITY_STYLES = {
  haute:   { bg: 'bg-red-100', text: 'text-red-700', label: 'Haute' },
  normale: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Normale' },
  basse:   { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Basse' },
}

const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : null

const getHash = (str) => {
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return hash
}
const getHSL = (str) => `hsl(${getHash(str) % 360}, 60%, 80%)`

const Avatar = ({ name, size = 24 }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return (
    <div className="rounded-full text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size / 2.2,
        background: `linear-gradient(135deg, ${getHSL(name)} 0%, hsl(${ (getHash(name) + 60) % 360}, 70%, 65%) 100%)`
      }}
    >
      {getInitials(name)}
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete }) {
  const priority = PRIORITY_STYLES[task.priorite] || PRIORITY_STYLES.basse
  const clientName = task.client_nom ? `${task.client_nom} ${task.client_prenom || ''}`.trim() : null
  const echeance = task.echeance ? new Date(task.echeance) : null
  let echeanceColor = 'text-gray-500'
  if (echeance) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) echeanceColor = 'text-red-600 font-semibold'
    else if (diffDays <= 7) echeanceColor = 'text-amber-600'
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer group transition-all duration-200 ease-out hover:shadow-md"
      onClick={() => onEdit(task)}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-gray-800 flex-1">{task.titre}</p>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priority.bg} ${priority.text}`}>{priority.label}</span>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        {clientName ? (
            <div className="flex items-center gap-2">
                <Avatar name={clientName} size={24} />
                <span className="text-xs text-gray-600 font-medium">{clientName}</span>
            </div>
        ) : <div />}
        {echeance && (
          <span className={`flex items-center gap-1.5 text-xs ${echeanceColor}`}>
            <Clock size={13} /> {fmtDateShort(echeance)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end mt-2 -mb-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(task) }} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
      </div>
    </motion.div>
  )
}

function TaskModal({ task, clients, onSave, onClose }) {
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire', priorite: 'normale' })

  useEffect(() => {
    if (task) setForm({ titre: task.titre || '', description: task.description || '', client_id: task.client_id || '', echeance: task.echeance ? task.echeance.split('T')[0] : '', statut: task.statut || 'a_faire', priorite: task.priorite || 'normale' })
  }, [task])
  
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...form, id: task?.id }); }
  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all duration-200"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 antialiased">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative m-4">
        <div className="p-6 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la' : 'Créer une'} tâche</h2><button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"><X size={20} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div><label htmlFor="titre" className={labelClass}>Titre *</label><input id="titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required className={inputClass} /></div>
            <div><label htmlFor="description" className={labelClass}>Description</label><textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} min-h-[80px]`} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="statut" className={labelClass}>Statut</label><select id="statut" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className={`${inputClass} cursor-pointer`}>{KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
              <div><label htmlFor="priorite" className={labelClass}>Priorité</label><select id="priorite" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className={`${inputClass} cursor-pointer`}><option value="haute">Haute</option><option value="normale">Normale</option><option value="basse">Basse</option></select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="echeance" className={labelClass}>Échéance</label><input id="echeance" type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className={inputClass} /></div>
              <div><label htmlFor="client" className={labelClass}>Client (optionnel)</label><select id="client" value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value || null })} className={`${inputClass} cursor-pointer`}><option value="">— Aucun —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">Annuler</button><button type="submit" className="px-4 py-2.5 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">{task ? 'Sauvegarder' : 'Créer la tâche'}</button></div>
        </form>
      </motion.div>
    </div>
  )
}

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
    } catch { toast.error('Impossible de charger les données') } 
    finally { setLoading(false) }
  }

  async function handleSave(formData) {
    try {
      if (formData.id) {
        const { data } = await api.put(`/api/taches/${formData.id}`, formData)
        setTasks(tasks.map(t => t.id === formData.id ? data : t))
        toast.success('Tâche modifiée ✓')
      } else {
        const { data } = await api.post('/api/taches', formData)
        setTasks([...tasks, data])
        toast.success('Tâche créée ✓')
      }
      setShowModal(false); setSelectedTask(null)
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return
    try {
      await api.delete(`/api/taches/${id}`)
      setTasks(t => t.filter(x => x.id !== id))
      toast.success('Tâche supprimée')
    } catch { toast.error('Erreur lors de la suppression') }
  }

  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, col) => ({...acc, [col.id]: tasks.filter(t => t.statut === col.id)}), {})

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans antialiased">
      <main className="p-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
          <button onClick={() => { setSelectedTask(null); setShowModal(true) }} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-px"><Plus size={16} />Nouvelle tâche</button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.id} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${col.pillBg}`}>
                  <span className={`text-sm font-bold ${col.pillText}`}>{tasksByStatus[col.id].length}</span>
                  <span className={`text-sm font-semibold ${col.pillText}`}>{col.title}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {KANBAN_COLUMNS.map(column => (
                <div key={column.id} className="bg-gray-50/70 rounded-xl p-4">
                  <div className="flex justify-between items-center gap-3 mb-5 px-1">
                    <h2 className="text-base font-bold text-gray-800">{column.title}</h2>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">{tasksByStatus[column.id].length}</span>
                  </div>
                  <div className="space-y-3 h-full">
                    <AnimatePresence>
                      {tasksByStatus[column.id].map(task => (<TaskCard key={task.id} task={task} onEdit={() => { setSelectedTask(task); setShowModal(true) }} onDelete={handleDelete} />))}
                    </AnimatePresence>
                    {tasksByStatus[column.id].length === 0 && (<div className="text-center py-10 text-xs text-gray-400">Aucune tâche ici.</div>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <AnimatePresence>{showModal && <TaskModal task={selectedTask} clients={clients} onSave={handleSave} onClose={() => setShowModal(false)} />}</AnimatePresence>
      <footer className="text-center py-4">
          <p className="text-xs text-gray-400">Rhasrhass®</p>
      </footer>
    </div>
  )
}
