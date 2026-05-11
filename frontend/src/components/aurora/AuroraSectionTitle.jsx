import { motion } from 'framer-motion';

const styles = {
  container: {
    marginBottom: 'var(--aurora-space-4)',
  },
  title: {
    fontSize: 'var(--aurora-text-xl)',
    fontWeight: 700,
    background: 'var(--aurora-gradient-primary)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },
  subtitle: {
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-muted)',
    marginTop: 'var(--aurora-space-1)',
    margin: 0,
  },
};

export function AuroraSectionTitle({ title, subtitle, as: Component = 'h2', ...props }) {
  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <Component style={styles.title}>{title}</Component>
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
    </motion.div>
  );
}

export default AuroraSectionTitle;
