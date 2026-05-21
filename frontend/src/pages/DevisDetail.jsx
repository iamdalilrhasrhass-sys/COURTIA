/**
 * DevisDetail — Détail d'un devis wizard
 * F3 — Statut + timeline + relances + activité + actions (renvoyer/annuler/signer/dupliquer)
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Send, CheckCircle2, XCircle, Clock,
  Copy, RefreshCw, Eye, Download, Mail, Loader2, AlertCircle,
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { AuroraPageHeader } from '../components/aurora/AuroraPageHeader'
import { AuroraCard } from '../components/aurora/AuroraCard'
import { AuroraButton } from '../components/aurora/AuroraButton'
import { AuroraBadge } from '../components/aurora/AuroraBadge'
import { AuroraSpinner } from '../components/aurora/AuroraSpinner'
import { AuroraDialog } from '../components/aurora/AuroraDialog'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const STATUS_TIMELINE = ['draft', 'ready', 'sent', 'opened', 'signed']
const STATUS_LABEL = {
  draft: 'Brouillon', ready: 'Prêt', sent: 'Envoyé', opened: 'Ouvert',
  signed: 'Signé', refused: 'Refusé', expired: 'Expiré',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v) || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function DevisDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  async function load() {
    setChargement(true)
    try {
      const { data: payload } = await api.get(`/devis/wizard/${id}`)
      setData(payload)
      if (payload.devis?.pdf_url) {
        try {
          const res = await api.get(`/devis/${id}/pdf?inline=1`, { responseType: 'blob' })
          const blob = new Blob([res.data], { type: 'application/pdf' })
          setPdfBlob(URL.createObjectURL(blob))
        } catch (e) { console.warn('PDF non disponible inline', e) }
      }
    } catch (e) {
      toast.error('Erreur chargement devis')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function run(action) {
    setBusy(true)
    try {
      if (action === 'send')      { await api.post(`/devis/${id}/send`);      toast.success('Envoyé · relances J+3/J+7/J+14 programmées') }
      if (action === 'relance')   { await api.post(`/devis/${id}/relance`, { template: 'J7' }); toast.success('Relance envoyée') }
      if (action === 'sign')      { await api.post(`/devis/${id}/sign`);      toast.success('Devis marqué signé') }
      if (action === 'cancel')    { await api.post(`/devis/${id}/cancel`);    toast.success('Devis annulé') }
      if (action === 'duplicate') {
        const { data: dup } = await api.post(`/devis/${id}/duplicate`)
        toast.success('Devis dupliqué')
        navigate(`/devis/${dup.devis.id}`)
        return
      }
      load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur action')
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  if (chargement) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <AuroraSpinner /> <span style={{ color: T.textSecondary, marginLeft: 12 }}>Chargement...</span>
    </div>
  )
  if (!data) return null

  const d = data.devis
  const stepIdx = STATUS_TIMELINE.indexOf(d.status)
  const rejected = d.status === 'refused' || d.status === 'expired'

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title={d.reference || `Devis #${d.id}`}
        subtitle={`${d.product} · ${d.client?.name || '—'} · ${fmtEur(d.total_premium_eur)}/an`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <AuroraButton variant="ghost" onClick={() => navigate('/devis')}>
              <ArrowLeft size={16} /> Retour
            </AuroraButton>
          </div>
        }
      />

      {/* Timeline statut */}
      <AuroraCard hover={false} style={{ marginBottom: 16 }}>
        <h4 style={{ color: T.text, fontSize: 13, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.6 }}>Avancement</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {STATUS_TIMELINE.map((s, i) => {
            const done = i <= stepIdx
            const current = i === stepIdx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_TIMELINE.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: done ? (rejected ? T.danger : T.accent) : 'rgba(255,255,255,0.08)',
                    border: current ? '2px solid #fff' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 12,
                  }}>
                    {done ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: done ? T.text : T.textMuted, fontWeight: 600 }}>{STATUS_LABEL[s]}</div>
                </div>
                {i < STATUS_TIMELINE.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < stepIdx ? T.accent : 'rgba(255,255,255,0.08)', margin: '0 8px', marginBottom: 14 }} />
                )}
              </div>
            )
          })}
        </div>
        {rejected && (
          <div style={{ marginTop: 14, padding: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, color: T.danger, fontSize: 12 }}>
            <AlertCircle size={12} style={{ display: 'inline', marginRight: 6 }} />
            Ce devis est {STATUS_LABEL[d.status]?.toLowerCase()}.
          </div>
        )}
      </AuroraCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* COLONNE GAUCHE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* PDF preview */}
          {pdfBlob && (
            <AuroraCard hover={false} style={{ padding: 0 }}>
              <div style={{ padding: 12, borderBottom: '1px solid ' + T.cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: T.text, fontSize: 13 }}><FileText size={12} style={{ display: 'inline' }} /> Aperçu PDF</strong>
                <a href={pdfBlob} download={`${d.reference}.pdf`} style={{ color: T.cyan, fontSize: 11, textDecoration: 'none' }}>
                  <Download size={12} style={{ display: 'inline' }} /> Télécharger
                </a>
              </div>
              <iframe src={pdfBlob} style={{ width: '100%', height: 600, border: 'none' }} title="PDF devis" />
            </AuroraCard>
          )}

          {/* Offres */}
          {(d.providers || []).length > 0 && (
            <AuroraCard hover={false}>
              <h4 style={{ color: T.text, margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Offres incluses</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                {d.providers.map((o, i) => (
                  <div key={i} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid ' + T.cardBorder, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: T.text, fontSize: 14 }}>{o.provider || '—'}</strong>
                      <span style={{ color: T.accent, fontWeight: 800, fontSize: 16 }}>{fmtEur(o.prime_annuelle_eur)}/an</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      {(o.garanties || []).slice(0, 4).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </AuroraCard>
          )}

          {/* Activité */}
          <AuroraCard hover={false}>
            <h4 style={{ color: T.text, margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Activité</h4>
            {(data.activity || []).length === 0 ? (
              <div style={{ color: T.textMuted, fontSize: 12 }}>Aucune activité enregistrée.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.activity || []).map((a) => (
                  <div key={a.id} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '8px 0', borderBottom: '1px solid ' + T.cardBorder }}>
                    <span style={{ color: T.textMuted, fontFamily: 'monospace', minWidth: 110 }}>{fmtDate(a.created_at)}</span>
                    <span style={{ color: T.text }}>{a.event}</span>
                  </div>
                ))}
              </div>
            )}
          </AuroraCard>
        </div>

        {/* COLONNE DROITE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Actions */}
          <AuroraCard hover={false}>
            <h4 style={{ color: T.text, margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(d.status === 'ready' || d.status === 'draft') && (
                <AuroraButton onClick={() => run('send')} chargement={busy} style={{ width: '100%' }}>
                  <Send size={14} /> Envoyer au client
                </AuroraButton>
              )}
              {(d.status === 'sent' || d.status === 'opened') && (
                <>
                  <AuroraButton onClick={() => run('relance')} chargement={busy} style={{ width: '100%' }}>
                    <RefreshCw size={14} /> Relancer maintenant
                  </AuroraButton>
                  <AuroraButton variant="outline" onClick={() => run('sign')} chargement={busy} style={{ width: '100%' }}>
                    <CheckCircle2 size={14} /> Marquer signé
                  </AuroraButton>
                </>
              )}
              <AuroraButton variant="ghost" onClick={() => run('duplicate')} chargement={busy} style={{ width: '100%' }}>
                <Copy size={14} /> Dupliquer
              </AuroraButton>
              {d.status !== 'signed' && d.status !== 'refused' && (
                <AuroraButton variant="danger" onClick={() => setConfirmAction('cancel')} style={{ width: '100%' }}>
                  <XCircle size={14} /> Annuler
                </AuroraButton>
              )}
            </div>
          </AuroraCard>

          {/* Client */}
          <AuroraCard hover={false}>
            <h4 style={{ color: T.text, margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Client</h4>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>{d.client?.name || '—'}</div>
            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>{d.client?.email || '—'}</div>
            <div style={{ fontSize: 11, color: T.textSecondary }}>{d.client?.phone || '—'}</div>
          </AuroraCard>

          {/* Relances */}
          <AuroraCard hover={false}>
            <h4 style={{ color: T.text, margin: '0 0 14px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Relances auto</h4>
            {(data.relances || []).length === 0 ? (
              <div style={{ color: T.textMuted, fontSize: 12 }}>Aucune relance programmée.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.relances.map((r) => {
                  const c = r.status === 'sent' ? T.success : r.status === 'cancelled' ? T.textMuted : T.warning
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: T.textSecondary }}>{r.template_key} · {fmtDate(r.scheduled_at)}</span>
                      <AuroraBadge variant={r.status === 'sent' ? 'success' : r.status === 'cancelled' ? 'default' : 'warning'}>
                        {r.status}
                      </AuroraBadge>
                    </div>
                  )
                })}
              </div>
            )}
          </AuroraCard>

          {d.ark_summary && (
            <AuroraCard hover={false} glow>
              <h4 style={{ color: T.ark, margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>⚡ Note ARK</h4>
              <div style={{ color: T.textSecondary, fontSize: 12, lineHeight: 1.5 }}>{d.ark_summary}</div>
            </AuroraCard>
          )}
        </div>
      </div>

      <AuroraDialog
        open={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        title="Annuler le devis"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <AuroraButton variant="ghost" onClick={() => setConfirmAction(null)}>Garder</AuroraButton>
            <AuroraButton variant="danger" onClick={() => run('cancel')} chargement={busy}>Annuler le devis</AuroraButton>
          </div>
        }
      >
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
          Cette action marquera le devis comme refusé et annulera les relances programmées.
        </p>
      </AuroraDialog>
    </div>
  )
}
