import React, { useState } from 'react'
import { MessageCircle, CheckSquare, Sparkles, Eye, ChevronRight, X, Phone } from 'lucide-react'
import { openWhatsappForClient } from '../../utils/whatsapp'

/**
 * ClientBubbleActionSheet — Bottom sheet (mobile) / tooltip (desktop) d'actions.
 * S'affiche au clic sur une bulle ou à l'appui long.
 */
export default function ClientBubbleActionSheet({
  client,
  intelligence,
  isOpen,
  onClose,
  onViewDetail,
  onAskArk,
  onCreateTask,
}) {
  if (!isOpen || !intelligence) return null

  const hasWhatsApp = intelligence.hasPhone && intelligence.whatsappMessage

  const actions = [
    {
      key: 'view',
      icon: Eye,
      label: 'Fiche client',
      desc: intelligence.displayName,
      onClick: () => { onClose(); onViewDetail?.(client.id) },
      primary: true,
    },
    {
      key: 'whatsapp',
      icon: Phone,
      label: 'WhatsApp',
      desc: hasWhatsApp ? 'Message prêt' : 'Numéro manquant',
      onClick: () => {
        onClose()
        if (hasWhatsApp) openWhatsappForClient(client, intelligence.whatsappMessage)
      },
      disabled: !hasWhatsApp,
      hint: !hasWhatsApp ? 'Compléter la fiche' : undefined,
    },
    {
      key: 'task',
      icon: CheckSquare,
      label: 'Créer une tâche',
      desc: intelligence.nextBestAction || 'Suivi',
      onClick: () => { onClose(); onCreateTask?.(client, intelligence) },
    },
    {
      key: 'ark',
      icon: Sparkles,
      label: 'Demander à ARK',
      desc: 'Analyse intelligente',
      onClick: () => { onClose(); onAskArk?.(client, intelligence) },
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-4 bottom-6 z-50 md:inset-auto md:absolute md:w-72 md:bottom-auto md:right-0 md:top-full md:mt-2">
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '0.5px solid rgba(0,0,0,0.08)',
            borderRadius: 20,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-black/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">{intelligence.displayName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{intelligence.mainSignal} · {intelligence.status}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={action.onClick}
                disabled={action.disabled}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-black/[0.03] disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    action.primary ? 'bg-black/[0.06]' : 'bg-black/[0.03]'
                  }`}
                >
                  <action.icon size={16} className={action.primary ? 'text-gray-900' : 'text-gray-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${action.primary ? 'text-gray-900' : 'text-gray-700'}`}>
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {action.hint || action.desc}
                  </p>
                </div>
                {!action.disabled && (
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Reasons footer */}
          {intelligence.reasons?.length > 0 && (
            <div className="px-5 py-3 border-t border-black/5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Pourquoi</p>
              <div className="flex flex-wrap gap-1">
                {intelligence.reasons.slice(0, 3).map((r, i) => (
                  <span key={i} className="text-[10px] text-gray-500 bg-black/[0.03] px-2 py-0.5 rounded-full">
                    {r.length > 60 ? r.substring(0, 60) + '…' : r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
