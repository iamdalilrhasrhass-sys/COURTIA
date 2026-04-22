import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, BarChart2,
  Settings, CreditCard, LogOut, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0)
  const l = (lastName || '').charAt(0)
  return (f + l).toUpperCase() || '?'
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-9 h-9 bg-[#2563eb] rounded-lg flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 8px rgba(37,99,235,0.6))' }}>
          <Shield className="text-white" size={20} />
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
          }
          .pulse-dot { animation: pulse 2s infinite; }
        `}</style>
        <span className="pulse-dot absolute top-0 right-0 block h-1.5 w-1.5 rounded-full bg-blue-400 ring-2 ring-[#080808]" />
      </div>
      <span className="text-white text-xl font-black tracking-[-0.03em]">COURTIA</span>
    </div>
  )
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/contrats', label: 'Contrats', icon: FileText },
  { path: '/taches', label: 'Tâches', icon: CheckSquare },
  { separator: true, label: 'MODULES' },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/parametres', label: 'Paramètres', icon: Settings },
  { path: '/abonnement', label: 'Abonnement', icon: CreditCard },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const updateUserState = () => {
      try {
        const storedUser = localStorage.getItem('courtia_user')
        if (storedUser) setUser(JSON.parse(storedUser))
      } catch (e) { console.error("Failed to parse user from localStorage", e) }
    }

    updateUserState() // Chargement initial

    // Met à jour la sidebar si le profil change ailleurs dans l'app
    window.addEventListener('profileUpdated', updateUserState)

    return () => window.removeEventListener('profileUpdated', updateUserState)
  }, [])

  function logout() {
    localStorage.removeItem('courtia_token');
    localStorage.removeItem('token');
    localStorage.removeItem('courtia_user');
    navigate('/login');
    toast.success('Déconnexion réussie');
  }

  return (
    <aside className="w-[240px] h-screen fixed top-0 left-0 flex flex-col bg-[#080808] border-r border-white/5 z-50 font-sans">
      <div className="p-5 border-b border-white/10 h-[65px] flex items-center">
        <Logo />
      </div>

      <nav className="flex-1 mt-8 px-[12px] space-y-1">
        {NAV_ITEMS.map((item, idx) => {
          if (item.separator) {
            return (
              <div key={`sep-${idx}`} className="mt-6 mb-2 px-3">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-600 uppercase">{item.label}</p>
              </div>
            )
          }

          const isActive = item.path === '/dashboard' ? location.pathname === item.path : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-transparent border-l-[3px] border-[#2563eb] pl-[9px] shadow-inner'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 px-3'
                }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user ? getInitials(user.first_name, user.last_name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[140px]">{user ? `${user.first_name} ${user.last_name}` : 'Chargement...'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-500 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
        <p className="text-center text-[9px] text-gray-700 mt-2">Rhasrhass®</p>
      </div>
    </aside>
  )
}
