import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function Taches() {
  const token = useAuthStore((state) => state.token)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState(null)
  const [filterStatut, setFilterStatut] = useState('a_faire')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [clients, setClients] = useState([])
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    priorite: 'normale',
    client_id: null,
    echeance: '',
    statut: 'a_faire'
  })

  useEffect(() => {
    if (token) {
      fetchTasks()
      fetchClients()
    }
  }, [token])

  const fetchTasks = async () => {
    try {
      // Simulating tasks API - will be replaced with real endpoint
      const mockTasks = [
        {
          id: 1,
          titre: 'Appeler Martin Renaud',
          description: 'Renouvellement auto assurance',
          priorite: 'haute',
          statut: 'a_faire',
          echeance: '2026-04-10',
          client_id: 1
        },
        {
          id: 2,
          titre: 'Envoyer devis habitation',
          description: 'Devis pour maison Île-de-France',
          priorite: 'normale',
          statut: 'en_cours',
          echeance: '2026-04-15',
          client_id: 2
        }
      ]
      setTasks(mockTasks)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setClients(Array.isArray(data) ? data : data.clients || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedForEdit) {
      setTasks(tasks.map(t => t.id === selectedForEdit.id ? {...formData, id: selectedForEdit.id} : t))
    } else {
      setTasks([...tasks, {...formData, id: Date.now()}])
    }
    setShowModal(false)
    setSelectedForEdit(null)
    setFormData({titre: '', description: '', priorite: 'normale', client_id: null, echeance: '', statut: 'a_faire'})
  }

  const handleDelete = (id) => {
    if (!confirm('Confirmer la suppression ?')) return
    setTasks(tasks.filter(t => t.id !== id))
  }

  const handleToggleStatut = (task) => {
    const newStatut = task.statut === 'a_faire' ? 'terminee' : 'a_faire'
    setTasks(tasks.map(t => t.id === task.id ? {...t, statut: newStatut} : t))
  }

  const handleEdit = (task) => {
    setSelectedForEdit(task)
    setFormData(task)
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
  }).sort((a, b) => {
    const priorityOrder = { haute: 1, normale: 2, basse: 3 }
    return (priorityOrder[a.priorite] || 2) - (priorityOrder[b.priorite] || 2)
  })

  if (loading) return <div style={{padding:'32px'}}>Chargement...</div>

  const urgentCount = tasks.filter(t => t.priorite === 'haute' && t.statut === 'a_faire').length

  return (
    <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
      {showModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'32px',borderRadius:'12px',width:'90%',maxWidth:'500px'}}>
            <h2 style={{fontSize:'20px',fontWeight:700,marginBottom:'20px'}}>{selectedForEdit ? 'Modifier' : 'Créer'} tâche</h2>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Titre *</label>
                <input 
                  value={formData.titre} 
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  required
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Priorité</label>
                  <select 
                    value={formData.priorite} 
                    onChange={(e) => setFormData({...formData, priorite: e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                  >
                    <option value='basse'>Basse</option>
                    <option value='normale'>Normale</option>
                    <option value='haute'>Haute</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Statut</label>
                  <select 
                    value={formData.statut} 
                    onChange={(e) => setFormData({...formData, statut: e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                  >
                    <option value='a_faire'>À faire</option>
                    <option value='en_cours'>En cours</option>
                    <option value='terminee'>Terminée</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Client (optionnel)</label>
                <select 
                  value={formData.client_id || ''} 
                  onChange={(e) => setFormData({...formData, client_id: e.target.value ? parseInt(e.target.value) : null})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                >
                  <option value=''>-- Aucun --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Échéance</label>
                <input 
                  type='date'
                  value={formData.echeance} 
                  onChange={(e) => setFormData({...formData, echeance: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div style={{display:'flex',gap:'12px',marginTop:'20px'}}>
                <button type='submit' style={{flex:1,padding:'10px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>
                  {selectedForEdit ? 'Modifier' : 'Créer'}
                </button>
                <button type='button' onClick={() => {setShowModal(false);setSelectedForEdit(null)}} style={{flex:1,padding:'10px',background:'#f0f0f0',color:'#0a0a0a',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
        <h2 style={{fontSize:'32px',fontWeight:900,color:'#0a0a0a'}}>Tâches {urgentCount > 0 && <span style={{background:'#dc2626',color:'#fff',borderRadius:'50%',width:'28px',height:'28px',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,marginLeft:'8px'}}>{urgentCount}</span>}</h2>
        <button onClick={() => {setSelectedForEdit(null);setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Arial'}}>
          <Plus size={18} />
          Créer tâche
        </button>
      </div>

      {/* Filters */}
      <div style={{marginBottom:'24px'}}>
        <div style={{marginBottom:'12px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'#666',marginRight:'12px'}}>Statut:</label>
          {['a_faire', 'en_cours', 'terminee'].map(statut => (
            <button key={statut} onClick={() => setFilterStatut(statut)} style={{padding:'6px 12px',background:filterStatut===statut?'#0a0a0a':'#f0f0f0',color:filterStatut===statut?'#fff':'#0a0a0a',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',marginRight:'6px'}}>
              {statut === 'a_faire' ? 'À faire' : statut === 'en_cours' ? 'En cours' : 'Terminée'}
            </button>
          ))}
        </div>
        <div>
          <label style={{fontSize:'12px',fontWeight:600,color:'#666',marginRight:'12px'}}>Priorité:</label>
          {['tous', 'haute', 'normale', 'basse'].map(p => (
            <button key={p} onClick={() => setFilterPriorite(p)} style={{padding:'6px 12px',background:filterPriorite===p?'#0a0a0a':'#f0f0f0',color:filterPriorite===p?'#fff':'#0a0a0a',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',marginRight:'6px'}}>
              {p === 'tous' ? 'Tous' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {filteredTasks.length === 0 ? (
          <div style={{textAlign:'center',padding:'48px 24px',color:'#999'}}>
            <p style={{fontSize:'14px'}}>Aucune tâche — tout est à jour ✓</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const client = clients.find(c => c.id === task.client_id)
            const prioColor = getPrioriteColor(task.priorite)
            return (
              <div key={task.id} style={{padding:'16px',border:'0.5px solid #f0f0f0',borderRadius:'8px',background:task.statut==='terminee'?'#f9fafb':'#fff',opacity:task.statut==='terminee'?0.6:1}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
                  <button onClick={() => handleToggleStatut(task)} style={{background:'none',border:'none',cursor:'pointer',padding:'0',marginTop:'2px'}}>
                    {task.statut === 'terminee' ? (
                      <CheckCircle2 size={20} style={{color:'#22c55e'}} />
                    ) : (
                      <Circle size={20} style={{color:'#ddd'}} />
                    )}
                  </button>
                  <div style={{flex:1}}>
                    <h3 style={{fontSize:'14px',fontWeight:600,color:task.statut==='terminee'?'#999':'#0a0a0a',textDecoration:task.statut==='terminee'?'line-through':'none'}}>{task.titre}</h3>
                    {task.description && <p style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>{task.description}</p>}
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'8px'}}>
                      <span style={{padding:'3px 8px',borderRadius:'4px',background:prioColor.bg,color:prioColor.color,fontSize:'11px',fontWeight:600}}>
                        {prioColor.label}
                      </span>
                      {task.echeance && <span style={{fontSize:'11px',color:'#666'}}>📅 {new Date(task.echeance).toLocaleDateString('fr-FR')}</span>}
                      {client && <span style={{fontSize:'11px',color:'#2563eb'}}>👤 {client.first_name} {client.last_name}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={() => handleEdit(task)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',padding:'4px'}}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(task.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:'4px'}}>
                      <Trash2 size={16} />
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
