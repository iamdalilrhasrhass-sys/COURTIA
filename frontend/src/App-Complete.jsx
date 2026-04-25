import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useClientStore } from './stores/clientStore'

// LOGIN PAGE
function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('dalil@test.com')
  const [password, setPassword] = useState('password123')
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setErr(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}} />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg">
            <span className="text-4xl">🚗</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">CRM Assurance</h1>
          <p className="text-slate-400">Insurance management, reimagined</p>
        </div>

        <div className="bg-slate-800/60 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(err || error) && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                <p className="text-sm text-red-400">⚠️ {err || error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {loading ? '🔄 Signing in...' : '🔓 Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs font-semibold text-blue-300 mb-1">🧪 Demo</p>
          <p className="text-xs text-blue-200">dalil@test.com / password123</p>
        </div>
      </div>
    </div>
  )
}

// DASHBOARD
function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { clients, fetchClients, loading } = useClientStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-800/60 border-r border-slate-700/50 backdrop-blur-sm flex flex-col">
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

        <nav className="flex-1 p-4 space-y-2">
          <a href="/" className="block w-full text-left px-4 py-3 rounded-lg bg-blue-600/20 border border-blue-500/50 text-blue-300 font-medium">
            📋 Clients
          </a>
        </nav>

        <div className="border-t border-slate-700/50 p-4">
          <div className="p-3 rounded-lg bg-slate-700/30 mb-3">
            <p className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600/20 border border-red-500/50 text-red-300 hover:bg-red-600/30"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-800/40 border-b border-slate-700/50 flex items-center px-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back, {user?.firstName}! 👋</h2>
            <p className="text-sm text-slate-400 mt-1">Manage your insurance portfolio</p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">👥 Clients</h1>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:shadow-lg">
              ➕ New Client
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-400">Chargement des clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-slate-800/60 rounded-xl p-12 text-center border border-slate-700/50">
              <p className="text-slate-400 mb-4">No clients yet</p>
              <button className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                Create your first client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {clients.map((c) => (
                <div key={c.id} className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{c.first_name} {c.last_name}</h3>
                      <p className="text-slate-400 text-sm mt-1">📧 {c.email}</p>
                      {c.phone && <p className="text-slate-400 text-sm">📱 {c.phone}</p>}
                      {c.company && <p className="text-slate-400 text-sm">🏢 {c.company}</p>}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 border border-green-500/50 text-green-300">
                      ✓ Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// APP
function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
