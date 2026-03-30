import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardBody } from '../components/Card'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error, clearError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [localError, setLocalError] = useState('')

  const validateForm = () => {
    const errors = {}
    
    if (!formData.firstName) errors.firstName = 'First name is required'
    if (!formData.lastName) errors.lastName = 'Last name is required'
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
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
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      )
      navigate('/')
    } catch (err) {
      setLocalError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
            <span className="text-4xl">🚗</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CRM Assurance</h1>
          <p className="text-slate-400">Join thousands of insurance brokers</p>
        </div>

        {/* Register Card */}
        <Card className="shadow-2xl shadow-blue-500/20">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {(localError || error) && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                  <p className="text-sm text-red-400 font-medium">⚠️ {localError || error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={formErrors.firstName}
                  placeholder="Jean"
                  disabled={loading}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={formErrors.lastName}
                  placeholder="Dupont"
                  disabled={loading}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
                placeholder="jean@company.com"
                disabled={loading}
                icon="📧"
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                placeholder="Min. 8 characters"
                disabled={loading}
                icon="🔐"
              />

              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={formErrors.confirmPassword}
                placeholder="••••••••"
                disabled={loading}
                icon="✓"
              />

              <label className="flex items-start text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-slate-700 border border-slate-600 accent-blue-500 mt-0.5"
                />
                <span className="ml-2 text-slate-400">
                  I agree to the <Link to="#" className="text-blue-400 hover:text-blue-300">Terms</Link> and <Link to="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? '⏳ Creating...' : '✨ Create Account'}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800/60 text-slate-400">Already a member?</span>
                </div>
              </div>

              <Link to="/login">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  🔓 Sign In
                </Button>
              </Link>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-8">
          Professional insurance management starts here
        </p>
      </div>
    </div>
  )
}
