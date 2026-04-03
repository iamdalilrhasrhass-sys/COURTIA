import { useState } from 'react'
import { X } from 'lucide-react'
import { useClientStore } from '../stores/clientStore'
import { useAuthStore } from '../stores/authStore'

export default function ClientModal({ client, onClose }) {
  const token = useAuthStore((state) => state.token)
  const addClient = useClientStore((state) => state.addClient)
  const updateClient = useClientStore((state) => state.updateClient)
  const [formData, setFormData] = useState(
    client ? { 
      firstName: client.first_name || '', 
      lastName: client.last_name || '', 
      email: client.email || '', 
      phone: client.phone || '', 
      address: client.address || '', 
      dateOfBirth: client.date_of_birth || '',
      type: client.type === 'entreprise' ? 'business' : 'particulier',
      status: client.status || 'prospect'
    } : { 
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      address: '', 
      dateOfBirth: '',
      type: 'particulier',
      status: 'prospect'
    }
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      type: formData.type === 'business' ? 'entreprise' : 'particulier',
      status: formData.status,
      civility: 'M.'
    }

    if (client?.id) {
      await updateClient(client.id, payload, token)
    } else {
      await addClient(payload, token)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-lg w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-cyan">
            {client ? 'Modifier client' : 'Ajouter client'}
          </h3>
          <button onClick={onClose} className="hover:bg-dark-3 p-2 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold mb-1">Prénom *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input-field w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Nom *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input-field w-full text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Téléphone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Date de naissance</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Adresse</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="input-field w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold mb-1">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input-field w-full text-sm"
              >
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Statut</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field w-full text-sm"
              >
                <option value="prospect">Prospect</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {client ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
