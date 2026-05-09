import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, CheckCircle2, FileSpreadsheet, Sparkles, ShieldCheck, Users } from 'lucide-react'
import api from '../api'
import AuroraBackground from '../components/ui/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusPill from '../components/ui/StatusPill'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'

const STEP_META = {
  profile: {
    icon: Building2,
    title: 'Profil cabinet',
    subtitle: 'Identité, ville, ORIAS et socle de conformité.',
  },
  import: {
    icon: FileSpreadsheet,
    title: 'Import clients',
    subtitle: 'Préparez votre portefeuille pour que COURTIA devienne utile tout de suite.',
  },
  google: {
    icon: CalendarDays,
    title: 'Agenda / Gmail',
    subtitle: 'Connecteurs prêts à activer, sans faux statut connecté.',
  },
  first_client: {
    icon: Users,
    title: 'Première fiche client',
    subtitle: 'Ouvrez une fiche client et voyez le cockpit en contexte métier.',
  },
  first_brief: {
    icon: Sparkles,
    title: 'Morning Brief ARK',
    subtitle: 'Lancez votre plan d’action quotidien.',
  },
}

const DEFAULT_STEPS = Object.keys(STEP_META).map((key) => ({ key, ...STEP_META[key], done: false }))

export default function CabinetOnboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingStep, setSavingStep] = useState('')
  const [error, setError] = useState('')
  const [cabinet, setCabinet] = useState(null)
  const [progress, setProgress] = useState(null)
  const [profile, setProfile] = useState({ cabinet_name: '', orias_number: '', city: '' })

  const loadOnboarding = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/onboarding')
      setCabinet(data.cabinet)
      setProgress(data.progress)
      setProfile((prev) => ({
        ...prev,
        cabinet_name: data.cabinet?.name || prev.cabinet_name,
        orias_number: data.cabinet?.orias_number || prev.orias_number,
      }))
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding indisponible pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOnboarding()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOnboarding])

  const steps = useMemo(() => {
    const apiSteps = progress?.steps?.length ? progress.steps : DEFAULT_STEPS
    return apiSteps.map((step) => ({ ...STEP_META[step.key], ...step }))
  }, [progress])

  async function completeStep(step, payload = {}) {
    setSavingStep(step)
    setError('')
    try {
      const { data } = await api.post('/onboarding/step', { step, payload })
      setProgress(data.progress)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de valider cette étape.')
    } finally {
      setSavingStep('')
    }
  }

  const completionPercent = progress?.completion_percent || 0

  return (
    <div style={pageStyle}>
      <AuroraBackground />
      <section style={heroStyle}>
        <div>
          <Badge tone="success">V1 cabinet</Badge>
          <p style={{ ...eyebrowStyle, marginTop: 14 }}>Onboarding cabinet</p>
          <h1 style={titleStyle}>Votre cabinet prend vie dans COURTIA.</h1>
          <p style={leadStyle}>
            En moins de trois minutes, posez le profil cabinet, préparez l’import clients, connectez vos outils et lancez votre premier Morning Brief ARK.
          </p>
        </div>
        <GlassCard style={progressCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={eyebrowStyle}>Progression</p>
              <strong style={{ fontSize: 44 }}>{completionPercent}%</strong>
            </div>
            <StatusPill status={completionPercent === 100 ? 'success' : 'warning'}>
              {completionPercent === 100 ? 'Prêt' : 'À finaliser'}
            </StatusPill>
          </div>
          <div style={barTrackStyle}><span style={{ ...barFillStyle, width: `${completionPercent}%` }} /></div>
          <p style={mutedStyle}>{cabinet?.name || 'Cabinet COURTIA'} · {cabinet?.role || 'owner'}</p>
        </GlassCard>
      </section>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <EmptyState title="Chargement de l’onboarding" description="COURTIA prépare le parcours cabinet." />
      ) : (
        <div style={gridStyle}>
          <GlassCard style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <ShieldCheck size={20} color="var(--c-aurora-cyan)" />
              <div>
                <h2 style={h2Style}>1. Profil cabinet</h2>
                <p style={mutedStyle}>Ces données alimenteront les futurs documents DDA et la conformité cabinet.</p>
              </div>
            </div>
            <div style={formGridStyle}>
              <Field label="Nom du cabinet">
                <Input value={profile.cabinet_name} onChange={(e) => setProfile((v) => ({ ...v, cabinet_name: e.target.value }))} placeholder="Cabinet Dupont Assurances" />
              </Field>
              <Field label="ORIAS">
                <Input value={profile.orias_number} onChange={(e) => setProfile((v) => ({ ...v, orias_number: e.target.value }))} placeholder="07000000" />
              </Field>
              <Field label="Ville">
                <Input value={profile.city} onChange={(e) => setProfile((v) => ({ ...v, city: e.target.value }))} placeholder="Paris" />
              </Field>
            </div>
            <Button onClick={() => completeStep('profile', profile)} disabled={savingStep === 'profile'}>
              {savingStep === 'profile' ? 'Enregistrement...' : 'Valider le profil'} <ArrowRight size={16} />
            </Button>
          </GlassCard>

          <div style={stepsColumnStyle}>
            {steps.map((step, index) => {
              const Icon = step.icon || STEP_META[step.key]?.icon || CheckCircle2
              return (
                <GlassCard key={step.key} style={stepCardStyle}>
                  <div style={stepNumberStyle}>{index + 1}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={stepHeaderStyle}>
                      <Icon size={19} color="var(--c-aurora-cyan)" />
                      <h3 style={h3Style}>{step.title}</h3>
                      <StatusPill status={step.done ? 'success' : 'warning'}>{step.done ? 'Validée' : 'À faire'}</StatusPill>
                    </div>
                    <p style={mutedStyle}>{step.subtitle || step.description}</p>
                    {renderStepAction(step.key, step.done, savingStep, completeStep, navigate)}
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function renderStepAction(key, done, savingStep, completeStep, navigate) {
  if (key === 'profile') return null
  if (key === 'import') {
    return (
      <div style={actionRowStyle}>
        <Button variant="secondary" onClick={() => navigate('/import')}>Ouvrir l’import</Button>
        <Button variant="ghost" onClick={() => completeStep('import')} disabled={done || savingStep === key}>{done ? 'Import prêt' : 'Valider plus tard'}</Button>
      </div>
    )
  }
  if (key === 'google') {
    return (
      <div style={actionRowStyle}>
        <Button variant="secondary" onClick={() => navigate('/parametres')}>Voir intégrations</Button>
        <Button variant="ghost" onClick={() => completeStep('google')} disabled={done || savingStep === key}>{done ? 'Étape validée' : 'Ignorer pour l’instant'}</Button>
      </div>
    )
  }
  if (key === 'first_client') {
    return (
      <div style={actionRowStyle}>
        <Button variant="secondary" onClick={() => navigate('/clients')}>Ouvrir Clients</Button>
        <Button variant="ghost" onClick={() => completeStep('first_client')} disabled={done || savingStep === key}>{done ? 'Fiche vue' : 'Marquer comme fait'}</Button>
      </div>
    )
  }
  return (
    <div style={actionRowStyle}>
      <Button variant="secondary" onClick={() => navigate('/morning-brief')}>Lancer Morning Brief</Button>
      <Button variant="ghost" onClick={() => completeStep('first_brief')} disabled={done || savingStep === key}>{done ? 'Brief prêt' : 'Valider le brief'}</Button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--c-text-secondary)', fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  )
}

const pageStyle = { position: 'relative', minHeight: '100vh', padding: '40px clamp(16px, 4vw, 48px)', color: 'var(--c-text-primary)', overflow: 'hidden' }
const heroStyle = { maxWidth: 1180, margin: '0 auto 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'end' }
const titleStyle = { margin: '18px 0 12px', fontFamily: 'var(--c-font-display)', fontSize: 'clamp(40px, 7vw, 82px)', lineHeight: 0.92, letterSpacing: '-0.06em' }
const leadStyle = { margin: 0, maxWidth: 760, color: 'var(--c-text-secondary)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.55 }
const progressCardStyle = { padding: 22, transform: 'perspective(900px) rotateX(2deg)' }
const eyebrowStyle = { margin: 0, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, fontWeight: 800 }
const mutedStyle = { margin: 0, color: 'var(--c-text-secondary)', lineHeight: 1.55 }
const barTrackStyle = { height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', margin: '16px 0 10px' }
const barFillStyle = { display: 'block', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--c-aurora-violet), var(--c-aurora-cyan))', transition: 'width 240ms ease' }
const gridStyle = { maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18 }
const panelStyle = { padding: 22, alignSelf: 'start' }
const sectionHeaderStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }
const h2Style = { margin: 0, fontFamily: 'var(--c-font-display)', fontSize: 24, letterSpacing: '-0.03em' }
const h3Style = { margin: 0, fontFamily: 'var(--c-font-display)', fontSize: 19, letterSpacing: '-0.02em' }
const formGridStyle = { display: 'grid', gap: 14, marginBottom: 18 }
const stepsColumnStyle = { display: 'grid', gap: 14 }
const stepCardStyle = { display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16, padding: 18, transformStyle: 'preserve-3d' }
const stepNumberStyle = { width: 38, height: 38, borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 900, color: '#07091a', background: 'linear-gradient(135deg, var(--c-aurora-pearl), var(--c-aurora-cyan))', boxShadow: 'var(--c-halo-cyan)' }
const stepHeaderStyle = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }
const actionRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }
const errorStyle = { maxWidth: 1180, margin: '0 auto 16px', padding: 14, borderRadius: 16, border: '1px solid rgba(255,111,140,0.32)', color: 'var(--c-danger)', background: 'rgba(255,111,140,0.08)' }
