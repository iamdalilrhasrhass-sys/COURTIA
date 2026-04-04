import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

function getToken() { return localStorage.getItem('token') }

function formatDate(dateStr) {
 if (!dateStr) return '—'
 return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatEuros(montant) {
 if (!montant) return '—'
 return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
}

function joursRestants(dateStr) {
 if (!dateStr) return null
 return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Contrats() {
 const navigate = useNavigate()
 const [contrats, setContrats] = useState([])
 const [clients, setClients] = useState([])
 const [loading, setLoading] = useState(true)
 const [filtreStatut, setFiltreStatut] = useState('Tous')
 const [showModal, setShowModal] = useState(false)
 const [editContrat, setEditContrat] = useState(null)
 const [showConfirm, setShowConfirm] = useState(null)
 const [form, setForm] = useState({
 client_id: '', type_contrat: 'Auto', compagnie: '', numero: '',
 prime_annuelle: '', date_effet: '', date_echeance: '', statut: 'actif'
 })

 const headers = { Authorization: `Bearer ${getToken()}` }

 const TYPES = ['Auto', 'Habitation', 'RC Pro', 'Mutuelle', 'Prévoyance', 'Décennale', 'Autre']
 const STATUTS = ['Tous', 'actif', 'résilié', 'en_attente']
 const COMPAGNIES = ['AXA', 'Allianz', 'Generali', 'MAIF', 'MMA', 'Groupama', 'Covéa', 'April', 'Malakoff Humanis']

 useEffect(() => {
 loadContrats()
 loadClients()
 }, [])

 async function loadContrats() {
 try {
 setLoading(true)
 const res = await axios.get(`${API_URL}/api/contrats`, { headers })
 setContrats(Array.isArray(res.data) ? res.data : [])
 } catch (err) {
 toast.error('Erreur chargement contrats')
 } finally {
 setLoading(false)
 }
 }

 async function loadClients() {
 try {
 const res = await axios.get(`${API_URL}/api/clients?limit=100`, { headers })
 setClients(res.data.data || res.data || [])
 } catch (err) {
 console.error('Erreur chargement clients:', err)
 }
 }

 async function saveContrat() {
 try {
 if (editContrat) {
 await axios.put(`${API_URL}/api/contrats/${editContrat.id}`, form, { headers })
 toast.success('Contrat modifié ✓')
 } else {
 await axios.post(`${API_URL}/api/contrats`, form, { headers })
 toast.success('Contrat ajouté ✓')
 }
 setShowModal(false)
 setEditContrat(null)
 setForm({ client_id: '', type_contrat: 'Auto', compagnie: '', numero: '', prime_annuelle: '', date_effet: '', date_echeance: '', statut: 'actif' })
 loadContrats()
 } catch (err) {
 toast.error('Erreur lors de la sauvegarde')
 }
 }

 async function deleteContrat(id) {
 try {
 await axios.delete(`${API_URL}/api/contrats/${id}`, { headers })
 toast.success('Contrat supprimé ✓')
 setShowConfirm(null)
 loadContrats()
 } catch (err) {
 toast.error('Erreur suppression')
 }
 }

 function openEdit(contrat) {
 setEditContrat(contrat)
 setForm({
 client_id: contrat.client_id || '',
 type_contrat: contrat.type_contrat || 'Auto',
 compagnie: contrat.compagnie || '',
 numero: contrat.numero || '',
 prime_annuelle: contrat.prime_annuelle || '',
 date_effet: contrat.date_effet ? contrat.date_effet.split('T')[0] : '',
 date_echeance: contrat.date_echeance ? contrat.date_echeance.split('T')[0] : '',
 statut: contrat.statut || 'actif'
 })
 setShowModal(true)
 }

 const contratsFiltres = filtreStatut === 'Tous' ? contrats : contrats.filter(c => c.statut === filtreStatut)

 if (loading) return (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
 <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
 </div>
 )

 return (
 <div style={{ padding: 32 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
 <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Contrats</h1>
 <button onClick={() => { setEditContrat(null); setShowModal(true) }} style={{ padding: '10px 20px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Ajouter contrat</button>
 </div>

 {/* Filtres */}
 <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
 {STATUTS.map(s => (
 <button key={s} onClick={() => setFiltreStatut(s)} style={{ padding: '8px 16px', background: filtreStatut === s ? '#0a0a0a' : 'white', color: filtreStatut === s ? 'white' : '#374151', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontWeight: filtreStatut === s ? 600 : 400 }}>{s === 'Tous' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
 ))}
 </div>

 {/* Table */}
 {contratsFiltres.length === 0 ? (
 <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
 <p style={{ fontSize: 18, marginBottom: 8 }}>Aucun contrat trouvé</p>
 <p style={{ fontSize: 14 }}>Commencez par ajouter le premier contrat d'un client pour suivre les échéances et commissions.</p>
 </div>
 ) : (
 <div style={{ overflowX: 'auto' }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ background: '#0a0a0a', color: 'white' }}>
 {['Client', 'Type', 'Compagnie', 'Prime/an', 'Échéance', 'Statut', 'Actions'].map(h => (
 <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {contratsFiltres.map((contrat, i) => {
 const jours = joursRestants(contrat.date_echeance)
 const isUrgent = jours !== null && jours <= 30 && jours >= 0
 const isExpire = jours !== null && jours < 0
 return (
 <tr key={contrat.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
 <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>
 <button onClick={() => navigate('/client/' + contrat.client_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 600, padding: 0, fontSize: 14 }}>
 {contrat.client_nom} {contrat.client_prenom}
 </button>
 </td>
 <td style={{ padding: '12px 16px', fontSize: 14 }}>{contrat.type_contrat}</td>
 <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>{contrat.compagnie}</td>
 <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{formatEuros(contrat.prime_annuelle)}</td>
 <td style={{ padding: '12px 16px', fontSize: 14 }}>
 <div>
 <span>{formatDate(contrat.date_echeance)}</span>
 {isUrgent && <span style={{ display: 'block', fontSize: 11, color: '#ea580c', fontWeight: 600 }}>⚠️ {jours}j restants</span>}
 {isExpire && <span style={{ display: 'block', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>🔴 Expiré</span>}
 </div>
 </td>
 <td style={{ padding: '12px 16px' }}>
 <span style={{ padding: '4px 10px', background: contrat.statut === 'actif' ? '#dcfce7' : contrat.statut === 'résilié' ? '#fee2e2' : '#fef9c3', color: contrat.statut === 'actif' ? '#16a34a' : contrat.statut === 'résilié' ? '#dc2626' : '#ca8a04', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
 {contrat.statut}
 </span>
 </td>
 <td style={{ padding: '12px 16px' }}>
 <div style={{ display: 'flex', gap: 8 }}>
 <button onClick={() => openEdit(contrat)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
 <button onClick={() => setShowConfirm(contrat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}

 {/* Modal Ajout/Modification */}
 {showModal && (
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
 <div style={{ background: 'white', borderRadius: 12, padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
 <h2 style={{ margin: '0 0 24px' }}>{editContrat ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Client *</label>
 <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
 <option value="">Sélectionner un client</option>
 {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
 </select>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Type *</label>
 <select value={form.type_contrat} onChange={e => setForm(p => ({ ...p, type_contrat: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
 {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Compagnie</label>
 <select value={form.compagnie} onChange={e => setForm(p => ({ ...p, compagnie: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
 <option value="">Sélectionner</option>
 {COMPAGNIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Numéro</label>
 <input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Prime annuelle (€)</label>
 <input type="number" value={form.prime_annuelle} onChange={e => setForm(p => ({ ...p, prime_annuelle: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Date d'effet</label>
 <input type="date" value={form.date_effet} onChange={e => setForm(p => ({ ...p, date_effet: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Date d'échéance *</label>
 <input type="date" value={form.date_echeance} onChange={e => setForm(p => ({ ...p, date_echeance: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
 </div>
 </div>
 <div>
 <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Statut</label>
 <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
 {['actif', 'en_attente', 'résilié', 'expiré'].map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
 <button onClick={() => { setShowModal(false); setEditContrat(null) }} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
 <button onClick={saveContrat} style={{ padding: '10px 20px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Sauvegarder</button>
 </div>
 </div>
 </div>
 )}

 {/* Modal Confirmation suppression */}
 {showConfirm && (
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
 <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 400, textAlign: 'center' }}>
 <p style={{ fontSize: 16, marginBottom: 24 }}>Supprimer ce contrat ? Cette action est irréversible.</p>
 <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
 <button onClick={() => setShowConfirm(null)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
 <button onClick={() => deleteContrat(showConfirm)} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Supprimer</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
