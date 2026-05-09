import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Lock, Bell, CreditCard, Eye, EyeOff, Check, AlertTriangle, ListTodo, Sunrise, Sparkles, Link, RefreshCw, CalendarDays, MessageSquare, Mail, Briefcase } from 'lucide-react'
import api from '../api'
import { getSessionUser, primeSessionUserCache } from '../api/sessionUser'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'

const NAV_ITEMS = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'securite', label: 'Sécurité', icon: Lock },
  { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Intégrations', icon: Link },
]
const INTEGRATIONS_API_ENABLED = String(import.meta.env.VITE_INTEGRATIONS_API_ENABLED || '').trim().toLowerCase() === 'true'

const getInitials = (firstName, lastName) => ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || '?'

const INTEGRATION_META = {
  google_calendar: {
    title: 'Google Agenda',
    icon: CalendarDays,
    connectPath: '/integrations/google-calendar/connect',
    syncPath: '/integrations/google-calendar/sync',
    disconnectPath: '/integrations/google-calendar/disconnect',
    description: 'Synchronisez vos rendez-vous courtier et enrichissez Morning Brief.',
  },
  whatsapp_business: {
    title: 'WhatsApp Business',
    icon: MessageSquare,
    connectPath: '/integrations/whatsapp/configure',
    syncPath: null,
    disconnectPath: '/integrations/whatsapp/configure',
    description: 'Centralisez les échanges clients WhatsApp dans la fiche 360.',
  },
  gmail: {
    title: 'Gmail',
    icon: Mail,
    connectPath: '/integrations/gmail/connect',
    syncPath: '/integrations/gmail/sync',
    disconnectPath: '/integrations/gmail/disconnect',
    description: 'Préparez la centralisation des échanges email professionnels.',
  },
  outlook: {
    title: 'Outlook',
    icon: Briefcase,
    connectPath: '/integrations/outlook/connect',
    syncPath: '/integrations/outlook/sync',
    disconnectPath: '/integrations/outlook/disconnect',
    description: 'Connectez Microsoft 365 pour un suivi client multi-canal.',
  },
}
const DEFAULT_INTEGRATIONS = Object.keys(INTEGRATION_META).map((provider) => ({
  provider,
  status: 'configuration_required',
  metadata: {},
  last_sync_at: null,
}))

function getIntegrationLabel(status = '') {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'connected') return { text: 'Connecté', classes: 'bg-emerald-100 text-emerald-700' }
  if (normalized === 'configured') return { text: 'Configuré', classes: 'bg-blue-100 text-blue-700' }
  if (normalized === 'authorization_received') return { text: 'Autorisation reçue', classes: 'bg-amber-100 text-amber-700' }
  if (normalized === 'pending_oauth') return { text: 'Connexion en attente', classes: 'bg-amber-100 text-amber-700' }
  if (normalized === 'configuration_required') return { text: 'Configuration requise', classes: 'bg-rose-100 text-rose-700' }
  if (normalized === 'oauth_denied') return { text: 'Connexion refusée', classes: 'bg-rose-100 text-rose-700' }
  return { text: 'Non connecté', classes: 'bg-gray-100 text-gray-700' }
}

const Toggle = ({ label, description, enabled, setEnabled, icon: Icon }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-start gap-4">
      <Icon className="text-gray-400 mt-0.5" size={20} />
      <div>
        <p className="font-medium text-sm text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] ${enabled ? 'bg-[#2563eb]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block w-5 h-5 transform bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
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
  const [notifications, setNotifications] = useState({ echeances: true, taches: true, morning_brief: true, news: false })
  const [integrations, setIntegrations] = useState(() => (INTEGRATIONS_API_ENABLED ? [] : DEFAULT_INTEGRATIONS))
  const [integrationsLoading, setIntegrationsLoading] = useState(false)
  const [integrationAction, setIntegrationAction] = useState('')
  const [whatsappConfig, setWhatsappConfig] = useState({ phone_number_id: '', business_account_id: '' })

  useEffect(() => {
    fetchProfile()
    if (INTEGRATIONS_API_ENABLED) fetchIntegrations()
  }, [])

  async function fetchProfile(options = {}) {
    const { force = false, silent = false } = options
    try {
      if (!silent) setLoading(true)
      const data = await getSessionUser({ force, allowStaleOn429: true })
      if (!data) throw new Error('session_unavailable')

      primeSessionUserCache(data)
      setProfile(data)
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '', cabinet: data.cabinet || '', orias: data.orias || '', telephone: data.telephone || '' })
    } catch {
      toast.error('Impossible de charger le profil')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/auth/me', form)
      const optimisticProfile = { ...(profile || {}), ...form }
      setProfile(optimisticProfile)
      primeSessionUserCache(optimisticProfile)
      toast.success('Profil mis à jour ✓')
      fetchProfile({ force: true, silent: true })
    } catch { toast.error('Erreur lors de la sauvegarde') } 
    finally { setSaving(false) }
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    toast('Fonctionnalité bientôt disponible.', { icon: '🚧' })
  }

  async function fetchIntegrations({ silent = false } = {}) {
    if (!INTEGRATIONS_API_ENABLED) {
      setIntegrations(DEFAULT_INTEGRATIONS)
      return
    }
    try {
      if (!silent) setIntegrationsLoading(true)
      const res = await api.get('/integrations/status')
      const list = Array.isArray(res?.data?.integrations) ? res.data.integrations : []
      setIntegrations(list)
      const wa = list.find((i) => i.provider === 'whatsapp_business')
      setWhatsappConfig({
        phone_number_id: wa?.metadata?.phone_number_id || '',
        business_account_id: wa?.metadata?.business_account_id || '',
      })
    } catch {
      if (!silent) toast.error('Impossible de charger les intégrations')
    } finally {
      if (!silent) setIntegrationsLoading(false)
    }
  }

  async function handleIntegrationAction(provider, action) {
    if (!INTEGRATIONS_API_ENABLED) {
      toast('API intégrations en cours de déploiement. Configurez VITE_INTEGRATIONS_API_ENABLED=true quand le backend est prêt.', { icon: 'ℹ️' })
      return
    }
    const meta = INTEGRATION_META[provider]
    if (!meta) return

    const actionKey = `${provider}:${action}`
    setIntegrationAction(actionKey)
    try {
      if (provider === 'whatsapp_business' && action === 'connect') {
        await api.post(meta.connectPath, {
          phone_number_id: whatsappConfig.phone_number_id || undefined,
          business_account_id: whatsappConfig.business_account_id || undefined,
        })
        toast.success('Configuration WhatsApp enregistrée')
        await fetchIntegrations({ silent: true })
        return
      }

      if (action === 'connect') {
        const res = await api.post(meta.connectPath)
        const authUrl = res?.data?.authUrl
        if (authUrl) {
          window.location.href = authUrl
          return
        }
        toast.success('Connexion initialisée')
      } else if (action === 'sync' && meta.syncPath) {
        const res = await api.post(meta.syncPath)
        if (typeof res?.data?.synced === 'number') {
          toast.success(`Synchronisation terminée (${res.data.synced})`)
        } else {
          toast.success('Synchronisation terminée')
        }
      } else if (action === 'disconnect' && meta.disconnectPath) {
        await api.post(meta.disconnectPath)
        toast.success('Intégration déconnectée')
      }

      await fetchIntegrations({ silent: true })
    } catch (err) {
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Action impossible'
      toast.error(String(msg))
    } finally {
      setIntegrationAction('')
    }
  }

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const inputClass = "w-full px-3 py-2 bg-white/85 border border-gray-200 rounded-lg text-sm text-black shadow-sm focus:border-[#2563eb] focus:shadow-md focus:shadow-blue-100 outline-none transition-all duration-200"
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

  const planConfig = {
    pro: { label: 'Le Cabinet', classes: 'bg-blue-100 text-blue-700', price: 159, features: ["Jusqu'à 500 clients", 'Assistant IA - ARK', 'Rapports avancés'] },
    starter: { label: "L'Essentiel", classes: 'bg-emerald-100 text-emerald-700', price: 89, features: ["Jusqu'à 200 clients", 'Scores & Segments', 'Module Tâches'] },
    elite: { label: 'Le Réseau', classes: 'bg-violet-100 text-violet-700', price: 350, features: ['Clients illimités', 'API & Intégrations', 'Support prioritaire'] },
    founder: { label: 'Founder', classes: 'bg-amber-100 text-amber-700', price: null, features: ['Accès anticipé', 'Toutes les fonctionnalités', 'Contact direct équipe'], noSubscriptionText: 'Offre en cours de configuration' }
  }
  const tier = (profile?.pricing_tier || '').toLowerCase()
  const currentPlan = planConfig[tier] || {
    label: profile?.pricing_tier || 'Aucun abonnement actif',
    classes: 'bg-gray-100 text-gray-700',
    price: null,
    features: [],
    noSubscriptionText: 'Aucun abonnement actif'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <AuroraPageHeader
            title="Paramètres"
            subtitle="Profil, sécurité, notifications et abonnement."
            badge="Configuration"
            dark
          />
          <div className="flex justify-center items-center py-24">
            <CourtiaLogoLoader fullScreen={false} message="Chargement des paramètres…" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent font-sans">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <AuroraPageHeader
          title="Paramètres"
          subtitle="Gérez votre profil, vos préférences et votre abonnement."
          badge="Espace cabinet"
          dark
        />
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Importer un portefeuille
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          <aside className="md:w-1/4">
            <nav className="space-y-1 sticky top-8">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeSection === item.id ? 'bg-white text-[#2563eb] shadow-sm border border-gray-200' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          
          <div className="flex-1 space-y-12">
            <section id="profil" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-white mb-1">Profil</h2>
              <p className="text-sm text-white/50 mb-5">Informations publiques et coordonnées.</p>
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
              <h2 className="text-xl font-bold text-white mb-1">Sécurité</h2>
              <p className="text-sm text-white/50 mb-5">Changez votre mot de passe.</p>
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

            <section id="abonnement" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-white mb-1">Abonnement</h2>
              <p className="text-sm text-white/50 mb-5">Gérez votre abonnement et consultez vos factures.</p>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-800">Votre plan actuel</p>
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${currentPlan.classes}`}>{currentPlan.label}</span>
                        </div>
                        {typeof currentPlan.price === 'number'
                          ? <p className="mt-2 text-3xl font-black text-gray-900">{currentPlan.price}€<span className="text-base font-medium text-gray-400">/mois</span></p>
                          : <p className="mt-2 text-lg font-semibold text-gray-600">{currentPlan.noSubscriptionText || 'Aucun abonnement actif'}</p>}
                        <ul className="mt-4 space-y-2 text-sm text-gray-600">
                            {currentPlan.features.map(f => (<li key={f} className="flex items-center gap-2"><Check size={16} className="text-emerald-500" /><span>{f}</span></li>))}
                        </ul>
                    </div>
                    <button onClick={() => navigate('/abonnement')} className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-blue-500/30">Upgrader mon plan</button>
                </div>
              </div>
            </section>

            <section id="notifications" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-white mb-1">Notifications</h2>
              <p className="text-sm text-white/50 mb-5">Choisissez comment nous pouvons vous contacter.</p>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-1 divide-y divide-gray-100">
                <Toggle icon={AlertTriangle} label="Alertes échéances contrats" description="Ne manquez jamais une date importante pour vos clients." enabled={notifications.echeances} setEnabled={() => { setNotifications({...notifications, echeances: !notifications.echeances}); toast.info('Préférence sauvegardée.') }}/>
                <Toggle icon={ListTodo} label="Rappels de tâches" description="Soyez notifié lorsque des tâches arrivent à échéance." enabled={notifications.taches} setEnabled={() => { setNotifications({...notifications, taches: !notifications.taches}); toast.info('Préférence sauvegardée.') }}/>
                <Toggle icon={Sunrise} label="Morning Brief quotidien" description="Recevez un résumé de votre journée chaque matin." enabled={notifications.morning_brief} setEnabled={() => { setNotifications({...notifications, morning_brief: !notifications.morning_brief}); toast.info('Préférence sauvegardée.') }}/>
                <Toggle icon={Sparkles} label="Nouveautés produit" description="Annonces des nouvelles fonctionnalités de COURTIA." enabled={notifications.news} setEnabled={() => { setNotifications({...notifications, news: !notifications.news}); toast.info('Préférence sauvegardée.') }}/>
              </div>
            </section>

            <section id="integrations" className="scroll-mt-8">
              <h2 className="text-xl font-bold text-white mb-1">Intégrations</h2>
              <p className="text-sm text-white/50 mb-5">Connectez agenda, WhatsApp et email pour alimenter ARK sans bricolage.</p>

              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-white/60">Tokens stockés côté backend uniquement. Consentement requis pour chaque connexion.</p>
                <button
                  type="button"
                  onClick={() => fetchIntegrations()}
                  disabled={integrationsLoading || !INTEGRATIONS_API_ENABLED}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw size={12} className={integrationsLoading ? 'animate-spin' : ''} />
                  Actualiser
                </button>
              </div>
              {!INTEGRATIONS_API_ENABLED && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Intégrations prêtes côté interface. Activez `VITE_INTEGRATIONS_API_ENABLED=true` quand l’API backend d’intégrations est déployée.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(INTEGRATION_META).map(([provider, meta]) => {
                  const row = integrations.find((item) => item.provider === provider) || { status: 'disconnected', metadata: {} }
                  const statusBadge = getIntegrationLabel(row.status)
                  const busy = integrationAction.startsWith(`${provider}:`)
                  const Icon = meta.icon
                  const canSync = Boolean(meta.syncPath) && (row.status === 'connected' || row.status === 'authorization_received' || row.status === 'configured')

                  return (
                    <div key={provider} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700">
                            <Icon size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{meta.title}</h3>
                            <p className="text-xs text-gray-500">{meta.description}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusBadge.classes}`}>
                          {statusBadge.text}
                        </span>
                      </div>

                      {provider === 'whatsapp_business' && (
                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="text-xs font-medium text-gray-600">
                            Phone Number ID
                            <input
                              value={whatsappConfig.phone_number_id}
                              onChange={(e) => setWhatsappConfig((prev) => ({ ...prev, phone_number_id: e.target.value }))}
                              placeholder="Meta phone number id"
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800"
                            />
                          </label>
                          <label className="text-xs font-medium text-gray-600">
                            Business Account ID
                            <input
                              value={whatsappConfig.business_account_id}
                              onChange={(e) => setWhatsappConfig((prev) => ({ ...prev, business_account_id: e.target.value }))}
                              placeholder="Meta business account id"
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800"
                            />
                          </label>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleIntegrationAction(provider, 'connect')}
                          disabled={busy || !INTEGRATIONS_API_ENABLED}
                          className="rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {provider === 'whatsapp_business' ? 'Configurer' : 'Connecter'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIntegrationAction(provider, 'sync')}
                          disabled={busy || !canSync || !INTEGRATIONS_API_ENABLED}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Synchroniser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIntegrationAction(provider, 'disconnect')}
                          disabled={busy || !INTEGRATIONS_API_ENABLED}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Déconnecter
                        </button>
                      </div>

                      <p className="mt-2 text-[11px] text-gray-500">
                        Dernière synchro: {row.last_sync_at ? new Date(row.last_sync_at).toLocaleString('fr-FR') : 'jamais'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
