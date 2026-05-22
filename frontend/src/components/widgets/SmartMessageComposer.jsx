// SmartMessageComposer.jsx
// Compositeur de messages intelligent avec aperçu temps réel et génération ARK.
// Props :
//   dossier {object} — données du dossier actif
//   client {object} — données client
//   onSend {function({channel, message, template})} — callback envoi
//   anthropicEnabled {boolean} — si false, génération ARK désactivée

import { useState, useCallback } from 'react'

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#22C55E' },
  { id: 'email',    label: 'Email',    icon: '✉️',  color: '#22D3EE' },
  { id: 'sms',      label: 'SMS',      icon: '📱',  color: '#8B5CF6' },
]

const TEMPLATES = [
  {
    id: 'docs_missing',
    label: 'Documents manquants',
    text: 'Bonjour {{prenom}}, pour finaliser votre dossier {{branche}}, il me manque : {{docs_manquants}}. Pouvez-vous me les transmettre ? Merci.',
  },
  {
    id: 'quote_followup',
    label: 'Relance devis',
    text: 'Bonjour {{prenom}}, je reviens vers vous concernant votre devis {{branche}}. J\'ai préparé une proposition adaptée à votre situation. Êtes-vous disponible pour en discuter ?',
  },
  {
    id: 'offer_proposal',
    label: 'Proposition offre',
    text: 'Bonjour {{prenom}}, j\'ai comparé les solutions disponibles pour votre dossier. L\'offre la plus adaptée est {{offre_recommandee}} à {{prix}}/mois. Je vous explique les détails si vous le souhaitez.',
  },
  {
    id: 'custom',
    label: 'Message libre',
    text: '',
  },
]

function substituteVars(text, dossier, client) {
  return text
    .replace(/{{prenom}}/g, client?.prenom ?? 'Client')
    .replace(/{{branche}}/g, dossier?.branchCode ?? 'votre dossier')
    .replace(/{{docs_manquants}}/g, dossier?.readinessReport?.missingRequiredDocuments?.join(', ') ?? '...')
    .replace(/{{offre_recommandee}}/g, dossier?.recommendedPartner ?? '...')
    .replace(/{{prix}}/g, dossier?.recommendedPrice ?? '...')
}

const DEFAULT_CLIENT = { prenom: 'Jean', nom: 'Dupont', phone: '+33612345678', email: 'jean.dupont@email.fr' }
const DEFAULT_DOSSIER = {
  branchCode: 'Auto',
  readinessReport: { missingRequiredDocuments: ['Relevé d\'information', 'Justificatif domicile'] },
  recommendedPartner: 'April Moto+',
  recommendedPrice: '38,50 €',
}

export default function SmartMessageComposer({
  dossier = DEFAULT_DOSSIER,
  client = DEFAULT_CLIENT,
  onSend,
  anthropicEnabled = true,
}) {
  const [channel, setChannel] = useState('whatsapp')
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [message, setMessage] = useState(substituteVars(TEMPLATES[0].text, DEFAULT_DOSSIER, DEFAULT_CLIENT))
  const [isGenerating, setIsGenerating] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [sent, setSent] = useState(false)

  const handleTemplateChange = (t) => {
    setTemplate(t)
    setMessage(substituteVars(t.text, dossier, client))
    setConfirmed(false)
    setSent(false)
  }

  const generateWithArk = useCallback(async () => {
    if (!anthropicEnabled) return
    setIsGenerating(true)
    setConfirmed(false)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: 'Tu es ARK, assistant IA de COURTIA. Tu rédiges des messages professionnels, chaleureux et concis pour courtiers en assurance. Réponds UNIQUEMENT avec le message, sans guillemets ni commentaires.',
          messages: [{
            role: 'user',
            content: `Rédige un message ${channel} de relance pour ce client en assurance ${dossier.branchCode}.
Client : ${client.prenom} ${client.nom}.
Documents manquants : ${dossier.readinessReport?.missingRequiredDocuments?.join(', ') ?? 'aucun'}.
Template de départ : "${template.text}".
Améliore-le pour le rendre naturel, humain et adapté au canal ${channel}. Maximum 3 phrases.`,
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim()
      if (text) setMessage(text)
    } catch (err) {
      console.error('ARK generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [channel, dossier, client, template, anthropicEnabled])

  const handleSend = () => {
    if (!confirmed) return
    setSent(true)
    onSend?.({ channel, message, template: template.id })
  }

  const activeChannel = CHANNELS.find(c => c.id === channel)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Composer un message</p>
          <p className="text-xs text-slate-400">{client.prenom} {client.nom}</p>
        </div>
        {/* Channel selector */}
        <div className="flex gap-1">
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channel === ch.id
                  ? 'text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              style={channel === ch.id ? { backgroundColor: ch.color } : {}}
              onClick={() => { setChannel(ch.id); setConfirmed(false) }}
            >
              {ch.icon} {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template selector */}
      <div className="flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              template.id === t.id
                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
            }`}
            onClick={() => handleTemplateChange(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Message area */}
      <div className="p-4 flex flex-col gap-3">
        {/* WhatsApp preview frame */}
        {channel === 'whatsapp' && (
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                {client.prenom[0]}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{client.prenom} {client.nom}</p>
                <p className="text-xs text-slate-400">WhatsApp</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg rounded-tl-none px-3 py-2 max-w-xs shadow-sm">
              <p className="text-sm text-slate-700 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                {message || '...'}
              </p>
              <p className="text-xs text-slate-400 text-right mt-1">Aperçu</p>
            </div>
          </div>
        )}

        {/* Text editor */}
        <textarea
          className="w-full text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 resize-none focus:outline-none focus:border-violet-400"
          rows={channel === 'whatsapp' ? 3 : 5}
          value={message}
          onChange={e => { setMessage(e.target.value); setConfirmed(false) }}
          placeholder="Saisir ou générer un message..."
        />

        {/* Char count + ARK generate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{message.length} caractères</span>
          {anthropicEnabled && (
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 disabled:opacity-50"
              onClick={generateWithArk}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                  ARK génère...
                </>
              ) : (
                <>✦ Générer avec ARK</>
              )}
            </button>
          )}
        </div>

        {/* Confirmation + Send */}
        {!sent ? (
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-500">Je valide ce message avant envoi</span>
            </label>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: confirmed ? activeChannel.color : '#6B7280' }}
              disabled={!confirmed}
              onClick={handleSend}
            >
              Envoyer {activeChannel.icon}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
            <span className="text-emerald-500">✓</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              Message envoyé par {activeChannel.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
