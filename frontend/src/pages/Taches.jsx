import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('token') }

export default function Taches() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState(null)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    client_id: '',
    echeance: '',
    statut: 'a_faire'
  })

  useEffect(() => {
    fetchTasks()
    fetchClients()
  }, [])

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/taches`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur tâches:', err)
      toast.error('Impossible de charger les tâches')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients`, { headers })
      if (!res.ok) return
      const data = await res.json()
      const arr = Array.isArray(data) ? data : (data.data || [])
      setClients(arr)
    } catch (err) {
      console.error('Erreur clients:', err)
    }
  }

  const resetForm = () => {
    setFormData({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire' })
    setSelectedForEdit(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedForEdit) {
        const res = await fetch(`${API_URL}/api/taches/${selectedForEdit.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify(formData)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Tâche modifiée ✓')
      } else {
        const res = await fetch(`${API_URL}/api/taches`, {
          method: 'POST', headers,
          body: JSON.stringify(formData)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Tâche créée ✓')
      }
      setShowModal(false)
      resetForm()
      fetchTasks()
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette tâche ?')) return
    try {
      const res = await fetch(`${API_URL}/api/taches/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Tâche supprimée')
      setTasks(tasks.filter(t => t.id !== id))
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleToggleStatut = async (task) => {
    const newStatut = task.statut === 'terminee' ? 'a_faire' : 'terminee'
    try {
      const res = await fetch(`${API_URL}/api/taches/${task.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ ...task, statut: newStatut })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setTasks(tasks.map(t => t.id === task.id ? { ...t, statut: newStatut } : t))
    } catch (err) {
      toast.error('Erreur mise à jour statut')
    }
  }

  const handleEdit = (task) => {
    setSelectedForEdit(task)
    setFormData({
      titre: task.titre || '',
      description: task.description || '',
      client_id: task.client_id || '',
      echeance: task.echeance ? task.echeance.split('T')[0] : '',
      statut: task.statut || 'a_faire'
    })
    setShowModal(true)
  }

  const getPrioriteColor = (priorite) => {
    const colors = {
      haute: { bg: '#fee2e2', color: '#dc2626', label: 'Haute' },
      normale: { bg: '#fef3c7', color: '#d97706', label: 'Normale' },
      basse: { bg: '#d1fae5', color: '#065f46', label: 'Basse' }
    }
    return colors[priorite] || colors.normale
  }

  const filteredTasks = tasks.filter(t => {
    const matchStatut = filterStatut === 'tous' || t.statut === filterStatut
    const matchPriorite = filterPriorite === 'tous' || t.priorite === filterPriorite
    return matchStatut && matchPriorite
  })

  const urgentCount = tasks.filter(t => t.priorite === 'haute' && t.statut !== 'terminee').length

  if (loading) return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#6b7280' }}>Chargement des tâches...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 32, fontFamily: 'Arial, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, width: '90%', maxWidth: 500 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{selectedForEdit ? 'Modifier' : 'Créer'} une tâche</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Titre *</label>
                <input value={formData.titre} onChange={e => setFormData({ ...formData, titre: e.target.value })} required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box', fontSize: 14, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Statut</label>
                  <select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Échéance</label>
                  <input type="date" value={formData.echeance} onChange={e => setFormData({ ...formData, echeance: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Client (optionnel)</label>
                <select value={formData.client_id || ''} onChange={e => setFormData({ ...formData, client_id: e.target.value || null })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                  <option value="">-- Aucun --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom || c.first_name} {c.prenom || c.last_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" style={{ flex: 1, padding: 10, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                  {selectedForEdit ? 'Modifier' : 'Créer'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  style={{ flex: 1, padding: 10, background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0a0a0a', margin: 0 }}>
          Tâches
          {urgentCount > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginLeft: 10 }}>
              {urgentCount}
            </span>
          )}
        </h1>
        <button onClick={() => { resetForm(); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + Créer tâche
        </button>
      </div>

      {/* Filtres */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#666', alignSelf: 'center', marginRight: 4 }}>Statut :</span>
          {[['tous', 'Tous'], ['a_faire', 'À faire'], ['en_cours', 'En cours'], ['terminee', 'Terminée']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatut(val)}
              style={{ padding: '6px 12px', background: filterStatut === val ? '#0a0a0a' : '#f0f0f0', color: filterStatut === val ? '#fff' : '#0a0a0a', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#666', alignSelf: 'center', marginRight: 4 }}>Priorité :</span>
          {[['tous', 'Tous'], ['haute', 'Haute'], ['normale', 'Normale'], ['basse', 'Basse']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterPriorite(val)}
              style={{ padding: '6px 12px', background: filterPriorite === val ? '#0a0a0a' : '#f0f0f0', color: filterPriorite === val ? '#fff' : '#0a0a0a', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9ca3af', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 14 }}>Aucune tâche — cliquez sur "+ Créer tâche" pour commencer</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const prioColor = getPrioriteColor(task.priorite)
            const clientLabel = task.client_nom ? `${task.client_nom} ${task.client_prenom || ''}`.trim() : null
            return (
              <div key={task.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 10, background: task.statut === 'terminee' ? '#f9fafb' : 'white', opacity: task.statut === 'terminee' ? 0.65 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <button onClick={() => handleToggleStatut(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, fontSize: 20 }}>
                    {task.statut === 'terminee' ? '✅' : '⬜'}
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: task.statut === 'terminee' ? '#9ca3af' : '#0a0a0a', textDecoration: task.statut === 'terminee' ? 'line-through' : 'none', margin: '0 0 4px' }}>
                      {task.titre}
                    </p>
                    {task.description && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>{task.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: prioColor.bg, color: prioColor.color, fontSize: 11, fontWeight: 600 }}>
                        {prioColor.label}
                      </span>
                      {task.statut !== 'terminee' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>
                          {task.statut === 'a_faire' ? 'À faire' : 'En cours'}
                        </span>
                      )}
                      {task.echeance && (
                        <span style={{ fontSize: 11, color: '#6b7280' }}>
                          📅 {new Date(task.echeance).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {clientLabel && (
                        <span style={{ fontSize: 11, color: '#2563eb' }}>👤 {clientLabel}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(task)}
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(task.id)}
                      style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
