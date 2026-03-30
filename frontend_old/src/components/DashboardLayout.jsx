import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname.includes(path)

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/60 border-r border-slate-700/50 backdrop-blur-sm flex flex-col">
        {/* Logo */}
        <div className="h-20 border-b border-slate-700/50 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500">
              <span className="text-xl">🚗</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">CRM</h1>
              <p className="text-xs text-slate-400">Assurance</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/clients"
            className={`
              block w-full text-left px-4 py-3 rounded-lg transition-all duration-200
              ${isActive('clients') 
                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10' 
                : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'}
            `}
          >
            <span className="text-lg mr-3">📋</span>
            <span className="font-medium">Clients</span>
          </Link>

          <Link
            to="/"
            className={`
              block w-full text-left px-4 py-3 rounded-lg transition-all duration-200
              ${isActive('/') && !isActive('clients')
                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10' 
                : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'}
            `}
          >
            <span className="text-lg mr-3">📊</span>
            <span className="font-medium">Dashboard</span>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-700/50 p-4">
          <div className="p-3 rounded-lg bg-slate-700/30 mb-3">
            <p className="text-sm font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="
              w-full px-4 py-2.5 rounded-lg text-sm font-medium
              bg-red-600/20 border border-red-500/50 text-red-300
              hover:bg-red-600/30 hover:border-red-500/80
              transition-all duration-200
            "
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-slate-800/40 border-b border-slate-700/50 backdrop-blur-sm flex items-center justify-between px-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back, {user?.firstName}! 👋</h2>
            <p className="text-sm text-slate-400 mt-1">Manage your insurance portfolio</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
