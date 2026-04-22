import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Lock, Bell, CreditCard, Eye, EyeOff, Check } from 'lucide-react'
import api from '../api'

const NAV_ITEMS = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'securite', label: 'Sécurité', icon: Lock },
  { id: 'plan', label: 'Plan & Facturation', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const getInitials = (firstName, lastName) => ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || '?'

const Toggle = ({ label, description, enabled, setEnabled }) => (
  <div className="flex items-center justify-between py-1">
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

export default function Parametres() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('profil')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', cabinet: '', orias: '', telephone: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  const [notifications, setNotifications] = useState({ summary: true, alerts: true, news: false })

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const { data } = await api.get('/api/auth/me')
      setProfile(data)
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '', cabinet: data.cabinet || '', orias: data.orias || '', telephone: data.telephone || '' })
      localStorage.setItem('courtia_user', JSON.stringify(data))
      window.dispatchEvent(new Event('profileUpdated'))
    } catch { toast.error('Impossible de charger le profil') } 
    finally { setLoading(false) }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/api/auth/me', form)
      toast.success('Profil mis à jour ✓')
      fetchProfile()
    } catch { toast.error('Erreur lors de la sauvegarde') } 
    finally { setSaving(false) }
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    toast('Fonctionnalité bientôt disponible.', { icon: '🚧' })
  }

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black shadow-sm focus:border-[#2563eb] focus:shadow-md focus:shadow-blue-100 outline-none transition-all duration-200"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  const planConfig = {
    pro: { label: 'Pro', classes: 'bg-blue-100 text-blue-700', features: ['Jusqu\'à 500 clients', 'Assistant IA - ARK', 'Rapports avancés'] },
    starter: { label: 'Starter', classes: 'bg-emerald-100 text-emerald-700', features: ['Jusqu\'à 100 clients', 'Scores & Segments', 'Module Tâches'] },
    elite: { label: 'Elite', classes: 'bg-violet-100 text-violet-700', features: ['Clients illimités', 'API & Intégrations', 'Support prioritaire'] },
    founder: { label: 'Founder', classes: 'bg-amber-100 text-amber-700', features: ['Accès anticipé', 'Toutes les fonctionnalités', 'Contact direct équipe'] }
  }
  const tier = (profile?.pricing_tier || '').toLowerCase()
  const currentPlan = planConfig[tier] || { label: profile?.pricing_tier || 'N/A', classes: 'bg-gray-100 text-gray-700', features: [] }

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      <main className="p-8 max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900">Paramètres</h1>
          <p className="text-gray-500 mt-1">Gérez votre profil, vos préférences et votre abonnement.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-12">
          <aside className="md:w-1/4">
            <nav className="space-y-1 sticky top-8">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeSection === item.id ? 'bg-white text-[#2563eb] shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          
          <div className="flex-1 space-y-12">
            <section id="profil" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Profil</h2>
              <p className="text-sm text-gray-500 mb-5">Informations publiques et coordonnées.</p>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <form onSubmit={handleProfileSubmit}>
                  <div className="p-6 space-y-5">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 text-[40px] rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold flex-shrink-0">{getInitials(form.first_name, form.last_name)}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div><label htmlFor="first_name" className={labelClass}>Prénom *</label><input id="first_name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className={inputClass} /></div>
                        <div><label htmlFor="last_name" className={labelClass}>Nom *</label><input id="last_name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className={inputClass} /></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label htmlFor="email" className={labelClass}>Email (lecture seule)</label><input id="email" type="email" value={form.email} disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} /></div>
                      <div><label htmlFor="telephone" className={labelClass}>Téléphone</label><input id="telephone" type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label htmlFor="cabinet" className={labelClass}>Cabinet</label><input id="cabinet" value={form.cabinet} onChange={e => setForm({ ...form, cabinet: e.target.value })} className={inputClass} /></div>
                      <div><label htmlFor="orias" className={labelClass}>Numéro ORIAS</label><input id="orias" value={form.orias} onChange={e => setForm({ ...form, orias: e.target.value })} className={inputClass} /></div>
                    </div>
                  </div>
                  <div className="bg-gray-50/70 p-4 flex justify-end rounded-b-xl border-t border-gray-100"><button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button></div>
                </form>
              </div>
            </section>

            <section id="securite" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sécurité</h2>
              <p className="text-sm text-gray-500 mb-5">Changez votre mot de passe.</p>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <form onSubmit={handlePasswordSubmit}>
                    <div className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[ {id: 'current', label: 'Actuel'}, {id: 'new', label: 'Nouveau'}, {id: 'confirm', label: 'Confirmer'} ].map(p => (
                          <div key={p.id}>
                            <label htmlFor={`${p.id}_password`} className={labelClass}>Mot de passe {p.label}</label>
                            <div className="relative"><input id={`${p.id}_password`} type={showPass[p.id] ? 'text' : 'password'} value={passwords[p.id]} onChange={e => setPasswords({...passwords, [p.id]: e.target.value})} className={inputClass} /><button type="button" onClick={() => setShowPass({...showPass, [p.id]: !showPass[p.id]})} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass[p.id] ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50/70 p-4 flex justify-end rounded-b-xl border-t border-gray-100"><button type="submit" className="px-5 py-2.5 bg-white text-gray-800 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors shadow-sm">Changer</button></div>
                </form>
              </div>
            </section>

            <section id="plan" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Plan & Facturation</h2>
              <p className="text-sm text-gray-500 mb-5">Gérez votre abonnement et consultez vos factures.</p>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3"><p className="font-semibold text-gray-800">Votre plan actuel</p><span className={`px-3 py-1 text-sm font-bold rounded-full ${currentPlan.classes}`}>{currentPlan.label}</span></div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">{currentPlan.features.map(f => (<li key={f} className="flex items-center gap-2"><Check size={16} className="text-emerald-500" /><span>{f}</span></li>))}</ul>
                </div>
                <button onClick={() => navigate('/abonnement')} className="px-5 py-2.5 bg-white text-gray-800 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm">Gérer l'abonnement</button>
              </div>
            </section>

            <section id="notifications" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Notifications</h2>
              <p className="text-sm text-gray-500 mb-5">Choisissez comment nous pouvons vous contacter.</p>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-3 divide-y divide-gray-100">
                <Toggle label="Résumé hebdomadaire" description="Recevez un bilan de votre activité chaque lundi matin." enabled={notifications.summary} setEnabled={() => { setNotifications({...notifications, summary: !notifications.summary}); toast.info('Préférence sauvegardée.') }}/>
                <Toggle label="Alertes importantes" description="Échéances de contrat, tâches urgentes, etc." enabled={notifications.alerts} setEnabled={() => { setNotifications({...notifications, alerts: !notifications.alerts}); toast.info('Préférence sauvegardée.') }}/>
                <Toggle label="Nouveautés produit" description="Annonces des nouvelles fonctionnalités de COURTIA." enabled={notifications.news} setEnabled={() => { setNotifications({...notifications, news: !notifications.news}); toast.info('Préférence sauvegardée.') }}/>
              </div>
            </section>
          </div>
        </div>
        <footer className="text-center py-12"><p className="text-xs text-gray-400">Rhasrhass®</p></footer>
      </main>
    </div>
  )
}
