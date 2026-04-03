import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let success
      if (isLogin) {
        success = await login(email, password)
      } else {
        success = await register(email, password, firstName, lastName)
      }

      if (success) {
        onAuthSuccess()
      } else {
        setError('Authentification échouée.')
      }
    } catch (err) {
      setError('Erreur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',fontFamily:'Arial,sans-serif'}}>
      <div style={{padding:'48px',borderRadius:'10px',width:'100%',maxWidth:'420px',border:'0.5px solid #f0f0f0'}}>
        <h1 style={{fontSize:'32px',fontWeight:900,textAlign:'center',color:'#0a0a0a',marginBottom:'8px'}}>COURTIA</h1>
        <p style={{textAlign:'center',color:'#999',marginBottom:'32px',fontSize:'13px'}}>CRM d'assurance avec IA native</p>

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'20px'}}>
          {!isLogin && (
            <>
              <div>
                <label style={{display:'block',fontSize:'12px',fontWeight:700,marginBottom:'8px',color:'#0a0a0a'}}>Prénom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required={!isLogin} placeholder="Votre prénom" style={{width:'100%',padding:'10px 12px',border:'0.5px solid #f0f0f0',borderRadius:'8px',fontSize:'13px',fontFamily:'Arial',background:'#fff',color:'#0a0a0a'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',fontWeight:700,marginBottom:'8px',color:'#0a0a0a'}}>Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required={!isLogin} placeholder="Votre nom" style={{width:'100%',padding:'10px 12px',border:'0.5px solid #f0f0f0',borderRadius:'8px',fontSize:'13px',fontFamily:'Arial',background:'#fff',color:'#0a0a0a'}} />
              </div>
            </>
          )}

          <div>
            <label style={{display:'block',fontSize:'12px',fontWeight:700,marginBottom:'8px',color:'#0a0a0a'}}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@example.com" style={{width:'100%',padding:'10px 12px',border:'0.5px solid #f0f0f0',borderRadius:'8px',fontSize:'13px',fontFamily:'Arial',background:'#fff',color:'#0a0a0a'}} />
          </div>

          <div>
            <label style={{display:'block',fontSize:'12px',fontWeight:700,marginBottom:'8px',color:'#0a0a0a'}}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{width:'100%',padding:'10px 12px',border:'0.5px solid #f0f0f0',borderRadius:'8px',fontSize:'13px',fontFamily:'Arial',background:'#fff',color:'#0a0a0a'}} />
          </div>

          {error && (
            <div style={{background:'#fee2e2',border:'0.5px solid #fca5a5',padding:'12px',borderRadius:'8px',color:'#dc2626',fontSize:'12px'}}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Arial',letterSpacing:'0.3px',transition:'background 0.2s',opacity:loading?0.6:1}}>
            {loading ? 'Chargement...' : isLogin ? 'Connexion' : 'Créer compte'}
          </button>
        </form>

        <button type="button" onClick={() => {setIsLogin(!isLogin); setError('')}} style={{width:'100%',marginTop:'20px',padding:'0',background:'none',border:'none',fontSize:'13px',color:'#2563eb',cursor:'pointer',fontFamily:'Arial',textDecoration:'none'}}>
          {isLogin ? 'Pas encore de compte ? S\'inscrire' : 'Déjà inscrit ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
