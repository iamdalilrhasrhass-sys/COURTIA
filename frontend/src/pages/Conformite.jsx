import { useState, useEffect } from 'react'
import { Shield, FileCheck, UserCheck, FileText, Download, AlertCircle, Loader2 } from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import {
  CONFORMITE_NEUTRE,
  protectionDonneesAffichee,
  produitsAffiches,
  referentielConformite,
  sigleChecklist,
} from '../lib/affichageConformite'
import api from '../api'
import toast from 'react-hot-toast'

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
  // l'API seule, sinon il est neutre. Voir `referentielConformite`
  // (lib/affichageConformite.js) : l'écran n'écrit plus « ACPR » en dur — c'était
  // le défaut mesuré sur un cabinet suisse, où l'ACPR n'a aucune compétence.
  const conformite = referentielConformite(dashboard)
  const conformiteExport = conformite.export || CONFORMITE_NEUTRE.export
  const checklistItems = conformite.checklist_items || CONFORMITE_NEUTRE.checklist_items
  // Sigle de la checklist : « DDA » n'a de sens que sur le marché français.
  const sigleChecklistMarche = sigleChecklist(conformite)
  // Mentions de protection des données du marché (nLPD/PFPDT en Suisse,
  // RGPD/CNIL en France) et familles de produits du marché : l'écran ne les
  // compose pas lui-même, il affiche ce que l'API a servi pour CE cabinet
  // (constats d'audit CH-026 et CH-039).
  const protectionDonnees = protectionDonneesAffichee(conformite)
  const produits = produitsAffiches(conformite)

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
          <ComplianceCard icon={FileCheck} title={sigleChecklistMarche ? `${sigleChecklistMarche} Conformité` : 'Conformité'} value={`${dashboard.dda.coverage_pct}%`} subtitle={`${dashboard.dda.conforme || 0} clients conformes / ${dashboard.total_clients}`} color={T.success} />
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
                {/* ── MENTIONS DE PROTECTION DES DONNÉES DU MARCHÉ ────────────
                    Constat d'audit CH-026 : ce bloc était écrit en dur
                    (« 📋 RGPD & Mentions légales · CGV · CGU · DPA · RGPD »)
                    et s'affichait à TOUS les cabinets, suisses compris. Il est
                    maintenant servi par l'API pour le marché du cabinet :
                    nLPD / PFPDT (finalités, catégories de données, durée de
                    conservation, droits, sous-traitants, localisation) en
                    Suisse, RGPD / CNIL en France. Un élément que le cabinet n'a
                    pas renseigné est affiché comme tel — jamais rempli par une
                    valeur plausible. */}
                <BlocProtectionDonnees protection={protectionDonnees} />

                {/* ── FAMILLES DE PRODUITS DU MARCHÉ ──────────────────────────
                    Constat d'audit CH-039 : la liste de produits restait
                    française pour un cabinet suisse. Elle vient désormais de
                    `backend/services/referentielProduits` (LAMal, LCA, LAA,
                    LPP, 3e pilier… en Suisse ; IARD, santé, auto… en France).
                    Sans réponse de l'API, aucune famille n'est affichée. */}
                <BlocProduits produits={produits} />
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

/**
 * Mentions de protection des données du marché (constat d'audit CH-026).
 *
 * Composant SÉPARÉ et exporté pour une raison précise : il est rendu tel quel
 * par le test `Conformite.blocs.test.jsx` (`renderToStaticMarkup`), qui prouve
 * sans navigateur qu'un cabinet suisse voit la nLPD (et aucun mot du RGPD) et
 * qu'un cabinet français voit le RGPD et la CNIL. Le composant ne décide RIEN :
 * tout ce qu'il affiche vient du référentiel servi par l'API.
 */
export function BlocProtectionDonnees({ protection }) {
  const bloc = protection || {}
  const elements = Array.isArray(bloc.elements) ? bloc.elements : []
  const pages = Array.isArray(bloc.pages_legales) ? bloc.pages_legales : []
  const sources = bloc.sources && typeof bloc.sources === 'object' ? Object.values(bloc.sources) : []

  return (
    <div style={{ marginTop: 20, padding: 14, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.20)', borderRadius: 8 }}>
      <strong style={{ color: T.cyan }}>{bloc.libelle_ecran}</strong>
      {bloc.referentiel_libelle ? (
        <p style={{ color: T.textSecondary, fontSize: 12, margin: '6px 0 0' }}>
          {bloc.referentiel_libelle}
          {bloc.autorite_libelle ? ` · Autorité : ${bloc.autorite_libelle}` : ''}
        </p>
      ) : null}
      {bloc.resume ? (
        <p style={{ color: T.textSecondary, fontSize: 12, margin: '6px 0 0' }}>{bloc.resume}</p>
      ) : null}
      {pages.length > 0 ? (
        <p style={{ color: T.textMuted, fontSize: 12, margin: '6px 0 0' }}>{pages.join(' · ')}</p>
      ) : null}
      {elements.length > 0 ? (
        <ul style={{ color: T.textSecondary, fontSize: 12, lineHeight: 1.7, paddingLeft: 16, margin: '10px 0 0' }}>
          {elements.map((element) => (
            <li key={element.cle}>
              {element.libelle}
              {element.reference ? <span style={{ color: T.textMuted }}> — {element.reference}</span> : null}
              {' : '}
              {/* Un élément non renseigné est affiché comme tel : la page ne
                  fabrique ni durée de conservation, ni sous-traitant. */}
              <span style={{ color: element.a_renseigner ? T.warning : T.text, fontWeight: element.a_renseigner ? 600 : 500 }}>
                {element.texte}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {sources.length > 0 ? (
        <p style={{ color: T.textMuted, fontSize: 11, margin: '10px 0 0' }}>Sources : {sources.join(' · ')}</p>
      ) : null}
    </div>
  )
}

/**
 * Familles de produits du marché (constat d'audit CH-039). Composant exporté
 * pour être rendu par le test, comme le bloc de protection des données. Sans
 * réponse de l'API, la liste est VIDE et la page le dit : elle ne retombe pas
 * sur une liste française.
 */
export function BlocProduits({ produits }) {
  const bloc = produits || {}
  const familles = Array.isArray(bloc.familles) ? bloc.familles : []

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ color: T.text, fontSize: 14, margin: '0 0 4px' }}>
        Produits du marché{bloc.pays ? ` — ${bloc.pays}` : ''}
      </h4>
      {familles.length > 0 ? (
        <>
          <ul style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
            {familles.map((famille) => (
              <li key={famille.code || famille.libelle}>{famille.libelle}</li>
            ))}
          </ul>
          {bloc.note ? (
            <p style={{ color: T.textMuted, fontSize: 11, margin: '8px 0 0' }}>{bloc.note}</p>
          ) : null}
        </>
      ) : (
        <p style={{ color: T.warning, fontSize: 12, margin: 0 }}>
          {bloc.message_indisponible || "Le référentiel de produits du marché n'a pas pu être chargé."}
        </p>
      )}
    </div>
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
