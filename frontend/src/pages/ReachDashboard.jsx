import { useState, useEffect } from 'react'
import api from '../api'
import { localeCourante } from '../lib/monnaie'
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme'

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

  const statutSequence = (status) => (
    status === 'running' ? pastille(TEINTE.vert)
      : status === 'paused' ? pastille(TEINTE.ambre)
        : pastille(TEINTE.neutre)
  )

  if (loading) return <div className="p-8" style={REACH.libelle}>Chargement...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ color: 'var(--text-primary)' }}>
      <h1 className="text-2xl font-bold mb-6" style={REACH.titre}>ARK REACH — Prospection</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Prospects', value: stats.total_prospects, teinte: TEINTE.cyan },
          { label: 'Audiences', value: stats.total_audiences, teinte: TEINTE.vert },
          { label: 'Campagnes', value: stats.total_campaigns, teinte: TEINTE.violet },
          { label: 'Messages', value: stats.total_messages, teinte: TEINTE.ambre },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ ...REACH.carte, borderRadius: RAYON.md }}>
            <p className="text-xs" style={REACH.libelle}>{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.teinte }}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* Create Audience */}
      <div className="rounded-xl p-6 mb-8" style={{ ...REACH.carte, borderRadius: RAYON.md }}>
        <h2 className="text-lg font-bold mb-4" style={REACH.titre}>Nouvelle audience</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newAudienceName}
            onChange={e => setNewAudienceName(e.target.value)}
            placeholder="Nom de l'audience (ex : garages de votre zone)"
            className="flex-1 px-4 py-2 text-sm outline-none"
            style={{ ...REACH.champ, borderRadius: RAYON.md }}
          />
          <button
            onClick={createAudience}
            className="px-6 py-2 font-semibold text-sm transition"
            style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
          >
            Créer
          </button>
        </div>
      </div>

      {/* Audiences */}
      <div className="rounded-xl p-6 mb-8" style={{ ...REACH.carte, borderRadius: RAYON.md }}>
        <h2 className="text-lg font-bold mb-4" style={REACH.titre}>Audiences ({audiences.length})</h2>
        {audiences.length === 0 ? (
          <p className="text-sm" style={REACH.discret}>Aucune audience. Créez-en une ci-dessus.</p>
        ) : (
          <div className="space-y-3">
            {audiences.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3" style={{ ...REACH.carteElevee, borderRadius: RAYON.md }}>
                <div>
                  <p className="font-semibold text-sm" style={REACH.titre}>{a.name}</p>
                  <p className="text-xs" style={REACH.discret}>Créée le {new Date(a.created_at).toLocaleDateString(localeCourante())}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prospects */}
      <div className="rounded-xl p-6 mb-8" style={{ ...REACH.carte, borderRadius: RAYON.md }}>
        <h2 className="text-lg font-bold mb-4" style={REACH.titre}>Prospects ({prospects.length})</h2>
        {prospects.length === 0 ? (
          <p className="text-sm" style={REACH.discret}>Aucun prospect. Importez un CSV.</p>
        ) : (
          <div className="space-y-2">
            {prospects.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3" style={{ ...REACH.carteElevee, borderRadius: RAYON.md }}>
                <div>
                  <p className="font-semibold text-sm" style={REACH.titre}>{p.contact_first_name} {p.contact_last_name}</p>
                  <p className="text-xs" style={REACH.discret}>{p.email} · {p.city || 'Ville inconnue'}</p>
                </div>
                <span className="text-xs px-2 py-1" style={{ ...pastille(TEINTE.neutre), borderRadius: RAYON.full }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sequences */}
      <div className="rounded-xl p-6" style={{ ...REACH.carte, borderRadius: RAYON.md }}>
        <h2 className="text-lg font-bold mb-4" style={REACH.titre}>Séquences ({sequences.length})</h2>
        {sequences.length === 0 ? (
          <p className="text-sm" style={REACH.discret}>Aucune séquence.</p>
        ) : (
          <div className="space-y-2">
            {sequences.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3" style={{ ...REACH.carteElevee, borderRadius: RAYON.md }}>
                <div>
                  <p className="font-semibold text-sm" style={REACH.titre}>{s.name}</p>
                  <p className="text-xs" style={REACH.discret}>{s.channel} · {s.template?.substring(0, 50)}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1" style={{ ...statutSequence(s.status), borderRadius: RAYON.full }}>{s.status}</span>
                  {s.status === 'draft' && (
                    <button
                      onClick={() => startSequence(s.id)}
                      className="text-xs px-3 py-1 transition"
                      style={{ ...pastille(TEINTE.cyan), borderRadius: RAYON.md }}
                    >
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
