import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BubbleCard from '../components/BubbleCard'
import BubbleBackground from '../components/BubbleBackground'
import api from '../api'

export default function PaiementSucces() {
  const navigate = useNavigate()
  const [message, setMessage] = useState("Votre essai est en cours d’activation.")
  
  useEffect(() => {
    api.get('/billing/status')
      .then((res) => {
        const s = res.data?.status
        if (s?.status) {
          setMessage(`Statut actuel: ${s.status}. Vous pouvez gérer votre abonnement depuis votre espace billing.`)
        }
      })
      .catch(() => {})
  }, [])
  
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:40}}>
      <BubbleBackground intensity="subtle" />
      <BubbleCard padding={40} style={{maxWidth:500,textAlign:'center',zIndex:1}}>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:12,color:'#0a0a0a',fontFamily:'Arial,sans-serif'}}>
          Bienvenue dans COURTIA ! 🎉
        </h1>
        <p style={{fontSize:16,color:'rgba(0,0,0,0.6)',marginBottom:24,fontFamily:'Arial,sans-serif',lineHeight:1.6}}>
          {message}
        </p>
        <p style={{fontSize:13,color:'rgba(0,0,0,0.56)',marginBottom:20,fontFamily:'Arial,sans-serif',lineHeight:1.5}}>
          L'abonnement démarre immédiatement. Annulation en ligne via le portail sécurisé.
        </p>
        <button onClick={() => navigate('/dashboard')} style={{
          padding:'12px 32px',background:'#2563eb',color:'white',border:'none',borderRadius:10,
          fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'Arial,sans-serif'
        }}>
          Accéder à mon espace
        </button>
        <button onClick={() => navigate('/billing')} style={{
          padding:'12px 20px',background:'transparent',color:'#2563eb',border:'1px solid rgba(37,99,235,0.35)',borderRadius:10,
          fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Arial,sans-serif',marginLeft:10
        }}>
          Ouvrir Billing
        </button>
      </BubbleCard>
    </div>
  )
}
