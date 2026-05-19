import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Building2, CreditCard, Crown, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import api from '../api'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraBackground from '../components/ui/AuroraBackground'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import GlassCard from '../components/ui/GlassCard'
import StatusPill from '../components/ui/StatusPill'

const PLAN_ICON = {
  starter: CreditCard,
  pro: Sparkles,
  cabinet: Building2,
  premium: Crown,
}

export default function Billing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState(null)
  const [stripeConfiguration, setStripeConfiguration] = useState(null)
  const [error, setError] = useState('')
  const [workingPlan, setWorkingPlan] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [plansRes, statusRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/status'),
      ])
      setPlans(plansRes.data?.plans || [])
      setStatus(statusRes.data?.status || null)
      setStripeConfiguration(statusRes.data?.stripe_configuration || plansRes.data?.stripe_configuration || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Données billing indisponibles pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial billing hydration comes from the API; keeping this local avoids changing the global data layer in PR3.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const selectedPlan = searchParams.get('plan') || status?.plan_code || 'pro'
  const missingConfiguration = useMemo(
    () => stripeConfiguration?.missing?.filter(Boolean) || [],
    [stripeConfiguration]
  )

  async function startCheckout(planCode) {
    if (planCode === 'premium') {
      navigate('/contact?type=premium')
      return
    }

    setWorkingPlan(planCode)
    setError('')
    try {
      const res = await api.post('/billing/checkout-session', { plan_code: planCode })
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      setError('Session Stripe indisponible pour le moment.')
    } catch (err) {
      const apiError = err.response?.data?.error
      if (apiError === 'legal_acceptance_required') {
        navigate(`/onboarding/billing?plan=${planCode}`)
        return
      }
      setError(err.response?.data?.message || 'Checkout Stripe indisponible pour le moment.')
    } finally {
      setWorkingPlan('')
    }
  }

  async function manageSubscription() {
    setError('')
    try {
      const res = await api.post('/billing/portal-session')
      if (res.data?.url) window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.message || 'Portail client indisponible pour le moment.')
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-start justify-center pt-20 text-white">
        <AuroraBackground />
        <CourtiaLogoLoader size={36} text="Chargement billing..." />
      </div>
    )
  }

  return (
    <div className="courtia-token-surface relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <AuroraBackground />
      <div className="mx-auto max-w-7xl space-y-6">
        <AuroraPageHeader
          title="Billing self-serve"
          subtitle="Choisissez votre plan, ouvrez Checkout Stripe et gérez l’abonnement depuis le portail sécurisé. Aucun numéro de carte n’est saisi dans COURTIA."
        />
        <p className="sr-only">Statut abonnement</p>
        <p className="sr-only">Plans disponibles</p>

        {error && (
          <GlassCard className="border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </GlassCard>
        )}

        {missingConfiguration.length > 0 && (
          <GlassCard className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-200">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-lg font-semibold text-white">Configuration Stripe requise</h3>
                    <StatusPill status="warning">Mode {stripeConfiguration?.mode || 'test'}</StatusPill>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-white/65">
                    Le billing est prêt côté produit, mais Checkout/Portal restent désactivés tant que les variables Stripe ne sont pas configurées côté backend.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingConfiguration.map((key) => (
                      <Badge key={key} tone="warning">{key}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={load}>
                <RefreshCw size={16} /> Rafraîchir
              </Button>
            </div>
          </GlassCard>
        )}

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.6fr]">
          <GlassCard className="p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200/70">Abonnement cabinet</p>
                <h2 className="m-0 text-2xl font-semibold text-white">{status?.plan_name || 'Aucun abonnement actif'}</h2>
              </div>
              <StatusPill status={status?.status === 'active' ? 'success' : status?.status === 'past_due' ? 'danger' : 'neutral'}>
                {status?.status || 'inactive'}
              </StatusPill>
            </div>

            <div className="space-y-1">
              <Info label="Plan" value={status?.plan_name || status?.plan_code || 'Starter'} />
              <Info label="Fin essai" value={formatDate(status?.trial_end_at)} />
              <Info label="Fin période" value={formatDate(status?.current_period_end)} />
              <Info label="Customer Stripe" value={status?.stripe_customer_id_masked || 'Non créé'} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => startCheckout(selectedPlan)} disabled={!!workingPlan}>
                <CreditCard size={16} /> {workingPlan ? 'Ouverture...' : 'Ouvrir Checkout'}
              </Button>
              <Button type="button" variant="secondary" onClick={manageSubscription}>
                <ShieldCheck size={16} /> Portail client
              </Button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Prix hors taxes. Stripe gère la carte, les factures, les renouvellements et la résiliation. COURTIA ne stocke aucune donnée bancaire.
            </p>
          </GlassCard>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(plans || []).map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                selected={selectedPlan === plan.code}
                loading={workingPlan === plan.code}
                onSelect={() => startCheckout(plan.code)}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, selected, loading, onSelect }) {
  const Icon = PLAN_ICON[plan.code] || CreditCard
  const contactOnly = plan.code === 'premium'
  return (
    <GlassCard className={`flex min-h-[330px] flex-col p-5 ${plan.highlighted ? 'ring-1 ring-cyan-200/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100">
          <Icon size={19} />
        </span>
        {plan.highlighted ? <Badge tone="success">Recommandé</Badge> : selected ? <Badge>Actuel</Badge> : null}
      </div>

      <div className="mt-5">
        <h3 className="m-0 text-xl font-semibold text-white">{plan.name}</h3>
        <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-white/60">
          {planSummary(plan.code)}
        </p>
      </div>

      <div className="mt-4">
        <div className="text-3xl font-black tracking-tight text-white">
          {contactOnly ? 'Sur devis' : `${Math.round(Number(plan.price || 0))} €`}
        </div>
        {!contactOnly && <div className="text-sm text-white/50">HT / mois{plan.trial_days > 0 ? ` après essai ${plan.trial_days} jours` : ''}</div>}
      </div>

      <ul className="mt-5 flex-1 space-y-2 text-sm text-white/65">
        {planFeatures(plan.code).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button type="button" variant={plan.highlighted ? 'primary' : 'secondary'} onClick={onSelect} disabled={loading} className="mt-5 w-full">
        {loading ? 'Préparation...' : contactOnly ? 'Demander une offre' : 'Choisir ce plan'}
      </Button>
    </GlassCard>
  )
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-3 text-sm">
      <span className="text-white/55">{label}</span>
      <span className="text-right font-semibold text-white">{value || '—'}</span>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function planSummary(code) {
  if (code === 'starter') return 'Pour lancer COURTIA avec les fondations CRM et rapports simples.'
  if (code === 'pro') return 'L’offre principale avec ARK, documents, intégrations et cockpit complet.'
  if (code === 'cabinet') return 'Pour équipes multi-collaborateurs avec pilotage avancé et support renforcé.'
  return 'Accompagnement sur mesure, intégrations avancées et déploiement cabinet.'
}

function planFeatures(code) {
  if (code === 'starter') return ['1 utilisateur', '200 clients', 'Dashboard, clients, contrats, tâches', 'Rapports essentiels']
  if (code === 'pro') return ['3 utilisateurs', '1 500 clients', 'ARK + Morning Brief', 'Gmail, Agenda, documents DDA']
  if (code === 'cabinet') return ['10 utilisateurs', 'Clients illimités', 'Commissions et reporting avancé', 'WhatsApp et support prioritaire']
  return ['Multi-cabinet', 'Accompagnement dédié', 'Intégrations avancées', 'Support prioritaire']
}
