import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--aurora-space-8)',
    textAlign: 'center',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--aurora-radius-full)',
    backgroundColor: 'var(--aurora-bg-surface-hover)',
    marginBottom: 'var(--aurora-space-4)',
  },
  icon: {
    color: 'var(--aurora-text-muted)',
  },
  title: {
    fontSize: 'var(--aurora-text-lg)',
    fontWeight: 600,
    color: 'var(--aurora-text-primary)',
    marginBottom: 'var(--aurora-space-2)',
    margin: 0,
  },
  description: {
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-muted)',
    maxWidth: 320,
    lineHeight: 1.6,
    marginBottom: 'var(--aurora-space-4)',
    margin: 0,
  },
  actions: {
    marginTop: 'var(--aurora-space-4)',
    display: 'flex',
    gap: 'var(--aurora-space-3)',
  },
};

export function AuroraEmptyState({ icon: Icon = Inbox, title, description, action, ...props }) {
  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <motion.div
        style={styles.iconWrapper}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
      >
        <Icon size={36} style={styles.icon} />
      </motion.div>
      {title && <h3 style={styles.title}>{title}</h3>}
      {description && <p style={{ ...styles.description, marginTop: 'var(--aurora-space-2)' }}>{description}</p>}
      {action && <div style={styles.actions}>{action}</div>}
    </motion.div>
  );
}

export default AuroraEmptyState;
