import { CalendarDays, MessageSquare, Mail, ListChecks, FileText, Bot, Clock3 } from 'lucide-react'

const PROVIDER_META = {
  google_calendar: { label: 'Google Agenda', icon: CalendarDays, color: '#2563eb' },
  whatsapp_business: { label: 'WhatsApp', icon: MessageSquare, color: '#16a34a' },
  gmail: { label: 'Gmail', icon: Mail, color: '#dc2626' },
  outlook: { label: 'Outlook', icon: Mail, color: '#2563eb' },
  task: { label: 'Tâche', icon: ListChecks, color: '#7c3aed' },
  contract: { label: 'Contrat', icon: FileText, color: '#0f766e' },
  ark: { label: 'ARK', icon: Bot, color: '#d97706' },
}

function formatDate(value) {
  if (!value) return 'Date inconnue'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Date inconnue'
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Date inconnue'
  }
}

function getProviderMeta(provider) {
  const key = String(provider || '').toLowerCase()
  return PROVIDER_META[key] || { label: key || 'Interaction', icon: Clock3, color: '#6b7280' }
}

export default function ClientInteractionsTimeline({ rows = [], loading = false, error = '', onRetry }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
        <p>{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 font-semibold underline">
            Réessayer
          </button>
        )}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
        Aucune interaction multi-canal pour ce client. Connectez Agenda / WhatsApp / Email pour enrichir la timeline.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const meta = getProviderMeta(row.provider)
        const Icon = meta.icon
        const occurredAt = row.occurred_at || row.created_at

        return (
          <div key={row.id || `${row.provider}-${index}`} className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md p-1" style={{ background: `${meta.color}15` }}>
                  <Icon size={12} color={meta.color} />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </div>
              <span className="text-[10px] text-gray-500">{formatDate(occurredAt)}</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">{row.subject || 'Interaction'}</p>
            {row.body_preview && <p className="mt-0.5 text-xs text-gray-600">{row.body_preview}</p>}
          </div>
        )
      })}
    </div>
  )
}
