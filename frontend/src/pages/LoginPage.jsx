import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
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
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {loading ? '🔄 Signing in...' : '🔓 Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs font-semibold text-blue-300 mb-2">🧪 Demo Credentials</p>
          <p className="text-xs text-blue-200">Email: dalil@test.com</p>
          <p className="text-xs text-blue-200">Password: password123</p>
        </div>
      </div>
    </div>
  )
}
