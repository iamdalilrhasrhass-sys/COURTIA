import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('token') }

export default function Parametres() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cabinet: '',
    orias: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: ''
  })

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/auth/me`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProfile(data)
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        cabinet: data.cabinet || '',
        orias: data.orias || '',
        telephone: data.telephone || '',
        adresse: data.adresse || '',
        ville: data.ville || '',
        code_postal: data.code_postal || ''
      })
    } catch (err) {
      console.error('Erreur profil:', err)
      toast.error('Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Profil mis à jour ✓')
      fetchProfile()
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const getPlanBadge = (plan) => {
    const badges = {
      'Starter': { bg: '#dbeafe', color: '#1e40af', label: '🔵 Starter' },
      'Pro': { bg: '#fcd34d', color: '#92400e', label: '🟡 Pro' },
      'Premium': { bg: '#d1fae5', color: '#065f46', label: '🟢 Premium' }
    }
    return badges[plan] || badges['Starter']
  }

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280' }}>Chargement du profil...</p>
        </div>
      </div>
    )
  }

  const planBadge = getPlanBadge(profile?.pricing_tier || 'Starter')

  return (
    <div style={{ padding: 32, fontFamily: 'Arial, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0a0a0a', marginBottom: 32 }}>Paramètres</h1>

      {/* Profil */}
      <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 20, marginTop: 0 }}>Mon profil</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Prénom *</label>
              <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Nom *</label>
              <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Email (lecture seule)</label>
            <input type="email" value={formData.email} disabled
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#f3f4f6', color: '#6b7280' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Cabinet</label>
              <input type="text" value={formData.cabinet} onChange={e => setFormData({ ...formData, cabinet: e.target.value })}
                placeholder="Nom du cabinet"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Numéro ORIAS</label>
              <input type="text" value={formData.orias} onChange={e => setFormData({ ...formData, orias: e.target.value })}
                placeholder="ex: 00012345"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Téléphone</label>
              <input type="tel" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="+33 6 00 00 00 00"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Ville</label>
              <input type="text" value={formData.ville} onChange={e => setFormData({ ...formData, ville: e.target.value })}
                placeholder="Paris"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Adresse</label>
            <input type="text" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })}
              placeholder="1 rue de la Paix"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={saving}
            style={{ padding: '11px 20px', background: saving ? '#9ca3af' : '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </form>
      </div>

      {/* Abonnement */}
      <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 20, marginTop: 0 }}>Mon abonnement</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, margin: '0 0 6px' }}>Plan actuel</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>{profile?.pricing_tier || 'Starter'}</p>
          </div>
          <span style={{ padding: '8px 16px', borderRadius: 8, background: planBadge.bg, color: planBadge.color, fontSize: 13, fontWeight: 700 }}>
            {planBadge.label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Compte créé le : {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}
        </p>
      </div>

      {/* Zone de danger */}
      <div style={{ background: '#fef2f2', padding: 24, borderRadius: 12, border: '1px solid #fecaca' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 12, marginTop: 0 }}>Zone de danger</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          La suppression de votre compte est irréversible. Toutes vos données seront supprimées.
        </p>
        <button onClick={() => toast.error('Contactez le support pour supprimer votre compte')}
          style={{ padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          Supprimer mon compte
        </button>
      </div>
    </div>
  )
}
