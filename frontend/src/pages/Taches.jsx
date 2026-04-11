import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Topbar from '../components/Topbar'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('token') }

function PriorityBadge({ priorite }) {
  const map = {
    haute: { bg: '#fee2e2', color: '#dc2626', label: 'Haute' },
    normale: { bg: '#fef9c3', color: '#d97706', label: 'Normale' },
    basse: { bg: '#dcfce7', color: '#16a34a', label: 'Basse' }
  }
  const p = map[priorite] || map.normale
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: p.bg, color: p.color, whiteSpace: 'nowrap' }}>{p.label}</span>
}

export default function Taches() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire', priorite: 'normale' })

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }

  useEffect(() => { fetchTasks(); fetchClients() }, [])

  async function fetchTasks() {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/taches`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch { toast.error('Impossible de charger les tâches') }
    finally { setLoading(false) }
  }

  async function fetchClients() {
    try {
      const res = await fetch(`${API_URL}/api/clients`, { headers })
      if (!res.ok) return
      const data = await res.json()
      setClients(Array.isArray(data) ? data : (data?.data || []))
    } catch {}
  }

  function resetForm() { setForm({ titre: '', description: '', client_id: '', echeance: '', statut: 'a_faire', priorite: 'normale' }); setSelected(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (selected) {
        const res = await fetch(`${API_URL}/api/taches/${selected.id}`, { method: 'PUT', headers, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success('Tâche modifiée ✓')
      } else {
        const res = await fetch(`${API_URL}/api/taches`, { method: 'POST', headers, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success('Tâche créée ✓')
      }
      setShowModal(false); resetForm(); fetchTasks()
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette tâche ?')) return
    try {
      await fetch(`${API_URL}/api/taches/${id}`, { method: 'DELETE', headers })
      toast.success('Tâche supprimée')
      setTasks(t => t.filter(x => x.id !== id))
    } catch { toast.error('Erreur lors de la suppression') }
  }

  async function toggleStatut(task) {
    const newStatut = task.statut === 'terminee' ? 'a_faire' : 'terminee'
    try {
      await fetch(`${API_URL}/api/taches/${task.id}`, { method: 'PUT', headers, body: JSON.stringify({ ...task, statut: newStatut }) })
      setTasks(t => t.map(x => x.id === task.id ? { ...x, statut: newStatut } : x))
    } catch { toast.error('Erreur mise à jour') }
  }

  function handleEdit(task) {
    setSelected(task)
    setForm({ titre: task.titre || '', description: task.description || '', client_id: task.client_id || '', echeance: task.echeance ? task.echeance.split('T')[0] : '', statut: task.statut || 'a_faire', priorite: task.priorite || 'normale' })
    setShowModal(true)
  }

  const filtered = tasks.filter(t => {
    const matchS = filterStatut === 'tous' || t.statut === filterStatut
    const matchP = filterPriorite === 'tous' || t.priorite === filterPriorite
    return matchS && matchP
  })

  const urgentCount = tasks.filter(t => t.priorite === 'haute' && t.statut !== 'terminee').length

  const inputStyle = { width: '100%', padding: '10px 12px', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: 'white' }
  const labelStyle = { fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 600, letterSpacing: 0.3 }

  const topbarAction = (
    <button onClick={() => { resetForm(); setShowModal(true) }}
      style={{ padding: '9px 18px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
      + Créer tâche
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 16, width: 480, border: '0.5px solid #e8e6e0' }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 24px', color: '#0a0a0a' }}>{selected ? 'Modifier' : 'Créer'} une tâche</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>TITRE *</label>
                <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>STATUT</label>
                  <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>PRIORITÉ</label>
                  <select value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="haute">Haute</option>
                    <option value="normale">Normale</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>ÉCHÉANCE</label>
                <input type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CLIENT (optionnel)</label>
                <select value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value || null })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— Aucun —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" style={{ flex: 1, padding: 11, background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                  {selected ? 'Modifier' : 'Créer'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  style={{ flex: 1, padding: 11, background: '#f7f6f2', color: '#0a0a0a', border: '0.5px solid #e8e6e0', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Topbar
        title={`Tâches${urgentCount > 0 ? ` (${urgentCount} urgente${urgentCount > 1 ? 's' : ''})` : ''}`}
        subtitle={`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} au total`}
        action={topbarAction}
      />

      <div style={{ padding: '24px 32px' }}>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 10, padding: 4 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center', padding: '0 8px', fontWeight: 600 }}>STATUT</span>
            {[['tous', 'Tous'], ['a_faire', 'À faire'], ['en_cours', 'En cours'], ['terminee', 'Terminée']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatut(v)}
                style={{ padding: '6px 12px', background: filterStatut === v ? '#0a0a0a' : 'transparent', color: filterStatut === v ? 'white' : '#9ca3af', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 10, padding: 4 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center', padding: '0 8px', fontWeight: 600 }}>PRIORITÉ</span>
            {[['tous', 'Tous'], ['haute', 'Haute'], ['normale', 'Normale'], ['basse', 'Basse']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterPriorite(v)}
                style={{ padding: '6px 12px', background: filterPriorite === v ? '#0a0a0a' : 'transparent', color: filterPriorite === v ? 'white' : '#9ca3af', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13, flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Chargement...
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: 12, border: '0.5px solid #e8e6e0', color: '#9ca3af', fontSize: 13 }}>
                Aucune tâche — cliquez sur "+ Créer tâche" pour commencer
              </div>
            ) : (
              filtered.map(task => {
                const clientLabel = task.client_nom ? `${task.client_nom} ${task.client_prenom || ''}`.trim() : null
                const done = task.statut === 'terminee'
                return (
                  <div key={task.id} style={{ padding: '14px 18px', border: '0.5px solid #e8e6e0', borderRadius: 12, background: done ? '#fafaf8' : 'white', opacity: done ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <button onClick={() => toggleStatut(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? '#16a34a' : '#d1d5db'}`, background: done ? '#dcfce7' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {done && <span style={{ fontSize: 10, color: '#16a34a' }}>✓</span>}
                        </div>
                      </button>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: done ? '#9ca3af' : '#0a0a0a', textDecoration: done ? 'line-through' : 'none', margin: '0 0 4px' }}>
                          {task.titre}
                        </p>
                        {task.description && <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px', lineHeight: 1.5 }}>{task.description}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <PriorityBadge priorite={task.priorite} />
                          {!done && (
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: task.statut === 'a_faire' ? '#f3f4f6' : '#eff6ff', color: task.statut === 'a_faire' ? '#6b7280' : '#2563eb' }}>
                              {task.statut === 'a_faire' ? 'À faire' : 'En cours'}
                            </span>
                          )}
                          {task.echeance && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              {new Date(task.echeance).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          {clientLabel && <span style={{ fontSize: 11, color: '#2563eb' }}>{clientLabel}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => handleEdit(task)}
                          style={{ padding: '5px 9px', background: '#f7f6f2', border: '0.5px solid #e8e6e0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => handleDelete(task.id)}
                          style={{ padding: '5px 9px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
