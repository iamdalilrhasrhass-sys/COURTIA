import { motion } from 'framer-motion';

const styles = {
  container: {
    marginBottom: 'var(--aurora-space-6)',
  },
  breadcrumb: {
    marginBottom: 'var(--aurora-space-2)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--aurora-space-4)',
    flexWrap: 'wrap',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 'var(--aurora-text-2xl)',
    fontWeight: 700,
    background: 'var(--aurora-gradient-primary)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-muted)',
    marginTop: 'var(--aurora-space-1)',
    margin: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-3)',
    flexShrink: 0,
  },
};

export function AuroraPageHeader({ title, subtitle, actions, breadcrumb, ...props }) {
  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {breadcrumb && <div style={styles.breadcrumb}>{breadcrumb}</div>}
      <div style={styles.header}>
        <div style={styles.content}>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div style={styles.actions}>{actions}</div>}
      </div>
    </motion.div>
  );
}

export default AuroraPageHeader;
