import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClientStore } from '../stores/clientStore'
import { Button } from '../components/Button'
import { Card, CardBody, CardHeader } from '../components/Card'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentClient, loading, error, fetchClient, deleteClient } = useClientStore()

  useEffect(() => {
    fetchClient(id)
  }, [id])

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(id)
        navigate('/clients')
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
  }

  if (loading) return <div className="text-center py-8">🔄 Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!currentClient) return <div>Client not found</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {currentClient.first_name} {currentClient.last_name}
        </h1>
        <div className="space-x-2">
          <Button onClick={() => navigate(`/clients/${id}/edit`)} variant="primary">
            ✏️ Edit
          </Button>
          <Button onClick={handleDelete} variant="danger">
            🗑️ Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-lg text-gray-900">{currentClient.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone</label>
            <p className="text-lg text-gray-900">{currentClient.phone || '—'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Company</label>
            <p className="text-lg text-gray-900">{currentClient.company || '—'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <p className="text-lg text-gray-900 capitalize">{currentClient.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Risk Score</label>
            <p className="text-lg text-gray-900">{currentClient.risk_score}/100</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Loyalty Score</label>
            <p className="text-lg text-gray-900">{currentClient.loyalty_score}/100</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
