import Magnetic3D from "../../components/vibe/Magnetic3D"
/**
 * ArkBubble — LOT 2
 * Bouton flottant ARK avec panel latéral
 * Design Aurora Dark (#8B5CF6)
 */

import { useState, useEffect } from 'react'
import { X, Sparkles, ChevronRight, Zap, Phone, Mail, FileText, Shield } from 'lucide-react'
import { useArk } from './ArkContextProvider'
import VapiVoiceButton from './VapiVoiceButton'

// Styles inline Aurora Dark
const styles = {
  // Bouton flottant
  bubble: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.2)',
    transition: 'all 0.3s ease',
    zIndex: 999,
    overflow: 'hidden'
  },
  bubbleHover: {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 32px rgba(139, 92, 246, 0.5), 0 0 0 2px rgba(139, 92, 246, 0.3)'
  },
  bubbleActive: {
    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
  },
  halo: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.3)',
    animation: 'arkPulse 2s ease-in-out infinite'
  },
  icon: {
    color: 'white',
    zIndex: 1
  },

  // Panel latéral
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '380px',
    maxWidth: '100vw',
    background: '#050510',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  panelOpen: {
    transform: 'translateX(0)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 998,
    opacity: 0,
    visibility: 'hidden',
    transition: 'all 0.3s ease'
  },
  overlayVisible: {
    opacity: 1,
    visibility: 'visible'
  },

  // Header panel
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(139, 92, 246, 0.05)'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerText: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '0.5px'
  },
  headerBadge: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#8B5CF6',
    background: 'rgba(139, 92, 246, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },

  // Contenu
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px'
  },

  // Cards de suggestion
  suggestionCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  suggestionCardHover: {
    background: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)'
  },
  suggestionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  suggestionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(139, 92, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  suggestionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'white',
    flex: 1
  },
  suggestionPriority: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  priorityHigh: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444'
  },
  priorityMedium: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B'
  },
  priorityLow: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22C55E'
  },

  // Actions rapides
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  quickAction: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  quickActionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px'
  },
  quickActionLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.7)'
  },

  // Loading
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px'
  },

  // Empty state
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '12px'
  }
}

// Animation CSS inline
const keyframes = `
  @keyframes arkPulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 0.3; }
  }
`

// Icônes par type d'action
const actionIcons = {
  call: Phone,
  email: Mail,
  task: FileText,
  compliance: Shield,
  default: Zap
}

function SuggestionCard({ suggestion, onClick }) {
  const [hovered, setHovered] = useState(false)
  const Icon = actionIcons[suggestion.type] || actionIcons.default

  const priorityStyle = {
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow
  }[suggestion.priority] || styles.priorityMedium

  return (
    <div
      style={{
        ...styles.suggestionCard,
        ...(hovered ? styles.suggestionCardHover : {})
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(suggestion)}
    >
      <div style={styles.suggestionHeader}>
        <div style={styles.suggestionIcon}>
          <Icon size={16} color="#8B5CF6" />
        </div>
        <span style={styles.suggestionTitle}>{suggestion.label}</span>
        <span style={{ ...styles.suggestionPriority, ...priorityStyle }}>
          {suggestion.priority}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
      </div>
    </div>
  )
}

function QuickActionButton({ icon: Icon, label, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        ...styles.quickAction,
        ...(hovered ? { background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' } : {})
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={styles.quickActionIcon}>
        <Icon size={18} color="#8B5CF6" />
      </div>
      <div style={styles.quickActionLabel}>{label}</div>
    </div>
  )
}

export default function ArkBubble() {
  const { isPanelOpen, togglePanel, closePanel, suggestions, isLoading, callArk, currentContext } = useArk()
  const [bubbleHovered, setBubbleHovered] = useState(false)

  // Fermer avec Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isPanelOpen) closePanel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isPanelOpen, closePanel])

  const handleSuggestionClick = async (suggestion) => {
    console.log('[ARK] Suggestion clicked:', suggestion)
    // TODO: Implémenter l'action selon le type
  }

  const handleQuickAction = async (action) => {
    const result = await callArk(action, { clientId: currentContext.clientId })
    console.log('[ARK] Quick action result:', result)
  }

  return (
    <>
      {/* Injection CSS animations */}
      <style>{keyframes}</style>

      {/* Overlay */}
      <div
        style={{
          ...styles.overlay,
          ...(isPanelOpen ? styles.overlayVisible : {})
        }}
        onClick={closePanel}
      />

      {/* Bouton flottant */}
      <button
        style={{
          ...styles.bubble,
          ...(bubbleHovered ? styles.bubbleHover : {}),
          ...(isPanelOpen ? styles.bubbleActive : {})
        }}
        className="animate-float animate-pulse-glow"
        onMouseEnter={() => setBubbleHovered(true)}
        onMouseLeave={() => setBubbleHovered(false)}
        onClick={togglePanel}
        title="Ouvrir ARK"
        aria-label="Ouvrir l'assistant ARK"
      >
        {/* Halo animé */}
        {!isPanelOpen && suggestions.length > 0 && (
          <div style={styles.halo} />
        )}
        <Sparkles size={24} style={styles.icon} />
      </button>

      {/* Panel latéral */}
      <div
        style={{
          ...styles.panel,
          ...(isPanelOpen ? styles.panelOpen : {}),
          transform: isPanelOpen ? 'perspective(1200px) rotateY(-2deg)' : 'translateX(100%)',
          boxShadow: '-10px 0 50px rgba(0,0,0,0.5), inset 1px 0 0 rgba(255,255,255,0.1)'
        }}
        className="glass-vibe"
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Sparkles size={18} color="#8B5CF6" />
            <span style={styles.headerText}>ARK</span>
            <span style={styles.headerBadge}>IA Active</span>
          </div>
          <button
            style={styles.closeBtn}
            onClick={closePanel}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div style={styles.content}>
          {/* Actions rapides */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Actions rapides</div>
            <div style={styles.quickActions}>
              <QuickActionButton
                icon={FileText}
                label="Brief client"
                onClick={() => handleQuickAction('client_brief')}
              />
              <QuickActionButton
                icon={Mail}
                label="Générer email"
                onClick={() => handleQuickAction('generate_email')}
              />
              <QuickActionButton
                icon={Phone}
                label="Script appel"
                onClick={() => handleQuickAction('call_script')}
              />
              <QuickActionButton
                icon={Shield}
                label="Conformité"
                onClick={() => handleQuickAction('compliance_check')}
              />
            </div>
            <VapiVoiceButton />
          </div>

          {/* Suggestions */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Suggestions</div>
            {isLoading ? (
              <div style={styles.loading}>Chargement...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <SuggestionCard
                  key={s.id || i}
                  suggestion={s}
                  onClick={handleSuggestionClick}
                />
              ))
            ) : (
              <div style={styles.empty}>
                <Sparkles size={24} color="rgba(139,92,246,0.5)" style={{ marginBottom: 12 }} />
                <div>Aucune suggestion pour le moment</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                  Naviguez vers une fiche client pour voir les recommandations ARK
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}