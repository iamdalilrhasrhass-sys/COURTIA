import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Lock, Bell, CreditCard } from 'lucide-react'
import Topbar from '../components/Topbar'
import api from '../api'

const SettingsCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <Icon className="text-gray-500" size={20} />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

const Toggle = ({ label, description, enabled, setEnabled }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-semibold text-sm text-gray-800">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] ${enabled ? 'bg-[#2563eb]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
)

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0)
  const l = (lastName || '').charAt(0)
  return (f + l).toUpperCase() || '?'
}

export default function Parametres() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', cabinet: '', orias: '', telephone: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [notifications, setNotifications] = useState({ summary: true, alerts: true, news: false })

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const res = await api.get('/api/auth/me')
      const data = res.data
      setProfile(data)
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        cabinet: data.cabinet || '',
        orias: data.orias || '',
        telephone: data.telephone || '',
      })
    } catch {
      toast.error('Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/api/auth/me', form)
      toast.success('Profil mis à jour ✓')
      fetchProfile()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    toast('Fonctionnalité bientôt disponible.', { icon: '🚧' })
  }

  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all duration-200"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"
  
  const planConfig = {
    Pro: { label: 'Pro', classes: 'bg-blue-100 text-blue-700' },
    Starter: { label: 'Starter', classes: 'bg-emerald-100 text-emerald-700' },
    Elite: { label: 'Elite', classes: 'bg-violet-100 text-violet-700' },
    Founder: { label: 'Founder', classes: 'bg-amber-100 text-amber-700' }
  }
  const currentPlan = planConfig[profile?.pricing_tier] || { label: profile?.pricing_tier || 'N/A', classes: 'bg-gray-100 text-gray-700' }


  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      <Topbar title="Paramètres" subtitle="Gérez votre profil et vos préférences" />
      <main className="p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 gap-8">
          
          <SettingsCard title="Profil" icon={User}>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 text-[40px] rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold flex-shrink-0">
                  {getInitials(form.first_name, form.last_name)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>Prénom *</label>
                    <input id="first_name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelClass}>Nom *</label>
                    <input id="last_name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className={inputClass} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className={labelClass}>Email (lecture seule)</label>
                  <input id="email" type="email" value={form.email} disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label htmlFor="telephone" className={labelClass}>Téléphone</label>
                  <input id="telephone" type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cabinet" className={labelClass}>Cabinet</label>
                  <input id="cabinet" value={form.cabinet} onChange={e => setForm({ ...form, cabinet: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="orias" className={labelClass}>Numéro ORIAS</label>
                  <input id="orias" value={form.orias} onChange={e => setForm({ ...form, orias: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={saving} className="px-4 py-2.5 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed">
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard title="Sécurité" icon={Lock}>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="current_password" className={labelClass}>Mot de passe actuel</label>
                  <input id="current_password" type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="new_password" className={labelClass}>Nouveau mot de passe</label>
                  <input id="new_password" type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="confirm_password" className={labelClass}>Confirmer le mot de passe</label>
                  <input id="confirm_password" type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" className="px-4 py-2.5 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard title="Plan & Facturation" icon={CreditCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className={labelClass}>Plan actuel</p>
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${currentPlan.classes}`}>
                  {currentPlan.label}
                </span>
              </div>
              <button onClick={() => navigate('/abonnement')} className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
                Gérer l'abonnement
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications" icon={Bell}>
            <div className="space-y-4">
              <Toggle
                label="Résumé hebdomadaire"
                description="Recevez un bilan de votre activité chaque lundi matin."
                enabled={notifications.summary}
                setEnabled={() => { setNotifications({...notifications, summary: !notifications.summary}); toast.info('Préférence de notification sauvegardée.') }}
              />
              <Toggle
                label="Alertes importantes"
                description="Échéances de contrat, tâches urgentes, etc."
                enabled={notifications.alerts}
                setEnabled={() => { setNotifications({...notifications, alerts: !notifications.alerts}); toast.info('Préférence de notification sauvegardée.') }}
              />
              <Toggle
                label="Nouveautés produit"
                description="Annonces des nouvelles fonctionnalités de COURTIA."
                enabled={notifications.news}
                setEnabled={() => { setNotifications({...notifications, news: !notifications.news}); toast.info('Préférence de notification sauvegardée.') }}
              />
            </div>
          </SettingsCard>

        </div>
        <footer className="text-center py-8">
          <p className="text-xs text-gray-400">Rhasrhass®</p>
        </footer>
      </main>
    </div>
  )
}
