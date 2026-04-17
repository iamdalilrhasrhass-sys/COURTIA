import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Topbar from '../components/Topbar'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('courtia_token') || localStorage.getItem('token') }

export default function Parametres() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', cabinet: '', orias: '', telephone: '', adresse: '', ville: '', code_postal: '' })

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/auth/me`, { headers })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProfile(data)
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '', cabinet: data.cabinet || '', orias: data.orias || '', telephone: data.telephone || '', adresse: data.adresse || '', ville: data.ville || '', code_postal: data.code_postal || '' })
    } catch { toast.error('Impossible de charger le profil') }
    finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { method: 'PUT', headers, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success('Profil mis à jour ✓')
      fetchProfile()
    } catch { toast.error('Erreur lors de la sauvegarde') }
    finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: 'white' }
  const labelStyle = { fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }
  const card = { background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: 28, marginBottom: 16 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <Topbar title="Paramètres" subtitle="Gérez votre profil et abonnement" />

      <div style={{ padding: '24px 32px', maxWidth: 720 }}>

        {/* Profil */}
        <div style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>MON PROFIL</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Prénom *</label>
                <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email (lecture seule)</label>
              <input type="email" value={form.email} disabled style={{ ...inputStyle, background: '#fafaf8', color: '#9ca3af' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Cabinet</label>
                <input value={form.cabinet} onChange={e => setForm({ ...form, cabinet: e.target.value })} placeholder="Nom du cabinet" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Numéro ORIAS</label>
                <input value={form.orias} onChange={e => setForm({ ...form, orias: e.target.value })} placeholder="00012345" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+33 6 00 00 00 00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Paris" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Adresse</label>
              <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="1 rue de la Paix" style={inputStyle} />
            </div>
            <button type="submit" disabled={saving}
              style={{ padding: '11px 20px', background: saving ? '#9ca3af' : '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'Arial, sans-serif', alignSelf: 'flex-start' }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </button>
          </form>
        </div>

        {/* Abonnement */}
        <div style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>MON ABONNEMENT</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: '#fafaf8', borderRadius: 10, border: '0.5px solid #e8e6e0', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontWeight: 600, letterSpacing: 0.5 }}>PLAN ACTUEL</p>
              <p style={{ fontSize: 18, fontWeight: 500, color: '#0a0a0a', margin: 0, letterSpacing: -0.3 }}>{profile?.pricing_tier || 'Pro'}</p>
            </div>
            <span style={{ padding: '5px 14px', borderRadius: 20, background: '#fef9c3', color: '#d97706', fontSize: 12, fontWeight: 700 }}>
              Founder · Garanti à vie
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            Membre depuis : {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}
          </p>
        </div>

        {/* Zone danger */}
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', margin: '0 0 10px', letterSpacing: 0.3 }}>ZONE DE DANGER</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px', lineHeight: 1.6 }}>La suppression est irréversible. Toutes vos données seront effacées.</p>
          <button onClick={() => toast.error('Contactez le support pour supprimer votre compte')}
            style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
