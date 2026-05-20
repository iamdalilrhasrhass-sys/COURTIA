import BordereauIntelligence from '../components/bordereau/BordereauIntelligence'

export default function Bordereau() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <BordereauIntelligence apiBase="/api" authToken={localStorage.getItem('courtia_token') || localStorage.getItem('token')} />
    </div>
  )
}
