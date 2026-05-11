/**
 * Integrations — F7
 * Page /integrations : grid de 10 cartes connecteurs + flux OAuth/apikey/webhook
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plug, Check, AlertCircle, ExternalLink, RefreshCw, X, Paramètres, Loader2,
  Calendar, Mail, MessageSquare, FileSignature, CreditCard, BookOpen, Hash, Zap,
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { AuroraPageHeader } from '../components/aurora/AuroraPageHeader'
import { AuroraCard } from '../components/aurora/AuroraCard'
import { AuroraButton } from '../components/aurora/AuroraButton'
import { AuroraBadge } from '../components/aurora/AuroraBadge'
import { AuroraDialog } from '../components/aurora/AuroraDialog'
import { AuroraSpinner } from '../components/aurora/AuroraSpinner'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const ICON_MAP = {
  rdv:        Calendar,
  email:      Mail,
  messaging:  MessageSquare,
  signature:  FileSignature,
  paiement:   CreditCard,
  compta:     BookOpen,
  notif:      Hash,
  integration: Zap,
}

const CATEGORIES = [
  { key: 'all',         label: 'Tous' },
  { key: 'rdv',         label: 'Rendez-vous' },
  { key: 'email',       label: 'E-mails' },
  { key: 'messaging',   label: 'Messages' },
  { key: 'signature',   label: 'Signature' },
  { key: 'paiement',    label: 'Paiement' },
  { key: 'compta',      label: 'Comptabilité' },
  { key: 'notif',       label: 'Notifications' },
  { key: 'integration', label: 'Automatisation' },
]

function ConnectorCard({ c, onConnect, onDisconnect, onTest }) {
  const Icon = ICON_MAP[c.category] || Plug
  const connected = c.status === 'connected'
  const error = c.status === 'error'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: T.cardBg,
        border: '1px solid ' + (connected ? 'rgba(34,197,94,0.30)' : error ? 'rgba(239,68,68,0.30)' : T.cardBorder),
        borderRadius: 14,
        padding: 18,
        position: 'relative',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: c.color || T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 18px ${c.color || T.accent}40`,
          }}>
            <Icon size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{c.name}</div>
            <div style={{ color: T.textMuted, fontSize: 11, textTransform: 'capitalize' }}>{c.category}</div>
          </div>
        </div>
        {connected && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.12)', color: T.success, fontSize: 11, fontWeight: 600 }}>
            <Check size={10} /> Connecté
          </span>
        )}
        {!connected && !c.configured && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: T.warning, fontSize: 10, fontWeight: 600 }}>
            <Paramètres size={10} /> Config
          </span>
        )}
        {error && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: T.danger, fontSize: 11, fontWeight: 600 }}>
            <AlertCircle size={10} /> Erreur
          </span>
        )}
      </div>

      <p style={{ color: T.textSecondary, fontSize: 12, lineHeight: 1.5, margin: '0 0 14px', minHeight: 36 }}>
        {c.description}
      </p>

      {c.external_account && (
        <div style={{ fontSize: 10, color: T.cyan, marginBottom: 10 }}>
          {c.external_account}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        {connected ? (
          <>
            <button
              onClick={() => onTest(c)}
              style={btnSecondaryStyle}
            >
              <RefreshCw size={11} /> Tester
            </button>
            <button
              onClick={() => onDisconnect(c)}
              style={{ ...btnSecondaryStyle, color: T.danger, borderColor: 'rgba(239,68,68,0.30)' }}
            >
              <X size={11} /> Déconnecter
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(c)}
            style={btnPrimaryStyle}
          >
            <Plug size={11} /> {c.configured ? 'Connecter' : 'Voir détails'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

const btnSecondaryStyle = {
  flex: 1, padding: '8px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid ' + T.cardBorder,
  color: T.textSecondary,
  borderRadius: 8, fontSize: 11, fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 0.15s',
}
const btnPrimaryStyle = {
  flex: 1, padding: '8px 12px',
  background: 'linear-gradient(135deg, #5B4DF5 0%, #8B5CF6 100%)',
  border: 'none', color: '#FFFFFF',
  borderRadius: 8, fontSize: 11, fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  boxShadow: '0 4px 14px rgba(91,77,245,0.30)',
}

export default function Integrations() {
  const [chargement, setChargement] = useState(true)
  const [connectors, setConnectors] = useState([])
  const [category, setCategory] = useState('all')

  const [dialog, setDialog] = useState(null) // { connector, form: {...}, mode: 'form' | 'oauth' | 'config_required' }
  const [busy, setBusy] = useState(false)

  async function load() {
    setChargement(true)
    try {
      const { data } = await api.get('/integrations/connectors')
      setConnectors(data?.items || [])
    } catch (e) {
      toast.error('Erreur chargement intégrations')
    } finally {
      setChargement(false)
    }
  }
  useEffect(() => { load() }, [])

  async function onConnect(c) {
    try {
      const { data } = await api.get(`/integrations/connectors/${c.key}/connect`)
      if (data?.configuration_required) {
        setDialog({ connector: c, mode: 'config_required', message: data.message, env: data.env_needed })
        return
      }
      if (data?.oauth_url) {
        // Ouvre OAuth dans une popup
        window.open(data.oauth_url, '_blank', 'width=600,height=720')
        toast.success('Fenêtre OAuth ouverte — autorisez puis rafraîchissez')
        setTimeout(load, 5000)
        return
      }
      if (data?.form) {
        setDialog({ connector: c, mode: 'form', form: data.form, values: {} })
        return
      }
      if (data?.message === 'managed_integration') {
        toast.success(`${c.name} géré côté admin — déjà actif si configuré`)
        return
      }
    } catch (e) {
      toast.error(`Erreur connexion ${c.name}`)
    }
  }

  async function onTest(c) {
    try {
      const { data } = await api.post(`/integrations/connectors/${c.key}/test`)
      if (data.ok) toast.success(`${c.name} — ${data.message || 'OK'}`)
      else toast.error(`${c.name} — ${data.message || 'KO'}`)
    } catch (e) {
      toast.error('Test échoué')
    }
  }

  async function onDisconnect(c) {
    if (!confirm(`Déconnecter ${c.name} ?`)) return
    try {
      await api.post(`/integrations/connectors/${c.key}/disconnect`)
      toast.success(`${c.name} déconnecté`)
      load()
    } catch (e) {
      toast.error('Erreur déconnexion')
    }
  }

  async function saveForm() {
    if (!dialog) return
    setBusy(true)
    try {
      await api.post(`/integrations/connectors/${dialog.connector.key}/save-credentials`, dialog.values || {})
      toast.success(`${dialog.connector.name} connecté ✓`)
      setDialog(null)
      load()
    } catch (e) {
      toast.error('Erreur enregistrement')
    } finally {
      setBusy(false)
    }
  }

  const visible = connectors.filter(c => category === 'all' || c.category === category)
  const stats = {
    total: connectors.length,
    connected: connectors.filter(c => c.status === 'connected').length,
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Intégrations"
        subtitle={`${stats.connected}/${stats.total} connecteurs actifs · OAuth Google · Microsoft · Yousign · Pennylane · Webhooks Slack/Discord`}
      />

      {/* Catégories chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: category === cat.key ? 'rgba(91,77,245,0.18)' : 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (category === cat.key ? 'rgba(91,77,245,0.40)' : T.cardBorder),
              color: category === cat.key ? T.text : T.textSecondary,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {chargement ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <AuroraSpinner /> <span style={{ color: T.textSecondary, marginLeft: 12 }}>Chargement des connecteurs...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {visible.map(c => (
            <ConnectorCard key={c.key} c={c} onConnect={onConnect} onDisconnect={onDisconnect} onTest={onTest} />
          ))}
        </div>
      )}

      {/* Dialog formulaire (api_key / webhook URL) */}
      <AuroraDialog
        open={!!dialog && dialog.mode === 'form'}
        onClose={() => setDialog(null)}
        title={`Connecter ${dialog?.connector?.name || ''}`}
      >
        {dialog?.form?.fields?.map((f) => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: T.textSecondary, fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {f.label}
            </label>
            <input
              type={f.type || 'text'}
              required={f.required}
              value={dialog.values?.[f.key] || ''}
              onChange={(e) => setDialog(d => ({ ...d, values: { ...(d.values || {}), [f.key]: e.target.value } }))}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', color: T.text,
                border: '1px solid ' + T.cardBorder, fontSize: 13, outline: 'none',
              }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <AuroraButton variant="ghost" onClick={() => setDialog(null)}>Annuler</AuroraButton>
          <AuroraButton onClick={saveForm} chargement={busy}>Enregistrer</AuroraButton>
        </div>
      </AuroraDialog>

      {/* Dialog configuration_required */}
      <AuroraDialog
        open={!!dialog && dialog.mode === 'config_required'}
        onClose={() => setDialog(null)}
        title="Configuration requise"
      >
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{dialog?.message}</p>
        {Array.isArray(dialog?.env) && (
          <ul style={{ color: T.textMuted, fontSize: 12, marginTop: 12 }}>
            {dialog.env.map(e => <li key={e} style={{ fontFamily: 'monospace' }}>{e}</li>)}
          </ul>
        )}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 8, color: T.warning, fontSize: 12 }}>
          Demandez à l'administrateur du cabinet COURTIA de configurer ces clés dans le tableau de bord serveur.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <AuroraButton onClick={() => setDialog(null)}>Compris</AuroraButton>
        </div>
      </AuroraDialog>
    </div>
  )
}
