import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let success
      if (isLogin) {
        success = await login(email, password)
      } else {
        success = await register(email, password, firstName, lastName)
      }

      if (success) {
        onAuthSuccess()
      } else {
        setError('Authentification échouée. Vérifiez vos identifiants.')
      }
    } catch (err) {
      setError('Erreur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-dark-2 to-dark flex items-center justify-center p-4">
      <div className="glass p-12 rounded-xl w-full max-w-md">
        <h1 className="text-gradient text-4xl font-black mb-2 text-center">COURTIA</h1>
        <p className="text-center text-slate-400 mb-8">CRM d'assurance avec IA native</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-bold mb-2">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field w-full"
                  required={!isLogin}
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field w-full"
                  required={!isLogin}
                  placeholder="Votre nom"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              required
              placeholder="vous@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              required
              placeholder="••••••••"
            />
          </div>

          {error && <div className="bg-red-500/20 border border-red-500 p-3 rounded text-red-300 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full font-bold py-3"
          >
            {loading ? 'Chargement...' : isLogin ? 'Connexion' : 'Créer compte'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setEmail('')
              setPassword('')
              setFirstName('')
              setLastName('')
            }}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
