import { useState, useRef, useEffect } from 'react'
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
      postalCode: client.postal_code || '',
      city: client.city || '',
      dateOfBirth: client.date_of_birth || '',
      type: client.type === 'entreprise' ? 'business' : 'particulier',
      status: client.status || 'prospect'
    } : { 
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      address: '',
      postalCode: '',
      city: '',
      dateOfBirth: '',
      type: 'particulier',
      status: 'prospect'
    }
  )
  
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const addressInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const fetchAddressSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      const suggestions = data.features.map((feature) => ({
        label: feature.properties.label,
        address: feature.properties.name || '',
        postalCode: feature.properties.postcode || '',
        city: feature.properties.city || '',
        context: feature.properties.context || ''
      }))
      setAddressSuggestions(suggestions)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error fetching address suggestions:', error)
      setAddressSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddressInput = (e) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, address: value }))
    fetchAddressSuggestions(value)
  }

  const handleAddressSelect = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      address: suggestion.address,
      postalCode: suggestion.postalCode,
      city: suggestion.city
    }))
    setAddressSuggestions([])
    setShowSuggestions(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      postal_code: formData.postalCode,
      city: formData.city,
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          addressInputRef.current && !addressInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

          {/* Address Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold mb-1">Adresse</label>
            <input
              ref={addressInputRef}
              type="text"
              name="address"
              value={formData.address}
              onChange={handleAddressInput}
              placeholder="Tapez votre adresse..."
              className="input-field w-full text-sm"
              autoComplete="off"
            />
            {loading && <div className="text-xs text-slate-400 mt-1">Recherche...</div>}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-dark-2 border border-cyan-500/30 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto"
              >
                {addressSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddressSelect(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-500/20 border-b border-dark-3 last:border-0 transition"
                  >
                    <div className="font-semibold">{suggestion.address}</div>
                    <div className="text-slate-400">{suggestion.postalCode} {suggestion.city}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Postal Code (auto-filled) */}
          <div>
            <label className="block text-xs font-bold mb-1">Code postal</label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              readOnly
              className="input-field w-full text-sm bg-dark-3 opacity-75"
            />
          </div>

          {/* City (auto-filled) */}
          <div>
            <label className="block text-xs font-bold mb-1">Ville</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              readOnly
              className="input-field w-full text-sm bg-dark-3 opacity-75"
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
                <option value="business">Entreprise</option>
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

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 btn-primary text-sm font-bold py-2"
            >
              {client ? 'Mettre à jour' : 'Créer client'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-dark-3 text-slate-300 rounded-lg text-sm font-bold py-2 hover:bg-dark-2 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
