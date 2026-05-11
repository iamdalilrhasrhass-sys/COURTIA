import { useState, useMemo } from 'react'
import { FileSpreadsheet, FileText, Download, Calculator, TrendingUp, Sparkles, GitCompareArrows, ChevronRight } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280', textDim: '#4B5563',
  cardBg: 'rgba(255,255,255,0.03)', cardBgHover: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)', cardBorderLight: 'rgba(255,255,255,0.10)',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.10)', arkBorder: 'rgba(139,92,246,0.25)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', cyan: '#22D3EE',
}

const COMPAGNIES = ['Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys']
const PRODUITS   = ['Auto', 'Habitation', 'Santé', 'Prévoyance', 'RC Pro', 'Flotte Auto', 'MRH', 'Cyber', 'Décennale', 'PJ']

const BAREMES = {
  Aurora:   { Auto: 12, Habitation: 14, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 11, MRH: 13, Cyber: 20, Décennale: 15, PJ: 22 },
  Novalia:  { Auto: 11, Habitation: 13, Santé: 9,  Prévoyance: 17, 'RC Pro': 15, 'Flotte Auto': 12, MRH: 14, Cyber: 19, Décennale: 14, PJ: 20 },
  Helios:   { Auto: 10, Habitation: 15, Santé: 7,  Prévoyance: 16, 'RC Pro': 14, 'Flotte Auto': 10, MRH: 12, Cyber: 18, Décennale: 13, PJ: 19 },
  Serenis:  { Auto: 13, Habitation: 12, Santé: 10, Prévoyance: 19, 'RC Pro': 17, 'Flotte Auto': 13, MRH: 15, Cyber: 21, Décennale: 16, PJ: 23 },
  Atlas:    { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 17, 'RC Pro': 18, 'Flotte Auto': 12, MRH: 14, Cyber: 22, Décennale: 15, PJ: 21 },
  Oria:     { Auto: 11, Habitation: 14, Santé: 9,  Prévoyance: 16, 'RC Pro': 15, 'Flotte Auto': 11, MRH: 13, Cyber: 19, Décennale: 14, PJ: 20 },
  Nivalis:  { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 12, MRH: 14, Cyber: 20, Décennale: 17, PJ: 22 },
  Solenys:  { Auto: 10, Habitation: 12, Santé: 10, Prévoyance: 15, 'RC Pro': 13, 'Flotte Auto': 9,  MRH: 11, Cyber: 17, Décennale: 12, PJ: 18 },
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

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

export default function CommissionsCalculator() {
  const [compagnie, setCompagnie] = useState('Aurora')
  const [produit, setProduit] = useState('Auto')
  const [prime, setPrime] = useState(1200)

  const taux = useMemo(() => BAREMES[compagnie]?.[produit] ?? 10, [compagnie, produit])
  const commission = useMemo(() => (Number(prime || 0) * taux) / 100, [prime, taux])
  const commissionMois = commission / 12

  // comparateur autres compagnies
  const comparison = useMemo(() => {
    return COMPAGNIES.map(c => ({
      compagnie: c,
      taux: BAREMES[c]?.[produit] ?? 0,
      commission: (Number(prime || 0) * (BAREMES[c]?.[produit] ?? 0)) / 100,
    })).sort((a, b) => b.commission - a.commission)
  }, [produit, prime])

  const best = comparison[0]
  const isBest = best?.compagnie === compagnie

  function exportCsv() {
    const csv = ['Compagnie;Produit;Prime;Taux;Commission',
      `${compagnie};${produit};${prime};${taux};${commission.toFixed(2)}`].join('\n')
    downloadBlob(`commission-${Date.now()}.csv`, 'text/csv;charset=utf-8', '﻿' + csv)
  }

  function exportPdf() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Commission COURTIA</title>
<style>body{font-family:system-ui;margin:32px;color:#0F172A}h1{font-size:28px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:left}th{background:#F8FAFC;font-size:11px;text-transform:uppercase}</style>
</head><body>
<h1>Estimation de commission</h1>
<table><tr><th>Compagnie</th><th>Produit</th><th>Prime</th><th>Taux</th><th>Commission</th></tr>
<tr><td>${compagnie}</td><td>${produit}</td><td>${fmtEur(prime)}</td><td>${taux}%</td><td><strong>${fmtEur(commission)}</strong></td></tr>
</table>
<p style="margin-top:24px;font-size:11px;color:#94A3B8">COURTIA — ${new Date().toLocaleString('fr-FR')}</p>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

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

        {/* HEADER */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
            ARK IA — Outils
          </div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em',
            color: T.text, margin: 0, lineHeight: 1.15,
          }}>Calculateur de commissions</h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: '6px 0 0' }}>
            Estimation instantanée selon le barème compagnie et comparaison cross-marché.
          </p>
        </header>

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
                  {COMPAGNIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Produit</label>
                <select value={produit} onChange={e => setProduit(e.target.value)} style={inputStyle}>
                  {PRODUITS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prime annuelle (€)</label>
                <input type="number" min="0" step="50" value={prime} onChange={e => setPrime(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={exportCsv} style={btnGhost}>
                <FileSpreadsheet size={13} /> Export CSV
              </button>
              <button onClick={exportPdf} style={btnGhost}>
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
                  Commission estimée
                </span>
              </div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800, fontSize: 56, color: T.text,
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>{fmtEur(commission)}</div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 8 }}>
                <strong style={{ color: T.text }}>{taux}%</strong> de {fmtEur(prime)} • soit <strong style={{ color: T.success }}>{fmtEur(commissionMois)}</strong>/mois
              </div>

              {isBest && (
                <div style={{
                  marginTop: 14, padding: '10px 12px',
                  background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: 9, fontSize: 12, color: T.success,
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
                }}>
                  <TrendingUp size={13} /> Meilleur taux du marché
                </div>
              )}
              {!isBest && best && (
                <div style={{
                  marginTop: 14, padding: '10px 12px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 9, fontSize: 12, color: T.warning,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Sparkles size={12} />
                  <span>ARK : <strong style={{ color: T.text }}>{best.compagnie}</strong> propose <strong>{best.taux}%</strong> ({fmtEur(best.commission - commission)} de plus)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparateur */}
        <div style={{
          background: T.cardBg, border: `1px solid ${T.cardBorder}`,
          borderRadius: 14, padding: 18, backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <GitCompareArrows size={14} color={T.cyan} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>
              Comparaison toutes compagnies — {produit} ({fmtEur(prime)})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Compagnie', 'Taux', 'Commission/an', 'Commission/mois', 'Écart vs sélection'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 14px', fontSize: 10,
                      fontWeight: 700, color: T.textMuted, textTransform: 'uppercase',
                      letterSpacing: '0.08em', borderBottom: `1px solid ${T.cardBorder}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => {
                  const isSelected = row.compagnie === compagnie
                  const ecart = row.commission - commission
                  return (
                    <tr key={row.compagnie} style={{
                      borderBottom: `1px solid ${T.cardBorder}`,
                      background: isSelected ? 'rgba(91,77,245,0.06)' : 'transparent',
                    }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>
                        {i === 0 && <span style={{ marginRight: 6 }}>🏆</span>}
                        {row.compagnie}
                        {isSelected && <span style={{ marginLeft: 6, fontSize: 10, color: T.accent, fontWeight: 700 }}>(sélection)</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: T.text, fontWeight: 700 }}>{row.taux}%</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: T.success, fontWeight: 700 }}>{fmtEur(row.commission)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: T.textSecondary }}>{fmtEur(row.commission / 12)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600,
                        color: ecart > 0 ? T.success : ecart < 0 ? T.danger : T.textMuted,
                      }}>
                        {ecart === 0 ? '—' : (ecart > 0 ? `+${fmtEur(ecart)}` : fmtEur(ecart))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}

const btnGhost = {
  padding: '8px 13px', background: 'rgba(255,255,255,0.04)', color: T.text,
  border: `1px solid ${T.cardBorderLight}`, borderRadius: 8, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
}
