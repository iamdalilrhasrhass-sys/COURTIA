/**
 * OnboardingBadge — LOT 20
 * Badge animé avec effet "earned" (confetti + glow)
 */

import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

export default function OnboardingBadge({
  badge,
  earned = false,
  size = 'md',
  showName = true,
  animate = false,
  onClick,
}) {
  const sizes = {
    sm: { container: 48, icon: 20, fontSize: 8 },
    md: { container: 72, icon: 32, fontSize: 10 },
    lg: { container: 96, icon: 42, fontSize: 12 },
  };

  const s = sizes[size] || sizes.md;

  return (
    <motion.div
      initial={animate ? { scale: 0, rotate: -180 } : false}
      animate={earned ? { scale: 1, rotate: 0 } : { scale: 0.9 }}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      onClick={onClick}
      style={{
        width: s.container,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          width: s.container,
          height: s.container,
          borderRadius: s.container * 0.25,
          background: earned
            ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))'
            : 'rgba(255,255,255,0.05)',
          border: earned
            ? '2px solid rgba(99,102,241,0.5)'
            : '2px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: earned
            ? '0 0 30px rgba(99,102,241,0.3), inset 0 0 20px rgba(99,102,241,0.1)'
            : 'none',
        }}
      >
        {/* Glow effect for earned badges */}
        {earned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(99,102,241,0.4) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Badge emoji or locked icon */}
        {earned ? (
          <span style={{ fontSize: s.icon, zIndex: 1 }}>{badge?.emoji || '🏆'}</span>
        ) : (
          <Lock size={s.icon * 0.6} color="rgba(255,255,255,0.3)" />
        )}

        {/* Check mark for earned */}
        {earned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: s.container * 0.28,
              height: s.container * 0.28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
            }}
          >
            <Check size={s.container * 0.15} color="white" strokeWidth={3} />
          </motion.div>
        )}
      </div>

      {/* Badge name */}
      {showName && (
        <span
          style={{
            fontSize: s.fontSize,
            color: earned ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            fontWeight: earned ? 600 : 400,
            maxWidth: s.container + 20,
            lineHeight: 1.2,
          }}
        >
          {badge?.name || 'Badge'}
        </span>
      )}
    </motion.div>
  );
}

// Composant pour afficher une collection de badges
export function BadgeCollection({ badges, onBadgeClick }) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {badges.map((badge, idx) => (
        <OnboardingBadge
          key={badge.key || idx}
          badge={badge}
          earned={badge.earned}
          animate={badge.justEarned}
          onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
        />
      ))}
    </div>
  );
}