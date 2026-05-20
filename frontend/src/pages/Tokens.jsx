import TokenWallet from '../components/TokenWallet'

export default function Tokens() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <TokenWallet apiBase="/api" authToken={localStorage.getItem('courtia_token') || localStorage.getItem('token')} />
    </div>
  )
}
