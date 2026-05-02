import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, ShieldCheck, RefreshCw, XCircle } from 'lucide-react'
import api from '../api'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'

export default function Billing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [plansRes, statusRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/status'),
      ])
      setPlans(plansRes.data?.plans || [])
      setStatus(statusRes.data?.status || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Données billing indisponibles pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function manageSubscription() {
    try {
      const res = await api.post('/billing/create-portal-session')
      if (res.data?.url) window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.message || 'Portail client indisponible pour le moment.')
    }
  }

  async function cancelTrial() {
    try {
      const res = await api.post('/billing/cancel-trial')
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      setError(res.data?.message || 'Annulation indisponible.')
    } catch (err) {
      setError(err.response?.data?.message || 'Annulation indisponible pour le moment.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <CourtiaLogoLoader size={36} text="Chargement billing..." />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 22px 42px' }}>
      <AuroraPageHeader
        title="Billing test mode"
        subtitle="0 € aujourd’hui — essai 7 jours — annulation en ligne via portail sécurisé Stripe."
      />

      {error && (
        <div style={errorBox}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <section style={panel}>
          <h3 style={title}>Statut abonnement</h3>
          <Info label="Plan" value={status?.plan_name || status?.plan_code || 'Starter'} />
          <Info label="Statut" value={status?.status || 'not_started'} />
          <Info label="Fin essai" value={status?.trial_end_at ? new Date(status.trial_end_at).toLocaleString('fr-FR') : '—'} />
          <Info label="Fin période" value={status?.current_period_end ? new Date(status.current_period_end).toLocaleString('fr-FR') : '—'} />
          <Info label="Customer Stripe" value={status?.stripe_customer_id_masked || '—'} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button type="button" onClick={() => navigate('/onboarding')} style={btnPrimary}>
              <CreditCard size={14} /> Activer / modifier mon essai
            </button>
            <button type="button" onClick={manageSubscription} style={btnGhost}>
              <ShieldCheck size={14} /> Gérer mon abonnement
            </button>
            <button type="button" onClick={cancelTrial} style={btnDanger}>
              <XCircle size={14} /> Annuler mon essai
            </button>
          </div>
        </section>

        <section style={panel}>
          <h3 style={title}>Plans disponibles</h3>
          {(plans || []).map((p) => (
            <div key={p.code} style={planItem}>
              <div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {p.code === 'premium'
                    ? 'Sur devis — pas de checkout direct'
                    : p.code === 'starter'
                      ? `0 € aujourd’hui, puis 89 € HT / mois après le ${p.trial_days}e jour (106,80 € TTC avec TVA 20 %).`
                      : `0 € aujourd’hui, puis 159 € HT / mois après le ${p.trial_days}e jour (190,80 € TTC avec TVA 20 %).`}
                </div>
              </div>
              {p.code !== 'premium' ? (
                <button type="button" onClick={() => navigate(`/onboarding?plan=${p.code}`)} style={btnMini}>
                  Choisir
                </button>
              ) : (
                <button type="button" onClick={() => navigate('/onboarding?plan=premium')} style={btnMini}>
                  Demander
                </button>
              )}
            </div>
          ))}
          <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.58)', fontSize: 12 }}>
            Prix indiqués hors taxes. TVA applicable au taux en vigueur. Validation comptable/juridique requise avant live.
          </p>
          <button type="button" onClick={load} style={{ ...btnGhost, marginTop: 8 }}>
            <RefreshCw size={14} /> Rafraîchir
          </button>
        </section>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

const panel = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 14,
}

const title = {
  margin: '0 0 10px',
  fontSize: 16,
  color: '#fff',
  fontWeight: 700,
}

const errorBox = {
  marginBottom: 12,
  border: '1px solid rgba(251,113,133,0.6)',
  background: 'rgba(127,29,29,0.35)',
  color: '#fecdd3',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
}

const btnPrimary = {
  border: '1px solid rgba(96,165,250,0.9)',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(124,58,237,0.95))',
  color: '#fff',
  borderRadius: 10,
  padding: '9px 12px',
  fontWeight: 700,
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const btnGhost = {
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.02)',
  color: '#fff',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const btnDanger = {
  border: '1px solid rgba(251,113,133,0.5)',
  background: 'rgba(127,29,29,0.35)',
  color: '#fecdd3',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const planItem = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 12px',
  marginBottom: 8,
}

const btnMini = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 12,
  cursor: 'pointer',
}
