import { X } from 'lucide-react'
import { useState } from 'react'

export default function ContractModal({ clientId, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    contract_type: 'auto',
    company: 'AXA',
    premium: '',
    startDate: '',
    endDate: '',
    policyNumber: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onAdd) {
      onAdd({
        ...formData,
        client_id: clientId
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass p-8 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gradient">Ajouter contrat</h2>
          <button onClick={onClose} className="text-cyan hover:opacity-80">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Type de contrat *</label>
            <select
              name="contract_type"
              value={formData.contract_type}
              onChange={handleChange}
              className="input-field w-full"
            >
              <option value="auto">Automobile</option>
              <option value="habitation">Habitation</option>
              <option value="responsabilite">Responsabilité civile</option>
              <option value="sante">Santé</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Compagnie assurance *</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="AXA, MAIF, Allianz..."
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Numéro de police *</label>
            <input
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleChange}
              placeholder="CONT-2026-001"
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Prime annuelle (€) *</label>
            <input
              type="number"
              name="premium"
              value={formData.premium}
              onChange={handleChange}
              placeholder="1200"
              className="input-field w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-2">Date début *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Date fin *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" className="btn-primary flex-1">
              Ajouter
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
