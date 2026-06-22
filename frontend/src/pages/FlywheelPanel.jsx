import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitBranch, Sparkles } from 'lucide-react'
import api from '../api'

const VERTICAL_LABELS = {
  assurance: 'Assurance',
  credit_immobilier: 'Crédit immobilier',
  immobilier: 'Immobilier',
}

const RELATION_LABELS = {
  financing: 'Financement',
  insurance: 'Assurance du bien',
  cross_sell: 'Multi-équipement',
}

const VERTICAL_COLORS = {
  immobilier: '#e85cff',
  credit_immobilier: '#22d3ee',
  assurance: '#7c5cff',
}

const euro = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

export default function FlywheelPanel({ clientId }) {
  const params = useParams()
  const navigate = useNavigate()
  const resolvedClientId = clientId || params.id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!resolvedClientId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/ark/clients/${resolvedClientId}/flywheel`)
      setData(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Impossible de charger le flywheel.')
    } finally {
      setLoading(false)
    }
  }, [resolvedClientId])

  useEffect(() => {
    load()
  }, [load])

  const dossiers = data?.dossiers || []
  const links = data?.links || []
  const targetIds = useMemo(() => new Set(links.map((link) => String(link.to_dossier_id))), [links])
  const byId = useMemo(() => Object.fromEntries(dossiers.map((dossier) => [String(dossier.id), dossier])), [dossiers])
  const origins = dossiers.filter((dossier) => !targetIds.has(String(dossier.id)))
  const childrenOf = (id) => links.filter((link) => String(link.from_dossier_id) === String(id))

  return (
    <div style={styles.shell}>
      <div style={styles.auroraA} />
      <div style={styles.auroraB} />
      <div style={styles.container}>
        <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Retour
        </button>

        <div style={styles.kicker}><GitBranch size={14} /> ARK · Chaîne de valeur</div>
        <h1 style={styles.title}>Le flywheel de ce client</h1>
        <p style={styles.subtitle}>Un dossier source peut engendrer crédit + assurance, pré-remplis par la provenance client.</p>

        {error && <div style={styles.error}>⚠ {error}</div>}
        {loading && <div style={styles.empty}>Chargement du flywheel…</div>}
        {!loading && !error && dossiers.length === 0 && (
          <div style={styles.empty}>Aucun dossier ARK pour ce client.</div>
        )}

        {!loading && !error && dossiers.length > 0 && (
          <>
            <div style={styles.totalCard}>
              <div style={styles.totalLabel}>
                <Sparkles size={15} /> Potentiel cumulé · {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''}
              </div>
              <div style={styles.totalValue}>{euro(data.total_potential)}</div>
            </div>

            <div style={styles.chain}>
              {origins.map((origin) => (
                <div key={origin.id} style={styles.branch}>
                  <DossierCard dossier={origin} origin />
                  {childrenOf(origin.id).length > 0 && (
                    <div style={styles.children}>
                      {childrenOf(origin.id).map((link) => {
                        const child = byId[String(link.to_dossier_id)]
                        if (!child) return null
                        return (
                          <div key={`${link.from_dossier_id}-${link.to_dossier_id}`} style={styles.childRow}>
                            <div style={styles.connector}>
                              {RELATION_LABELS[link.relation] || link.relation}
                            </div>
                            <DossierCard dossier={child} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DossierCard({ dossier, origin = false }) {
  const navigate = useNavigate()
  const color = VERTICAL_COLORS[dossier.vertical_key] || '#7c5cff'
  return (
    <div style={{ ...styles.card, borderColor: `${color}66`, boxShadow: origin ? `0 0 34px ${color}33` : 'none' }}>
      <div style={{ ...styles.cardTag, color }}>{VERTICAL_LABELS[dossier.vertical_key] || dossier.vertical_key}</div>
      <div style={styles.cardProduct}>{dossier.product_type}</div>
      <div style={styles.cardMeta}>
        <span style={styles.status}>{dossier.status}</span>
        <span style={{ ...styles.score, color: Number(dossier.completion_score) >= 80 ? '#5cffa6' : color }}>
          {dossier.completion_score || 0} %
        </span>
      </div>
      {Number(dossier.estimated_premium) > 0 && (
        <div style={styles.premium}>{euro(dossier.estimated_premium)}</div>
      )}
      <button
        type="button"
        onClick={() => navigate(`/ark/dossiers/${dossier.id}/advice-note`)}
        style={styles.adviceButton}
      >
        Note conseil
      </button>
      {origin && <div style={styles.originBadge}>Point d’entrée</div>}
    </div>
  )
}

const styles = {
  shell: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
    background: 'radial-gradient(120% 120% at 50% -10%, #15122b 0%, #0a0a12 55%, #07070d 100%)',
    color: '#e9e9f2',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  auroraA: {
    position: 'absolute',
    top: -140,
    left: '18%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(232,92,255,.24), transparent 65%)',
    filter: 'blur(46px)',
  },
  auroraB: {
    position: 'absolute',
    bottom: -180,
    right: -80,
    width: 520,
    height: 520,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,.2), transparent 65%)',
    filter: 'blur(50px)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 820,
    margin: '0 auto',
    padding: '40px 20px 80px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid rgba(255,255,255,.14)',
    background: 'rgba(255,255,255,.06)',
    color: '#e9e9f2',
    borderRadius: 999,
    padding: '8px 13px',
    cursor: 'pointer',
    marginBottom: 26,
  },
  kicker: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#8b86b8',
    fontWeight: 700,
  },
  title: {
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 850,
    margin: '8px 0 7px',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    color: '#b9b6d4',
    margin: 0,
    maxWidth: 620,
  },
  error: {
    marginTop: 22,
    padding: '13px 16px',
    borderRadius: 13,
    background: 'rgba(255,77,109,.12)',
    border: '1px solid rgba(255,77,109,.3)',
    color: '#ffb3c1',
    fontSize: 14,
  },
  empty: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.1)',
    color: '#a9a5ca',
  },
  totalCard: {
    marginTop: 28,
    padding: '19px 22px',
    borderRadius: 18,
    background: 'linear-gradient(90deg, rgba(124,92,255,.16), rgba(34,211,238,.09))',
    border: '1px solid rgba(124,92,255,.28)',
  },
  totalLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#aaa6d0',
    fontWeight: 650,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 850,
    marginTop: 6,
    background: 'linear-gradient(90deg,#7c5cff,#22d3ee,#e85cff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  chain: {
    marginTop: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  branch: {},
  children: {
    marginTop: 14,
    marginLeft: 20,
    paddingLeft: 22,
    borderLeft: '2px dashed rgba(255,255,255,.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  childRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  connector: {
    flexShrink: 0,
    minWidth: 132,
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8b86b8',
    border: '1px solid rgba(255,255,255,.14)',
    borderRadius: 8,
    padding: '5px 9px',
    textAlign: 'center',
  },
  card: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    padding: '17px 18px',
    borderRadius: 16,
    background: 'rgba(255,255,255,.045)',
    border: '1px solid',
    backdropFilter: 'blur(12px)',
  },
  cardTag: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardProduct: {
    fontSize: 18,
    fontWeight: 800,
    color: '#fff',
    marginTop: 4,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  status: {
    fontSize: 12,
    color: '#9893c3',
    textTransform: 'capitalize',
  },
  score: {
    fontSize: 13,
    fontWeight: 800,
  },
  premium: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: 800,
    color: '#ffce54',
  },
  adviceButton: {
    marginTop: 12,
    padding: '7px 11px',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,.14)',
    background: 'rgba(255,255,255,.06)',
    color: '#e9e9f2',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
  },
  originBadge: {
    position: 'absolute',
    top: 13,
    right: 14,
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#0a0a12',
    background: 'linear-gradient(90deg,#e85cff,#7c5cff)',
    borderRadius: 7,
    padding: '3px 8px',
  },
}
