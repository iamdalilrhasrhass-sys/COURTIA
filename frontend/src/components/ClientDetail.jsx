import { ArrowLeft, Mail, Phone, MapPin, FileText, AlertCircle, Heart, MessageSquare, Send, Plus, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useClientStore } from '../stores/clientStore'
import { useAuthStore } from '../stores/authStore'
import ContractModal from './ContractModal'
import { callArkAI } from '../services/arkService'

function ScoreBar({ score, colorClass }) {
  return (
    <div className="w-full h-3 bg-dark-3 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function ScoreReasons({ reasons }) {
  if (!reasons || reasons.length === 0) return null
  return (
    <ul className="mt-2 space-y-1">
      {reasons.map((r) => (
        <li key={r.code} className="text-xs text-slate-400 flex justify-between">
          <span>{r.label}</span>
          <span className="text-slate-500">+{r.points} pts</span>
        </li>
      ))}
    </ul>
  )
}

export default function ClientDetail() {
  const selectedClient = useClientStore((state) => state.selectedClient)
  const setSelectedClient = useClientStore((state) => state.setSelectedClient)
  const fetchClientDetail = useClientStore((state) => state.fetchClientDetail)
  const refreshClientScore = useClientStore((state) => state.refreshClientScore)
  const token = useAuthStore((state) => state.token)

  const [note, setNote] = useState('')
  const [showContractModal, setShowContractModal] = useState(false)
  const [showRDVModal, setShowRDVModal] = useState(false)
  const [arkMessage, setArkMessage] = useState('')
  const [arkResponse, setArkResponse] = useState('')
  const [arkLoading, setArkLoading] = useState(false)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rdvData, setRDVData] = useState({
    title: '', description: '', start_time: '', end_time: '', type: 'meeting'
  })

  // Enrichit le client sélectionné avec ses contrats dès l'ouverture de la fiche
  useEffect(() => {
    if (!selectedClient) return
    // Recharge uniquement si les contrats ne sont pas encore présents
    if (!Array.isArray(selectedClient.contracts)) {
      setDetailLoading(true)
      fetchClientDetail(selectedClient.id)
        .catch(console.error)
        .finally(() => setDetailLoading(false))
    }
  }, [selectedClient?.id])

  const handleRefreshScore = async () => {
    if (!selectedClient) return
    setScoreLoading(true)
    try {
      await refreshClientScore(selectedClient.id)
    } catch (err) {
      console.error('Score refresh error:', err)
    } finally {
      setScoreLoading(false)
    }
  }

  const handleCall = () => {
    const tel = selectedClient.phone?.replace(/\s/g, '') || ''
    if (tel) window.location.href = `tel:${tel}`
  }

  const handleWhatsApp = () => {
    const msg = `Bonjour ${selectedClient.first_name}, suite à notre conversation sur votre assurance...`
    const phone = selectedClient.phone?.replace(/\D/g, '') || ''
    if (phone) window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  const handleEmail = () => {
    const subject = `Vos contrats d'assurance - ${selectedClient.first_name}`
    const contracts = selectedClient.contracts || []
    const body = `Bonjour ${selectedClient.first_name},\n\nContrats actifs: ${contracts.length}\nScore fidélité: ${selectedClient.loyalty_score ?? '—'}/100\n\nCordialement`
    window.location.href = `mailto:${selectedClient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleCreateRDV = async () => {
    if (!rdvData.title || !rdvData.start_time || !rdvData.end_time) {
      alert('Tous les champs sont requis')
      return
    }
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '/api') + '/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: selectedClient.id, ...rdvData })
      })
      if (response.ok) {
        setShowRDVModal(false)
        setRDVData({ title: '', description: '', start_time: '', end_time: '', type: 'meeting' })
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
      const contracts = selectedClient.contracts || []
      const clientData = {
        ...selectedClient,
        contracts: contracts.map(c => ({
          type: c.type,
          premium: c.annual_premium,
          endDate: c.end_date
        })),
        claims: [],
        alerts: selectedClient.risk_reasons?.map(r => r.label) || [],
        riskScore: selectedClient.risk_score,
        loyaltyScore: selectedClient.loyalty_score,
        history: [],
        notes: note
      }
      const response = await callArkAI(clientData, arkMessage, token)
      setArkResponse(response)
      setArkMessage('')
    } catch (error) {
      setArkResponse('Erreur: Impossible de contacter ARK.')
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

  if (detailLoading) {
    return (
      <div className="ml-64 p-8 flex items-center gap-3 text-slate-400">
        <RefreshCw size={20} className="animate-spin" />
        Chargement de la fiche client…
      </div>
    )
  }

  const contracts = selectedClient.contracts || []
  const riskScore = selectedClient.risk_score
  const loyaltyScore = selectedClient.loyalty_score

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
        {/* Colonne principale */}
        <div className="col-span-2">
          <div className="glass p-8 rounded-lg mb-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-black text-gradient">
                {selectedClient.first_name} {selectedClient.last_name}
              </h2>
              <div className="flex gap-2">
                <button onClick={handleCall} className="btn-primary flex items-center gap-2">
                  <Phone size={18} /> Appeler
                </button>
                <button onClick={handleWhatsApp} className="btn-secondary flex items-center gap-2">
                  💬 WhatsApp
                </button>
                <button onClick={handleEmail} className="btn-secondary flex items-center gap-2">
                  ✉️ Email
                </button>
                <button onClick={() => setShowRDVModal(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={18} /> RDV
                </button>
              </div>
            </div>
            <div className="space-y-3">
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
                <Heart size={20} className={loyaltyScore > 70 ? 'text-red-500' : 'text-slate-500'} />
                <span>Score fidélité: {loyaltyScore != null ? `${loyaltyScore}/100` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Contrats — données réelles */}
          <div className="glass p-6 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan flex items-center gap-2">
                <FileText size={20} /> Contrats actifs
              </h3>
              <button onClick={() => setShowContractModal(true)} className="btn-secondary text-sm">+ Ajouter</button>
            </div>
            {contracts.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun contrat enregistré</p>
            ) : (
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div key={c.id} className="bg-dark-3 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-bold">{c.type}</p>
                      <p className="text-xs text-slate-500">{c.company} · N°{c.number}</p>
                      <p className="text-sm text-slate-500">
                        Expire: {c.end_date ? new Date(c.end_date).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                    <p className="font-bold text-cyan">
                      {c.annual_premium ? `${c.annual_premium}€/an` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="glass p-6 rounded-lg">
            <h3 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
              <MessageSquare size={20} /> Notes internes
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

        {/* Colonne droite */}
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
                  <p className="text-slate-500 text-xs">Posez une question sur ce client…</p>
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
                  className="btn-primary p-2 disabled:opacity-50"
                >
                  {arkLoading ? '...' : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Risk Score */}
          <div className="glass p-6 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-cyan">Risk Score</h3>
              <button
                onClick={handleRefreshScore}
                disabled={scoreLoading}
                title="Recalculer le score"
                className="text-slate-400 hover:text-cyan disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={16} className={scoreLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            {riskScore != null ? (
              <>
                <div className="text-4xl font-black text-cyan mb-2">{riskScore}/100</div>
                <ScoreBar score={riskScore} colorClass="from-green-500 to-cyan-500" />
                <p className="text-xs text-slate-500 mt-2 capitalize">
                  {selectedClient.risk_level || (riskScore < 40 ? 'faible' : riskScore < 70 ? 'modéré' : 'élevé')}
                </p>
                <ScoreReasons reasons={selectedClient.risk_reasons} />
              </>
            ) : (
              <p className="text-slate-500 text-sm">Non calculé — cliquez sur ↻</p>
            )}
          </div>

          {/* Loyalty Score */}
          <div className="glass p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-cyan mb-3">Score Fidélité</h3>
            {loyaltyScore != null ? (
              <>
                <div className="text-4xl font-black text-pink-500 mb-2">{loyaltyScore}/100</div>
                <ScoreBar score={loyaltyScore} colorClass="from-pink-500 to-red-500" />
                <p className="text-xs text-slate-500 mt-2">
                  {loyaltyScore > 80 ? 'Très fidèle' : loyaltyScore > 60 ? 'Fidèle' : 'À cultiver'}
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">Non calculé</p>
            )}
          </div>

          {/* Alertes — dérivées des risk_reasons après calcul */}
          {selectedClient.risk_reasons && selectedClient.risk_reasons.length > 0 && (
            <div className="glass p-6 rounded-lg">
              <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                <AlertCircle size={20} /> Alertes actives
              </h3>
              <div className="space-y-2 text-sm">
                {selectedClient.risk_reasons.map((r) => (
                  <div key={r.code} className="bg-red-500/10 p-2 rounded text-red-400">
                    🔴 {r.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRDVModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-cyan mb-6">Créer RDV</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Titre *</label>
                <input type="text" placeholder="Ex: Revue d'assurance" className="input-field w-full"
                  value={rdvData.title} onChange={(e) => setRDVData({ ...rdvData, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Description</label>
                <textarea placeholder="Notes..." className="input-field w-full min-h-20 resize-none"
                  value={rdvData.description} onChange={(e) => setRDVData({ ...rdvData, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Début *</label>
                <input type="datetime-local" className="input-field w-full"
                  value={rdvData.start_time} onChange={(e) => setRDVData({ ...rdvData, start_time: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Fin *</label>
                <input type="datetime-local" className="input-field w-full"
                  value={rdvData.end_time} onChange={(e) => setRDVData({ ...rdvData, end_time: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Type</label>
                <select className="input-field w-full"
                  value={rdvData.type} onChange={(e) => setRDVData({ ...rdvData, type: e.target.value })}>
                  <option value="meeting">Réunion</option>
                  <option value="call">Appel</option>
                  <option value="email_follow_up">Email suivi</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowRDVModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button onClick={handleCreateRDV} className="btn-primary flex-1">Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <ContractModal
          clientId={selectedClient?.id}
          onClose={() => setShowContractModal(false)}
          onAdd={() => fetchClientDetail(selectedClient.id)}
        />
      )}
    </div>
  )
}
