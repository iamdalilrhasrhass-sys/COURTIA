import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Zap, ArrowRight } from 'lucide-react'
import api from '../api'
import AuroraBackground from '../components/ui/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function StripeTest() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('pro')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')

  const startCheckout = async () => {
    setLoading(true)
    setError('')
    setPaymentUrl('')
    try {
      // 1. Accept legal
      await api.post('/billing/legal-acceptance', {
        accept_cgv: true,
        accept_privacy: true,
        accept_dpa: true,
        accept_renewal: true,
        plan_code: plan,
      })
      // 2. Create checkout
      const { data } = await api.post('/billing/create-checkout-session', { plan })
      setPaymentUrl(data.checkout_url || data.url)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erreur checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 20px' }}>
        <Badge style={{ marginBottom: 12 }}>TEST STRIPE</Badge>
        <h1 style={{ fontSize: 24, fontWeight: 300, color: '#fff', margin: '0 0 8px' }}>
          Paiement test — {plan === 'pro' ? 'PRO 199€' : 'STARTER 89€'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--aurora-text-secondary)', marginBottom: 24 }}>
          Mode test Stripe. Carte test : <code>4242 4242 4242 4242</code> — Date/CCV au choix.
        </p>

        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          {/* Plan toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['starter', 'pro'].map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10,
                  background: plan === p ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${plan === p ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: plan === p ? '#fff' : 'var(--aurora-text-secondary)',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {p === 'pro' ? 'PRO 199€' : 'STARTER 89€'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!paymentUrl ? (
            <Button
              onClick={startCheckout}
              loading={loading}
              style={{ width: '100%' }}
            >
              <Zap size={16} style={{ marginRight: 6 }} />
              Payer {plan === 'pro' ? '199€' : '89€'} (TEST)
            </Button>
          ) : (
            <div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#6ee7b7', fontSize: 13 }}>
                ✅ Session Stripe créée — clique ci-dessous pour payer
              </div>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <Button style={{ width: '100%', background: 'linear-gradient(135deg, #635BFF, #4F46E5)' }}>
                  <CreditCard size={16} style={{ marginRight: 6 }} />
                  Ouvrir la page de paiement Stripe
                </Button>
              </a>
            </div>
          )}
        </GlassCard>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--aurora-text-muted)', fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Retour cockpit
          </button>
        </div>
      </div>
    </AuroraBackground>
  )
}
