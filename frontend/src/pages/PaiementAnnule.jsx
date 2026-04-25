import { useNavigate } from 'react-router-dom'
import BubbleCard from '../components/BubbleCard'
import BubbleBackground from '../components/BubbleBackground'

export default function PaiementAnnule() {
  const navigate = useNavigate()
  
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:40}}>
      <BubbleBackground intensity="subtle" />
      <BubbleCard padding={40} style={{maxWidth:500,textAlign:'center',zIndex:1}}>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:12,color:'#0a0a0a',fontFamily:'Arial,sans-serif'}}>
          Paiement non finalisé
        </h1>
        <p style={{fontSize:16,color:'rgba(0,0,0,0.6)',marginBottom:24,fontFamily:'Arial,sans-serif',lineHeight:1.6}}>
          Votre paiement n'a pas été finalisé. Aucun montant n'a été débité.
        </p>
        <button onClick={() => navigate('/abonnement')} style={{
          padding:'12px 32px',background:'#2563eb',color:'white',border:'none',borderRadius:10,
          fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'Arial,sans-serif'
        }}>
          Retour aux abonnements
        </button>
      </BubbleCard>
    </div>
  )
}
