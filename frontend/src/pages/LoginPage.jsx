import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('demo@courtia.fr')
  const [password, setPassword] = useState('Demo2026!')
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/dashboard')
      toast.success('Connecté avec succès')
    } catch (err) {
      setErr(err.message || 'Erreur de connexion')
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
            COURTIA
          </h1>
          <p className="text-slate-400 text-base">Le CRM intelligent pour courtiers d'assurance</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/60 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {(err || error) && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                <p className="text-sm text-red-400">⚠️ {err || error}</p>
              </div>
            )}

            {/* Email input */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@courtia.fr"
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Password input */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Connexion en cours...' : '🔓 Se connecter'}
            </button>
          </form>
        </div>

        {/* Demo credentials info */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs font-semibold text-blue-300 mb-3">🧪 Compte démo</p>
          <div className="space-y-2 text-xs text-blue-200">
            <p className="font-mono">Email: <span className="text-blue-100">demo@courtia.fr</span></p>
            <p className="font-mono">Mot de passe: <span className="text-blue-100">Demo2026!</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
