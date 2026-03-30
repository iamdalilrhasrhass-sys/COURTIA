import { X } from 'lucide-react'
import { useState } from 'react'

export default function ProspectModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    value: '',
    stage: 0
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
        stage: parseInt(formData.stage),
        value: `${formData.value}€`,
        date: new Date().toISOString().split('T')[0]
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass p-8 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gradient">Ajouter prospect</h2>
          <button onClick={onClose} className="text-cyan hover:opacity-80">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Nom de l'entreprise *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ABC Corp..."
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Téléphone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Valeur estimée (€) *</label>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="5000"
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Étape initiale</label>
            <select
              name="stage"
              value={formData.stage}
              onChange={handleChange}
              className="input-field w-full"
            >
              <option value="0">Prospect</option>
              <option value="1">Qualification</option>
              <option value="2">Proposition</option>
              <option value="3">Négociation</option>
              <option value="4">Gagné</option>
            </select>
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
