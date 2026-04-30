import { useState, useEffect } from 'react'
import api from '../api'

export default function ReachDashboard() {
  const [audiences, setAudiences] = useState([])
  const [prospects, setProspects] = useState([])
  const [sequences, setSequences] = useState([])
  const [stats, setStats] = useState({})
  const [newAudienceName, setNewAudienceName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [aud, pro, seq, st] = await Promise.all([
        api.get('/reach/audiences'),
        api.get('/reach/prospects?limit=50'),
        api.get('/reach/campaigns'),
        api.get('/reach/dashboard')
      ])
      setAudiences(aud.data?.data || aud.data || [])
      setProspects(pro.data?.data || pro.data || [])
      setSequences(seq.data?.data || seq.data || [])
      setStats(st.data?.data || st.data || {})
    } catch (e) { console.error('Reach load error:', e) }
    setLoading(false)
  }

  const createAudience = async () => {
    if (!newAudienceName.trim()) return
    try {
      await api.post('/reach/audiences', { name: newAudienceName })
      setNewAudienceName('')
      loadData()
    } catch (e) { console.error('Create audience error:', e) }
  }

  const startSequence = async (id) => {
    try {
      await api.patch(`/reach/campaigns/${id}/status`, { status: 'running' })
      loadData()
    } catch (e) { console.error('Start sequence error:', e) }
  }

  if (loading) return <div className="p-8 text-gray-500">Chargement...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ARK REACH — Prospection</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Prospects', value: stats.total_prospects, color: 'text-blue-600' },
          { label: 'Audiences', value: stats.total_audiences, color: 'text-green-600' },
          { label: 'Campagnes', value: stats.total_campaigns, color: 'text-purple-600' },
          { label: 'Messages', value: stats.total_messages, color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* Create Audience */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-4">Nouvelle audience</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newAudienceName}
            onChange={e => setNewAudienceName(e.target.value)}
            placeholder="Nom de l'audience (ex: Courtiers ORIAS Paris)"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={createAudience} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700">
            Créer
          </button>
        </div>
      </div>

      {/* Audiences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-4">Audiences ({audiences.length})</h2>
        {audiences.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune audience. Créez-en une ci-dessus.</p>
        ) : (
          <div className="space-y-3">
            {audiences.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-xs text-gray-400">Créée le {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prospects */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-4">Prospects ({prospects.length})</h2>
        {prospects.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun prospect. Importez un CSV.</p>
        ) : (
          <div className="space-y-2">
            {prospects.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{p.contact_first_name} {p.contact_last_name}</p>
                  <p className="text-xs text-gray-400">{p.email} · {p.city || 'Ville inconnue'}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sequences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4">Séquences ({sequences.length})</h2>
        {sequences.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune séquence.</p>
        ) : (
          <div className="space-y-2">
            {sequences.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.channel} · {s.template?.substring(0, 50)}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'running' ? 'bg-green-100 text-green-700' :
                    s.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>{s.status}</span>
                  {s.status === 'draft' && (
                    <button onClick={() => startSequence(s.id)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Démarrer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
