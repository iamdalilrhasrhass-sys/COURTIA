/**
 * Devis Wizard — 3 étapes : Produit&Client → Garanties → Recommandations ARK
 * F3 — pleine intégration comparator-engine + génération PDF
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ChevronRight, ChevronLeft, Sparkles, Loader2, FileSignature,
  Send, Eye, Star, ArrowRight, User, Package, Shield,
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { AuroraPageHeader } from '../components/aurora/AuroraPageHeader'
import { AuroraCard } from '../components/aurora/AuroraCard'
import { AuroraButton } from '../components/aurora/AuroraButton'
import { AuroraBadge } from '../components/aurora/AuroraBadge'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const PRODUITS = [
  { key: 'Auto',        label: 'Auto',          desc: 'Particulier ou flotte' },
  { key: 'MRH',         label: 'MRH',           desc: 'Multirisque habitation' },
  { key: 'Santé',       label: 'Santé',         desc: 'Complémentaire santé' },
  { key: 'Prévoyance',  label: 'Prévoyance',    desc: 'TNS / salarié / cadre' },
  { key: 'RC Pro',      label: 'Pro / RC Pro',  desc: 'Activité professionnelle' },
  { key: 'Multi-risque',label: 'Multi-risque',  desc: 'Locaux pros' },
]

const PRESETS = [
  { key: 'essentiel', label: 'Essentiel', desc: 'Couverture de base — prix mini',         color: T.cyan },
  { key: 'confort',   label: 'Confort',   desc: 'Équilibre prix / couverture',             color: T.accent },
  { key: 'premium',   label: 'Premium',   desc: 'Couverture maximale',                     color: T.ark },
  { key: 'sur_mesure',label: 'Sur-mesure',desc: 'Personnalisé garantie par garantie',      color: T.warning },
]

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v) || 0)

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', color: T.text,
  border: '1px solid ' + T.cardBorder, fontSize: 13, outline: 'none',
}

function Stepper({ step }) {
  const steps = [
    { n: 1, label: 'Produit & Client', icon: User },
    { n: 2, label: 'Garanties',        icon: Shield },
    { n: 3, label: 'Recommandations ARK', icon: Sparkles },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
      {steps.map((s, i) => {
        const Icon = s.icon
        const active = s.n === step
        const done = s.n < step
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', borderRadius: 999,
              background: active ? 'rgba(91,77,245,0.15)' : done ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (active ? 'rgba(91,77,245,0.40)' : done ? 'rgba(34,197,94,0.40)' : T.cardBorder),
              color: active ? T.text : done ? T.success : T.textMuted,
              fontSize: 13, fontWeight: 600,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: active ? T.accent : done ? T.success : 'rgba(255,255,255,0.10)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>
                {done ? <Check size={12} /> : s.n}
              </div>
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight size={14} color={T.textMuted} />}
          </div>
        )
      })}
    </div>
  )
}

export default function DevisWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)

  // Étape 1
  const [clients, setClients] = useState([])
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [product, setProduct] = useState('Auto')

  // Étape 2
  const [preset, setPreset] = useState('confort')
  const [dateEffet, setDateEffet] = useState('')
  const [profil, setProfil] = useState({ age: 35, ville: 'Paris', zone: 'urbain', situation: 'celibataire', sinistres_3ans: 0 })

  // Wizard state
  const [devisId, setDevisId] = useState(null)
  const [reference, setReference] = useState(null)

  // Étape 3
  const [computing, setComputing] = useState(false)
  const [quotes, setQuotes] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedOffers, setSelectedOffers] = useState([])
  const [pdfUrl, setPdfUrl] = useState(null)

  // Recherche clients
  useEffect(() => {
    let cancelled = false
    if (clientQuery.length < 2) return
    api.get(`/clients?search=${encodeURIComponent(clientQuery)}&limit=10`)
      .then(({ data }) => { if (!cancelled) setClients(Array.isArray(data) ? data : (data?.data || data?.clients || [])) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [clientQuery])

  async function step1Next() {
    if (!selectedClient && !clientQuery) {
      toast.error('Sélectionnez un client (ou saisissez un nom)')
      return
    }
    if (!product) return toast.error('Sélectionnez un produit')
    setBusy(true)
    try {
      const { data } = await api.post('/devis/wizard/init', {
        client_id: selectedClient?.id || null,
        product,
        preset: 'confort',
        garanties: { profil },
        date_effet: dateEffet || null,
      })
      setDevisId(data.devis.id)
      setReference(data.devis.reference)
      setStep(2)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur initialisation wizard')
    } finally {
      setBusy(false)
    }
  }

  async function step2Compute() {
    setComputing(true)
    setStep(3)
    try {
      const { data } = await api.post('/comparator-engine/compute', {
        profil, produit: product, level: preset,
        client_id: selectedClient?.id || null,
      })
      setQuotes(data?.quotes || [])
      setSummary(data?.summary || null)
      // Pré-sélection : meilleur prix + meilleur score
      const sorted = (data?.quotes || []).slice().sort((a, b) => (a.prime_annuelle_eur || 0) - (b.prime_annuelle_eur || 0))
      setSelectedOffers([sorted[0]?.provider].filter(Boolean))
    } catch (e) {
      toast.error('Erreur calcul comparatif')
      setStep(2)
    } finally {
      setComputing(false)
    }
  }

  async function generatePdf() {
    if (selectedOffers.length === 0) return toast.error('Sélectionnez au moins 1 offre')
    setBusy(true)
    try {
      const offers = quotes
        .filter(q => selectedOffers.includes(q.provider))
        .map(q => ({
          provider: q.provider,
          prime_annuelle_eur: q.prime_annuelle_eur,
          prime_mensuelle_eur: q.prime_mensuelle_eur,
          garanties: q.garanties,
          am_best: q.am_best || 'A',
          sav: '24/7',
          badges: q.badges || [],
        }))
      const ark_summary = summary?.ark_explanation || `${selectedOffers.length} offre(s) sélectionnée(s) — économie potentielle ${fmtEur(summary?.economy_eur || 0)}/an.`
      const { data } = await api.post('/devis/wizard/finalize', {
        devis_id: devisId,
        offers,
        ark_summary,
      })
      const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
      // Le PDF nécessite auth — on génère un blob URL côté front
      const res = await api.get(`/devis/${devisId}/pdf?inline=1`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      toast.success('PDF généré ✓')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur génération PDF')
    } finally {
      setBusy(false)
    }
  }

  async function sendDevis() {
    if (!devisId) return
    setBusy(true)
    try {
      await api.post(`/devis/${devisId}/send`)
      toast.success('Devis envoyé — relances J+3 / J+7 / J+14 programmées')
      navigate(`/devis/${devisId}`)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur envoi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Nouveau devis"
        subtitle={reference ? `Référence ${reference} — wizard ARK 1-clic` : 'Wizard ARK 1-clic — 3 étapes, recommandation IA, PDF prêt à envoyer'}
        actions={
          <AuroraButton variant="ghost" onClick={() => navigate('/devis')}>Annuler</AuroraButton>
        }
      />

      <Stepper step={step} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <AuroraCard hover={false}>
              <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 16px' }}>👤 Sélection client & produit</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={labelStyle}>Client</label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Rechercher un client par nom..."
                    value={clientQuery}
                    onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null) }}
                  />
                  {selectedClient && (
                    <div style={{ marginTop: 10, padding: 10, background: 'rgba(91,77,245,0.10)', border: '1px solid rgba(91,77,245,0.30)', borderRadius: 8, fontSize: 12, color: T.text }}>
                      <strong>{selectedClient.company_name || `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`}</strong>
                      <div style={{ color: T.textSecondary, fontSize: 11 }}>{selectedClient.email}</div>
                    </div>
                  )}
                  {!selectedClient && clients.length > 0 && (
                    <div style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.cardBorder, borderRadius: 8 }}>
                      {clients.slice(0, 6).map((c) => (
                        <div key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: T.text, borderBottom: '1px solid ' + T.cardBorder }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(91,77,245,0.10)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <strong>{c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}</strong>
                          <div style={{ color: T.textMuted, fontSize: 11 }}>{c.email}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ ...labelStyle, marginTop: 18 }}>Date d'effet</label>
                  <input type="date" style={inputStyle} value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} />
                </div>

                <div>
                  <label style={labelStyle}>Produit</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {PRODUITS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setProduct(p.key)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: product === p.key ? 'rgba(91,77,245,0.15)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid ' + (product === p.key ? 'rgba(91,77,245,0.40)' : T.cardBorder),
                          color: T.text,
                          fontSize: 13, textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{p.label}</div>
                        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <AuroraButton onClick={step1Next} chargement={busy}>
                  Continuer <ChevronRight size={16} />
                </AuroraButton>
              </div>
            </AuroraCard>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <AuroraCard hover={false}>
              <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 16px' }}>🛡️ Garanties & préférences</h3>

              <label style={labelStyle}>Préset garanties</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 10,
                      background: preset === p.key ? 'rgba(91,77,245,0.15)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid ' + (preset === p.key ? 'rgba(91,77,245,0.40)' : T.cardBorder),
                      color: T.text,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: p.color, fontSize: 13 }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Âge</label>
                  <input type="number" style={inputStyle} value={profil.age} onChange={(e) => setProfil(p => ({ ...p, age: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>Ville</label>
                  <input type="text" style={inputStyle} value={profil.ville} onChange={(e) => setProfil(p => ({ ...p, ville: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Zone</label>
                  <select style={inputStyle} value={profil.zone} onChange={(e) => setProfil(p => ({ ...p, zone: e.target.value }))}>
                    <option value="urbain">Urbain</option>
                    <option value="periurbain">Péri-urbain</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Situation</label>
                  <select style={inputStyle} value={profil.situation} onChange={(e) => setProfil(p => ({ ...p, situation: e.target.value }))}>
                    <option value="celibataire">Célibataire</option>
                    <option value="marie">Marié(e) / pacsé(e)</option>
                    <option value="famille">Famille</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Sinistres 3 ans</label>
                  <input type="number" min="0" max="10" style={inputStyle} value={profil.sinistres_3ans} onChange={(e) => setProfil(p => ({ ...p, sinistres_3ans: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>Profession</label>
                  <input type="text" style={inputStyle} value={profil.profession || ''} onChange={(e) => setProfil(p => ({ ...p, profession: e.target.value }))} placeholder="Optionnel" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                <AuroraButton variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={16} /> Précédent</AuroraButton>
                <AuroraButton onClick={step2Compute}>
                  <Sparkles size={14} /> Comparer avec ARK
                </AuroraButton>
              </div>
            </AuroraCard>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            {computing ? (
              <AuroraCard hover={false}>
                <div style={{ padding: 60, textAlign: 'center', color: T.textSecondary }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: T.ark, marginBottom: 16 }} />
                  <div style={{ fontSize: 14 }}>ARK compare 8 compagnies du marché…</div>
                </div>
              </AuroraCard>
            ) : (
              <>
                {summary && (
                  <AuroraCard hover={false} glow style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Sparkles size={20} color={T.ark} />
                      <h3 style={{ color: T.text, margin: 0, fontSize: 16 }}>Recommandation ARK</h3>
                    </div>
                    <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      {summary.ark_explanation || `Meilleur prix : ${summary.cheapest_provider} à ${fmtEur(summary.cheapest_eur)}/an. Économie ${fmtEur(summary.economy_eur)}/an vs marché.`}
                    </p>
                  </AuroraCard>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {quotes.map((q, idx) => {
                    const picked = selectedOffers.includes(q.provider)
                    return (
                      <motion.div
                        key={q.provider}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedOffers(prev =>
                          prev.includes(q.provider)
                            ? prev.filter(p => p !== q.provider)
                            : prev.length < 3 ? [...prev, q.provider] : prev
                        )}
                        style={{
                          padding: 16, borderRadius: 12,
                          background: picked ? 'rgba(91,77,245,0.12)' : T.cardBg,
                          border: '1px solid ' + (picked ? 'rgba(91,77,245,0.50)' : T.cardBorder),
                          cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                        }}
                      >
                        {picked && (
                          <div style={{
                            position: 'absolute', top: 10, right: 10,
                            width: 22, height: 22, borderRadius: '50%',
                            background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                        {idx === 0 && (
                          <AuroraBadge style={{ marginBottom: 8 }}>
                            <Star size={10} /> Top choix ARK
                          </AuroraBadge>
                        )}
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{q.provider}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.accent, marginTop: 4 }}>
                          {fmtEur(q.prime_annuelle_eur)}<span style={{ fontSize: 11, color: T.textSecondary, fontWeight: 500 }}> / an</span>
                        </div>
                        <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 10 }}>
                          {fmtEur(q.prime_mensuelle_eur)} / mois
                        </div>
                        <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>
                          {(q.garanties || []).slice(0, 3).map((g, i) => <div key={i}>✓ {g}</div>)}
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + T.cardBorder, fontSize: 11, color: T.ark }}>
                          Score ARK : {q.ark_score}/100
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {pdfUrl && (
                  <AuroraCard hover={false} style={{ marginBottom: 16, padding: 0 }}>
                    <div style={{ padding: 14, borderBottom: '1px solid ' + T.cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: T.text, fontSize: 13 }}>📄 Aperçu PDF</strong>
                      <span style={{ color: T.success, fontSize: 11 }}>Généré ✓</span>
                    </div>
                    <iframe src={pdfUrl} style={{ width: '100%', height: 600, border: 'none' }} title="Aperçu devis PDF" />
                  </AuroraCard>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <AuroraButton variant="ghost" onClick={() => setStep(2)}><ChevronLeft size={16} /> Précédent</AuroraButton>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!pdfUrl ? (
                      <AuroraButton onClick={generatePdf} chargement={busy} disabled={selectedOffers.length === 0}>
                        <FileSignature size={14} /> Générer PDFs ({selectedOffers.length})
                      </AuroraButton>
                    ) : (
                      <>
                        <AuroraButton variant="outline" onClick={generatePdf} chargement={busy}>
                          <Eye size={14} /> Régénérer
                        </AuroraButton>
                        <AuroraButton onClick={sendDevis} chargement={busy}>
                          <Send size={14} /> Envoyer au client
                        </AuroraButton>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const labelStyle = {
  color: T.textSecondary, fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.5,
  marginBottom: 6, display: 'block',
}
