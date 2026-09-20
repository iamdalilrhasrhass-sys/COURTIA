import { useState, useEffect } from 'react'
import { Shield, FileCheck, UserCheck, FileText, Download, AlertCircle, Loader2 } from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import api from '../api'
import toast from 'react-hot-toast'

const CONFORMITE_NEUTRE = {
  marche: null,
  autorite: null,
  chapeau: 'Registre de conformité · KYC · Mandats · Audit logs · Export',
  checklist_titre: 'Checklist de conformité',
  // Étapes génériques du devoir de conseil : vraies en France comme en
  // Suisse, elles ne nomment ni autorité, ni texte, ni pièce propre à un
  // marché (pas d'IPID, pas de « fiche conseil »).
  checklist_items: [
    'Besoin client exprimé',
    'Devoir de conseil documenté',
    'Documents remis au client',
    'Informations marché transmises',
    'Fiche synthèse signée',
  ],
  export: {
    libelle: 'Exporter le registre de conformité',
    fichier: `registre-conformite-${new Date().getFullYear()}.json`,
    // Aucune route par défaut : sans réponse de l'API on ne sait pas quel
    // registre exporter, et on n'en invente pas un.
    route: null,
  },
}

/**
 * Repli FRANÇAIS — utilisé UNIQUEMENT quand l'API a répondu en annonçant le
 * marché FR (elle seule connaît le pays du cabinet). Il n'est plus le repli
 * par défaut : c'est exactement ce qui faisait apparaître « ACPR » chez un
 * cabinet suisse quand l'API tardait ou échouait.
 */
const CONFORMITE_DEFAUT_FR = {
  marche: 'FR',
  autorite: 'ACPR',
  chapeau: 'DDA · KYC · Mandats · Audit logs · Export ACPR',
  checklist_titre: 'Checklist DDA (Directive Distribution Assurance)',
  checklist_items: [
    'Besoin client exprimé',
    'Devoir de conseil documenté',
    'Documents remis au client (notice, IPID, fiche conseil)',
    'Informations marché transmises',
    'Fiche synthèse signée',
  ],
  export: {
    libelle: 'Export ACPR',
    fichier: `rapport-acpr-${new Date().getFullYear()}.json`,
    route: '/conformite/export-acpr',
  },
}

/**
 * Référentiel affiché par l'écran.
 *
 * POURQUOI cette fonction : le repli est le point où l'ACPR s'imposait à un
 * cabinet suisse. Ici, le repli français n'est retenu que si l'API a répondu
 * en annonçant `marche: 'FR'` ; dans TOUS les autres cas (API en attente, API
 * en échec, marché CH, marché absent) on affiche un libellé neutre, sans
 * autorité nommée. On ne fabrique jamais un référentiel plausible mais faux.
 */
function referentielConformite(dashboard) {
  const reponse = dashboard?.conformite
  if (reponse && typeof reponse === 'object') {
    const repli = String(reponse.marche || '').toUpperCase() === 'FR'
      ? CONFORMITE_DEFAUT_FR
      : CONFORMITE_NEUTRE
    return {
      ...repli,
      ...reponse,
      checklist_items: reponse.checklist_items || repli.checklist_items,
      export: { ...repli.export, ...(reponse.export || {}) },
    }
  }
  // Pas de bloc conformite : la seule chose que l'API peut nous avoir dite du
  // marché est `dashboard.marche`. Elle n'a rien dit → neutre.
  return String(dashboard?.marche || '').toUpperCase() === 'FR'
    ? CONFORMITE_DEFAUT_FR
    : CONFORMITE_NEUTRE
}

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

export default function Conformite() {
  const [dashboard, setDashboard] = useState(null)
  const [mandats, setMandats] = useState([])
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('overview')
  // Échec de chargement : on l'affiche tel quel. Avant, l'écran restait sur un
  // spinner puis retombait silencieusement sur un référentiel français — un
  // cabinet suisse pouvait donc lire « ACPR » sans qu'aucune API n'ait parlé.
  const [erreur, setErreur] = useState(false)

  async function load() {
    setErreur(false)
    try {
      const [d, m, l] = await Promise.all([
        api.get('/conformite/dashboard'),
        api.get('/conformite/mandats').catch(() => ({ data: { mandats: [] } })),
        api.get('/conformite/audit-logs').catch(() => ({ data: { logs: [] } })),
      ])
      setDashboard(d.data)
      setMandats(m.data.mandats || [])
      setLogs(l.data.logs || [])
    } catch (err) {
      setErreur(true)
      toast.error('Conformité indisponible')
    }
  }
  useEffect(() => { load() }, [])

  // Référentiel affiché (marche, autorité, libellés d'export) : il vient de
  // l'API seule, sinon il est neutre. Voir `referentielConformite` plus haut :
  // l'écran n'écrit plus « ACPR » en dur — c'était le défaut mesuré sur un
  // cabinet suisse, où l'ACPR n'a aucune compétence.
  const conformite = referentielConformite(dashboard)
  const conformiteExport = conformite.export || CONFORMITE_NEUTRE.export
  const checklistItems = conformite.checklist_items || CONFORMITE_NEUTRE.checklist_items
  // Sigle de la checklist : « DDA » n'a de sens que sur le marché français.
  const sigleChecklist = conformite.marche === 'FR' ? 'DDA' : null

  async function exporterConformite() {
    // Sans route connue, on ne sait pas quel registre exporter : le dire est
    // plus honnête que de télécharger un fichier d'un autre marché.
    if (!conformiteExport.route) {
      toast.error("Export indisponible : le registre du cabinet n'a pas pu être chargé")
      return
    }
    try {
      const res = await api.get(conformiteExport.route)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = conformiteExport.fichier || `registre-conformite-${new Date().getFullYear()}.json`
      a.click()
      toast.success(`${conformiteExport.libelle} généré ✓`)
    } catch {
      toast.error(`Erreur lors de l'export : ${conformiteExport.libelle}`)
    }
  }

  if (erreur && !dashboard) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <AlertCircle size={28} color={T.warning} />
      {/* Aucune autorité, aucun sigle : on ne sait rien du référentiel du
          cabinet, donc on n'en affiche aucun. */}
      <p style={{ color: T.text, fontSize: 14, margin: 0, textAlign: 'center' }}>
        Le registre de conformité n'a pas pu être chargé.
      </p>
      <p style={{ color: T.textSecondary, fontSize: 12.5, margin: 0, textAlign: 'center', maxWidth: 420 }}>
        Aucune donnée de conformité n'est affichée tant que la réponse du serveur n'est pas arrivée :
        le référentiel du cabinet vient de cette réponse, jamais d'une valeur par défaut.
      </p>
      <button onClick={load} style={{
        background: 'rgba(34,211,238,0.12)', color: T.cyan,
        border: '1px solid rgba(34,211,238,0.25)', padding: '8px 16px',
        borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
      }}>Réessayer</button>
    </div>
  )

  if (!dashboard) return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="animate-spin" color={T.ark} />
    </div>
  )

  return (
    <>
      <VibeBackdrop intensity="low" />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageHeader
          breadcrumb={[{ label: 'Cabinet', to: '/parametres' }, { label: 'Conformité' }]}
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color={T.cyan} /> Conformité courtage
          </span>}
          subtitle={conformite.chapeau}
          action={
            // Le bouton d'export n'apparaît que si l'API a fourni sa route :
            // sans elle, on ne propose pas un téléchargement d'un autre marché.
            conformiteExport.route ? (
              <button onClick={exporterConformite} style={{
                background: 'rgba(34,211,238,0.12)', color: T.cyan,
                border: '1px solid rgba(34,211,238,0.25)',
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Download size={12} /> {conformiteExport.libelle}
              </button>
            ) : null
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {/* Les intitulés de conformité suivent le référentiel du marché :
              « DDA » est un sigle français, il n'est affiché qu'en France. */}
          <ComplianceCard icon={FileCheck} title={sigleChecklist ? `${sigleChecklist} Conformité` : 'Conformité'} value={`${dashboard.dda.coverage_pct}%`} subtitle={`${dashboard.dda.conforme || 0} clients conformes / ${dashboard.total_clients}`} color={T.success} />
          <ComplianceCard icon={UserCheck} title="KYC Vérifié" value={`${dashboard.kyc.coverage_pct}%`} subtitle={`${dashboard.kyc.verified || 0} clients vérifiés`} color={T.cyan} />
          <ComplianceCard icon={FileText} title="Mandats actifs" value={dashboard.mandats.active || 0} subtitle={`${dashboard.mandats.expired || 0} expirés`} color={T.accent} />
          <ComplianceCard icon={AlertCircle} title="À traiter" value={(dashboard.dda.pending || 0) + (dashboard.dda.incomplete || 0)} subtitle="checklists de conformité" color={T.warning} />
        </div>

        <SimpleCard padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.cardBorder}` }}>
            {['overview', 'mandats', 'audit'].map(k => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  flex: 1, padding: '12px 16px',
                  background: tab === k ? 'rgba(91,77,245,0.08)' : 'transparent',
                  color: tab === k ? T.accent : T.textSecondary,
                  border: 'none', borderBottom: tab === k ? `2px solid ${T.accent}` : '2px solid transparent',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {k === 'overview' ? 'Vue d\'ensemble' : k === 'mandats' ? 'Mandats' : 'Audit logs'}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {tab === 'overview' && (
              <div>
                <h4 style={{ color: T.text, fontSize: 14, margin: '0 0 12px' }}>{conformite.checklist_titre}</h4>
                {/* Les étapes viennent du référentiel du marché (API) ; en
                    l'absence de réponse elles restent génériques : la liste
                    française nommait « notice, IPID, fiche conseil », propres
                    au marché français. */}
                <ul style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
                  {checklistItems.map((item) => (
                    <li key={item}>✅ {item}</li>
                  ))}
                </ul>
                <div style={{ marginTop: 20, padding: 14, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.20)', borderRadius: 8 }}>
                  <strong style={{ color: T.cyan }}>📋 RGPD & Mentions légales</strong>
                  <p style={{ color: T.textSecondary, fontSize: 12, margin: '6px 0 0' }}>
                    Toutes les pages légales sont accessibles depuis le footer public :
                    Mentions légales · CGV · CGU · Politique de confidentialité · DPA · RGPD · Sous-traitants
                  </p>
                </div>
              </div>
            )}
            {tab === 'mandats' && (
              <div>
                {mandats.length === 0 ? (
                  <div style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center', padding: 30 }}>
                    Aucun mandat enregistré.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Référence</th>
                        <th style={thStyle}>Client</th>
                        <th style={thStyle}>Signé le</th>
                        <th style={thStyle}>Expire le</th>
                        <th style={thStyle}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mandats.map(m => (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                          <td style={{ padding: 10, fontSize: 12, color: T.text }}>{m.reference || `M-${m.id}`}</td>
                          <td style={{ padding: 10, fontSize: 12, color: T.text }}>{m.first_name} {m.last_name}</td>
                          <td style={{ padding: 10, fontSize: 12, color: T.textSecondary }}>{m.signed_at || '—'}</td>
                          <td style={{ padding: 10, fontSize: 12, color: T.textSecondary }}>{m.expires_at || '—'}</td>
                          <td style={{ padding: 10 }}>
                            <span style={{
                              background: m.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                              color: m.status === 'active' ? T.success : T.warning,
                              padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                            }}>{m.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {tab === 'audit' && (
              <div>
                {logs.length === 0 ? (
                  <div style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center', padding: 30 }}>
                    Aucun log d'audit.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {logs.slice(0, 50).map(l => (
                      <div key={l.id} style={{ padding: 10, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 6, fontSize: 12, color: T.textSecondary }}>
                        <span style={{ color: T.text, fontWeight: 600 }}>{l.action}</span> — {l.created_at}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SimpleCard>
      </div>
    </>
  )
}

const thStyle = {
  padding: '10px 8px', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: T.textMuted, textAlign: 'left',
  borderBottom: `1px solid ${T.cardBorder}`,
}

function ComplianceCard({ icon: Icon, title, value, subtitle, color }) {
  return (
    <SimpleCard padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ color: T.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{subtitle}</div>
    </SimpleCard>
  )
}
