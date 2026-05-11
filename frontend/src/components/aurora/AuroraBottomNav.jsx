/* ═══════════════════════════════════════════════════════════════════════════
   AuroraBottomNav — Mobile Bottom Navigation Bar
   COURTIA V2 • iOS-grade tab bar with glassmorphism
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Shield,
  PenTool,
  MoreHorizontal,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Default Navigation Items
   ───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_ITEMS = [
  { id: 'home', path: '/v2', icon: Home, label: 'Accueil' },
  { id: 'clients', path: '/v2/clients', icon: Users, label: 'Clients' },
  { id: 'ark', path: '/v2/ark-watch', icon: Shield, label: 'ARK' },
  { id: 'compose', path: '/v2/compose', icon: PenTool, label: 'Compose' },
  { id: 'more', path: null, icon: MoreHorizontal, label: 'Plus' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraBottomNav({
  items = DEFAULT_ITEMS,
  onMoreClick,
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
    // Then prefix match (for nested routes)
    const prefix = items.find(
      (item) => item.path && item.path !== '/v2' && path.startsWith(item.path)
    );
    if (prefix) return prefix.id;
    // Default to home if on /v2
    if (path.startsWith('/v2')) return 'home';
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
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
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
