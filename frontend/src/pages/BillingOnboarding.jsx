import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, CreditCard, Sparkles } from 'lucide-react'
import api from '../api'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'

const BILLING_TEST_UI_ENABLED = import.meta.env.VITE_BILLING_TEST_MODE !== 'false'

const PLAN_COPY = {
  starter: {
    title: 'Starter',
    banner: '0 € aujourd’hui, puis 89 € HT / mois après le 7e jour (106,80 € TTC avec TVA 20 %).',
  },
  pro: {
    title: 'Pro',
    banner: '0 € aujourd’hui, puis 159 € HT / mois après le 7e jour (190,80 € TTC avec TVA 20 %).',
  },
  premium: {
    title: 'Premium',
    banner: 'Sur devis — demande de contact.',
  },
}

export default function BillingOnboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialPlan = params.get('plan') === 'starter' ? 'starter' : params.get('plan') === 'premium' ? 'premium' : 'pro'
  const [planCode, setPlanCode] = useState(initialPlan)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    cabinet_name: '',
    legal_form: '',
    siret: '',
    orias: '',
    billing_email: '',
    phone: '',
    address_line1: '',
    postal_code: '',
    city: '',
    country: 'France',
    legal_signatory_name: '',
    legal_signatory_role: '',
  })
  const [consents, setConsents] = useState({
    accept_cgv: false,
    accept_privacy: false,
    accept_dpa: false,
    accept_trial: false,
    accept_renewal: false,
  })

  const plan = useMemo(() => PLAN_COPY[planCode] || PLAN_COPY.pro, [planCode])

  const toggleConsent = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleActivateTrial() {
    setError('')
    setSuccess('')
    if (!BILLING_TEST_UI_ENABLED) {
      setError('Billing test mode désactivé sur cet environnement.')
      return
    }
    if (!form.cabinet_name || !form.billing_email) {
      setError('Merci de renseigner au minimum le nom du cabinet et l’email de facturation.')
      return
    }
    if (!Object.values(consents).every(Boolean)) {
      setError('Merci d’accepter l’ensemble des consentements requis.')
      return
    }

    setLoading(true)
    try {
      await api.post('/billing/onboarding', form)

      const acceptanceRes = await api.post('/billing/legal-acceptance', {
        plan_code: planCode,
        ...consents,
        cgv_version: 'draft-2026-05',
        privacy_version: 'draft-2026-05',
        dpa_version: 'draft-2026-05',
      })

      if (planCode === 'premium') {
        setSuccess('Votre demande Premium est enregistrée. L’équipe COURTIA vous contacte pour devis et contractualisation.')
        return
      }

      const checkoutRes = await api.post('/billing/create-checkout-session', {
        plan_code: planCode,
        legal_acceptance_id: acceptanceRes.data?.acceptance_id,
      })

      const url = checkoutRes.data?.checkout_url || checkoutRes.data?.url
      if (!url) {
        setError('Session Stripe test indisponible pour le moment.')
        return
      }

      window.location.href = url
    } catch (err) {
      const msg = err.response?.data?.message
      if (err.response?.data?.error === 'billing_test_mode_not_configured') {
        setError('Billing test mode n’est pas encore configuré côté serveur.')
      } else {
        setError(msg || 'Impossible d’activer l’essai pour le moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 500px at 10% 0%, rgba(124,58,237,0.22), transparent), radial-gradient(900px 500px at 90% 10%, rgba(56,189,248,0.16), transparent), #05070f', color: '#fff', padding: '32px 16px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CourtiaBubbleLogo size={38} />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>Onboarding cabinet & activation essai</h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
              Carte gérée par Stripe — 0 € aujourd’hui — annulation en ligne.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {['starter', 'pro', 'premium'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setPlanCode(code)}
              style={{
                border: code === planCode ? '1px solid rgba(147,197,253,0.8)' : '1px solid rgba(255,255,255,0.14)',
                background: code === planCode ? 'rgba(59,130,246,0.24)' : 'rgba(255,255,255,0.03)',
                color: '#fff',
                borderRadius: 999,
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {PLAN_COPY[code].title}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.84)', fontWeight: 600, fontSize: 13 }}>
            {plan.banner}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <section style={cardStyle}>
            <h2 style={h2Style}>Informations cabinet</h2>
            <div style={grid2}>
              <Input label="Nom du cabinet*" value={form.cabinet_name} onChange={(v) => onChange('cabinet_name', v)} />
              <Input label="Forme juridique" value={form.legal_form} onChange={(v) => onChange('legal_form', v)} />
              <Input label="SIRET" value={form.siret} onChange={(v) => onChange('siret', v)} />
              <Input label="ORIAS" value={form.orias} onChange={(v) => onChange('orias', v)} />
              <Input label="Email facturation*" value={form.billing_email} onChange={(v) => onChange('billing_email', v)} />
              <Input label="Téléphone" value={form.phone} onChange={(v) => onChange('phone', v)} />
              <Input label="Adresse" value={form.address_line1} onChange={(v) => onChange('address_line1', v)} />
              <Input label="Code postal" value={form.postal_code} onChange={(v) => onChange('postal_code', v)} />
              <Input label="Ville" value={form.city} onChange={(v) => onChange('city', v)} />
              <Input label="Pays" value={form.country} onChange={(v) => onChange('country', v)} />
              <Input label="Signataire légal" value={form.legal_signatory_name} onChange={(v) => onChange('legal_signatory_name', v)} />
              <Input label="Fonction signataire" value={form.legal_signatory_role} onChange={(v) => onChange('legal_signatory_role', v)} />
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={h2Style}>Consentements requis</h2>
            <Consent checked={consents.accept_cgv} onChange={() => toggleConsent('accept_cgv')} text="J’accepte les CGV." />
            <Consent checked={consents.accept_privacy} onChange={() => toggleConsent('accept_privacy')} text="J’accepte la politique de confidentialité." />
            <Consent checked={consents.accept_dpa} onChange={() => toggleConsent('accept_dpa')} text="J’accepte le traitement des données selon le DPA." />
            <Consent checked={consents.accept_trial} onChange={() => toggleConsent('accept_trial')} text="J’accepte l’essai gratuit de 7 jours." />
            <Consent checked={consents.accept_renewal} onChange={() => toggleConsent('accept_renewal')} text="Je comprends le démarrage auto après l’essai sauf annulation." />

            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Mini icon={CreditCard} text="Carte gérée exclusivement par Stripe Checkout." />
              <Mini icon={ShieldCheck} text="Aucune donnée carte stockée dans COURTIA." />
              <Mini icon={Sparkles} text={plan.banner} />
            </div>
          </section>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleActivateTrial} disabled={loading} style={ctaStyle}>
            {loading ? 'Préparation...' : (planCode === 'premium' ? 'Envoyer ma demande Premium' : `Activer mon essai ${plan.title}`)}
          </button>
          <button type="button" onClick={() => navigate('/billing')} style={ghostBtnStyle}>
            Voir mon statut billing
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} style={ghostBtnStyle}>
            Continuer sans paiement (mode démo)
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 12, marginTop: 2 }}>
          Prix indiqués hors taxes. TVA applicable au taux en vigueur.
        </p>
      </div>
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.74)' }}>{label}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          padding: '10px 12px',
          fontSize: 13,
          outline: 'none',
        }}
      />
    </label>
  )
}

function Consent({ checked, onChange, text }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <span style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.9)' }}>{text}</span>
    </label>
  )
}

function Mini({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
      <Icon size={14} />
      <span>{text}</span>
    </div>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
  padding: 16,
}

const h2Style = { margin: '0 0 12px', fontSize: 16, fontWeight: 700 }
const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }
const ctaStyle = {
  border: '1px solid rgba(96,165,250,0.9)',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(124,58,237,0.95))',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}
const ghostBtnStyle = {
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
}
const errorStyle = {
  border: '1px solid rgba(251,113,133,0.6)',
  background: 'rgba(127,29,29,0.35)',
  color: '#fecdd3',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
}
const successStyle = {
  border: '1px solid rgba(110,231,183,0.6)',
  background: 'rgba(6,95,70,0.35)',
  color: '#bbf7d0',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
}
