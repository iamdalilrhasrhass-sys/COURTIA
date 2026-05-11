import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const placements = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
};

const arrowPlacements = {
  top: { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
  bottom: { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
  left: { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  right: { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
};

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
  },
  tooltip: {
    position: 'absolute',
    padding: 'var(--aurora-space-2) var(--aurora-space-3)',
    backgroundColor: 'var(--aurora-bg-deep)',
    color: 'var(--aurora-text-primary)',
    fontSize: 'var(--aurora-text-xs)',
    fontWeight: 500,
    borderRadius: 'var(--aurora-radius-md)',
    boxShadow: 'var(--aurora-shadow-elevated)',
    whiteSpace: 'nowrap',
    zIndex: 9500,
    pointerEvents: 'none',
  },
  arrow: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: 'var(--aurora-bg-deep)',
  },
};

export function AuroraTooltip({ content, children, placement = 'top', delay = 200 }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            role="tooltip"
            style={{ ...styles.tooltip, ...placements[placement] }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            {content}
            <div style={{ ...styles.arrow, ...arrowPlacements[placement] }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AuroraTooltip;
