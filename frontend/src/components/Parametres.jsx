import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function Parametres() {
  const token = useAuthStore((state) => state.token)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cabinet: '',
    orias: '',
    telephone: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [token])

  const fetchProfile = async () => {
    try {
      // Mock profile data - replace with real API endpoint
      const mockProfile = {
        first_name: 'Dalil',
        last_name: 'Rhasrhass',
        email: 'dalil@courtia.com',
        cabinet: 'Courtia Assurance',
        orias: 'FR123456789',
        telephone: '+33612345678',
        plan: 'Premium',
        created_at: '2026-03-01'
      }
      setProfile(mockProfile)
      setFormData(mockProfile)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Mock save - replace with real API endpoint
      setMessage('✓ Profil mis à jour')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Erreur lors de la sauvegarde')
    }
    setSaving(false)
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
    return <div style={{padding:'32px'}}>Chargement...</div>
  }

  const planBadge = getPlanBadge(profile?.plan || 'Starter')

  return (
    <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff',maxWidth:'600px'}}>
      <h2 style={{fontSize:'32px',fontWeight:900,color:'#0a0a0a',marginBottom:'32px'}}>Paramètres</h2>

      {message && (
        <div style={{padding:'12px 16px',background:message.includes('Erreur')?'#fee2e2':'#d1fae5',color:message.includes('Erreur')?'#dc2626':'#065f46',borderRadius:'8px',marginBottom:'24px',fontSize:'13px'}}>
          {message}
        </div>
      )}

      {/* Profile Section */}
      <div style={{background:'#f9fafb',padding:'24px',borderRadius:'12px',border:'0.5px solid #e5e7eb',marginBottom:'32px'}}>
        <h3 style={{fontSize:'16px',fontWeight:700,color:'#0a0a0a',marginBottom:'20px'}}>Mon profil</h3>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Prénom *</label>
              <input 
                type='text'
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial'}}
              />
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Nom *</label>
              <input 
                type='text'
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial'}}
              />
            </div>
          </div>

          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Email (lecture seule)</label>
            <input 
              type='email'
              value={formData.email}
              disabled
              style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial',background:'#f3f4f6',color:'#6b7280'}}
            />
          </div>

          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Cabinet</label>
            <input 
              type='text'
              value={formData.cabinet}
              onChange={(e) => setFormData({...formData, cabinet: e.target.value})}
              style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial'}}
            />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Numéro ORIAS</label>
              <input 
                type='text'
                value={formData.orias}
                onChange={(e) => setFormData({...formData, orias: e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial'}}
              />
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'#666',display:'block',marginBottom:'6px'}}>Téléphone</label>
              <input 
                type='tel'
                value={formData.telephone}
                onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'0.5px solid #d1d5db',borderRadius:'6px',fontSize:'13px',fontFamily:'Arial'}}
              />
            </div>
          </div>

          <button type='submit' disabled={saving} style={{padding:'12px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'Arial',opacity:saving?0.6:1}}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </form>
      </div>

      {/* Subscription Section */}
      <div style={{background:'#f9fafb',padding:'24px',borderRadius:'12px',border:'0.5px solid #e5e7eb',marginBottom:'32px'}}>
        <h3 style={{fontSize:'16px',fontWeight:700,color:'#0a0a0a',marginBottom:'20px'}}>Mon abonnement</h3>
        <div style={{padding:'16px',background:'#fff',borderRadius:'8px',border:'0.5px solid #e5e7eb'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <p style={{fontSize:'14px',color:'#666',marginBottom:'6px'}}>Plan actuel</p>
              <p style={{fontSize:'18px',fontWeight:700,color:'#0a0a0a'}}>{profile?.plan || 'Starter'}</p>
            </div>
            <span style={{padding:'8px 16px',borderRadius:'6px',background:planBadge.bg,color:planBadge.color,fontSize:'12px',fontWeight:700}}>
              {planBadge.label}
            </span>
          </div>
          <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'0.5px solid #e5e7eb'}}>
            <p style={{fontSize:'12px',color:'#666'}}>Inscription : {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
          </div>
        </div>
        <div style={{marginTop:'16px'}}>
          <button style={{width:'100%',padding:'10px',background:'#f3f4f6',color:'#0a0a0a',border:'0.5px solid #d1d5db',borderRadius:'6px',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'Arial'}}>
            Voir les détails d'abonnement
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{background:'#fef2f2',padding:'24px',borderRadius:'12px',border:'0.5px solid #fecaca'}}>
        <h3 style={{fontSize:'16px',fontWeight:700,color:'#dc2626',marginBottom:'16px'}}>Zone de danger</h3>
        <p style={{fontSize:'13px',color:'#666',marginBottom:'16px'}}>
          La suppression de votre compte est irréversible. Toutes vos données seront supprimées.
        </p>
        <button style={{width:'100%',padding:'10px',background:'#dc2626',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer',fontSize:'13px',fontFamily:'Arial'}}>
          Supprimer mon compte
        </button>
      </div>
    </div>
  )
}
