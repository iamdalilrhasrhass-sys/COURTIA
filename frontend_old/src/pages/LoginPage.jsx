import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardBody } from '../components/Card'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [localError, setLocalError] = useState('')

  const validateForm = () => {
    const errors = {}
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    return errors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
    setLocalError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      await login(formData.email, formData.password)
      navigate('/')
    } catch (err) {
      setLocalError(err.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
            <span className="text-4xl">🚗</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CRM Assurance</h1>
          <p className="text-slate-400 text-lg">Insurance management, reimagined</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl shadow-blue-500/20">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {(localError || error) && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 backdrop-blur-sm">
                  <p className="text-sm text-red-400 font-medium">⚠️ {localError || error}</p>
                </div>
              )}

              {/* Email Field */}
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
                placeholder="you@company.com"
                disabled={loading}
                icon="📧"
              />

              {/* Password Field */}
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                placeholder="••••••••"
                disabled={loading}
                icon="🔐"
              />

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-slate-700 border border-slate-600 accent-blue-500"
                  />
                  <span className="ml-2 text-slate-400">Remember me</span>
                </label>
                <Link to="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? '⏳ Signing in...' : '🔓 Sign In'}
              </Button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800/60 text-slate-400">New here?</span>
                </div>
              </div>

              {/* Register Link */}
              <Link to="/register">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  ✨ Create Account
                </Button>
              </Link>
            </form>
          </CardBody>
        </Card>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm">
          <p className="text-xs font-semibold text-blue-300 mb-2">🧪 Demo Credentials</p>
          <p className="text-xs text-blue-200">Email: <code className="bg-slate-900/50 px-2 py-1 rounded">dalil@test.com</code></p>
          <p className="text-xs text-blue-200">Password: <code className="bg-slate-900/50 px-2 py-1 rounded">password123</code></p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          By signing in, you agree to our <Link to="#" className="text-slate-400 hover:text-slate-300">Terms</Link> and <Link to="#" className="text-slate-400 hover:text-slate-300">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
