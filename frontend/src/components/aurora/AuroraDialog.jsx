import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    padding: 'var(--aurora-space-4)',
  },
  dialog: {
    backgroundColor: 'var(--aurora-bg-surface)',
    borderRadius: 'var(--aurora-radius-xl)',
    border: '1px solid var(--aurora-border-soft)',
    boxShadow: 'var(--aurora-shadow-elevated)',
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--aurora-space-4) var(--aurora-space-6)',
    borderBottom: '1px solid var(--aurora-border-soft)',
  },
  title: {
    fontSize: 'var(--aurora-text-lg)',
    fontWeight: 600,
    color: 'var(--aurora-text-primary)',
    margin: 0,
  },
  closeBtn: {
    padding: 'var(--aurora-space-2)',
    border: 'none',
    background: 'transparent',
    color: 'var(--aurora-text-muted)',
    cursor: 'pointer',
    borderRadius: 'var(--aurora-radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background var(--aurora-duration-fast) var(--aurora-ease), color var(--aurora-duration-fast) var(--aurora-ease)',
  },
  body: {
    padding: 'var(--aurora-space-6)',
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 'var(--aurora-space-3)',
    padding: 'var(--aurora-space-4) var(--aurora-space-6)',
    borderTop: '1px solid var(--aurora-border-soft)',
  },
};

export function AuroraDialog({ open, onClose, title, children, footer, ...props }) {
  const dialogRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      const focusable = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            style={styles.dialog}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            {...props}
          >
            <div style={styles.header}>
              <h2 id="dialog-title" style={styles.title}>{title}</h2>
              <motion.button
                style={styles.closeBtn}
                onClick={onClose}
                whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)' }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} />
              </motion.button>
            </div>
            <div style={styles.body}>{children}</div>
            {footer && <div style={styles.footer}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuroraDialog;
