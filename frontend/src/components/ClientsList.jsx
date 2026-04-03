import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { useClientStore } from '../stores/clientStore'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../hooks/useToast'
import { useResponsive } from '../hooks/useResponsive'
import ClientModal from './ClientModal'
import Toast from './Toast'

export default function ClientsList() {
  const clients = useClientStore((state) => state.clients)
  const fetchClients = useClientStore((state) => state.fetchClients)
  const deleteClient = useClientStore((state) => state.deleteClient)
  const setSelectedClient = useClientStore((state) => state.setSelectedClient)
  const token = useAuthStore((state) => state.token)
  const { isMobile } = useResponsive()
  const { toast, showToast, closeToast } = useToast()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState(null)

  useEffect(() => {
    if (token) {
      fetchClients(token)
    }
  }, [token, fetchClients])

  const filteredClients = clients.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id) => {
    if (window.confirm('Confirmer la suppression de ce client ?')) {
      try {
        const success = await deleteClient(id, token)
        if (success) {
          showToast('Client supprimé avec succès', 'success', 3000)
        } else {
          showToast('Erreur lors de la suppression', 'error', 3000)
        }
      } catch (error) {
        showToast('Erreur: ' + error.message, 'error', 3000)
      }
    }
  }

  const handleEdit = (client) => {
    setSelectedForEdit(client)
    setShowModal(true)
  }

  const handleView = (client) => {
    setSelectedClient(client)
  }

  return (
    <div className="ml-64 p-8">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={closeToast}
        />
      )}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-gradient">Clients</h2>
        <button
          onClick={() => {
            setSelectedForEdit(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Ajouter client
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass p-4 rounded-lg mb-6">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1 bg-transparent border-0"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-3 border-b border-blue-500/30">
            <tr>
              <th className="p-4 text-left">Nom</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Téléphone</th>
              <th className="p-4 text-left">Statut</th>
              <th className="p-4 text-left">Risk Score</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-500">
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-slate-700/30 hover:bg-dark-3 transition">
                  <td className="p-4 font-bold">{`${client.first_name} ${client.last_name}` || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{client.email || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{client.phone || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      client.status === 'actif' ? 'bg-green-500/20 text-green-400' :
                      client.status === 'prospect' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {client.status === 'actif' ? 'Actif' : client.status === 'prospect' ? 'Prospect' : client.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="w-12 h-2 bg-dark-3 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{width: `${client.risk_score || 50}%`}}></div>
                    </div>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleView(client)}
                      className="p-2 hover:bg-blue-500/20 rounded-lg transition"
                      title="Voir"
                    >
                      <Eye size={18} className="text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 hover:bg-blue-500/20 rounded-lg transition"
                      title="Modifier"
                    >
                      <Edit size={18} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && <ClientModal client={selectedForEdit} onClose={() => setShowModal(false)} />}
    </div>
  )
}
