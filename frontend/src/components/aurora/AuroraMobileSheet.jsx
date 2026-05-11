/* ═══════════════════════════════════════════════════════════════════════════
   AuroraMobileSheet — iOS-style Bottom Sheet / Drawer
   COURTIA V2 • Draggable sheet with snap points
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

const parseSnapPoint = (snap, containerHeight) => {
  if (typeof snap === 'number') return snap;
  if (typeof snap === 'string' && snap.endsWith('%')) {
    const percent = parseFloat(snap) / 100;
    return containerHeight * percent;
  }
  return containerHeight * 0.5;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraMobileSheet({
  open,
  onClose,
  title,
  children,
  snapPoints = ['50%', '90%'],
  initialSnap = 0,
  showCloseButton = true,
  showHandle = true,
  glass = true,
  className = '',
  overlayClassName = '',
  onSnapChange,
  ...props
}) {
  const sheetRef = useRef(null);
  const dragControls = useDragControls();
  const [containerHeight, setContainerHeight] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [currentSnapIndex, setCurrentSnapIndex] = React.useState(initialSnap);

  // Calculate snap heights
  const snapHeights = snapPoints.map((snap) =>
    parseSnapPoint(snap, containerHeight)
  );
  const currentHeight = snapHeights[currentSnapIndex] || snapHeights[0];
  const maxHeight = Math.max(...snapHeights);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => setContainerHeight(window.innerHeight);
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle drag end — snap to nearest point or close
  const handleDragEnd = useCallback(
    (_, info) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // Fast swipe down → close
      if (velocity > 500) {
        onClose();
        return;
      }

      // Fast swipe up → max snap
      if (velocity < -500) {
        const maxIndex = snapHeights.length - 1;
        setCurrentSnapIndex(maxIndex);
        onSnapChange?.(maxIndex);
        return;
      }

      // Calculate current visual height after drag
      const draggedHeight = currentHeight - offset;

      // If dragged below threshold (30% of min snap), close
      const minSnap = Math.min(...snapHeights);
      if (draggedHeight < minSnap * 0.3) {
        onClose();
        return;
      }

      // Find nearest snap point
      let nearestIndex = 0;
      let minDiff = Infinity;
      snapHeights.forEach((height, index) => {
        const diff = Math.abs(height - draggedHeight);
        if (diff < minDiff) {
          minDiff = diff;
          nearestIndex = index;
        }
      });

      setCurrentSnapIndex(nearestIndex);
      onSnapChange?.(nearestIndex);
    },
    [currentHeight, snapHeights, onClose, onSnapChange]
  );

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Keyboard handling
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className={`aurora-sheet-overlay ${overlayClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            className={`aurora-sheet-content ${
              glass ? 'aurora-sheet-content--glass' : ''
            } ${className}`}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: currentHeight }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ maxHeight: maxHeight, touchAction: 'none' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'aurora-sheet-title' : undefined}
            {...props}
          >
            {/* Handle */}
            {showHandle && (
              <div
                className="aurora-sheet-handle"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="aurora-sheet-handle-bar" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="aurora-sheet-header">
                {title && (
                  <h2 id="aurora-sheet-title" className="aurora-sheet-title">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    className="aurora-sheet-close"
                    onClick={onClose}
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="aurora-sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Exports
   ───────────────────────────────────────────────────────────────────────────── */

export default AuroraMobileSheet;
