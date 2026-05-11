import { useState, useEffect } from 'react'
import {
  Brain, AlertTriangle, TrendingUp, Calendar, Sparkles, Loader2,
  ArrowRight, Phone, Gift, Users, Target, Zap, RefreshCw,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import { VibeBackdrop } from '../components/vibe'
import api from '../api'
import toast from 'react-hot-toast'

const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  cyan: '#22D3EE',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)

// ────────────────────────────────────────────────────────────
// WIDGET 1 — CHURN PREDICTOR
// ────────────────────────────────────────────────────────────
function ChurnPredictor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  async function run() {
    setLoading(true)
    try {
      const res = await api.post('/ark-intelligence/churn-predict')
      setData(res.data)
      toast.success(`Scan churn terminé — ${res.data.at_risk_count} clients à risque`)
    } catch (err) {
      toast.error('Erreur scan churn')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [])

  const riskColor = (level) => ({
    critical: T.danger, high: '#FB923C', medium: T.warning, low: T.success,
  }[level] || T.textSecondary)

  return (
    <SimpleCard padding={24}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color={T.danger} />
          </div>
          <div>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Churn Predictor ARK</h3>
            <p style={{ color: T.textSecondary, fontSize: 12, margin: '2px 0 0' }}>Clients à risque de perte — Top 20</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          style={{
            background: 'rgba(139,92,246,0.12)', color: T.ark,
            border: '1px solid rgba(139,92,246,0.25)',
            padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Re-scanner
        </button>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatBox label="Clients scannés" value={data.total_clients_scanned} color={T.text} />
          <StatBox label="À risque" value={data.at_risk_count} color={T.danger} />
          <StatBox label="Score moyen" value={`${data.average_score}/100`} color={T.warning} />
          <StatBox label="Top risques" value={data.top_risks?.length || 0} color={T.ark} />
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: T.textSecondary }}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {data?.top_risks?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {data.top_risks.map((r) => (
            <div
              key={r.client_id}
              onClick={() => setSelected(r)}
              style={{
                background: T.cardBg,
                border: `1px solid ${riskColor(r.risk_level)}40`,
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                boxShadow: r.score >= 75 ? `0 0 30px ${riskColor(r.risk_level)}20` : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = riskColor(r.risk_level)}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = `${riskColor(r.risk_level)}40`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{r.client_name}</div>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{r.city || 'Ville n/a'}</div>
                </div>
                <div style={{
                  background: `${riskColor(r.risk_level)}20`,
                  color: riskColor(r.risk_level),
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {r.score}/100
                </div>
              </div>
              <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Risque {r.risk_level}
              </div>
              {r.factors?.slice(0, 2).map((f, idx) => (
                <div key={idx} style={{ color: T.textSecondary, fontSize: 11, marginBottom: 3 }}>
                  • {f.label}
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: T.textMuted, fontSize: 11 }}>LTV : {fmtEur(r.lifetime_value)}</span>
                <span style={{ color: T.ark, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Plan ARK <ArrowRight size={11} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <RetentionPlanModal client={selected} onClose={() => setSelected(null)} />}
    </SimpleCard>
  )
}

function RetentionPlanModal({ client, onClose }) {
  const plan = client.retention_plan || {}
  const iconFor = (type) => type === 'appel' ? Phone : type === 'offre' ? Gift : Calendar
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0A0A18',
          border: '1px solid rgba(139,92,246,0.30)',
          borderRadius: 16, padding: 28, maxWidth: 600, width: '90%',
          boxShadow: '0 0 80px rgba(139,92,246,0.20)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Sparkles size={20} color={T.ark} />
          <div>
            <h3 style={{ color: T.text, fontSize: 18, margin: 0 }}>Plan de rétention ARK</h3>
            <p style={{ color: T.textSecondary, fontSize: 12, margin: '2px 0 0' }}>
              {client.client_name} — Score {client.score}/100 — Urgence {plan.urgency}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.20)',
          borderRadius: 8, padding: 12, marginBottom: 16,
        }}>
          <div style={{ color: T.ark, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
            🎯 FOCUS — Taux récupération estimé : {plan.estimated_recovery_pct}%
          </div>
          <div style={{ color: T.text, fontSize: 13 }}>{plan.focus}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(plan.steps || []).map((step, idx) => {
            const Icon = iconFor(step.type)
            return (
              <div key={idx} style={{
                background: T.cardBg, border: `1px solid ${T.cardBorder}`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(91,77,245,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} color={T.accent} />
                  </div>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>
                    Étape {step.ordre} — {step.titre}
                  </div>
                </div>
                <div style={{ color: T.textSecondary, fontSize: 12, lineHeight: 1.5 }}>
                  {step.script}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: T.textSecondary,
              border: `1px solid ${T.cardBorder}`, padding: '8px 14px',
              borderRadius: 8, fontSize: 12, cursor: 'pointer',
            }}
          >
            Fermer
          </button>
          <button
            onClick={() => { toast.success('Plan ajouté aux tâches ✓'); onClose() }}
            style={{
              background: T.accent, color: 'white',
              border: 'none', padding: '8px 16px',
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Lancer le plan ↗
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// WIDGET 2 — CROSS-SELL ENGINE
// ────────────────────────────────────────────────────────────
function CrossSellMatrix() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/ark-intelligence/cross-sell/matrix')
      setData(res.data)
    } catch (err) {
      toast.error('Erreur cross-sell')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const heatColor = (score, owned) => {
    if (owned) return 'rgba(255,255,255,0.04)'
    if (score >= 80) return 'rgba(239,68,68,0.35)'    // très chaud
    if (score >= 60) return 'rgba(251,146,60,0.30)'   // chaud
    if (score >= 40) return 'rgba(245,158,11,0.20)'   // tiède
    if (score >= 20) return 'rgba(34,211,238,0.10)'   // froid
    return 'rgba(255,255,255,0.02)'                    // glacé
  }

  return (
    <SimpleCard padding={24}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(34,211,238,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={20} color={T.cyan} />
          </div>
          <div>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Cross-Sell Engine</h3>
            <p style={{ color: T.textSecondary, fontSize: 12, margin: '2px 0 0' }}>Matrice client × produit — opportunités</p>
          </div>
        </div>
        {data && (
          <div style={{
            background: 'rgba(34,197,94,0.12)', color: T.success,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
          }}>
            Potentiel total : {fmtEur(data.total_potential_eur)}/an
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color={T.textSecondary} />
        </div>
      )}

      {data?.clients?.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={thStyle}>Client</th>
                {data.products.map((p) => (
                  <th key={p} style={{ ...thStyle, textAlign: 'center' }}>{p}</th>
                ))}
                <th style={{ ...thStyle, textAlign: 'right' }}>Total €/an</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.slice(0, 12).map((c) => (
                <tr key={c.client_id}>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: T.text, borderBottom: `1px solid ${T.cardBorder}` }}>
                    <div style={{ fontWeight: 600 }}>{c.client_name || `Client #${c.client_id}`}</div>
                    <div style={{ color: T.textMuted, fontSize: 10 }}>{c.city}</div>
                  </td>
                  {data.products.map((p) => {
                    const opp = c.opportunities.find(o => o.product === p)
                    const owned = opp?.status === 'owned'
                    return (
                      <td
                        key={p}
                        style={{
                          background: heatColor(opp?.score || 0, owned),
                          textAlign: 'center', padding: 10,
                          borderBottom: `1px solid ${T.cardBorder}`,
                          cursor: opp && !owned && opp.score >= 30 ? 'pointer' : 'default',
                        }}
                        title={opp?.rationale || ''}
                        onClick={() => {
                          if (opp && !owned && opp.score >= 30) {
                            toast.success(`Devis ${p} pour ${c.client_name}… (ouverture comparateur)`)
                          }
                        }}
                      >
                        {owned ? (
                          <span style={{ color: T.textMuted, fontSize: 11 }}>✓</span>
                        ) : opp?.score >= 30 ? (
                          <div>
                            <div style={{ color: T.text, fontWeight: 700, fontSize: 11 }}>{opp.score}</div>
                            <div style={{ color: T.textSecondary, fontSize: 9 }}>{fmtEur(opp.estimated_eur)}</div>
                          </div>
                        ) : (
                          <span style={{ color: T.textMuted, fontSize: 10 }}>—</span>
                        )}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 8px', fontSize: 12, color: T.cyan, fontWeight: 700, textAlign: 'right', borderBottom: `1px solid ${T.cardBorder}` }}>
                    {fmtEur(c.total_opportunity_eur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.clients?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.textSecondary }}>
          Aucun client à analyser pour le moment.
        </div>
      )}
    </SimpleCard>
  )
}

const thStyle = {
  padding: '10px 8px', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: T.textMuted, textAlign: 'left',
  borderBottom: `1px solid ${T.cardBorder}`,
}

// ────────────────────────────────────────────────────────────
// WIDGET 3 — RENEWAL OPTIMIZER
// ────────────────────────────────────────────────────────────
function RenewalOptimizer() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/ark-intelligence/renewals/optimize')
      setData(res.data)
    } catch (err) {
      toast.error('Erreur renewals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <SimpleCard padding={24}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(91,77,245,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={20} color={T.accent} />
          </div>
          <div>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Renewal Optimizer</h3>
            <p style={{ color: T.textSecondary, fontSize: 12, margin: '2px 0 0' }}>Contrats à échéance &lt; 90j — recommandation ARK</p>
          </div>
        </div>
        {data && (
          <div style={{
            background: 'rgba(34,197,94,0.12)', color: T.success,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
          }}>
            Économie potentielle : {fmtEur(data.total_potential_saving_eur)}
          </div>
        )}
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatBox label="Contrats 90j" value={data.total_contracts_90d} color={T.text} />
          <StatBox label="À migrer" value={data.migrate_count} color={T.warning} />
          <StatBox label="À reconduire" value={data.renew_count} color={T.success} />
        </div>
      )}

      {/* Timeline horizontale 90j */}
      {data?.renewals?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Timeline 90 jours
          </div>
          <div style={{
            position: 'relative',
            height: 70,
            background: 'linear-gradient(to right, rgba(239,68,68,0.10), rgba(245,158,11,0.10), rgba(34,197,94,0.06))',
            borderRadius: 10,
            border: `1px solid ${T.cardBorder}`,
            marginBottom: 20,
            padding: '10px 0',
          }}>
            {data.renewals.map((r, idx) => {
              const pct = Math.min(98, Math.max(2, (Math.max(0, r.days_to_echeance) / 90) * 100))
              const color = r.recommendation === 'migrate' ? T.warning : T.success
              return (
                <div
                  key={r.contract_id}
                  title={`${r.client_name} — ${r.product} — J-${r.days_to_echeance}\n${r.rationale}`}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 10 + (idx % 3) * 16,
                    width: 14, height: 14,
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid rgba(0,0,0,0.5)',
                    boxShadow: `0 0 12px ${color}80`,
                    cursor: 'pointer',
                  }}
                />
              )
            })}
            <div style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 9, color: T.textMuted }}>Auj.</div>
            <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 9, color: T.textMuted }}>J+90</div>
          </div>

          {/* Liste détaillée */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.renewals.slice(0, 8).map((r) => (
              <div
                key={r.contract_id}
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 10, padding: 12,
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 120px 100px',
                  gap: 10, alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{r.client_name}</div>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{r.product} — J-{r.days_to_echeance}</div>
                </div>
                <div>
                  <div style={{ color: T.textSecondary, fontSize: 10, textTransform: 'uppercase' }}>Actuel</div>
                  <div style={{ color: T.text, fontSize: 12 }}>{r.current_provider}</div>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{fmtEur(r.current_premium_eur)}</div>
                </div>
                <div>
                  <div style={{ color: T.textSecondary, fontSize: 10, textTransform: 'uppercase' }}>Recommandé</div>
                  <div style={{ color: T.text, fontSize: 12 }}>{r.recommended_provider}</div>
                  <div style={{ color: r.saving_eur > 30 ? T.success : T.textMuted, fontSize: 11 }}>
                    {r.saving_eur > 0 ? `−${fmtEur(r.saving_eur)}` : 'équivalent'}
                  </div>
                </div>
                <div>
                  <span style={{
                    background: r.recommendation === 'migrate' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                    color: r.recommendation === 'migrate' ? T.warning : T.success,
                    padding: '3px 8px', borderRadius: 6,
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {r.recommendation === 'migrate' ? '↗ Migrer' : '↻ Renouveler'}
                  </span>
                </div>
                <button
                  onClick={() => toast.success(`Préparation ${r.product} pour ${r.client_name}…`)}
                  style={{
                    background: 'rgba(139,92,246,0.12)', color: T.ark,
                    border: '1px solid rgba(139,92,246,0.25)',
                    padding: '6px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                  }}
                >
                  <Zap size={11} /> ARK
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.renewals?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.textSecondary }}>
          Aucune échéance proche dans les 90 jours.
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color={T.textSecondary} />
        </div>
      )}
    </SimpleCard>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 10, padding: 12,
    }}>
      <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ────────────────────────────────────────────────────────────
export default function ArkIntelligence() {
  return (
    <>
      <VibeBackdrop intensity="medium" />
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageHeader
          breadcrumb={[{ label: 'ARK IA', to: '/assistant-ark' }, { label: 'Intelligence prédictive' }]}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Brain size={26} color={T.ark} />
              ARK Intelligence prédictive
            </span>
          }
          subtitle="3 moteurs ML cockpit — Churn · Cross-Sell · Renouvellement"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChurnPredictor />
          <CrossSellMatrix />
          <RenewalOptimizer />
        </div>
      </div>
    </>
  )
}
