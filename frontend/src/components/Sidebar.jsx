import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, BarChart2,
  Settings, CreditCard, LogOut, Shield, Menu, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from './Logo'

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0)
  const l = (lastName || '').charAt(0)
  return (f + l).toUpperCase() || '?'
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/contrats', label: 'Contrats', icon: FileText },
  { path: '/taches', label: 'Tâches', icon: CheckSquare },
  { separator: true, label: 'MODULES' },
  { path: '/analytics', label: 'Analyses', icon: BarChart2 },
  { path: '/parametres', label: 'Paramètres', icon: Settings },
  { path: '/abonnement', label: 'Abonnement', icon: CreditCard },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Ferme le menu mobile quand on change de page
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const updateUserState = () => {
      try {
        const storedUser = localStorage.getItem('courtia_user')
        if (storedUser) setUser(JSON.parse(storedUser))
      } catch (e) { console.error("Failed to parse user from localStorage", e) }
    }

    updateUserState()

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

  // Normalise l'utilisateur (support camelCase du login + snake_case de /me)
  const userName = user
    ? ((user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '')).trim()
    : 'Chargement...'
  const userFirstName = user ? (user.first_name || user.firstName || '') : ''
  const userLastName = user ? (user.last_name || user.lastName || '') : ''
  const userEmail = user?.email || ''

  const sidebarContent = (
    <aside className="w-[240px] h-full flex flex-col bg-[#080808] border-r border-white/5 font-sans">
      <div className="p-5 border-b border-white/10 h-[65px] flex items-center justify-between">
        <Logo size={36} dark={true} textSize={15} />
        {/* Bouton fermer — visible seulement sur mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 mt-8 px-[12px] space-y-1 overflow-y-auto">
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

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user ? getInitials(userFirstName, userLastName) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[140px]">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
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

  return (
    <>
      {/* === BOUTON HAMBURGER MOBILE === */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2 bg-[#080808] border border-white/10 rounded-lg text-white shadow-lg hover:bg-[#1a1a1a] transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={22} />
      </button>

      {/* === OVERLAY MOBILE === */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* === SIDEBAR DESKTOP (toujours visible) === */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-50">
        {sidebarContent}
      </div>

      {/* === SIDEBAR MOBILE (slide-in) === */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="md:hidden fixed top-0 left-0 h-screen z-[60] shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
