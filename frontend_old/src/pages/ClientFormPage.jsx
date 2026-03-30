import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClientStore } from '../stores/clientStore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardBody } from '../components/Card'

export default function ClientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentClient, loading, createClient, updateClient, fetchClient } = useClientStore()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
    riskScore: 50,
    loyaltyScore: 50,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchClient(id)
    }
  }, [id])

  useEffect(() => {
    if (currentClient) {
      setFormData({
        firstName: currentClient.first_name || '',
        lastName: currentClient.last_name || '',
        email: currentClient.email || '',
        phone: currentClient.phone || '',
        company: currentClient.company || '',
        status: currentClient.status || 'active',
        riskScore: currentClient.risk_score || 50,
        loyaltyScore: currentClient.loyalty_score || 50,
      })
    }
  }, [currentClient])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.firstName) newErrors.firstName = 'First name required'
    if (!formData.lastName) newErrors.lastName = 'Last name required'
    if (!formData.email) newErrors.email = 'Email required'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      if (id) {
        await updateClient(id, formData)
      } else {
        await createClient(formData)
      }
      navigate('/clients')
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {id ? '✏️ Edit Client' : '➕ New Client'}
      </h1>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                disabled={submitting}
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                disabled={submitting}
              />
            </div>

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              disabled={submitting}
            />

            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={submitting}
            />

            <Input
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              disabled={submitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Score</label>
                <input
                  type="range"
                  name="riskScore"
                  min="0"
                  max="100"
                  value={formData.riskScore}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">{formData.riskScore}/100</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Score</label>
              <input
                type="range"
                name="loyaltyScore"
                min="0"
                max="100"
                value={formData.loyaltyScore}
                onChange={handleChange}
                disabled={submitting}
                className="w-full"
              />
              <p className="text-xs text-gray-600 mt-1">{formData.loyaltyScore}/100</p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/clients')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
              >
                {submitting ? '💾 Saving...' : '💾 Save'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
