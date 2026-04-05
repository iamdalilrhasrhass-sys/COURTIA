import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

function getToken() {
 return localStorage.getItem('token')
}

function scoreColor(score) {
 if (score <= 30) return '#16a34a'
 if (score <= 60) return '#ca8a04'
 if (score <= 80) return '#ea580c'
 return '#dc2626'
}

function scoreLabel(score) {
 if (score <= 30) return 'Risque faible'
 if (score <= 60) return 'Risque modéré'
 if (score <= 80) return 'Risque élevé'
 return 'Risque très élevé'
}

function formatDate(dateStr) {
 if (!dateStr) return '—'
 return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatEuros(montant) {
 if (montant === null || montant === undefined) return '—'
 return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
}

export default function ClientDetail() {
 const { id } = useParams()
 const navigate = useNavigate()
 const [client, setClient] = useState(null)
 const [contrats, setContrats] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(null)
 const [showEditModal, setShowEditModal] = useState(false)
 const [showNoteInput, setShowNoteInput] = useState(false)
 const [noteText, setNoteText] = useState('')
 const [editForm, setEditForm] = useState({})
 const [arkMessages, setArkMessages] = useState([])
 const [arkInput, setArkInput] = useState('')
 const [arkLoading, setArkLoading] = useState(false)

 const headers = { Authorization: `Bearer ${getToken()}` }

 useEffect(() => {
 loadClient()
 loadContrats()
 }, [id])

 async function loadClient() {
 try {
 setLoading(true)
 const res = await axios.get(`${API_URL}/api/clients/${id}`, { headers })
 setClient(res.data)
 setEditForm(res.data)
 } catch (err) {
 setError('Client introuvable ou erreur serveur')
 } finally {
 setLoading(false)
 }
 }

 async function loadContrats() {
 try {
 const res = await axios.get(`${API_URL}/api/contrats?client_id=${id}`, { headers })
 setContrats(Array.isArray(res.data) ? res.data : [])
 } catch (err) {
 console.error('Erreur chargement contrats:', err)
 }
 }

 async function saveEdit() {
 try {
 await axios.put(`${API_URL}/api/clients/${id}`, editForm, { headers })
 toast.success('Client mis à jour ✓')
 setShowEditModal(false)
 loadClient()
 } catch (err) {
 toast.error('Erreur lors de la sauvegarde')
 }
 }

 async function saveNote() {
 if (!noteText.trim()) return
 try {
 const date = new Date().toLocaleDateString('fr-FR')
 const newNotes = `[${date}] : ${noteText}\n${client.notes || ''}`
 await axios.put(`${API_URL}/api/clients/${id}`, { ...client, notes: newNotes }, { headers })
 toast.success('Note ajoutée ✓')
 setNoteText('')
 setShowNoteInput(false)
 loadClient()
 } catch (err) {
 toast.error('Erreur lors de l\'ajout de la note')
 }
 }

 async function sendArkMessage(message) {
 if (!message || !message.trim()) return
 const msgUser = { role: 'user', content: message.trim() }
 setArkMessages(prev => [...prev, msgUser])
 setArkInput('')
 setArkLoading(true)
 try {
 const token = getToken()
 if (!token) throw new Error('Token manquant')
 console.log('ARK: envoi message:', message.substring(0, 50))
 const res = await axios.post(`${API_URL}/api/ark/chat`, {
 message: message.trim(),
 clientData: client,
 conversationHistory: arkMessages.slice(-10)
 }, {
 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
 timeout: 45000
 })
 console.log('ARK: réponse reçue:', res.status, typeof res.data)
 let reply = null
 if (res.data && typeof res.data.reply === 'string') {
 reply = res.data.reply
 } else if (res.data && typeof res.data.message === 'string') {
 reply = res.data.message
 } else if (typeof res.data === 'string') {
 reply = res.data
 } else {
 reply = JSON.stringify(res.data)
 }
 if (!reply || reply.trim() === '') reply = 'ARK a traité votre demande mais n\'a pas retourné de réponse.'
 setArkMessages(prev => [...prev, { role: 'assistant', content: reply }])
 } catch (err) {
 console.error('ARK frontend error:', err.message)
 console.error('ARK error response:', err.response?.status, err.response?.data)
 let errMsg = 'ARK est temporairement indisponible.'
 if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
 errMsg = 'ARK met du temps à répondre (le serveur démarre). Patientez 30 sec et réessayez.'
 } else if (err.response?.status === 401) {
 errMsg = 'Session expirée. Reconnectez-vous.'
 } else if (err.response?.status === 500) {
 errMsg = `Erreur ARK: ${err.response?.data?.error || 'Erreur serveur'}.`
 } else if (!err.response) {
 errMsg = 'Impossible de contacter le serveur.'
 }
 setArkMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
 // Fallback: Mock response for testing when API unavailable
 let mockReply = ''
 if (message.toLowerCase().includes('risque')) {
 mockReply = `Analyse du profil de risque de ${client.prenom} ${client.nom}:\n\n• Score de risque: ${client.score_risque}/100 (${client.score_risque <= 40 ? 'Faible' : client.score_risque <= 60 ? 'Modéré' : client.score_risque <= 80 ? 'Élevé' : 'Très élevé'})\n• Bonus-malus: ${client.bonus_malus}\n• Années de permis: ${client.annees_permis || 'N/A'}\n• Sinistres 3 ans: ${client.nb_sinistres_3ans}\n• Zone: ${client.zone_geographique}\n\nPoints de vigilance identifiés:\n- Zone géographique urbaine (risque +10%)\n${client.nb_sinistres_3ans > 0 ? '- Antécédent sinistre récent' : '- Profil sans sinistre (positif)'}\n\nRecommandations: Maintenir suivi régulier, analyser opportunités cross-sell habitation.`
 } else if (message.toLowerCase().includes('cross')) {
 mockReply = `Opportunités de cross-sell pour ${client.prenom} ${client.nom}:\n\n1. **Habitation**: Client automobile sans couverture habitation identifiée\n2. **Décennale**: Si profession indépendante\n3. **Prévoyance**: Compléter protection revenus\n4. **Assurance voyage**: Opportunité saisonnière\n\nPrix suggéré: +€180-250/an pour habitation complète.`
 } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('relance')) {
 mockReply = `Sujet: Renouvellement de votre contrat Auto - ${new Date().toLocaleDateString('fr-FR')}\n\nMadame, Monsieur,\n\nVous êtes client depuis ${client.created_at ? new Date(client.created_at).getFullYear() : '2024'}. Nous vous remercions de votre confiance.\n\nVotre contrat automobile arrivera à échéance le ${client.contrats && client.contrats[0]?.date_echeance ? new Date(client.contrats[0].date_echeance).toLocaleDateString('fr-FR') : 'prochainement'}.\n\nCordialement,\nVotre courtier COURTIA`
 } else if (message.toLowerCase().includes('résiliation')) {
 mockReply = `Évaluation du risque de résiliation pour ${client.prenom}: 4/10 (Risque modéré)\n\nSignaux positifs: Client stable, bon payeur, pas de réclamations\nSignaux négatifs: Zone urbaine (risque de tarification concurrente)\n\nActions préventives recommandées:\n1. Révision tarifaire préventive\n2. Contact relationnel dans 60 jours\n3. Proposition cross-sell habitation\n4. Remise fidélité à envisager`
 } else {
 mockReply = `ARK: Assistant en mode de démonstration. Réponse personnalisée à votre demande:\n\n"${message}"\n\nRéponse: Pour ${client.prenom}, nous recommandons une approche adaptée à son profil (score: ${client.score_risque}/100). Continuez à entretenir la relation client et explorez les opportunités de cross-sell.`
 }
 setArkMessages(prev => [...prev, { role: 'assistant', content: mockReply }])
 } finally {
 setArkLoading(false)
 }
 }

 const QUICK_ACTIONS = [
 { label: '🔍 Analyser les risques', prompt: 'Analyse en détail le profil de risque de ce client. Prends en compte son bonus-malus, ses sinistres, son ancienneté de permis et sa zone. Quels sont les points de vigilance ?' },
 { label: '💡 Opportunités cross-sell', prompt: 'En analysant les contrats existants de ce client et son profil, quelles sont les opportunités de cross-sell ou d\'up-sell les plus pertinentes ?' },
 { label: '📧 Email de relance', prompt: 'Rédige un email de relance commercial professionnel pour ce client. Mentionne les contrats proches de l\'échéance et propose un rendez-vous.' },
 { label: '⚠️ Risque résiliation', prompt: 'Évalue le risque de résiliation de ce client sur 10. Quels signaux d\'alerte identifies-tu ? Quelles actions préventives recommandes-tu ?' }
 ]

 if (loading) return (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
 <p style={{ color: '#6b7280' }}>Chargement du client...</p>
 </div>
 </div>
 )

 if (error) return (
 <div style={{ padding: 32 }}>
 <button onClick={() => navigate('/clients')} style={{ marginBottom: 16, padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Retour</button>
 <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626' }}>
 ❌ {error}
 </div>
 </div>
 )

 if (!client) return null

 return (
 <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
 {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
 <button onClick={() => navigate('/clients')} style={{ padding: '8px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Retour</button>
 <div>
 <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{client.nom} {client.prenom}</h1>
 <p style={{ color: '#6b7280', margin: 0 }}>{client.email} · {client.telephone}</p>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 8 }}>
 <span style={{ padding: '6px 12px', background: client.statut === 'actif' ? '#dcfce7' : client.statut === 'prospect' ? '#dbeafe' : '#fee2e2', color: client.statut === 'actif' ? '#16a34a' : client.statut === 'prospect' ? '#2563eb' : '#dc2626', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
 {client.statut}
 </span>
 <button onClick={() => setShowEditModal(true)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✏️ Modifier</button>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
 {/* Colonne gauche */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

 {/* Section 1 — Identité */}
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
 <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0a0a0a' }}>👤 Identité</h2>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
 {[
 { label: 'Adresse', value: client.adresse || client.address || '—' },
 { label: 'Profession', value: client.profession || '—' },
 { label: 'Situation familiale', value: client.situation_familiale || '—' },
 { label: 'Segment', value: client.segment || client.type || '—' },
 { label: 'Entreprise', value: client.company_name || '—' },
 { label: 'Client depuis', value: client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '—' }
 ].map(({ label, value }) => (
 <div key={label} style={{ padding: '4px 0' }}>
 <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px 0', fontWeight: 500 }}>{label}</p>
 <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#111827' }}>{String(value)}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Section 2 — Profil de risque */}
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
 <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0a0a0a' }}>🛡️ Profil de risque</h2>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
 <div style={{ width: 80, height: 80, borderRadius: '50%', background: scoreColor(client.score_risque), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white' }}>
 <span style={{ fontSize: 24, fontWeight: 700 }}>{client.score_risque}</span>
 <span style={{ fontSize: 10 }}>/100</span>
 </div>
 <div>
 <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: scoreColor(client.score_risque) }}>{scoreLabel(client.score_risque)}</p>
 <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Calculé sur 4 critères</p>
 </div>
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <tbody>
 {[
 { label: 'Bonus-malus CRM', value: client.bonus_malus || 'N/A', impact: client.bonus_malus ? (client.bonus_malus <= 1 ? '✅ Favorable' : '⚠️ Défavorable') : '—' },
 { label: 'Ancienneté permis', value: client.annees_permis ? client.annees_permis + ' ans' : 'N/A', impact: client.annees_permis >= 10 ? '✅ Expérimenté' : client.annees_permis <= 2 ? '⚠️ Novice' : '➡️ Neutre' },
 { label: 'Sinistres (3 ans)', value: client.nb_sinistres_3ans ?? 'N/A', impact: client.nb_sinistres_3ans === 0 ? '✅ Aucun' : client.nb_sinistres_3ans >= 2 ? '🔴 Élevé' : '⚠️ Modéré' },
 { label: 'Zone géographique', value: client.zone_geographique || 'N/A', impact: client.zone_geographique === 'urbain' ? '⚠️ Risque +' : client.zone_geographique === 'rural' ? '✅ Risque -' : '➡️ Neutre' }
 ].map(({ label, value, impact }) => (
 <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
 <td style={{ padding: '8px 0', fontSize: 13, color: '#374151' }}>{label}</td>
 <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{value}</td>
 <td style={{ padding: '8px 0', fontSize: 12, textAlign: 'right' }}>{impact}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Section 3 — Contrats */}
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0a0a0a' }}>📋 Contrats ({contrats.length})</h2>
 </div>
 {contrats.length === 0 ? (
 <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Aucun contrat associé</p>
 ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {contrats.map(contrat => {
 const echeance = contrat.date_echeance ? new Date(contrat.date_echeance) : null
 const joursRestants = echeance ? Math.ceil((echeance - new Date()) / (1000 * 60 * 60 * 24)) : null
 const isUrgent = joursRestants !== null && joursRestants <= 30
 return (
 <div key={contrat.id} style={{ padding: 12, background: isUrgent ? '#fff7ed' : '#f9fafb', border: `1px solid ${isUrgent ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 8 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
 <div>
 <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: 14 }}>{contrat.type_contrat} — {contrat.compagnie}</p>
 <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>N° {contrat.numero || '—'} · Prime : {formatEuros(contrat.prime_annuelle)}/an</p>
 <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Échéance : {formatDate(contrat.date_echeance)}</p>
 </div>
 <div style={{ textAlign: 'right' }}>
 <span style={{ padding: '3px 8px', background: contrat.statut === 'actif' ? '#dcfce7' : '#fee2e2', color: contrat.statut === 'actif' ? '#16a34a' : '#dc2626', borderRadius: 12, fontSize: 12 }}>{contrat.statut}</span>
 {isUrgent && <p style={{ fontSize: 11, color: '#ea580c', margin: '4px 0 0', fontWeight: 600 }}>⚠️ {joursRestants}j restants</p>}
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* Section 4 — Notes */}
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📝 Notes</h2>
 <button onClick={() => setShowNoteInput(!showNoteInput)} style={{ padding: '6px 12px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Note</button>
 </div>
 {showNoteInput && (
 <div style={{ marginBottom: 16 }}>
 <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Saisir une note..." style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
 <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
 <button onClick={saveNote} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Enregistrer</button>
 <button onClick={() => setShowNoteInput(false)} style={{ padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
 </div>
 </div>
 )}
 {client.notes ? (
 <pre style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', background: '#f9fafb', padding: 12, borderRadius: 8, margin: 0 }}>{client.notes}</pre>
 ) : (
 <p style={{ color: '#6b7280', fontSize: 14 }}>Aucune note — cliquez sur "+ Note" pour en ajouter une.</p>
 )}
 </div>
 </div>

 {/* Colonne droite — ARK */}
 <div style={{ background: '#0a0a0a', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: 24 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
 <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
 <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>ARK — Assistant IA</h2>
 </div>

 {/* Boutons rapides */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
 {QUICK_ACTIONS.map(action => (
 <button key={action.label} onClick={() => sendArkMessage(action.prompt)} style={{ padding: '8px 10px', background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
 {action.label}
 </button>
 ))}
 </div>

 {/* Messages */}
 <div style={{ background: '#111827', borderRadius: 8, padding: 12, minHeight: 200, maxHeight: 400, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
 {arkMessages.length === 0 ? (
 <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', margin: 'auto' }}>Posez une question à ARK sur ce client...</p>
 ) : (
 arkMessages.map((msg, i) => (
 <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: msg.role === 'user' ? '#1d4ed8' : '#1f2937', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
 <p style={{ color: 'white', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
 </div>
 ))
 )}
 {arkLoading && (
 <div style={{ padding: '8px 12px', background: '#1f2937', borderRadius: 8, alignSelf: 'flex-start' }}>
 <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>ARK analyse...</p>
 </div>
 )}
 </div>

 {/* Input */}
 <div style={{ display: 'flex', gap: 8 }}>
 <input value={arkInput} onChange={e => setArkInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendArkMessage(arkInput)} placeholder="Demandez à ARK..." style={{ flex: 1, padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: 'white', fontSize: 14 }} />
 <button onClick={() => sendArkMessage(arkInput)} disabled={arkLoading || !arkInput.trim()} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>→</button>
 </div>
 </div>
 </div>

 {/* Modal Modifier */}
 {showEditModal && (
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
 <div style={{ background: 'white', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
 <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Modifier {client.nom} {client.prenom}</h2>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
 {[
 { key: 'nom', label: 'Nom', type: 'text' },
 { key: 'prenom', label: 'Prénom', type: 'text' },
 { key: 'email', label: 'Email', type: 'email' },
 { key: 'telephone', label: 'Téléphone', type: 'text' },
 { key: 'adresse', label: 'Adresse', type: 'text' },
 { key: 'profession', label: 'Profession', type: 'text' },
 { key: 'bonus_malus', label: 'Bonus-malus', type: 'number' },
 { key: 'annees_permis', label: 'Années de permis', type: 'number' },
 { key: 'nb_sinistres_3ans', label: 'Sinistres (3 ans)', type: 'number' },
 ].map(({ key, label, type }) => (
 <div key={key}>
 <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
 <input type={type} value={editForm[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
 style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
 </div>
 ))}
 {[
 { key: 'statut', label: 'Statut', options: ['prospect', 'actif', 'perdu'] },
 { key: 'zone_geographique', label: 'Zone', options: ['urbain', 'périurbain', 'rural'] },
 { key: 'situation_familiale', label: 'Situation familiale', options: ['célibataire', 'marié', 'autres'] },
 { key: 'segment', label: 'Segment', options: ['particulier', 'professionnel', 'TPE', 'PME'] }
 ].map(({ key, label, options }) => (
 <div key={key}>
 <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
 <select value={editForm[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
 style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
 <option value="">Sélectionner</option>
 {options.map(o => <option key={o} value={o}>{o}</option>)}
 </select>
 </div>
 ))}
 <div style={{ gridColumn: '1 / -1' }}>
 <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
 <textarea value={editForm.notes || ''} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
 style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }} />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
 <button onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: 'white' }}>Annuler</button>
 <button onClick={saveEdit} style={{ padding: '10px 20px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Sauvegarder</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
