import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, User, Calendar, X, Trash2 } from 'lucide-react'
import Topbar from '../components/Topbar'
import api from '../api'

const KANBAN_COLUMNS = [
  { id: 'a_faire', title: 'À faire', color: 'bg-blue-500' },
  { id: 'en_cours', title: 'En cours', color: 'bg-amber-500' },
  { id: 'terminee', title: 'Terminé', color: 'bg-emerald-500' },
]

const PRIORITY_STYLES = {
  haute:   { indicator: 'bg-red-500', label: 'Haute' },
  normale: { indicator: 'bg-blue-500', label: 'Normale' },
  basse:   { indicator: 'bg-gray-400', label: 'Basse' },
}

const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : null

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
    <div className="bg-white p-3.5 rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group" onClick={() => onEdit(task)}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-gray-800 flex-1 pr-2">{task.titre}</p>
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${priority.indicator}`} title={`Priorité ${priority.label}`}></div>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {clientName && <span className="flex items-center gap-1.5" title={clientName}><User size={13} /> <span className="truncate max-w-[80px]">{clientName}</span></span>}
          {echeance && <span className={`flex items-center gap-1.5 ${echeanceColor}`}><Calendar size={13} /> {fmtDateShort(echeance)}</span>}
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
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
      className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-[#2563eb] hover:to-[#7c3aed] hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02]">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {KANBAN_COLUMNS.map(column => (
              <div key={column.id} className="bg-gray-50/70 rounded-xl p-4 min-h-[300px]">
                <div className="flex items-center gap-3 mb-5 px-1">
                  <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                  <h2 className="text-base font-bold text-gray-800">{column.title}</h2>
                  <span className="text-sm font-semibold text-gray-400">{tasksByStatus[column.id].length}</span>
                </div>
                <div className="space-y-3 h-full overflow-y-auto">
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
