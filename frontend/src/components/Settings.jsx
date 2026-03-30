import { useState } from 'react'
import { Mail, Phone, Building2, Save } from 'lucide-react'

export default function Settings() {
  const [firmData, setFirmData] = useState({
    firmName: 'COURTIA Assurances',
    ownerName: 'Dalil Rhasrhass',
    email: 'contact@courtia.fr',
    phone: '+33 1 23 45 67 89',
    address: '123 Rue de la Paix, 75001 Paris',
    city: 'Paris',
    postalCode: '75001',
    website: 'https://courtia.fr',
    logo: null,
    siret: '12345678901234',
    naf: '6622Z'
  })

  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFirmData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // TODO: Send to API
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    console.log('Saved:', firmData)
  }

  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Paramètres</h2>

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
              <Mail size={16} /> Email
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
              <Phone size={16} /> Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              value={firmData.phone}
              onChange={handleChange}
              className="input-field w-full"
            />
          </div>
          <div>
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

        <div className="mt-8 flex gap-3">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save size={18} />
            Enregistrer
          </button>
          {saved && <span className="text-green-400 flex items-center">✓ Paramètres sauvegardés</span>}
        </div>
      </div>

      {/* Integration Settings */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-2xl font-bold mb-6">Intégrations</h3>
        <div className="space-y-4">
          <div className="p-4 bg-dark-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">Telegram</p>
                <p className="text-sm text-slate-400">Notifications de relances automatiques</p>
              </div>
              <button className="btn-secondary">Configurer</button>
            </div>
          </div>
          <div className="p-4 bg-dark-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">Google Drive</p>
                <p className="text-sm text-slate-400">Synchronisation des documents</p>
              </div>
              <button className="btn-secondary">Configurer</button>
            </div>
          </div>
          <div className="p-4 bg-dark-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">DocuSign</p>
                <p className="text-sm text-slate-400">Signature électronique des documents</p>
              </div>
              <button className="btn-secondary">Configurer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
