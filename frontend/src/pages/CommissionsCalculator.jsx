/* ============================================================================
   COURTIARK — Écran « Calculateur de commissions »
   ----------------------------------------------------------------------------
   POURQUOI cette réécriture : l'écran portait en constantes HUIT compagnies
   (« Aurora », « Novalia », « Helios », « Serenis », « Atlas », « Oria »,
   « Nivalis », « Solenys ») et une matrice de taux inventée (10 à 23 % selon
   produit). Aucune de ces compagnies n'existe et aucun de ces taux n'était
   celui d'un cabinet : le courtier pouvait exporter un PDF/CSV présentant une
   commission calculée sur un barème fictif.

   RÈGLE désormais : les barèmes viennent de `GET /api/commissions/baremes`, et
   SEULS ceux du cabinet (`source === 'cabinet'`) sont présentés comme un calcul.
   Quand l'API ne sert que le catalogue d'EXEMPLE livré avec le produit (ou ne
   répond pas), l'écran ne devine rien : il n'affiche ni compagnie, ni taux, ni
   montant, et il explique quoi configurer. L'export est retiré dans ce cas —
   on n'exporte pas une donnée qui n'est pas celle du cabinet.

   La devise de la prime suit le marché du cabinet (lib/monnaie.js : CHF en
   Suisse, EUR sinon).
   ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Calculator, TrendingUp, Sparkles, GitCompareArrows, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../api'
import { VibeBackdrop } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import { fmtMontant, symboleCourant } from '../lib/monnaie'
import FonctionIndisponible from '../components/FonctionIndisponible'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280', textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)', cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)', cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.10)', arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', cyan: '#22D3EE',
}

// Montant dans la devise du cabinet (CHF en Suisse, EUR sinon).
const fmtMontantLocal = (v) => fmtMontant(v, { maximumFractionDigits: 2 })

function downloadBlob(name, mime, content) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 9,
  background: 'rgba(255,255,255,0.05)',
  color: T.text,
  border: `1px solid ${T.cardBorderLight}`,
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: T.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  marginBottom: 6,
}

const btnGhost = {
  padding: '8px 13px', background: 'rgba(255,255,255,0.04)', color: T.text,
  border: `1px solid ${T.cardBorderLight}`, borderRadius: 8, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
}

/** Nombre exploitable, sinon null (« pas de mesure »). */
function nombreOuNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function CommissionsCalculator() {
  const [baremes, setBaremes] = useState([])
  const [source, setSource] = useState(null)
  const [messageApi, setMessageApi] = useState('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)

  const [compagnie, setCompagnie] = useState('')
  const [produit, setProduit] = useState('')
  const [prime, setPrime] = useState('')

  const symbole = symboleCourant()

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const res = await api.get('/commissions/baremes')
      const lignes = Array.isArray(res.data?.data) ? res.data.data : []
      setBaremes(lignes)
      setSource(res.data?.source || null)
      setMessageApi(res.data?.message || '')
    } catch (e) {
      setBaremes([])
      setSource(null)
      setErreur(e?.response?.data?.message
        || "Les barèmes de commission n'ont pas pu être chargés. Aucun barème n'est affiché à la place.")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  // Seuls les barèmes PROPRES au cabinet alimentent un calcul. Le catalogue
  // d'exemple du produit (source « exemple… ») est refusé : ce n'est pas le
  // barème du cabinet, et l'afficher reviendrait à inventer ses taux.
  const baremesCabinet = useMemo(
    () => (source === 'cabinet' ? baremes : []),
    [baremes, source]
  )

  const compagnies = useMemo(
    () => [...new Set(baremesCabinet.map((b) => b.compagnie).filter(Boolean))].sort(),
    [baremesCabinet]
  )

  const produits = useMemo(() => {
    const liste = baremesCabinet
      .filter((b) => !compagnie || b.compagnie === compagnie)
      .map((b) => b.produit)
      .filter(Boolean)
    return [...new Set(liste)].sort()
  }, [baremesCabinet, compagnie])

  // Sélection par défaut : la première compagnie / le premier produit RÉELS.
  useEffect(() => {
    if (!compagnies.length) { setCompagnie(''); return }
    if (!compagnies.includes(compagnie)) setCompagnie(compagnies[0])
  }, [compagnies, compagnie])

  useEffect(() => {
    if (!produits.length) { setProduit(''); return }
    if (!produits.includes(produit)) setProduit(produits[0])
  }, [produits, produit])

  const taux = useMemo(() => {
    const ligne = baremesCabinet.find((b) => b.compagnie === compagnie && b.produit === produit)
    return ligne ? nombreOuNull(ligne.rate_percent) : null
  }, [baremesCabinet, compagnie, produit])

  const primeNombre = nombreOuNull(prime)
  const commission = (taux !== null && primeNombre !== null) ? (primeNombre * taux) / 100 : null
  const commissionMois = commission === null ? null : commission / 12

  // Comparaison : uniquement les compagnies du cabinet pour le produit choisi.
  const comparaison = useMemo(() => {
    if (taux === null) return []
    return compagnies
      .map((c) => {
        const ligne = baremesCabinet.find((b) => b.compagnie === c && b.produit === produit)
        const t = ligne ? nombreOuNull(ligne.rate_percent) : null
        return {
          compagnie: c,
          taux: t,
          commission: (t !== null && primeNombre !== null) ? (primeNombre * t) / 100 : null,
        }
      })
      .sort((a, b) => (b.commission ?? -1) - (a.commission ?? -1))
  }, [baremesCabinet, compagnies, produit, taux, primeNombre])

  const meilleur = comparaison.find((c) => c.commission !== null) || null

  // L'export n'existe QUE si le calcul repose sur les barèmes du cabinet.
  const exportAutorise = source === 'cabinet' && taux !== null && commission !== null

  function exportCsv() {
    if (!exportAutorise) return
    const csv = ['Compagnie;Produit;Prime;Taux;Commission',
      `${compagnie};${produit};${primeNombre};${taux};${commission.toFixed(2)}`].join('\n')
    downloadBlob(`commission-${Date.now()}.csv`, 'text/csv;charset=utf-8', '﻿' + csv)
  }

  function exportPdf() {
    if (!exportAutorise) return
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Commission COURTIARK</title>
<style>body{font-family:system-ui;margin:32px;color:#0F172A}h1{font-size:28px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:left}th{background:#F8FAFC;font-size:11px;text-transform:uppercase}</style>
</head><body>
<h1>Commission calculée</h1>
<table><tr><th>Compagnie</th><th>Produit</th><th>Prime</th><th>Taux</th><th>Commission</th></tr>
<tr><td>${compagnie}</td><td>${produit}</td><td>${fmtMontantLocal(primeNombre)}</td><td>${taux}%</td><td><strong>${fmtMontantLocal(commission)}</strong></td></tr>
</table>
<p style="margin-top:24px;font-size:11px;color:#94A3B8">Barèmes du cabinet — COURTIARK</p>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

  const aucunBaremeCabinet = !chargement && !erreur && baremesCabinet.length === 0

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 24px 48px' }}>
      <VibeBackdrop intensity={0.75} />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{
        position: 'fixed', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(91,77,245,0.06) 0%, transparent 70%)',
        top: -150, right: -100, pointerEvents: 'none', zIndex: 0,
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto' }}>

        {/* EN-TÊTE */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
            ARK IA — Outils
          </div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', var(--c-font-display, sans-serif)",
            fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em',
            color: T.text, margin: 0, lineHeight: 1.15,
          }}>Calculateur de commissions</h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
            Calcul sur les barèmes réellement enregistrés pour votre cabinet. Le catalogue
            d&apos;exemple livré avec le produit n&apos;alimente aucun calcul ni aucun export.
          </p>
        </header>

        {erreur && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#FCA5A5', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <AlertTriangle size={15} />
            <span style={{ flex: 1, minWidth: 220 }}>{erreur}</span>
            <button type="button" onClick={charger} style={btnGhost}>
              <RefreshCw size={13} /> Réessayer
            </button>
          </div>
        )}

        {/* AUCUN BARÈME DU CABINET : aucun chiffre, aucune compagnie d'exemple */}
        {aucunBaremeCabinet && (
          <div style={{
            background: T.cardBg, border: `1px solid ${T.cardBorder}`,
            borderRadius: 14, padding: 26, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calculator size={15} color={T.ark} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Aucun barème de commission pour votre cabinet</h2>
            </div>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.65, margin: '0 0 10px' }}>
              Cet écran ne calcule rien tant que vos barèmes ne sont pas enregistrés : aucun taux,
              aucune compagnie et aucun montant ne sont affichés, car un barème d&apos;exemple ne
              correspond pas aux conditions négociées par votre cabinet.
            </p>
            {messageApi && (
              <p style={{ fontSize: 12, color: T.warning, margin: '0 0 10px', lineHeight: 1.6 }}>
                {messageApi}
              </p>
            )}
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
              Les taux réellement enregistrés se consultent dans <strong style={{ color: T.text }}>Commissions</strong> ;
              une fois vos barèmes saisis, le calcul et l&apos;export s&apos;activent ici automatiquement.
            </p>
          </div>
        )}

        {!erreur && !aucunBaremeCabinet && (
          <>
            {/* Row : formulaire + résultat */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 14,
              marginBottom: 16,
            }}>
              {/* Formulaire */}
              <div style={{
                background: T.cardBg, border: `1px solid ${T.cardBorder}`,
                borderRadius: 14, padding: 22, backdropFilter: 'blur(12px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <Calculator size={14} color={T.accent} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h3>
                </div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Compagnie</label>
                    <select value={compagnie} onChange={e => setCompagnie(e.target.value)} style={inputStyle}>
                      {compagnies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Produit</label>
                    <select value={produit} onChange={e => setProduit(e.target.value)} style={inputStyle}>
                      {produits.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Prime annuelle ({symbole})</label>
                    <input type="number" min="0" step="50" value={prime} onChange={e => setPrime(e.target.value)} style={inputStyle} placeholder="Montant" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <button onClick={exportCsv} disabled={!exportAutorise} style={{ ...btnGhost, opacity: exportAutorise ? 1 : 0.45, cursor: exportAutorise ? 'pointer' : 'default' }}>
                    <FileSpreadsheet size={13} /> Export CSV
                  </button>
                  <button onClick={exportPdf} disabled={!exportAutorise} style={{ ...btnGhost, opacity: exportAutorise ? 1 : 0.45, cursor: exportAutorise ? 'pointer' : 'default' }}>
                    <FileText size={13} /> PDF
                  </button>
                </div>
              </div>

              {/* Résultat */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(91,77,245,0.10), rgba(139,92,246,0.04))',
                border: `1px solid rgba(91,77,245,0.25)`,
                borderRadius: 14, padding: 22,
                backdropFilter: 'blur(12px)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: -50, right: -50, width: 180, height: 180,
                  borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)',
                  filter: 'blur(20px)', pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={14} color={T.ark} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                      Commission calculée
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', var(--c-font-display, sans-serif)",
                    fontWeight: 800, fontSize: 56, color: T.text,
                    letterSpacing: '-0.03em', lineHeight: 1,
                  }}>{commission === null ? '—' : fmtMontantLocal(commission)}</div>
                  <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 8 }}>
                    {taux === null
                      ? 'Taux non renseigné pour ce couple compagnie / produit.'
                      : <><strong style={{ color: T.text }}>{taux}%</strong> de {primeNombre === null ? '—' : fmtMontantLocal(primeNombre)} • soit <strong style={{ color: T.success }}>{commissionMois === null ? '—' : fmtMontantLocal(commissionMois)}</strong>/mois</>}
                  </div>

                  {meilleur && meilleur.compagnie !== compagnie && commission !== null && meilleur.commission !== null && (
                    <div style={{
                      marginTop: 14, padding: '10px 12px',
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 9, fontSize: 12, color: T.warning,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Sparkles size={12} />
                      <span>Votre barème le plus élevé sur ce produit : <strong style={{ color: T.text }}>{meilleur.compagnie}</strong> à <strong>{meilleur.taux}%</strong> ({fmtMontantLocal(meilleur.commission - commission)} de plus).</span>
                    </div>
                  )}
                  {meilleur && meilleur.compagnie === compagnie && (
                    <div style={{
                      marginTop: 14, padding: '10px 12px',
                      background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: 9, fontSize: 12, color: T.success,
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
                    }}>
                      <TrendingUp size={13} /> Barème le plus élevé de votre cabinet sur ce produit
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparateur — barèmes du cabinet uniquement */}
            <div style={{
              background: T.cardBg, border: `1px solid ${T.cardBorder}`,
              borderRadius: 14, padding: 18, backdropFilter: 'blur(12px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <GitCompareArrows size={14} color={T.cyan} />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>
                  Comparaison de vos barèmes — {produit} ({primeNombre === null ? 'prime non saisie' : fmtMontantLocal(primeNombre)})
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Compagnie', 'Taux', 'Commission/an', 'Commission/mois'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 14px', fontSize: 10,
                          fontWeight: 700, color: T.textMuted, textTransform: 'uppercase',
                          letterSpacing: '0.08em', borderBottom: `1px solid ${T.cardBorder}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparaison.map((row) => {
                      const isSelected = row.compagnie === compagnie
                      return (
                        <tr key={row.compagnie} style={{
                          borderBottom: `1px solid ${T.cardBorder}`,
                          background: isSelected ? 'rgba(91,77,245,0.06)' : 'transparent',
                        }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>
                            {row.compagnie}
                            {isSelected && <span style={{ marginLeft: 6, fontSize: 10, color: T.accent, fontWeight: 700 }}>(sélection)</span>}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: T.text, fontWeight: 700 }}>{row.taux === null ? '—' : row.taux + '%'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: T.success, fontWeight: 700 }}>{row.commission === null ? '—' : fmtMontantLocal(row.commission)}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: T.textSecondary }}>{row.commission === null ? '—' : fmtMontantLocal(row.commission / 12)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* RELEVÉ MENSUEL EN PDF — ÉTAT HONNÊTE, SANS BOUTON NI COMPTEUR
            POURQUOI (défaut P3 mesuré le 20/09/2026, QA adverse n° 2) : la route
            serveur `GET /api/commissions/statement/:annee/:mois/pdf` répond 501
            « non implémenté ». Aucun bouton de cet écran ne l'appelle, et aucun
            compteur (« 0 relevé ») ne vient suggérer une mesure qui n'existe
            pas : l'écran dit simplement que la fonction n'est pas installée. */}
        <FonctionIndisponible titre="Relevé mensuel de commissions (PDF)" style={{ marginTop: 16 }}>
          La production par COURTIARK d&apos;un relevé mensuel téléchargeable n&apos;est pas
          installée dans cette version : aucun bouton ne le propose ici. Le calcul affiché
          ci-dessus reste celui de votre écran, et l&apos;export CSV/PDF du calcul en cours
          reste disponible.
        </FonctionIndisponible>

      </main>
    </div>
  )
}
