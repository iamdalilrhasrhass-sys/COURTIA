/* ═══════════════════════════════════════════════════════════════════════════
   AuroraMobileMore — "Plus" Drawer Content for Bottom Nav
   COURTIA V2 • Quick access to secondary features
   ═══════════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mic,
  FileSearch,
  Calculator,
  Globe,
  Settings,
  Users,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Bell,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Default Menu Items
   ───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_SECTIONS = [
  {
    id: 'production',
    items: [
      {
        id: 'contrats',
        icon: FileSearch,
        label: 'Contrats',
        subtitle: 'Portefeuille assurance',
        path: '/contrats',
      },
      {
        id: 'devis',
        icon: Calculator,
        label: 'Devis',
        subtitle: 'Comparateur tarifs',
        path: '/devis',
      },
      {
        id: 'opportunites',
        icon: Sparkles,
        label: 'Opportunités',
        subtitle: 'Pipeline ARK',
        path: '/opportunites',
      },
      {
        id: 'documents',
        icon: Globe,
        label: 'Documents',
        path: '/documents',
      },
    ],
  },
  {
    id: 'ark',
    items: [
      {
        id: 'morning',
        icon: Sparkles,
        label: 'Morning Brief',
        subtitle: 'Priorités ARK du jour',
        path: '/morning-brief',
      },
      {
        id: 'voice',
        icon: Mic,
        label: 'Voice Intake',
        subtitle: 'Saisie vocale IA',
        path: '/v2/voice',
      },
      {
        id: 'comparateur',
        icon: Calculator,
        label: 'Comparateur IA',
        path: '/comparateur',
      },
    ],
  },
  {
    id: 'communication',
    items: [
      {
        id: 'relances',
        icon: MessageSquare,
        label: 'Relances',
        path: '/relances',
      },
      {
        id: 'notifications',
        icon: Bell,
        label: 'Notifications',
        path: '/taches',
      },
    ],
  },
  {
    id: 'settings',
    items: [
      {
        id: 'parametres',
        icon: Settings,
        label: 'Paramètres',
        path: '/parametres',
      },
      {
        id: 'equipe',
        icon: Users,
        label: 'Équipe',
        subtitle: 'Gérer les collaborateurs',
        path: '/equipe',
      },
      {
        id: 'abonnement',
        icon: HelpCircle,
        label: 'Abonnement',
        path: '/abonnement',
      },
      {
        id: 'aide',
        icon: HelpCircle,
        label: 'Aide & Support',
        path: '/aide',
      },
    ],
  },
  {
    id: 'account',
    items: [
      {
        id: 'deconnexion',
        icon: LogOut,
        label: 'Déconnexion',
        action: 'logout',
        danger: true,
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Animation Variants
   ───────────────────────────────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraMobileMore({
  sections = DEFAULT_SECTIONS,
  onClose,
  onLogout,
  className = '',
  ...props
}) {
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    if (item.action === 'logout') {
      onLogout?.();
    } else if (item.path) {
      navigate(item.path);
    }
    onClose?.();
  };

  return (
    <motion.div
      className={`aurora-mobile-more ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {/* User banner (optional) */}
      <motion.div
        className="aurora-mobile-more-user"
        variants={itemVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--aurora-space-md)',
          padding: 'var(--aurora-space-md) var(--aurora-space-lg)',
          marginBottom: 'var(--aurora-space-sm)',
          background: 'linear-gradient(135deg, var(--aurora-primary), var(--aurora-secondary, #a855f7))',
          borderRadius: 'var(--aurora-radius-lg)',
          color: 'white',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--aurora-text-base)' }}>
            COURTIA Pro
          </div>
          <div style={{ fontSize: 'var(--aurora-text-sm)', opacity: 0.9 }}>
            Accès complet aux fonctionnalités IA
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="aurora-mobile-more-section">
          {sectionIndex > 0 && (
            <motion.div
              className="aurora-mobile-list-separator"
              variants={itemVariants}
            />
          )}

          <div className="aurora-mobile-list">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  className={`aurora-mobile-list-item ${
                    item.danger ? 'aurora-mobile-list-item--danger' : ''
                  }`}
                  variants={itemVariants}
                  onClick={() => handleItemClick(item)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="aurora-mobile-list-item-icon">
                    <Icon size={20} />
                  </div>

                  <div className="aurora-mobile-list-item-content">
                    <div className="aurora-mobile-list-item-title">
                      {item.label}
                    </div>
                    {item.subtitle && (
                      <div className="aurora-mobile-list-item-subtitle">
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        background: 'var(--aurora-primary)',
                        color: 'white',
                        fontSize: 'var(--aurora-text-xs)',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        marginRight: 'var(--aurora-space-sm)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {!item.danger && (
                    <ChevronRight
                      size={18}
                      className="aurora-mobile-list-item-chevron"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Version footer */}
      <motion.div
        variants={itemVariants}
        style={{
          textAlign: 'center',
          padding: 'var(--aurora-space-lg)',
          fontSize: 'var(--aurora-text-xs)',
          color: 'var(--aurora-text-muted)',
        }}
      >
        COURTIA V2 • Aurora Design System
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Exports
   ───────────────────────────────────────────────────────────────────────────── */

export default AuroraMobileMore;
