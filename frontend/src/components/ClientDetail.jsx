import { ArrowLeft, Mail, Phone, MapPin, FileText, AlertCircle, Heart, Clock, FileCheck, MessageSquare, Send, Calendar, Plus, PhoneIcon } from 'lucide-react'
import { useState } from 'react'
import { useClientStore } from '../store/clientStore'
import { useAuthStore } from '../store/authStore'
import ContractModal from './ContractModal'
import { callArkAI } from '../services/arkService'

export default function ClientDetail() {
  const selectedClient = useClientStore((state) => state.selectedClient)
  const setSelectedClient = useClientStore((state) => state.setSelectedClient)
  const token = useAuthStore((state) => state.token)
  const [note, setNote] = useState('')
  const [showContractModal, setShowContractModal] = useState(false)
  const [showRDVModal, setShowRDVModal] = useState(false)
  const [arkMessage, setArkMessage] = useState('')
  const [arkResponse, setArkResponse] = useState('')
  const [arkLoading, setArkLoading] = useState(false)
  const [rdvData, setRDVData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    type: 'meeting'
  })
  const [contracts, setContracts] = useState([
    { name: 'Responsabilité civile', date: '2026-12-31', amount: '850€' },
    { name: 'Auto 2 véhicules', date: '2026-06-15', amount: '1200€' },
    { name: 'Habitation', date: '2027-03-20', amount: '450€' }
  ])

  const handleAddContract = (contractData) => {
    // Ajouter le contrat à la liste locale
    const newContract = {
      name: `${contractData.contract_type} - ${contractData.company}`,
      date: contractData.endDate,
      amount: `${contractData.premium}€`
    }
    setContracts([...contracts, newContract])
    // TODO: Envoyer à l'API pour sauvegarder
  }

  const handleCall = () => {
    const tel = selectedClient.phone.replace(/\s/g, '')
    window.location.href = `tel:${tel}`
  }

  const handleWhatsApp = () => {
    const msg = `Bonjour ${selectedClient.first_name}, suite à notre conversation sur votre assurance...`
    const phone = selectedClient.phone.replace(/\D/g, '')
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  const handleEmail = () => {
    const subject = `Vos contrats d'assurance - ${selectedClient.first_name}`
    const body = `Bonjour ${selectedClient.first_name},\n\nVoici un résumé de votre situation:\n\nContrats actifs: ${contracts.length}\nScore fidélité: ${selectedClient.loyalty_score}/100\n\nCordialement`
    window.location.href = `mailto:${selectedClient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleCreateRDV = async () => {
    if (!rdvData.title || !rdvData.start_time || !rdvData.end_time) {
      alert('Tous les champs sont requis')
      return
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          ...rdvData
        })
      })

      if (response.ok) {
        setShowRDVModal(false)
        setRDVData({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          type: 'meeting'
        })
        alert('RDV créé avec succès!')
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
    }
  }

  const handleSendArkMessage = async () => {
    if (!arkMessage.trim()) return

    setArkLoading(true)
    setArkResponse('')

    try {
      // Préparer les données du client pour ARK
      const clientData = {
        first_name: selectedClient.first_name,
        last_name: selectedClient.last_name,
        email: selectedClient.email,
        phone: selectedClient.phone,
        contracts: contracts.map(c => ({
          type: c.name,
          premium: c.amount.replace('€', ''),
          endDate: c.date
        })),
        claims: [
          { date: '2024-11-15', description: 'Accident auto', status: 'résolu' },
          { date: '2023-05-20', description: 'Dégât habitation', status: 'payé' }
        ],
        alerts: [
          'Contrat expire dans 60 jours',
          'RDV de révision recommandé',
          'Cross-sell: RC civile'
        ],
        riskScore: selectedClient.risk_score || 50,
        loyaltyScore: selectedClient.loyalty_score || 50,
        history: [
          { date: '2026-03-26', action: 'Contrat auto renouvelé' },
          { date: '2026-03-20', action: 'Appel de révision' },
          { date: '2026-02-14', action: 'Demande de devis habitation' },
          { date: '2026-01-10', action: 'Visite sinistre' }
        ],
        notes: note
      }

      // Appeler l'API ARK
      const response = await callArkAI(clientData, arkMessage, token)
      setArkResponse(response)
      setArkMessage('')
    } catch (error) {
      console.error('ARK Error:', error)
      setArkResponse('Erreur: Impossible de contacter ARK. Vérifiez votre connexion.')
    } finally {
      setArkLoading(false)
    }
  }

  if (!selectedClient) {
    return (
      <div className="ml-64 p-8">
        <p className="text-slate-500">Sélectionnez un client pour voir les détails</p>
      </div>
    )
  }

  const displayName = `${selectedClient.first_name} ${selectedClient.last_name}`

  return (
    <div className="ml-64 p-8 max-h-screen overflow-y-auto">
      <button
        onClick={() => setSelectedClient(null)}
        className="flex items-center gap-2 text-cyan mb-6 hover:opacity-80"
      >
        <ArrowLeft size={20} />
        Retour
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="col-span-2">
          {/* Header avec infos principales */}
          <div className="glass p-8 rounded-lg mb-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-black text-gradient">{displayName}</h2>
              <div className="flex gap-2">
                <button onClick={handleCall} className="btn-primary flex items-center gap-2">
                  <Phone size={18} />
                  Appeler
                </button>
                <button onClick={handleWhatsApp} className="btn-secondary flex items-center gap-2">
                  💬 WhatsApp
                </button>
                <button onClick={handleEmail} className="btn-secondary flex items-center gap-2">
                  ✉️ Email
                </button>
                <button onClick={() => setShowRDVModal(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={18} />
                  RDV
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-cyan" />
                <span>{selectedClient.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-cyan" />
                <span>{selectedClient.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-cyan" />
                <span>{selectedClient.address || selectedClient.city || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Heart size={20} className={selectedClient.loyalty_score > 70 ? 'text-red-500' : 'text-slate-500'} />
                <span>Score fidélité: {selectedClient.loyalty_score || 50}/100</span>
              </div>
            </div>

            {/* Prochain RDV */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <label className="block text-sm font-bold mb-2">Prochain RDV</label>
              <input type="date" className="input-field w-full" defaultValue="2026-04-05" />
            </div>
          </div>

          {/* Contrats actifs */}
          <div className="glass p-6 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan flex items-center gap-2">
                <FileText size={20} />
                Contrats actifs
              </h3>
              <button onClick={() => setShowContractModal(true)} className="btn-secondary text-sm">+ Ajouter</button>
            </div>
            <div className="space-y-3">
              {contracts.map((contract, idx) => (
                <div key={idx} className="bg-dark-3 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{contract.name}</p>
                    <p className="text-sm text-slate-500">Expire : {contract.date}</p>
                  </div>
                  <p className="font-bold text-cyan">{contract.amount}/an</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sinistres */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold text-cyan mb-4">Sinistres</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="bg-dark-3 p-3 rounded">2024-11-15 - Accident auto (résolu)</div>
              <div className="bg-dark-3 p-3 rounded">2023-05-20 - Dégât habitation (payé)</div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Total: 2 sinistres (5 ans)</p>
          </div>

          {/* Documents */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
              <FileCheck size={20} />
              Documents
            </h3>
            <div className="space-y-2">
              <div className="bg-dark-3 p-3 rounded flex justify-between items-center">
                <span>Devis habitation 2026.pdf</span>
                <button className="text-cyan hover:opacity-80 text-sm">📥</button>
              </div>
              <div className="bg-dark-3 p-3 rounded flex justify-between items-center">
                <span>Contrat auto signé.pdf</span>
                <button className="text-cyan hover:opacity-80 text-sm">📥</button>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
              <Clock size={20} />
              Historique
            </h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p>2026-03-26 - Contrat auto renouvelé</p>
              <p>2026-03-20 - Appel de révision</p>
              <p>2026-02-14 - Demande de devis habitation</p>
              <p>2026-01-10 - Visite sinistre</p>
            </div>
          </div>

          {/* Notes */}
          <div className="glass p-6 rounded-lg">
            <h3 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Notes internes
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note..."
              className="input-field w-full min-h-24 resize-none"
            />
            <button className="btn-primary mt-2">Enregistrer</button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div>
          {/* ARK Chat */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-cyan mb-4">ARK - Assistant IA</h3>
            <div className="bg-dark-3 p-4 rounded-lg min-h-80 flex flex-col justify-between">
              <div className="space-y-2 text-sm overflow-y-auto max-h-48 mb-4">
                {arkResponse ? (
                  <div className="bg-green-500/10 p-3 rounded text-green-400 whitespace-pre-wrap text-xs">
                    {arkResponse}
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-500/20 p-2 rounded text-cyan">
                      ✓ Brief RDV préparé
                    </div>
                    <div className="bg-red-500/20 p-2 rounded text-red-400">
                      ⚠️ Contrat auto expire bientôt
                    </div>
                    <div className="bg-green-500/20 p-2 rounded text-green-400">
                      💡 Cross-sell: RC possible
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <input
                  type="text"
                  placeholder="Message ARK..."
                  value={arkMessage}
                  onChange={(e) => setArkMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendArkMessage()}
                  disabled={arkLoading}
                  className="input-field w-full text-sm flex-1"
                />
                <button
                  onClick={handleSendArkMessage}
                  disabled={arkLoading || !arkMessage.trim()}
                  className="btn-primary p-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {arkLoading ? '...' : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Risk Score */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-cyan mb-4">Risk Score</h3>
            <div className="text-4xl font-black text-cyan mb-4">{selectedClient.risk_score || 50}/100</div>
            <div className="w-full h-3 bg-dark-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-cyan-500"
                style={{width: `${(selectedClient.risk_score || 50)}%`}}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {(selectedClient.risk_score || 50) < 40 ? 'Bas risque' : (selectedClient.risk_score || 50) < 70 ? 'Risque modéré' : 'Haut risque'}
            </p>
          </div>

          {/* Loyalty Score */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-cyan mb-4">Score Fidélité</h3>
            <div className="text-4xl font-black text-pink-500 mb-4">{selectedClient.loyalty_score || 50}/100</div>
            <div className="w-full h-3 bg-dark-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-red-500"
                style={{width: `${(selectedClient.loyalty_score || 50)}%`}}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {(selectedClient.loyalty_score || 50) > 80 ? 'Très fidèle' : (selectedClient.loyalty_score || 50) > 60 ? 'Fidèle' : 'À cultiver'}
            </p>
          </div>

          {/* Alertes */}
          <div className="glass p-6 rounded-lg">
            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              Alertes actives
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-red-500/10 p-2 rounded text-red-400 font-bold">
                🔴 Contrat expire dans 60 jours
              </div>
              <div className="bg-orange-500/10 p-2 rounded text-orange-400">
                🟠 RDV de révision recommandé
              </div>
              <div className="bg-yellow-500/10 p-2 rounded text-yellow-400">
                🟡 Cross-sell: RC civile
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRDVModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-cyan mb-6">Créer RDV</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Titre *</label>
                <input
                  type="text"
                  placeholder="Ex: Revue d'assurance"
                  className="input-field w-full"
                  value={rdvData.title}
                  onChange={(e) => setRDVData({ ...rdvData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Description</label>
                <textarea
                  placeholder="Notes..."
                  className="input-field w-full min-h-20 resize-none"
                  value={rdvData.description}
                  onChange={(e) => setRDVData({ ...rdvData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Date/Heure début *</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={rdvData.start_time}
                  onChange={(e) => setRDVData({ ...rdvData, start_time: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Date/Heure fin *</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={rdvData.end_time}
                  onChange={(e) => setRDVData({ ...rdvData, end_time: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Type</label>
                <select
                  className="input-field w-full"
                  value={rdvData.type}
                  onChange={(e) => setRDVData({ ...rdvData, type: e.target.value })}
                >
                  <option value="meeting">Réunion</option>
                  <option value="call">Appel</option>
                  <option value="email_follow_up">Email suivi</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowRDVModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateRDV}
                  className="btn-primary flex-1"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <ContractModal
          clientId={selectedClient?.id}
          onClose={() => setShowContractModal(false)}
          onAdd={handleAddContract}
        />
      )}
    </div>
  )
}
