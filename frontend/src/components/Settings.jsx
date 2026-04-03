import { useState, useEffect } from 'react'
import { Mail, Phone, Building2, Save } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const API_URL = 'https://courtia.onrender.com'

export default function Settings() {
  const token = useAuthStore((state) => state.token)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [firmData, setFirmData] = useState({
    firmName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    website: '',
    logo: null,
    siret: '',
    naf: ''
  })

  // Load profile on mount
  useEffect(() => {
    if (token) {
      fetchProfile()
    }
  }, [token])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/settings/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.status === 404) {
        // No profile exists yet
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setFirmData({
        firmName: data.firm_name || '',
        ownerName: data.owner_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postalCode: data.postal_code || '',
        website: data.website || '',
        logo: null,
        siret: data.siret || '',
        naf: data.naf || ''
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFirmData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      
      const payload = {
        firm_name: firmData.firmName,
        owner_name: firmData.ownerName,
        email: firmData.email,
        phone: firmData.phone,
        address: firmData.address,
        city: firmData.city,
        postal_code: firmData.postalCode,
        website: firmData.website,
        siret: firmData.siret,
        naf: firmData.naf
      }
      
      const response = await fetch(`${API_URL}/api/settings/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      console.log('✅ Profil sauvegardé')
    } catch (err) {
      setError(err.message)
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="ml-64 p-8">
        <h2 className="text-4xl font-black text-gradient mb-8">Paramètres</h2>
        <div className="text-slate-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Paramètres</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg mb-6 text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-lg mb-6 text-green-400">
          ✅ Profil sauvegardé avec succès
        </div>
      )}

      {/* Cabinet Info */}
      <div className="glass p-6 rounded-lg mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 size={28} className="text-cyan-400" />
          <h3 className="text-2xl font-bold">Informations du cabinet</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-2">Nom du cabinet</label>
            <input
              type="text"
              name="firmName"
              value={firmData.firmName}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Responsable</label>
            <input
              type="text"
              name="ownerName"
              value={firmData.ownerName}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={firmData.email}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Phone size={16} />
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              value={firmData.phone}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-bold mb-2">Adresse</label>
            <input
              type="text"
              name="address"
              value={firmData.address}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Ville</label>
            <input
              type="text"
              name="city"
              value={firmData.city}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Code postal</label>
            <input
              type="text"
              name="postalCode"
              value={firmData.postalCode}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Site web</label>
            <input
              type="url"
              name="website"
              value={firmData.website}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">SIRET</label>
            <input
              type="text"
              name="siret"
              value={firmData.siret}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Code NAF</label>
            <input
              type="text"
              name="naf"
              value={firmData.naf}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
