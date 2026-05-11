import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const variantConfig = {
  success: { icon: CheckCircle, color: 'var(--aurora-emerald)', bg: 'rgba(16, 185, 129, 0.1)' },
  error: { icon: XCircle, color: 'var(--aurora-rose)', bg: 'rgba(244, 63, 94, 0.1)' },
  warning: { icon: AlertCircle, color: 'var(--aurora-amber)', bg: 'rgba(245, 158, 11, 0.1)' },
  info: { icon: Info, color: 'var(--aurora-cyan)', bg: 'rgba(6, 182, 212, 0.1)' },
};

const styles = {
  container: {
    position: 'fixed',
    top: 'var(--aurora-space-4)',
    right: 'var(--aurora-space-4)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--aurora-space-2)',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-3)',
    padding: 'var(--aurora-space-3) var(--aurora-space-4)',
    backgroundColor: 'var(--aurora-bg-surface)',
    border: '1px solid var(--aurora-border-soft)',
    borderRadius: 'var(--aurora-radius-lg)',
    boxShadow: 'var(--aurora-shadow-elevated)',
    minWidth: 300,
    maxWidth: 420,
    pointerEvents: 'auto',
  },
  iconWrapper: {
    flexShrink: 0,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--aurora-radius-full)',
  },
  message: {
    flex: 1,
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-primary)',
    fontWeight: 500,
  },
  closeBtn: {
    flexShrink: 0,
    padding: 4,
    border: 'none',
    background: 'transparent',
    color: 'var(--aurora-text-muted)',
    cursor: 'pointer',
    borderRadius: 'var(--aurora-radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--aurora-duration-fast) var(--aurora-ease)',
  },
};

function Toast({ id, message, variant = 'info', onClose }) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{ ...styles.toast, borderLeft: `3px solid ${config.color}` }}
    >
      <div style={{ ...styles.iconWrapper, backgroundColor: config.bg }}>
        <Icon size={16} style={{ color: config.color }} />
      </div>
      <span style={styles.message}>{message}</span>
      <button style={styles.closeBtn} onClick={() => onClose(id)}>
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => {
      const updated = [...prev, { id, message, variant }];
      return updated.slice(-5);
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={styles.container}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function AuroraToast(props) {
  return <Toast {...props} />;
}

export default AuroraToast;
