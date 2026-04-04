import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Edit2, Trash2 } from 'lucide-react'
import { useClientStore } from '../stores/clientStore'
import { useAuthStore } from '../stores/authStore'
import { useResponsive } from '../hooks/useResponsive'
import { formatNomClient } from '../utils/format'
import Spinner from './Spinner'
import ConfirmModal from './ConfirmModal'
import ClientModal from './ClientModal'

export default function ClientsList() {
  const clients = useClientStore((state) => state.clients)
  const fetchClients = useClientStore((state) => state.fetchClients)
  const deleteClient = useClientStore((state) => state.deleteClient)
  const setSelectedClient = useClientStore((state) => state.setSelectedClient)
  const token = useAuthStore((state) => state.token)
  const { isMobile } = useResponsive()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    if (token) {
      setLoading(true)
      fetchClients(token)
      setTimeout(() => setLoading(false), 500)
    }
  }, [token, fetchClients])

  const filteredClients = clients.filter((c) => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  })

  const handleDelete = (id) => {
    setConfirmDelete(id)
  }

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      deleteClient(confirmDelete, token)
      setConfirmDelete(null)
    }
  }

  const handleEdit = (client) => {
    setSelectedForEdit(client)
    setShowModal(true)
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
      {confirmDelete && (
        <ConfirmModal message="Supprimer ce client ? Cette action est irréversible." onConfirm={confirmDeleteAction} onCancel={() => setConfirmDelete(null)} isDanger={true} />
      )}

      {showModal && (
        <ClientModal
          client={selectedForEdit}
          onClose={() => {setShowModal(false); setSelectedForEdit(null)}}
          onSuccess={() => {setShowModal(false); setSelectedForEdit(null)}}
        />
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
        <h2 style={{fontSize:'32px',fontWeight:900,color:'#0a0a0a'}}>Clients</h2>
        <button onClick={() => {setSelectedForEdit(null); setShowModal(true)}} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Arial',letterSpacing:'0.3px'}}>
          <Plus size={18} />
          Ajouter client
        </button>
      </div>

      {/* Search Bar */}
      <div style={{marginBottom:'24px',position:'relative'}}>
        <Search style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#999',width:'18px',height:'18px'}} />
        <input type="text" placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:'100%',padding:'10px 12px 10px 40px',border:'0.5px solid #f0f0f0',borderRadius:'8px',fontSize:'13px',fontFamily:'Arial',background:'#fff',color:'#0a0a0a'}} />
      </div>

      {/* Clients Table */}
      <div style={{border:'0.5px solid #f0f0f0',borderRadius:'10px',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#0a0a0a',height:'44px'}}>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Nom</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Email</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Téléphone</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Statut</th>
              <th style={{padding:'12px 16px',textAlign:'left',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Risk Score</th>
              <th style={{padding:'12px 16px',textAlign:'center',fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'0.5px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, idx) => (
              <tr key={client.id} style={{borderTop:'0.5px solid #f0f0f0',height:'48px',background:idx%2===0?'#fff':'#fafafa'}}>
                <td style={{padding:'12px 16px',fontSize:'13px',color:'#0a0a0a',fontWeight:500}}>{formatNomClient(client)}</td>
                <td style={{padding:'12px 16px',fontSize:'13px',color:'#666'}}>{client.email}</td>
                <td style={{padding:'12px 16px',fontSize:'13px',color:'#666'}}>{client.phone || 'N/A'}</td>
                <td style={{padding:'12px 16px',fontSize:'12px',fontWeight:600}}>
                  <span style={{padding:'4px 10px',borderRadius:'6px',background:client.status==='Active'?'#d1fae5':client.status==='Prospect'?'#dbeafe':'#f3f4f6',color:client.status==='Active'?'#065f46':client.status==='Prospect'?'#1d4ed8':'#6b7280'}}>
                    {client.status || 'Prospect'}
                  </span>
                </td>
                <td style={{padding:'12px 16px',fontSize:'13px',color:'#0a0a0a',fontWeight:600}}>{client.risk_score || '—'}</td>
                <td style={{padding:'12px 16px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  <button onClick={() => setSelectedClient(client)} style={{background:'none',border:'none',cursor:'pointer',color:'#2563eb',padding:'4px'}}>
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleEdit(client)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',padding:'4px'}}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(client.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:'4px'}}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredClients.length === 0 && !search && (
        <div style={{textAlign:'center',padding:'48px 24px',color:'#999'}}>
          <p style={{fontSize:'14px'}}>📋 Ajoutez votre premier client pour commencer à gérer votre portefeuille.</p>
          <button onClick={() => {setSelectedForEdit(null); setShowModal(true)}} style={{marginTop:'12px',padding:'10px 20px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>+ Ajouter client</button>
        </div>
      )}

      {filteredClients.length === 0 && search && (
        <div style={{textAlign:'center',padding:'48px 24px',color:'#999'}}>
          <p style={{fontSize:'14px'}}>Aucun client trouvé pour "{search}"</p>
        </div>
      )}
    </div>
  )
}
