import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import api from '../api'

const CourtiaLogo = () => (
    <svg width="160" height="40" viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="30" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="bold" fill="white">
            COURTIA
        </text>
    </svg>
)

const Feature = ({ text }) => (
    <div className="flex items-start gap-3">
        <CheckCircle className="text-[#2563eb] mt-1 flex-shrink-0" size={20} />
        <span className="text-gray-300">{text}</span>
    </div>
)

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        if (!email || !password) {
            setError('Veuillez renseigner votre email et votre mot de passe.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/api/auth/login', { email, password })
            const { token, user } = res.data
            localStorage.setItem('courtia_token', token)
            if (user) localStorage.setItem('courtia_user', JSON.stringify(user))
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue. Vérifiez vos identifiants.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex font-sans bg-gray-100">
            {/* Left Panel */}
            <div className="w-1/2 flex-col justify-between bg-[#080808] text-white p-12 hidden md:flex">
                <div className="flex-shrink-0">
                    <CourtiaLogo />
                    <p className="mt-6 text-2xl font-medium leading-snug max-w-md">
                        Le CRM intelligent qui anticipe les besoins de vos clients.
                    </p>
                </div>
                <div className="space-y-4 flex-shrink-0">
                    <Feature text="Scores de risque et d'opportunité en temps réel" />
                    <Feature text="Alertes proactives pour ne manquer aucune échéance" />
                    <Feature text="Vision 360° du portefeuille pour des ventes croisées efficaces" />
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-sm">
                    <div className="text-center md:text-left mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Connexion</h1>
                        <p className="mt-2 text-gray-500">
                            Heureux de vous revoir !
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-sm text-red-600 rounded-lg p-3 mb-4 flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Adresse email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all duration-200"
                                    placeholder="vous@exemple.com"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-gray-700 mb-1.5"
                                >
                                    Mot de passe
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all duration-200"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Connexion en cours...' : 'Se connecter'}
                            </button>
                        </div>
                    </form>

                    <footer className="text-center mt-12">
                        <p className="text-xs text-gray-400">COURTIA®</p>
                    </footer>
                </div>
            </div>
        </div>
    )
}
