import { Search, X, Filter } from 'lucide-react'
import { useState } from 'react'
import { useClientStore } from '../stores/clientStore'

export default function SearchBar({ clients = [], prospects = [], onNavigate }) {
  const setSelectedClient = useClientStore((state) => state.setSelectedClient)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    riskScore: 'all',
    lastContactDays: 'all'
  })

  const handleSearch = (value) => {
    setQuery(value)
    if (value.length < 1) {
      setResults([])
      return
    }

    const searchTerm = value.toLowerCase()
    
    // Search clients
    let clientResults = clients
      .filter(c => 
        (`${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm) ||
        c.phone?.toLowerCase().includes(searchTerm))
      )
      .slice(0, 5)
      .map(c => ({
        type: 'client',
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        subtitle: c.email || c.phone,
        status: c.status,
        riskScore: c.risk_score
      }))

    // Search prospects
    const prospectResults = prospects
      .filter(p => p.name.toLowerCase().includes(searchTerm))
      .slice(0, 5)
      .map(p => ({
        type: 'prospect',
        id: p.id,
        name: p.name,
        subtitle: p.value
      }))

    // Apply filters
    if (filters.type !== 'all') {
      clientResults = clientResults.filter(r => {
        if (filters.type === 'client') return r.type === 'client'
        if (filters.type === 'prospect') return r.type === 'prospect'
        return true
      })
    }

    if (filters.status !== 'all') {
      clientResults = clientResults.filter(r => r.status === filters.status)
    }

    if (filters.riskScore !== 'all') {
      clientResults = clientResults.filter(r => {
        if (filters.riskScore === 'high') return r.riskScore >= 70
        if (filters.riskScore === 'medium') return r.riskScore >= 40 && r.riskScore < 70
        if (filters.riskScore === 'low') return r.riskScore < 40
        return true
      })
    }

    setResults([...clientResults, ...prospectResults])
    setIsOpen(true)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleSelectResult = (result) => {
    if (result.type === 'client') {
      setSelectedClient(clients.find(c => c.id === result.id))
      onNavigate('clients')
    }
    clearSearch()
  }

  return (
    <div className="relative mb-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="🔍 Chercher clients, contrats, prospects..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query && setIsOpen(true)}
            className="input-field w-full pr-8"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary px-3"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 glass p-4 rounded-lg z-40 mb-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-slate-400 block mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="all">Tous</option>
                <option value="client">Clients</option>
                <option value="prospect">Prospects</option>
              </select>
            </div>
            
            <div>
              <label className="text-slate-400 block mb-2">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="all">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            
            <div>
              <label className="text-slate-400 block mb-2">Score de risque</label>
              <select
                value={filters.riskScore}
                onChange={(e) => setFilters({ ...filters, riskScore: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="all">Tous</option>
                <option value="high">Élevé (70+)</option>
                <option value="medium">Moyen (40-70)</option>
                <option value="low">Faible (&lt;40)</option>
              </select>
            </div>
            
            <div>
              <label className="text-slate-400 block mb-2">Dernier contact</label>
              <select
                value={filters.lastContactDays}
                onChange={(e) => setFilters({ ...filters, lastContactDays: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="all">Tous</option>
                <option value="7">Moins de 7 jours</option>
                <option value="30">Moins de 30 jours</option>
                <option value="60">Plus de 60 jours</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-lg z-40 overflow-hidden max-h-96 overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-3 hover:bg-slate-700/50 border-b border-slate-700 last:border-b-0 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-cyan">{result.name}</p>
                <p className="text-xs text-slate-400">{result.subtitle}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                result.type === 'client' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {result.type === 'client' ? '👤 Client' : '📊 Prospect'}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-lg p-4 text-center text-slate-400 text-sm">
          Aucun résultat pour "{query}"
        </div>
      )}
    </div>
  )
}
