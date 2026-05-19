import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Car, FileSpreadsheet, Home, ShieldCheck, Sparkles, Target, Users, Briefcase } from 'lucide-react'
import api from '../api'
import AuroraBackground from '../components/ui/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusPill from '../components/ui/StatusPill'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'

// ─── STEPS — Métier courtier ───
const STEP_META = {
  profile: {
    icon: Building2,
    title: 'Votre cabinet',
    subtitle: 'Identité professionnelle, ORIAS, ancrage local.',
  },
  portefeuille: {
    icon: Briefcase,
    title: 'Votre portefeuille',
    subtitle: 'Branches, volume, typologie clients.',
  },
  priorites: {
    icon: Target,
    title: 'Vos priorités',
    subtitle: 'Ce qui compte le plus dans votre quotidien.',
  },
  import: {
    icon: FileSpreadsheet,
    title: 'Import clients',
    subtitle: 'Optionnel — importez votre portefeuille existant.',
  },
  premiere_action: {
    icon: Sparkles,
    title: 'Première action',
    subtitle: 'Créez votre première fiche ou lancez votre Morning Brief.',
  },
}

const DEFAULT_STEPS = Object.keys(STEP_META).map((key) => ({ key, ...STEP_META[key], done: false }))

const BRANCHES = [
  { key: 'auto', label: 'Auto / MRH', icon: Car },
  { key: 'habitation', label: 'Habitation', icon: Home },
  { key: 'pro', label: 'Professionnelle', icon: Briefcase },
  { key: 'emprunteur', label: 'Emprunteur', icon: ShieldCheck },
  { key: 'sante', label: 'Santé / Prévoyance', icon: Users },
]

const PRIORITES = [
  { key: 'relances', label: 'Relances clients', desc: 'Ne plus rien oublier, prioriser les urgences' },
  { key: 'devis', label: 'Pipeline devis', desc: 'Suivre les propositions en cours, relancer au bon moment' },
  { key: 'contrats', label: 'Gestion contrats', desc: 'Échéances, reconductions, avenants' },
  { key: 'commissions', label: 'Suivi commissions', desc: 'Vision claire sur le chiffre d\'affaires' },
  { key: 'reporting', label: 'Reporting', desc: 'Tableaux de bord pour piloter le cabinet' },
]

export default function CabinetOnboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingStep, setSavingStep] = useState('')
  const [error, setError] = useState('')
  const [cabinet, setCabinet] = useState(null)
  const [progress, setProgress] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  // Profile
  const [profile, setProfile] = useState({ cabinet_name: '', orias_number: '', city: '' })
  // Portfolio
  const [branches, setBranches] = useState([])
  const [volume, setVolume] = useState('')
  // Priorities
  const [priorites, setPriorites] = useState([])

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
      if (data.cabinet?.branches) setBranches(data.cabinet.branches)
      if (data.cabinet?.portfolio_volume) setVolume(String(data.cabinet.portfolio_volume))
      if (data.cabinet?.priorites) setPriorites(data.cabinet.priorites)
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding indisponible pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOnboarding()
  }, [loadOnboarding])

  const steps = useMemo(() => {
    const apiSteps = progress?.steps?.length ? progress.steps : DEFAULT_STEPS
    return apiSteps.map((step) => ({ ...STEP_META[step.key], ...step }))
  }, [progress])

  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  const saveProfile = async () => {
    setSavingStep('profile')
    try {
      await api.put('/onboarding/profile', profile)
      markDone('profile')
    } catch (err) {
      setError('Erreur lors de la sauvegarde du profil.')
    } finally {
      setSavingStep('')
    }
  }

  const savePortefeuille = async () => {
    setSavingStep('portefeuille')
    try {
      await api.put('/onboarding/portefeuille', { branches, portfolio_volume: parseInt(volume) || 0 })
      markDone('portefeuille')
    } catch (err) {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSavingStep('')
    }
  }

  const savePriorites = async () => {
    setSavingStep('priorites')
    try {
      await api.put('/onboarding/priorites', { priorites })
      markDone('priorites')
    } catch (err) {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSavingStep('')
    }
  }

  const markDone = (key) => {
    setProgress((prev) => {
      if (!prev?.steps) return prev
      return {
        ...prev,
        steps: prev.steps.map((s) => (s.key === key ? { ...s, done: true } : s)),
      }
    })
  }

  const toggleBranch = (key) => {
    setBranches((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const togglePriorite = (key) => {
    setPriorites((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const goToCockpit = () => navigate('/dashboard')
  const goToImport = () => navigate('/onboarding/import')
  const goToClientNew = () => navigate('/clients/new')
  const goToBrief = () => navigate('/brief')

  // ─── Loading ───
  if (loading) return (
    <AuroraBackground>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="aurora-spinner" />
      </div>
    </AuroraBackground>
  )

  // ─── Error ───
  if (error && !cabinet) return (
    <AuroraBackground>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <EmptyState icon={ShieldCheck} title="Onboarding" description={error} />
      </div>
    </AuroraBackground>
  )

  const currentStepKey = steps[activeStep]?.key

  return (
    <AuroraBackground>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Badge style={{ marginBottom: 12 }}>Onboarding cabinet</Badge>
          <h1 style={{ fontSize: 28, fontWeight: 300, margin: '0 0 8px', color: '#fff', letterSpacing: '-0.02em' }}>
            Bienvenue chez Courtia
          </h1>
          <p style={{ color: 'var(--aurora-text-secondary)', fontSize: 15, margin: 0 }}>
            Quelques minutes pour configurer votre cockpit. Tout est modifiable ensuite.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--aurora-text-muted)' }}>
              Étape {activeStep + 1} sur {steps.length}
            </span>
            <span style={{ fontSize: 13, color: 'var(--aurora-accent)', fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--aurora-accent), var(--aurora-rose-soft))', borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
            {steps.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setActiveStep(i)}
                style={{
                  width: i === activeStep ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  border: 'none',
                  background: i === activeStep ? 'var(--aurora-accent)' : s.done ? 'var(--aurora-emerald-soft)' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                aria-label={`Étape ${i + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <GlassCard style={{ padding: 32 }}>
          {/* STEP 0: Profile */}
          {currentStepKey === 'profile' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Building2 size={22} style={{ color: 'var(--aurora-accent)' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#fff' }}>Votre cabinet</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--aurora-text-muted)' }}>Identité professionnelle et conformité</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  label="Nom du cabinet"
                  placeholder="Ex: Martin Assurances"
                  value={profile.cabinet_name}
                  onChange={(e) => setProfile({ ...profile, cabinet_name: e.target.value })}
                />
                <Input
                  label="Numéro ORIAS"
                  placeholder="Ex: 24001234"
                  value={profile.orias_number}
                  onChange={(e) => setProfile({ ...profile, orias_number: e.target.value })}
                />
                <Input
                  label="Ville d'exercice"
                  placeholder="Ex: Lyon"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={saveProfile}
                  loading={savingStep === 'profile'}
                  disabled={!profile.cabinet_name}
                >
                  Continuer <ArrowRight size={15} style={{ marginLeft: 4 }} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: Portfolio */}
          {currentStepKey === 'portefeuille' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Briefcase size={22} style={{ color: 'var(--aurora-accent)' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#fff' }}>Votre portefeuille</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--aurora-text-muted)' }}>Pour que Courtia s'adapte à votre activité</p>
                </div>
              </div>

              <p style={{ fontSize: 14, color: 'var(--aurora-text-secondary)', marginBottom: 14 }}>Branches principales</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {BRANCHES.map((b) => {
                  const active = branches.includes(b.key)
                  const Icon = b.icon
                  return (
                    <button
                      key={b.key}
                      onClick={() => toggleBranch(b.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 20,
                        background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#fff' : 'var(--aurora-text-secondary)',
                        fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={14} />
                      {b.label}
                    </button>
                  )
                })}
              </div>

              <Input
                label="Volume approximatif du portefeuille (nombre de clients/contrats)"
                placeholder="Ex: 250"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />

              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="ghost" onClick={() => setActiveStep(0)}>Retour</Button>
                <Button onClick={savePortefeuille} loading={savingStep === 'portefeuille'}>
                  Continuer <ArrowRight size={15} style={{ marginLeft: 4 }} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Priorities */}
          {currentStepKey === 'priorites' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Target size={22} style={{ color: 'var(--aurora-accent)' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#fff' }}>Vos priorités</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--aurora-text-muted)' }}>Ce qui compte le plus dans votre quotidien</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PRIORITES.map((p) => {
                  const active = priorites.includes(p.key)
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePriorite(p.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 12,
                        background: active ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        border: `2px solid ${active ? 'var(--aurora-accent)' : 'rgba(255,255,255,0.2)'}`,
                        background: active ? 'var(--aurora-accent)' : 'transparent',
                        flexShrink: 0, transition: 'all 0.2s',
                      }}>
                        {active && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--aurora-text-muted)', marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="ghost" onClick={() => setActiveStep(1)}>Retour</Button>
                <Button onClick={savePriorites} loading={savingStep === 'priorites'}>
                  Continuer <ArrowRight size={15} style={{ marginLeft: 4 }} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Import */}
          {currentStepKey === 'import' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <FileSpreadsheet size={22} style={{ color: 'var(--aurora-accent)' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#fff' }}>Import clients</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--aurora-text-muted)' }}>Optionnel — vous pouvez commencer sans import</p>
                </div>
              </div>

              <p style={{ fontSize: 14, color: 'var(--aurora-text-secondary)', lineHeight: 1.6 }}>
                Si vous avez un fichier Excel ou CSV de vos clients, importez-le maintenant.
                Courtia détecte automatiquement les colonnes et vous aide à faire le mapping.
                Formats acceptés : .xlsx, .xls, .csv
              </p>

              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Button variant="ghost" onClick={() => {
                  markDone('import')
                  setActiveStep(4)
                }}>
                  Plus tard
                </Button>
                <Button onClick={goToImport}>
                  Importer un fichier <ArrowRight size={15} style={{ marginLeft: 4 }} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: First Action */}
          {currentStepKey === 'premiere_action' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Sparkles size={22} style={{ color: 'var(--aurora-accent)' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#fff' }}>Première action</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--aurora-text-muted)' }}>Votre cockpit est prêt. Choisissez par où commencer.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={goToClientNew}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 20px', borderRadius: 12,
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                    color: '#fff', fontSize: 14,
                  }}
                >
                  <Users size={18} />
                  <div>
                    <strong>Créer votre première fiche client</strong>
                    <div style={{ fontSize: 12, color: 'var(--aurora-text-muted)', marginTop: 2 }}>Ouvrez une fiche et découvrez le cockpit en contexte réel.</div>
                  </div>
                  <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>

                <button
                  onClick={goToBrief}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 20px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                    color: '#fff', fontSize: 14,
                  }}
                >
                  <Sparkles size={18} />
                  <div>
                    <strong>Lancer votre Morning Brief</strong>
                    <div style={{ fontSize: 12, color: 'var(--aurora-text-muted)', marginTop: 2 }}>ARK prépare vos priorités du jour.</div>
                  </div>
                  <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </div>

              <div style={{ marginTop: 28, textAlign: 'center' }}>
                <Button onClick={goToCockpit}>
                  Accéder au cockpit <ArrowRight size={15} style={{ marginLeft: 4 }} />
                </Button>
                <p style={{ fontSize: 12, color: 'var(--aurora-text-muted)', marginTop: 8 }}>
                  Tout est modifiable ensuite depuis Paramètres.
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Skip link */}
        {currentStepKey !== 'premiere_action' && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={goToCockpit}
              style={{
                background: 'none', border: 'none',
                color: 'var(--aurora-text-muted)', fontSize: 13,
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Passer l'onboarding, accéder au cockpit
            </button>
          </div>
        )}
      </div>
    </AuroraBackground>
  )
}
