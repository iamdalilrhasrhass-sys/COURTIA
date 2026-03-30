import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Bon matin! 🌅", subtext: "Prêt à démarrer votre journée?" }
  if (hour < 18) return { text: "Bon après-midi! ☀️", subtext: "Continuons le travail!" }
  return { text: "Bonsoir! 🌙", subtext: "Une dernière revue avant de vous reposer?" }
}

export default function AuthPremium() {
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('dalil@test.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const greeting = getGreeting()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      console.error('Login failed:', err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-6xl font-black text-gradient mb-4">COURTIA</h1>
          <p className="text-2xl font-bold text-cyan mb-2">{greeting.text}</p>
          <p className="text-slate-400">{greeting.subtext}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="glass p-8 rounded-2xl backdrop-blur-xl border border-cyan/20 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-2 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none transition"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-2 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 mt-6"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Demo: dalil@test.com / password123
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Plateforme CRM pour courtiers en assurance
        </p>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </div>
  )
}
