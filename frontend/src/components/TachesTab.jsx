import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Clock, X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'

const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire', headerColor: 'text-slate-700', bgColor: 'bg-slate-50/30', borderColor: 'border-slate-300/60' },
  { id: 'en_cours', title: 'En cours', headerColor: 'text-blue-700', bgColor: 'bg-blue-50/30', borderColor: 'border-blue-300/60' },
  { id: 'terminee', title: 'Terminé', headerColor: 'text-green-700', bgColor: 'bg-green-50/30', borderColor: 'border-green-300/60' },
]

const PRIORITIES = {
  haute:   { label: 'Haute', classes: 'bg-red-100/80 text-red-700' },
  normale: { label: 'Normale', classes: 'bg-blue-100/80 text-blue-700' },
  basse:   { label: 'Basse', classes: 'bg-gray-100/80 text-gray-600' },
}

const fmtDate = (d) => {
  if (!d) return null
  const date = new Date(d); date.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  const daysDiff = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  
  let color = 'text-gray-500'
  if (daysDiff < 0) color = 'text-red-600 font-semibold'
  else if (daysDiff <= 2) color = 'text-amber-600 font-semibold'

  return <div className={`flex items-center gap-1.5 text-xs ${color}`}><Clock size={12} />{new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }
}

function TaskCard({ task, onEdit, onDelete }) {
  const priority = PRIORITIES[task.priorite] || PRIORITIES.basse

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, boxShadow: '0 4px 15px rgba(37, 99, 235, 0.1)' }}
      className="from-white/80 to-slate-50/80 bg-gradient-to-br backdrop-blur-lg border border-slate-200/50 rounded-xl p-4 transition-all duration-300 group cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-gray-900 flex-1 pr-2">{task.titre}</p>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priority.classes}`}>{priority.label}</span>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50/50">
        {fmtDate(task.echeance)}
        <div className="flex items-center -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>
    </motion.div>
  )
}

function TaskModal({ task, clientId, onSave, onClose }) {
  const [form, setForm] = useState({ titre: '', description: '', priorite: 'normale', echeance: '' })
  
  useEffect(() => { if (task) { setForm({ ...task, echeance: task.echeance ? task.echeance.split('T')[0] : '' }) } else { setForm({ titre: '', description: '', priorite: 'normale', echeance: '' }) } }, [task])
  
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...form, id: task?.id, statut: task?.statut || 'a_faire' }); }
  const inputClass = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:border-[#2563eb] outline-none"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la' : 'Nouvelle'} tâche</h2><button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div><label htmlFor="titre" className={labelClass}>Titre *</label><input id="titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required className={inputClass} /></div>
            <div><label htmlFor="description" className={labelClass}>Description (courte)</label><textarea id="description" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputClass} min-h-[60px]`} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="priorite" className={labelClass}>Priorité</label><select id="priorite" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className={inputClass}>{Object.entries(PRIORITIES).map(([id,p]) => <option key={id} value={id}>{p.label}</option>)}</select></div>
              <div><label htmlFor="echeance" className={labelClass}>Date limite</label><input id="echeance" type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className={inputClass} /></div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/70 border-t border-gray-100 rounded-b-xl flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">Annuler</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-lg text-sm font-semibold hover:opacity-90 shadow-sm">Sauvegarder</button></div>
        </form>
      </motion.div>
    </div>
  )
}

export default function TachesTab({ taches: initialTaches = [], clientId, navigate }) {
  const [taches, setTaches] = useState(initialTaches)
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => { setTaches(initialTaches) }, [initialTaches])

  const tasksByStatus = useMemo(() => KANBAN_COLUMNS.reduce((acc, col) => ({...acc, [col.id]: taches.filter(t => t.statut === col.id).sort((a,b) => new Date(a.echeance) - new Date(b.echeance))}), {}), [taches])
  const openModal = (task = null) => { setSelectedTask(task); setShowModal(true) }

  async function handleSave(formData) {
    try {
      const payload = { ...formData, client_id: clientId, description: formData.description || '' }
      if (payload.id) {
        const { data } = await api.put(`/api/taches/${payload.id}`, payload)
        setTaches(taches.map(t => t.id === payload.id ? data : t))
        toast.success('Tâche modifiée ✓')
      } else {
        const { data } = await api.post('/api/taches', payload)
        setTaches([...taches, data])
        toast.success('Tâche créée ✓')
      }
      setShowModal(false); setSelectedTask(null)
    } catch { toast.error('Erreur lors de la sauvegarde.') }
  }
  
  async function handleDelete(id) {
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return
    try {
      await api.delete(`/api/taches/${id}`)
      setTaches(t => t.filter(x => x.id !== id))
      toast.success('Tâche supprimée.')
    } catch { toast.error('Erreur de suppression.') }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-end mb-6">
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.05]"><Plus size={16} /> Nouvelle tâche</button>
      </div>
      
      {taches.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/50 backdrop-blur-lg border border-slate-200/50 rounded-2xl shadow-sm">
          <p className="font-semibold text-gray-600">Aucune tâche pour ce client</p>
          <p className="mt-1 text-sm text-gray-400">Organisez votre travail en créant votre première tâche.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {KANBAN_COLUMNS.map(col => (
            <div key={col.id}>
              <h3 className={`px-2 text-base font-bold ${col.headerColor}`}>{col.title} <span className="text-sm font-medium text-gray-400">{tasksByStatus[col.id].length}</span></h3>
              <motion.div variants={containerVariants} initial="hidden" animate="visible"
                className={`mt-3 p-3 space-y-3 rounded-2xl min-h-[300px] border-2 ${col.bgColor} ${col.borderColor} ${col.id === 'terminee' ? 'opacity-75' : ''}`}>
                {tasksByStatus[col.id].map(task => <TaskCard key={task.id} task={task} onEdit={openModal} onDelete={handleDelete} />)}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && <TaskModal task={selectedTask} clientId={clientId} onSave={handleSave} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}
