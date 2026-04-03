import { User, Mail, Building2, LogOut, Edit2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Profile() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  if (!user) {
    return (
      <div className="ml-64 p-8">
        <p className="text-slate-500">Chargement du profil...</p>
      </div>
    )
  }

  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Mon Profil</h2>

      {/* Profile Card */}
      <div className="glass p-8 rounded-lg max-w-2xl mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
            <User size={48} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gradient">{user.email}</h1>
            <p className="text-slate-400">Courtier en Assurance</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-dark-3 rounded-lg">
            <Mail size={20} className="text-cyan" />
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="font-bold">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dark-3 rounded-lg">
            <Building2 size={20} className="text-cyan" />
            <div>
              <p className="text-sm text-slate-400">Cabinet</p>
              <p className="font-bold">COURTIA Assurances</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-3 p-4 rounded-lg text-center">
            <p className="text-2xl font-black text-cyan">27</p>
            <p className="text-xs text-slate-500 mt-1">Clients actifs</p>
          </div>
          <div className="bg-dark-3 p-4 rounded-lg text-center">
            <p className="text-2xl font-black text-cyan">18</p>
            <p className="text-xs text-slate-500 mt-1">Contrats</p>
          </div>
          <div className="bg-dark-3 p-4 rounded-lg text-center">
            <p className="text-2xl font-black text-cyan">78%</p>
            <p className="text-xs text-slate-500 mt-1">Conversion</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex items-center gap-2 flex-1">
            <Edit2 size={18} />
            Modifier le profil
          </button>
          <button onClick={logout} className="btn-secondary flex items-center gap-2 flex-1">
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass p-6 rounded-lg max-w-2xl">
        <h3 className="text-xl font-bold text-cyan mb-4">Préférences</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-dark-3 rounded-lg cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span>Notifications par email</span>
          </label>
          <label className="flex items-center gap-3 p-3 bg-dark-3 rounded-lg cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span>Alertes contrats expirant</span>
          </label>
          <label className="flex items-center gap-3 p-3 bg-dark-3 rounded-lg cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span>Rapports mensuels</span>
          </label>
        </div>
      </div>
    </div>
  )
}
