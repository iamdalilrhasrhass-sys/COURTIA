import { useState, useMemo } from 'react'
import { FileSpreadsheet, FileText, Download } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6', success: '#22C55E',
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
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.10)',
  fontSize: 14,
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: T.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

export default function CommissionsCalculator() {
  const [compagnie, setCompagnie] = useState('Aurora')
  const [produit, setProduit] = useState('Auto')
  const [prime, setPrime] = useState(1200)

  const taux = useMemo(() => BAREMES[compagnie]?.[produit] ?? 10, [compagnie, produit])
  const commission = useMemo(() => (Number(prime || 0) * taux) / 100, [prime, taux])
  const commissionMois = commission / 12

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
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>

        <PageHeader
          title="Commissions"
          subtitle="Calcul instantané selon le barème compagnie."
        />

        {/* Résultat géant */}
        <SimpleCard padding={32} style={{
          textAlign: 'center',
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(34,211,238,0.04))',
          border: '1px solid rgba(139,92,246,0.25)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Commission estimée
          </div>
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(48px, 8vw, 72px)',
            lineHeight: 1,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            {fmtEur(commission)}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 8 }}>
            soit <strong style={{ color: '#fff' }}>{fmtEur(commissionMois)}</strong> / mois &middot;
            taux <strong style={{ color: T.accent }}>{taux}%</strong>
          </div>
        </SimpleCard>

        {/* 3 champs */}
        <SimpleCard padding={24}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Compagnie</label>
              <select value={compagnie} onChange={e => setCompagnie(e.target.value)} style={inputStyle}>
                {COMPAGNIES.map(c => <option key={c} value={c} style={{ background: '#0a0a18' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Produit</label>
              <select value={produit} onChange={e => setProduit(e.target.value)} style={inputStyle}>
                {PRODUITS.map(p => <option key={p} value={p} style={{ background: '#0a0a18' }}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prime annuelle</label>
              <input
                type="number"
                min={0}
                step={50}
                value={prime}
                onChange={(e) => setPrime(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button onClick={exportPdf} style={btnGhost}>
              <FileText size={13} /> PDF
            </button>
            <button onClick={exportCsv} style={btnGhost}>
              <FileSpreadsheet size={13} /> CSV
            </button>
          </div>
        </SimpleCard>
      </main>
    </div>
  )
}

const btnGhost = {
  padding: '8px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer',
  fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
