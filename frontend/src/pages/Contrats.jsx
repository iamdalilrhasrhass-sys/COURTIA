import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { formatDate, formatEuros } from '../utils/format'

const API_URL = 'https://courtia.onrender.com'

export default function Contrats() {
  const token = useAuthStore((state) => state.token)
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState(null)
  const [filterStatus, setFilterStatus] = useState('tous')
  const [clients, setClients] = useState([])
  const [formData, setFormData] = useState({
    client_id: '',
    type_contrat: 'auto',
    compagnie: '',
    numero: '',
    prime_annuelle: '',
    date_effet: '',
    date_echeance: '',
    statut: 'actif'
  })

  // Load contrats and clients
  useEffect(() => {
    if (token) {
      fetchContrats()
      fetchClients()
    }
  }, [token])

  const fetchContrats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contracts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setContrats(Array.isArray(data) ? data : data.contracts || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching contrats:', err)
      setError('Erreur lors du chargement des contrats')
    } finally {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = selectedForEdit ? 'PUT' : 'POST'
      const endpoint = selectedForEdit ? `/api/contracts/${selectedForEdit.id}` : '/api/contracts'
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: parseInt(formData.client_id),
          type_contrat: formData.type_contrat,
          compagnie: formData.compagnie,
          numero: formData.numero,
          prime_annuelle: parseFloat(formData.prime_annuelle),
          date_effet: formData.date_effet,
          date_echeance: formData.date_echeance,
          statut: formData.statut
        })
      })

      if (res.ok) {
        fetchContrats()
        setShowModal(false)
        setSelectedForEdit(null)
        setFormData({
          client_id: '',
          type_contrat: 'auto',
          compagnie: '',
          numero: '',
          prime_annuelle: '',
          date_effet: '',
          date_echeance: '',
          statut: 'actif'
        })
        toast.success(selectedForEdit ? 'Contrat modifié ✓' : 'Contrat ajouté ✓')
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      console.error('Error saving contrat:', err)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce contrat ? Cette action est irréversible.')) return
    try {
      const res = await fetch(`${API_URL}/api/contracts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchContrats()
        toast.success('Contrat supprimé ✓')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error('Error deleting contrat:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleEdit = (contrat) => {
    setSelectedForEdit(contrat)
    setFormData({
      client_id: contrat.client_id,
      type_contrat: contrat.type_contrat,
      compagnie: contrat.compagnie,
      numero: contrat.numero,
      prime_annuelle: contrat.prime_annuelle,
      date_effet: contrat.date_effet,
      date_echeance: contrat.date_echeance,
      statut: contrat.statut
    })
    setShowModal(true)
  }

  const getStatusBadge = (status, dateEcheance) => {
    const days = dateEcheance ? Math.ceil((new Date(dateEcheance) - new Date()) / (1000 * 60 * 60 * 24)) : null
    
    if (status === 'actif') {
      if (days && days < 30 && days > 0) {
        return { bg: '#fef3c7', color: '#d97706', label: '⚠ Bientôt', icon: '⚠️' }
      }
      return { bg: '#d1fae5', color: '#065f46', label: 'Actif', icon: '✓' }
    }
    if (status === 'résilié') {
      return { bg: '#fee2e2', color: '#dc2626', label: 'Résilié', icon: '✗' }
    }
    if (days && days <= 0) {
      return { bg: '#fee2e2', color: '#dc2626', label: 'Expiré', icon: '⚠️' }
    }
    return { bg: '#f3f4f6', color: '#6b7280', label: 'En attente', icon: '-' }
  }

  const filteredContrats = filterStatus === 'tous' 
    ? contrats 
    : contrats.filter(c => c.statut === filterStatus)

  if (loading) {
    return <div style={{padding:'32px',textAlign:'center',color:'#999'}}>⏳ Chargement des contrats...</div>
  }

  if (error) {
    return <div style={{padding:'32px'}}>
      <div style={{padding:'16px',background:'#fee2e2',border:'0.5px solid #fca5a5',borderRadius:'8px',color:'#dc2626',fontSize:'13px'}}>
        ❌ {error}
      </div>
    </div>
  }

  return (
    <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
      {showModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'32px',borderRadius:'12px',width:'90%',maxWidth:'500px'}}>
            <h2 style={{fontSize:'20px',fontWeight:700,marginBottom:'20px'}}>{selectedForEdit ? 'Modifier' : 'Ajouter'} contrat</h2>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Client *</label>
                <select 
                  value={formData.client_id} 
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  required
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                >
                  <option value=''>-- Sélectionner --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Type contrat *</label>
                <select 
                  value={formData.type_contrat} 
                  onChange={(e) => setFormData({...formData, type_contrat: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                >
                  <option value='auto'>Automobile</option>
                  <option value='habitation'>Habitation</option>
                  <option value='sante'>Santé</option>
                  <option value='prevoyance'>Prévoyance</option>
                  <option value='pro'>Professionnel</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Compagnie *</label>
                <input 
                  value={formData.compagnie} 
                  onChange={(e) => setFormData({...formData, compagnie: e.target.value})}
                  required
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Numéro contrat</label>
                <input 
                  value={formData.numero} 
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Prime annuelle (€)</label>
                <input 
                  type='number' 
                  step='0.01'
                  value={formData.prime_annuelle} 
                  onChange={(e) => setFormData({...formData, prime_annuelle: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Date effet</label>
                  <input 
                    type='date'
                    value={formData.date_effet} 
                    onChange={(e) => setFormData({...formData, date_effet: e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                  />
                </div>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Date échéance</label>
                  <input 
                    type='date'
                    value={formData.date_echeance} 
                    onChange={(e) => setFormData({...formData, date_echeance: e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                  />
                </div>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'#666'}}>Statut</label>
                <select 
                  value={formData.statut} 
                  onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px',marginTop:'4px',fontFamily:'Arial'}}
                >
                  <option value='actif'>Actif</option>
                  <option value='résilié'>Résilié</option>
                  <option value='en attente'>En attente</option>
                </select>
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
        <h2 style={{fontSize:'32px',fontWeight:900,color:'#0a0a0a'}}>Contrats</h2>
        <button onClick={() => {setSelectedForEdit(null);setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Arial'}}>
          <Plus size={18} />
          Ajouter contrat
        </button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
        {['tous', 'actif', 'résilié', 'en attente'].map(status => (
          <button key={status} onClick={() => setFilterStatus(status)} style={{padding:'8px 16px',background:filterStatus===status?'#0a0a0a':'#f0f0f0',color:filterStatus===status?'#fff':'#0a0a0a',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{border:'0.5px solid #f0f0f0',borderRadius:'10px',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#0a0a0a',height:'44px'}}>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Client</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Type</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Compagnie</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Prime</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Échéance</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff'}}>Statut</th>
              <th style={{padding:'12px 16px',textAlign:'center',fontSize:'12px',fontWeight:700,color:'#fff'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContrats.map((contrat, idx) => {
              const client = clients.find(c => c.id === contrat.client_id)
              const badge = getStatusBadge(contrat.statut, contrat.date_echeance)
              return (
                <tr key={contrat.id} style={{borderTop:'0.5px solid #f0f0f0',height:'48px',background:idx%2===0?'#fff':'#fafafa'}}>
                  <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:500}}>{client ? `${client.first_name} ${client.last_name}` : 'N/A'}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px'}}>{contrat.type_contrat}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px'}}>{contrat.compagnie}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:600}}>{formatEuros(contrat.prime_annuelle)}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px'}}>
                    {contrat.date_echeance && (
                      <div>
                        {formatDate(contrat.date_echeance)}
                        {Math.ceil((new Date(contrat.date_echeance) - new Date()) / (1000 * 60 * 60 * 24)) < 30 && (
                          <AlertCircle size={14} style={{display:'inline',marginLeft:'6px',color:'#f59e0b'}} />
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{padding:'4px 10px',borderRadius:'6px',background:badge.bg,color:badge.color,fontSize:'12px',fontWeight:600}}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                    <button onClick={() => handleEdit(contrat)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',padding:'4px'}}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(contrat.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:'4px'}}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredContrats.length === 0 && (
        <div style={{textAlign:'center',padding:'48px 24px',color:'#999'}}>
          <p style={{fontSize:'14px'}}>Aucun contrat trouvé</p>
        </div>
      )}
    </div>
  )
}
