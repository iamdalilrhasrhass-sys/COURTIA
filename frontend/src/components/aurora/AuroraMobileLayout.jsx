/* ═══════════════════════════════════════════════════════════════════════════
   AuroraMobileLayout — Responsive Layout Wrapper for V2 Pages
   COURTIA V2 • Mobile bottom nav + optional header
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu } from 'lucide-react';
import { AuroraBottomNav } from './AuroraBottomNav';
import { AuroraMobileSheet } from './AuroraMobileSheet';
import { AuroraMobileMore } from './AuroraMobileMore';

/* ─────────────────────────────────────────────────────────────────────────────
   useMediaQuery Hook
   ───────────────────────────────────────────────────────────────────────────── */

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page Title Map
   ───────────────────────────────────────────────────────────────────────────── */

const PAGE_TITLES = {
  '/v2': 'Accueil',
  '/v2/clients': 'Clients',
  '/v2/ark-watch': 'ARK Watch',
  '/v2/compose': 'Compose',
  '/v2/voice': 'Voice Intake',
  '/v2/doc-vision': 'Doc Vision',
  '/v2/quote-intel': 'Quote Intel',
  '/v2/settings': 'Paramètres',
  '/v2/team': 'Équipe',
  '/v2/help': 'Aide',
  '/v2/messages': 'Messages',
  '/v2/notifications': 'Notifications',
};

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraMobileLayout({
  children,
  title: titleProp,
  showHeader = true,
  showBackButton = 'auto',
  showBottomNav = true,
  headerActions,
  onBack,
  className = '',
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine page title
  const title = titleProp || PAGE_TITLES[location.pathname] || '';

  // Determine if back button should show
  const shouldShowBack = (() => {
    if (showBackButton === true) return true;
    if (showBackButton === false) return false;
    // Auto: show if not on main nav pages
    const mainPages = ['/v2', '/v2/clients', '/v2/ark-watch', '/v2/compose'];
    return !mainPages.includes(location.pathname);
  })();

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/v2');
    }
  }, [onBack, navigate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    // Clear auth state, redirect to login
    localStorage.removeItem('courtia_token');
    sessionStorage.removeItem('courtia_token');
    navigate('/login');
  }, [navigate]);

  // On desktop, render children only (transparent wrapper)
  if (!isMobile) {
    return (
      <div className={`aurora-layout-desktop ${className}`} {...props}>
        {children}
      </div>
    );
  }

  // Mobile layout
  return (
    <div
      className={`aurora-mobile-layout aurora-bottom-nav-spacer ${className}`}
      {...props}
    >
      {/* Mobile Header */}
      {showHeader && (
        <motion.header
          className="aurora-mobile-header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {shouldShowBack && (
            <button
              type="button"
              className="aurora-mobile-header-back"
              onClick={handleBack}
              aria-label="Retour"
            >
              <ArrowLeft size={24} />
            </button>
          )}

          <h1 className="aurora-mobile-header-title">{title}</h1>

          {headerActions && (
            <div className="aurora-mobile-header-actions">{headerActions}</div>
          )}
        </motion.header>
      )}

      {/* Page Content */}
      <main className="aurora-mobile-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <AuroraBottomNav onMoreClick={() => setMoreSheetOpen(true)} />
      )}

      {/* More Sheet */}
      <AuroraMobileSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Plus"
        snapPoints={['60%', '90%']}
      >
        <AuroraMobileMore
          onClose={() => setMoreSheetOpen(false)}
          onLogout={handleLogout}
        />
      </AuroraMobileSheet>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Additional Hook Export
   ───────────────────────────────────────────────────────────────────────────── */

export { useMediaQuery };

/* ─────────────────────────────────────────────────────────────────────────────
   Exports
   ───────────────────────────────────────────────────────────────────────────── */

export default AuroraMobileLayout;
