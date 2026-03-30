import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClientStore } from '../stores/clientStore'
import { Button } from '../components/Button'
import { Card, CardBody, CardHeader } from '../components/Card'
import { Input } from '../components/Input'

export default function ClientsPage() {
  const navigate = useNavigate()
  const { clients, loading, error, fetchClients } = useClientStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">👥 Clients</h1>
          <p className="text-slate-400 mt-1">Manage your client portfolio</p>
        </div>
        <Link to="/clients/new">
          <Button variant="primary" size="lg">
            ➕ New Client
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search clients by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon="🔍"
        />
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody>
            <p className="text-6xl mb-4">📭</p>
            <p className="text-slate-400 mb-4 text-lg">No clients yet</p>
            <Link to="/clients/new">
              <Button variant="primary">Create your first client</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              hoverable 
              className="transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardBody className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {client.first_name} {client.last_name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">📧 {client.email}</p>
                    {client.phone && (
                      <p className="text-slate-400 text-sm">📱 {client.phone}</p>
                    )}
                    {client.company && (
                      <p className="text-slate-400 text-sm">🏢 {client.company}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${client.status === 'active' 
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300' 
                        : 'bg-slate-600/20 border border-slate-500/50 text-slate-300'}
                    `}>
                      {client.status === 'active' ? '✓ Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/clients/${client.id}`)
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/clients/${client.id}/edit`)
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Scores */}
                <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full"
                        style={{width: `${client.risk_score}%`}}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{client.risk_score}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Loyalty Score</p>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{width: `${client.loyalty_score}%`}}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{client.loyalty_score}/100</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
