/* ═══════════════════════════════════════════════════════════════════════════
   AuroraBottomNav — Mobile Bottom Navigation Bar
   COURTIA V2 • iOS-grade tab bar with glassmorphism
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  CheckSquare,
  MoreHorizontal,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Default Navigation Items — COURTIA Aurora-Bubble C
   Cockpit / Clients / ARK / Actions / Plus
   ───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_ITEMS = [
  { id: 'cockpit', path: '/dashboard', icon: LayoutDashboard, label: 'Cockpit' },
  { id: 'clients', path: '/clients', icon: Users, label: 'Clients' },
  { id: 'ark', path: '/assistant-ark', icon: Sparkles, label: 'ARK' },
  { id: 'actions', path: '/taches', icon: CheckSquare, label: 'Actions', badge: true },
  { id: 'more', path: null, icon: MoreHorizontal, label: 'Plus' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraBottomNav({
  items = DEFAULT_ITEMS,
  onMoreClick,
  notificationsCount = 0,
  className = '',
  ...props
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active item
  const activeId = useMemo(() => {
    const path = location.pathname;
    // Exact match first
    const exact = items.find((item) => item.path === path);
    if (exact) return exact.id;
    // Then prefix match (for nested routes), longest match wins
    let bestMatch = null;
    let bestLen = 0;
    for (const item of items) {
      if (!item.path) continue;
      if (path === item.path || path.startsWith(item.path + '/')) {
        if (item.path.length > bestLen) {
          bestMatch = item;
          bestLen = item.path.length;
        }
      }
    }
    if (bestMatch) return bestMatch.id;
    return null;
  }, [location.pathname, items]);

  const handleItemClick = (item) => {
    if (item.id === 'more' && onMoreClick) {
      onMoreClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav
      className={`aurora-bottom-nav ${className}`}
      role="navigation"
      aria-label="Navigation principale mobile"
      {...props}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`aurora-bottom-nav-item ${
              isActive ? 'aurora-bottom-nav-item--active' : ''
            }`}
            onClick={() => handleItemClick(item)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            {/* Active indicator with layoutId for smooth transition */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="aurora-bottom-nav-indicator"
                  className="aurora-bottom-nav-indicator"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
            </AnimatePresence>

            <motion.div
              className="aurora-bottom-nav-icon"
              animate={{
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ position: 'relative' }}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge && notificationsCount > 0 && (
                <span
                  aria-label={`${notificationsCount} notifications`}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: '#EF4444',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #050510',
                    boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
                  }}
                >
                  {notificationsCount > 9 ? '9+' : notificationsCount}
                </span>
              )}
            </motion.div>

            <motion.span
              className="aurora-bottom-nav-label"
              animate={{
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {item.label}
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Exports
   ───────────────────────────────────────────────────────────────────────────── */

export default AuroraBottomNav;
