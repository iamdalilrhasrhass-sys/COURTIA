import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, BarChart2,
  Settings, CreditCard, LogOut, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlanStore } from '../stores/planStore'

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0)
  const l = (lastName || '').charAt(0)
  return (f + l).toUpperCase() || '?'
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        animate={{ scale: [1, 1.1, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
        className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
        <Shield className="text-white" size={20} />
      </motion.div>
      <span className="text-white text-xl font-black tracking-tighter">COURTIA</span>
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

const PLAN_BADGE = {
  start: { bg: '#1a1a1a', color: '#9ca3af', label: 'Start' },
  pro: { bg: 'rgba(37,99,235,0.2)', color: '#60a5fa', label: 'Pro' },
  elite: { bg: 'rgba(124,58,237,0.2)', color: '#a78bfa', label: 'Elite' },
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPlan = usePlanStore(s => s.currentPlan)
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('courtia_user')
      if (storedUser) setUser(JSON.parse(storedUser))
    } catch (e) {
      console.error("Failed to parse user from localStorage", e)
    }
  }, [])

  function logout() {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('user')
    localStorage.removeItem('courtia_user')
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  const badge = PLAN_BADGE[currentPlan] || PLAN_BADGE.pro

  return (
    <aside className="w-[240px] h-screen fixed top-0 left-0 flex flex-col bg-gradient-to-b from-[#080808] to-[#111111] border-r border-white/10 z-50">
      <div className="p-5 border-b border-white/10">
        <Logo />
        <span style={{ background: badge.bg, color: badge.color }}
          className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/5">
          {badge.label}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item, idx) => {
          if (item.separator) {
            return (
              <div key={`sep-${idx}`} className="pt-4 pb-2 px-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
              </div>
            )
          }

          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              transition={{ duration: 0.2 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium relative transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563eb] rounded-r-full"
                />
              )}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent opacity-50 rounded-md" />
              )}
              <Icon size={18} />
              <span>{item.label}</span>
            </motion.button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
            {user ? getInitials(user.first_name, user.last_name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user ? `${user.first_name} ${user.last_name}` : 'Chargement...'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-4">Rhasrhass®</p>
      </div>
    </aside>
  )
}
