import { useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { formatDateTime } from '../../lib/salesProspecting'

export default function SalesUsersPanel({ onUsersChanged }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'prospecteur' })
  const [busy, setBusy] = useState(false)
  const load = async () => { const response = await salesApi.users(); setUsers(response.data.users || []) }
  useEffect(() => {
    let active = true
    salesApi.users().then((response) => { if (active) setUsers(response.data.users || []) }).catch(() => {})
    return () => { active = false }
  }, [])

  async function invite(event) {
    event.preventDefault(); setBusy(true)
    try { await salesApi.inviteUser(form); toast.success('Invitation envoyée'); setForm({ username: '', email: '', first_name: '', last_name: '', role: 'prospecteur' }); await load(); onUsersChanged?.() }
    catch (error) { toast.error(error?.response?.data?.error || 'Invitation impossible') }
    finally { setBusy(false) }
  }

  async function status(user, action) {
    if (action !== 'activate' && !window.confirm(`${action === 'delete' ? 'Supprimer' : 'Suspendre'} @${user.username} ?`)) return
    setBusy(true)
    try { await salesApi.setUserStatus(user.id, { action, reason: 'Action depuis le cockpit Boss' }); toast.success('Utilisateur mis à jour'); await load(); onUsersChanged?.() }
    catch (error) { toast.error(error?.response?.data?.error || 'Mise à jour impossible') }
    finally { setBusy(false) }
  }

  return <div className="sales-admin-grid users">
    <section className="sales-panel">
      <header><div><span className="sales-kicker"><UsersRound size={15} /> Accès</span><h3>Équipe commerciale</h3><p>Le rôle est vérifié en base à chaque requête, pas uniquement dans l’interface.</p></div></header>
      <div className="sales-user-list">{users.map((user) => <article key={user.id} className={user.suspended_at || user.deleted_at ? 'is-inactive' : ''}><span className="sales-user-avatar">{(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}</span><div><strong>{user.first_name || user.username} {user.last_name || ''}</strong><span>@{user.username} · {user.role === 'super_admin' ? 'Boss' : 'Prospecteur'}</span><small>{user.assigned_cabinets} cabinets · {user.calls_today} appels aujourd’hui · dernière connexion {formatDateTime(user.last_login_at)}</small></div><em>{user.deleted_at ? 'Supprimé' : user.suspended_at ? 'Suspendu' : user.must_change_password ? 'Invitation en attente' : 'Actif'}</em>{user.role !== 'super_admin' && <div className="sales-user-actions">{user.suspended_at || user.deleted_at ? <button onClick={() => status(user, 'activate')}>Réactiver</button> : <><button onClick={() => status(user, 'suspend')}>Suspendre</button><button className="danger" onClick={() => status(user, 'delete')}>Supprimer</button></>}</div>}</article>)}</div>
    </section>
    <section className="sales-panel sales-invite-card">
      <header><div><span className="sales-kicker"><UserPlus size={15} /> Invitation sécurisée</span><h3>Créer un utilisateur</h3><p>Aucun mot de passe temporaire : la personne reçoit un lien de 48 heures.</p></div></header>
      <form onSubmit={invite} className="sales-form-grid compact"><label>Nom d’utilisateur *<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex. tarek" /></label><label>Rôle *<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="prospecteur">Prospecteur</option><option value="super_admin">SUPER_ADMIN</option></select></label><label>Prénom<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label><label>Nom<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label><label className="sales-span-2">E-mail professionnel *<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><button className="sales-button primary sales-span-2" disabled={busy || !form.username || !form.email}><ShieldCheck size={16} /> {busy ? 'Création…' : 'Créer et envoyer l’invitation'}</button></form>
    </section>
  </div>
}
