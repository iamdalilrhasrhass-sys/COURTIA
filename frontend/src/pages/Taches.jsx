import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Clock, X } from 'lucide-react'
import Topbar from '../components/Topbar'
import api from '../api'

const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire', headerClasses: 'bg-gray-100 border-gray-200' },
  { id: 'en_cours', title: 'En cours', headerClasses: 'bg-blue-50 border-t-2 border-blue-500' },
  { id: 'terminee', title: 'Terminé', headerClasses: 'bg-emerald-50 border-t-2 border-emerald-500' },
]

const PRIORITY_STYLES = {
  haute:   { label: 'Haute', classes: 'bg-red-100 text-red-600' },
  normale: { label: 'Normale', classes: 'bg-blue-100 text-blue-600' },
  basse:   { label: 'Basse', classes: 'bg-gray-100 text-gray-500' },
}

const MiniAvatar = ({ name }) => {
  const getInitials = (name) => {
    if (!name) return '?'
    const names = name.trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
      {getInitials(name)}
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete }) {
  const priority = PRIORITY_STYLES[task.priorite] || PRIORITY_STYLES.basse
  const clientName = task.client_nom ? `${task.client_nom} ${task.client_prenom || ''}`.trim() : null
  const echeance = task.echeance ? new Date(task.echeance) : null
  const isOverdue = echeance && new Date() > echeance

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start">
        <p className="font-semibold text-sm text-gray-800 pr-4">{task.titre}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={14} /></button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>
      
      {clientName && (
        <div className="flex items-center gap-2 mt-3">
          <MiniAvatar name={clientName} />
          <span className="text-xs text-gray-600 font-medium">{clientName}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priority.classes}`}>
          {priority.label}
        </span>
        {echeance && (
          <span className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            <Clock size={12} />
            {echeance.toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  )
}

function TaskModal({ task, clients, onSave, onClose }) {
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire', priorite: 'normale' })

  useEffect(() => {
    if (task) {
      setForm({
        titre: task.titre || '',
        description: task.description || '',
        client_id: task.client_id || '',
        echeance: task.echeance ? task.echeance.split('T')[0] : '',
        statut: task.statut || 'a_faire',
        priorite: task.priorite || 'normale'
      })
    }
  }, [task])
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: task?.id });
  }

  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all duration-200"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" style={{ animationDuration: '200ms' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative m-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{task ? 'Modifier' : 'Créer'} une tâche</h2>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="titre" className={labelClass}>Titre *</label>
              <input id="titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} resize-vertical`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="statut" className={labelClass}>Statut</label>
                <select id="statut" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className={`${inputClass} cursor-pointer`}>
                  <option value="a_faire">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminee">Terminée</option>
                </select>
              </div>
              <div>
                <label htmlFor="priorite" className={labelClass}>Priorité</label>
                <select id="priorite" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className={`${inputClass} cursor-pointer`}>
                  <option value="haute">Haute</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="echeance" className={labelClass}>Échéance</label>
              <input id="echeance" type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="client" className={labelClass}>Client (optionnel)</label>
              <select id="client" value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value || null })} className={`${inputClass} cursor-pointer`}>
                <option value="">— Aucun —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">Annuler</button>
            <button type="submit" className="px-4 py-2.5 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm hover:shadow-lg hover:shadow-blue-500/20">
              {task ? 'Sauvegarder' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
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
      const [tasksRes, clientsRes] = await Promise.all([
        api.get('/api/taches'),
        api.get('/api/clients')
      ])
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
      const clientData = clientsRes.data
      setClients(Array.isArray(clientData) ? clientData : (clientData?.data || []))
    } catch {
      toast.error('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(formData) {
    try {
      if (formData.id) {
        await api.put(`/api/taches/${formData.id}`, formData)
        toast.success('Tâche modifiée ✓')
      } else {
        await api.post('/api/taches', formData)
        toast.success('Tâche créée ✓')
      }
      setShowModal(false); setSelectedTask(null); fetchAll()
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette tâche ?')) return
    try {
      await api.delete(`/api/taches/${id}`)
      toast.success('Tâche supprimée')
      setTasks(t => t.filter(x => x.id !== id))
    } catch { toast.error('Erreur lors de la suppression') }
  }

  function handleEdit(task) {
    setSelectedTask(task)
    setShowModal(true)
  }

  const topbarAction = (
    <button onClick={() => { setSelectedTask(null); setShowModal(true) }}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02]">
      <Plus size={16} />
      Nouvelle tâche
    </button>
  )
  
  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.statut === col.id)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white font-sans">
      <Topbar
        title="Tâches"
        subtitle={`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} au total`}
        action={topbarAction}
      />

      <main className="p-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDuration: '400ms' }}>
            {KANBAN_COLUMNS.map(column => (
              <div key={column.id} className="bg-gray-50/70 rounded-xl flex flex-col">
                <div className={`p-4 rounded-t-xl border-b ${column.headerClasses}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-800">{column.title}</h2>
                    <span className="text-sm font-semibold text-gray-500 bg-white/70 px-2 py-0.5 rounded-md">
                      {tasksByStatus[column.id].length}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4 h-full overflow-y-auto">
                  {tasksByStatus[column.id].map(task => (
                    <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                  {tasksByStatus[column.id].length === 0 && (
                    <div className="text-center py-10 text-xs text-gray-400">
                      Aucune tâche ici.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6">
        <p className="text-xs text-gray-400">Rhasrhass®</p>
      </footer>
      
      {showModal && <TaskModal task={selectedTask} clients={clients} onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
