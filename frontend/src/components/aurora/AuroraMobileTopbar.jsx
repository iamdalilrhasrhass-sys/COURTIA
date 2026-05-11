/* ═══════════════════════════════════════════════════════════════════════════
   AuroraMobileTopbar — Topbar mobile COURTIA
   Burger left + CourtiaMiniLogo center + Bell right
   Aurora-Bubble C • premium glass
   ═══════════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import CourtiaMiniLogo from '../brand/CourtiaMiniLogo';

export function AuroraMobileTopbar({
  onMenuClick,
  onBellClick,
  notificationsCount = 0,
  logoTo = '/dashboard',
  className = '',
  rightExtra = null,
}) {
  const navigate = useNavigate();

  const handleBell = () => {
    if (onBellClick) onBellClick();
    else navigate('/taches');
  };

  return (
    <header
      className={`aurora-mobile-topbar ${className}`}
      role="banner"
      aria-label="Barre supérieure mobile"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'rgba(5,5,16,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        zIndex: 50,
      }}
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: 10,
        }}
      >
        <Menu size={22} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={() => navigate(logoTo)}
        aria-label="Accueil COURTIA"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CourtiaMiniLogo size={26} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {rightExtra}
        <button
          type="button"
          onClick={handleBell}
          aria-label={`Notifications${notificationsCount ? ` (${notificationsCount})` : ''}`}
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            minWidth: 44,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 10,
          }}
        >
          <Bell size={20} strokeWidth={2} />
          {notificationsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
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
              }}
            >
              {notificationsCount > 9 ? '9+' : notificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default AuroraMobileTopbar;
