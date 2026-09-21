/* ============================================================================
   COURTIA — ACQUISITION COURTIA
   ----------------------------------------------------------------------------
   Écran interne de pilotage commercial. Il lit le service de capture
   (`GET /api/sales/leads`, `/funnel`, `/summary`) et affiche EXACTEMENT ce que
   le service renvoie :

     * aucun chiffre inventé : ce qui n'est pas mesuré est affiché « non mesuré » ;
     * aucun score sans raison : chaque score ARK expose les points qui le
       composent (`score_details` du service) ;
     * aucune donnée de test dans le commercial : `environment = qa` est exclu
       par défaut (bascule explicite pour l'inclure).

   Ne remplace AUCUN module existant : Prospection, Opportunités, Clients,
   Tâches, Relances, le brief du matin gardent leur rôle. Cet écran est la porte
   d'entrée commerciale des leads captés par le site public.

   Le jeton de lecture n'est pas dans ce fichier : le relais serveur l'ajoute
   (voir src/lib/salesApi.js).
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, Flame, ShieldCheck, Search, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, ExternalLink, Sun,
} from 'lucide-react'
import { chargerLeads, chargerFunnel } from '../lib/salesApi'
import { LIBELLES } from '../lib/libelles'
import {
  NON_MESURE, STATUTS, lignesFunnel, lireScore, progressionDemo, lireHotLead,
  etiquetteStatut, etiquetteQualification, formatDate, formatDateHeure, ouVide,
  provenance, nomLead, couleurScore,
} from '../lib/salesViewModel'

const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.07)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.18)',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
}

const PERIMETRES = [
  { cle: 'production', libelle: 'Production (données de test exclues)', includeQa: false, environment: undefined },
  { cle: 'tous', libelle: 'Tous les périmètres (données de test incluses)', includeQa: true, environment: undefined },
  { cle: 'qa', libelle: 'Données de test uniquement', includeQa: true, environment: 'qa' },
]

const LIMITE = 25

function Badge({ children, ton = 'neutre', titre }) {
  const tons = {
    neutre: { bg: 'rgba(148,163,184,0.14)', color: '#cbd5e1' },
    info: { bg: 'rgba(56,189,248,0.14)', color: '#7dd3fc' },
    actif: { bg: 'rgba(139,92,246,0.16)', color: '#c4b5fd' },
    succes: { bg: 'rgba(34,197,94,0.14)', color: '#86efac' },
    echec: { bg: 'rgba(239,68,68,0.14)', color: '#fca5a5' },
    chaud: { bg: 'rgba(245,158,11,0.16)', color: '#fcd34d' },
  }
  const t = tons[ton] || tons.neutre
  return (
    <span title={titre} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
      borderRadius: 6, fontSize: 10, fontWeight: 700, background: t.bg, color: t.color,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function Valeur({ mesure, taille = 20 }) {
  // « non mesuré » n'est pas un 0 : la distinction est visible à l'œil.
  const estMesure = mesure.estMesure
  return (
    <span style={{
      fontSize: taille, fontWeight: 800, letterSpacing: '-0.02em',
      color: estMesure ? T.text : T.textMuted,
      fontStyle: estMesure ? 'normal' : 'italic',
    }}>{mesure.texte}</span>
  )
}

function Carte({ titre, sousTitre, children, actions }) {
  return (
    <section style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>{titre}</h2>
          {sousTitre && <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textMuted }}>{sousTitre}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export default function AcquisitionCourtia() {
  const navigate = useNavigate()
  const [perimetre, setPerimetre] = useState('production')
  const [statut, setStatut] = useState('')
  const [source, setSource] = useState('')
  const [recherche, setRecherche] = useState('')
  const [rechercheAppliquee, setRechercheAppliquee] = useState('')
  const [offset, setOffset] = useState(0)
  const [nonce, setNonce] = useState(0)

  const [leads, setLeads] = useState(null)
  const [total, setTotal] = useState(0)
  const [funnel, setFunnel] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [luA, setLuA] = useState(null)
  const abortRef = useRef(null)

  const filtre = useMemo(
    () => PERIMETRES.find((p) => p.cle === perimetre) || PERIMETRES[0],
    [perimetre],
  )

  const charger = useCallback(async () => {
    abortRef.current?.abort()
    const controleur = new AbortController()
    abortRef.current = controleur
    setChargement(true)
    setErreur(null)
    try {
      const commun = { environment: filtre.environment, includeQa: filtre.includeQa }
      const [repLeads, repFunnel] = await Promise.all([
        chargerLeads({
          ...commun, statut: statut || undefined, source: source || undefined,
          q: rechercheAppliquee || undefined, limit: LIMITE, offset,
        }, { signal: controleur.signal }),
        chargerFunnel(commun, { signal: controleur.signal }),
      ])
      setLeads(Array.isArray(repLeads?.leads) ? repLeads.leads : [])
      setTotal(Number(repLeads?.total) || 0)
      setFunnel(repFunnel || null)
      setLuA(new Date())
    } catch (err) {
      if (err?.name === 'AbortError') return
      setLeads(null)
      setFunnel(null)
      setErreur(err)
    } finally {
      setChargement(false)
    }
  }, [filtre, statut, source, rechercheAppliquee, offset])

  useEffect(() => { charger() }, [charger, nonce])
  useEffect(() => () => abortRef.current?.abort(), [])

  const etapes = useMemo(() => lignesFunnel(funnel), [funnel])
  const sourcesConnues = useMemo(() => {
    const vues = new Set((leads || []).map((l) => l.source).filter(Boolean))
    return [...vues].sort()
  }, [leads])

  const scores = useMemo(() => (leads || []).map((l) => ({ lead: l, score: lireScore(l) })), [leads])
  const chauds = useMemo(() => (leads || []).filter((l) => lireHotLead(l).chaud), [leads])

  const appliquerRecherche = (e) => {
    e.preventDefault()
    setOffset(0)
    setRechercheAppliquee(recherche.trim())
  }

  const pageCourante = Math.floor(offset / LIMITE) + 1
  const pagesTotal = Math.max(1, Math.ceil(total / LIMITE))

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 48px', background: T.bg, color: T.text }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* EN-TÊTE */}
        <header style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={16} color={T.ark} />
            <span style={{ fontSize: 11, fontWeight: 800, color: T.ark, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Espace interne · administrateur
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
                ACQUISITION COURTIA
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: T.textSecondary }}>
                Demandes de démo réellement captées par le formulaire du site public, lues depuis
                le service de capture ({filtre.libelle}). Aucun chiffre n'est estimé : ce qui n'est pas mesuré est écrit « non mesuré ».
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.textMuted }}>
                {luA ? `Lu le ${formatDateHeure(luA.toISOString())}` : 'Lecture en cours…'}
              </span>
              <button onClick={() => setNonce((n) => n + 1)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', color: T.text, border: `1px solid ${T.cardBorder}`,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <RefreshCw size={12} /> Actualiser
              </button>
            </div>
          </div>
        </header>

        {/* ERREUR DE LECTURE — jamais de repli silencieux sur des données fictives */}
        {erreur && (
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20, padding: '14px 16px',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12,
          }}>
            <AlertTriangle size={18} color={T.danger} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
                Lecture commerciale indisponible — aucune donnée n'est affichée.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: T.textSecondary }}>
                {erreur.message}
                {erreur.code ? ` (code service : ${erreur.code})` : ''}
              </p>
              {erreur.details && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textMuted }}>{erreur.details}</p>
              )}
            </div>
          </div>
        )}

        {/* FILTRES */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20,
          padding: '12px 14px', background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12,
        }}>
          <Filter size={14} color={T.textMuted} />
          <select value={perimetre} onChange={(e) => { setPerimetre(e.target.value); setOffset(0) }} style={champStyle}>
            {PERIMETRES.map((p) => <option key={p.cle} value={p.cle}>{p.libelle}</option>)}
          </select>
          <select value={statut} onChange={(e) => { setStatut(e.target.value); setOffset(0) }} style={champStyle}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS).map(([cle, v]) => <option key={cle} value={cle}>{v.libelle}</option>)}
          </select>
          <input
            list="sources-acquisition"
            value={source}
            onChange={(e) => { setSource(e.target.value); setOffset(0) }}
            placeholder="Source (ex. organic, linkedin)"
            style={{ ...champStyle, minWidth: 190 }}
          />
          <datalist id="sources-acquisition">
            {sourcesConnues.map((s) => <option key={s} value={s} />)}
          </datalist>
          <form onSubmit={appliquerRecherche} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} color={T.textMuted} style={{ position: 'absolute', left: 9, top: 9 }} />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Cabinet, email, nom…"
                style={{ ...champStyle, paddingLeft: 28, minWidth: 200 }}
              />
            </div>
            <button type="submit" style={boutonStyle}>Chercher</button>
          </form>
          {(statut || source || rechercheAppliquee || perimetre !== 'production') && (
            <button
              onClick={() => { setStatut(''); setSource(''); setRecherche(''); setRechercheAppliquee(''); setPerimetre('production'); setOffset(0) }}
              style={{ ...boutonStyle, color: T.textMuted }}
            >Réinitialiser</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textMuted }}>
            {chargement ? 'Lecture…' : `${total} lead(s) au total · page ${pageCourante}/${pagesTotal}`}
          </span>
        </div>

        {/* FUNNEL */}
        <Carte
          titre="FUNNEL — visiteur → client"
          sousTitre={funnel
            ? `Périmètre : ${funnel.environment} · mesure ouverte le ${ouVide(formatDateHeure(funnel.mesure_depuis))} · seuil HOT LEAD : ${funnel.seuil_hot_lead}/100`
            : 'Agrégats des demandes de démo réellement captées'}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 10 }}>
            {etapes.map((e) => (
              <div key={e.cle} style={{
                background: e.estMesure ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                border: `1px solid ${e.ecart ? 'rgba(245,158,11,0.4)' : T.cardBorder}`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {e.libelle}
                </div>
                <Valeur mesure={e} />
                {e.ecart && (
                  <div title={e.detail} style={{ marginTop: 6, fontSize: 10, color: T.warning, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <AlertTriangle size={10} /> écart entre canaux
                  </div>
                )}
                {e.detail && (
                  <div title={e.detail} style={{ marginTop: 6, fontSize: 10, color: T.textMuted, lineHeight: 1.4 }}>
                    {e.detail}
                  </div>
                )}
              </div>
            ))}
            {!etapes.length && !chargement && (
              <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>
                Funnel indisponible : le service n'a rien renvoyé (aucune valeur affichée).
              </p>
            )}
          </div>
        </Carte>

        {/* ARK SALES — score explicable */}
        <Carte
          titre="ARK SALES — score expliqué, lead par lead"
          sousTitre={`Chaque score vient du service (score_details) : les points sont affichés avec leur raison. HOT LEAD = score ≥ ${funnel?.seuil_hot_lead ?? 60} ET au moins un signal fort.`}
          actions={chauds.length > 0 && (
            <Badge ton="chaud"><Flame size={11} /> {chauds.length} HOT LEAD</Badge>
          )}
        >
          {chargement && !scores.length && (
            <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>Lecture des scores…</p>
          )}
          {!chargement && !scores.length && (
            <p style={{ margin: 0, fontSize: 12.5, color: T.textSecondary }}>
              Aucun lead dans ce périmètre : aucun score à expliquer. (Basculez le périmètre sur « Tous les périmètres (données de test incluses) »
              pour voir les leads de test, ou partagez la page publique pour recevoir une vraie demande.)
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 12 }}>
            {scores.map(({ lead, score }) => {
              const hot = lireHotLead(lead)
              const nom = nomLead(lead)
              return (
                <div key={lead.id} style={{
                  background: hot.chaud ? 'rgba(245,158,11,0.05)' : T.arkBg,
                  border: `1px solid ${hot.chaud ? 'rgba(245,158,11,0.35)' : T.arkBorder}`,
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nom.cabinet}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>{nom.contact} · {lead.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: couleurScore(score.note), lineHeight: 1 }}>
                        {score.explique ? `${score.note ?? 0}` : NON_MESURE}
                      </div>
                      <div style={{ fontSize: 9.5, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {score.explique ? 'score ARK /100' : 'score ARK'}
                      </div>
                    </div>
                  </div>

                  {hot.chaud && (
                    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge ton="chaud"><Flame size={11} /> HOT LEAD</Badge>
                      <span style={{ fontSize: 10.5, color: '#fcd34d' }}>
                        {hot.signaux.length ? hot.signaux.join(' · ') : 'signaux forts présents'}
                      </span>
                    </div>
                  )}

                  <ul style={{ margin: '10px 0 0', padding: '0 0 0 16px', listStyle: 'none' }}>
                    {score.raisons.length ? score.raisons.map((r, i) => (
                      <li key={i} style={{ fontSize: 11.5, color: '#c4b5fd', lineHeight: 1.7, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: -14, color: T.ark }}>•</span>{r}
                      </li>
                    )) : (
                      <li style={{ fontSize: 11.5, color: T.textMuted, fontStyle: 'italic' }}>
                        Aucune raison enregistrée : le score de ce lead n'a pas été calculé par le service.
                      </li>
                    )}
                  </ul>

                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge ton={STATUTS[lead.statut]?.ton || 'neutre'}>{etiquetteStatut(lead.statut)}</Badge>
                    <Badge ton={lead.qualification === 'chaud' ? 'chaud' : 'neutre'}>
                      {etiquetteQualification(lead.qualification)}
                    </Badge>
                    <Badge ton={lead.environment === 'production' ? 'info' : 'echec'}>
                      {lead.environment === 'production' ? 'production' : `environnement ${lead.environment === 'qa' ? 'de test' : lead.environment}`}
                    </Badge>
                    {lead.environment !== 'production' && (
                      <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>test — ne pas contacter</span>
                    )}
                    <button onClick={() => navigate('/prospection')} style={{ ...boutonStyle, marginLeft: 'auto', fontSize: 11 }}>
                      Prospection <ExternalLink size={10} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Carte>

        {/* TABLEAU DES LEADS */}
        <Carte
          titre="Leads captés"
          sousTitre="Cabinet · contact · pays · source · landing · date · progression démo · score ARK · qualification · statut · prochaine action · owner"
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: T.textMuted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {['Cabinet', 'Contact', 'Pays', 'Source', 'Landing', 'Date', 'Progression démo',
                    'Score ARK', 'Qualification', 'Statut', 'Prochaine action', 'Owner'].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', borderBottom: `1px solid ${T.cardBorder}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leads || []).map((lead) => {
                  const score = lireScore(lead)
                  const demo = progressionDemo(lead)
                  const nom = nomLead(lead)
                  const hot = lireHotLead(lead)
                  return (
                    <tr key={lead.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: T.text }}>{nom.cabinet}</div>
                        <div style={{ fontSize: 10.5, color: T.textMuted }}>#{lead.id}{hot.chaud ? ' · HOT' : ''}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: T.textSecondary }}>{nom.contact}</div>
                        <div style={{ fontSize: 10.5, color: T.textMuted }}>{lead.email}</div>
                        <div style={{ fontSize: 10.5, color: T.textMuted }}>tél. {ouVide(lead.telephone)}</div>
                      </td>
                      <td style={tdStyle}>{ouVide(lead.pays)}</td>
                      <td style={tdStyle}>{provenance(lead)}</td>
                      <td style={tdStyle}>{ouVide(lead.landing_page)}</td>
                      <td style={tdStyle}>{formatDate(lead.created_at)}</td>
                      <td style={tdStyle}>
                        <span style={{ color: demo.estMesure ? T.textSecondary : T.textMuted, fontStyle: demo.estMesure ? 'normal' : 'italic' }}>
                          {demo.texte}
                        </span>
                        {demo.horodatage && (
                          <div style={{ fontSize: 10.5, color: T.textMuted }}>{formatDateHeure(demo.horodatage)}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, color: couleurScore(score.note) }}>
                          {score.explique ? `${score.note ?? 0}/100` : NON_MESURE}
                        </span>
                        {!!score.raisons.length && (
                          <div title={score.raisons.join(' — ')} style={{ fontSize: 10, color: T.textMuted, maxWidth: 200 }}>
                            {score.raisons.slice(0, 2).join(' · ')}{score.raisons.length > 2 ? ' …' : ''}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>{etiquetteQualification(lead.qualification)}</td>
                      <td style={tdStyle}><Badge ton={STATUTS[lead.statut]?.ton || 'neutre'}>{etiquetteStatut(lead.statut)}</Badge></td>
                      <td style={tdStyle}>{ouVide(lead.next_action)}</td>
                      <td style={tdStyle}>{ouVide(lead.owner)}</td>
                    </tr>
                  )
                })}
                {!chargement && !(leads || []).length && (
                  <tr>
                    <td colSpan={12} style={{ padding: '22px 12px', color: T.textSecondary, fontSize: 12.5 }}>
                      {erreur
                        ? 'Aucune donnée affichée : la lecture a échoué (voir le bandeau ci-dessus).'
                        : filtre.cle === 'production'
                          ? "Aucune demande de démo enregistrée pour l'instant (les demandes de test sont exclues ici). Sélectionnez « Tous les périmètres (données de test incluses) » pour les voir, ou attendez la première demande réelle."
                          : 'Aucun lead pour ces filtres.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {leads ? `${leads.length} lead(s) affiché(s) sur ${total}` : 'aucune donnée'}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - LIMITE))}
                style={{ ...boutonStyle, opacity: offset === 0 ? 0.4 : 1 }}
              ><ChevronLeft size={12} /> Précédent</button>
              <span style={{ fontSize: 11, color: T.textMuted }}>{pageCourante} / {pagesTotal}</span>
              <button
                disabled={offset + LIMITE >= total}
                onClick={() => setOffset((o) => o + LIMITE)}
                style={{ ...boutonStyle, opacity: offset + LIMITE >= total ? 0.4 : 1 }}
              >Suivant <ChevronRight size={12} /></button>
            </div>
          </div>
        </Carte>

        {/* PIED — traçabilité de la lecture */}
        <footer style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: T.textMuted }}>
          <span><Sun size={11} /> {luA ? `Données lues à ${formatDateHeure(luA.toISOString())}` : 'données non lues'}</span>
          <span>Source : demandes de démo réellement captées</span>
          <span>Demandes de test exclues par défaut</span>
          <a href="/morning-brief" style={{ color: T.ark, textDecoration: 'none' }}>Voir le {LIBELLES.briefDuMatin} →</a>
        </footer>
      </div>
    </div>
  )
}

const champStyle = {
  padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${T.cardBorder}`, color: '#fff', fontSize: 12, outline: 'none',
}

const boutonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.cardBorder}`, color: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

const tdStyle = { padding: '9px 10px', verticalAlign: 'top', color: '#cbd5e1' }
