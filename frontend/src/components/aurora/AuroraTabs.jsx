import { motion } from 'framer-motion';

const styles = {
  container: {
    width: '100%',
  },
  tabList: {
    display: 'flex',
    gap: 'var(--aurora-space-1)',
    borderBottom: '1px solid var(--aurora-border-soft)',
    position: 'relative',
  },
  tab: {
    position: 'relative',
    padding: 'var(--aurora-space-3) var(--aurora-space-4)',
    fontSize: 'var(--aurora-text-sm)',
    fontWeight: 500,
    color: 'var(--aurora-text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-2)',
    transition: 'color var(--aurora-duration-fast) var(--aurora-ease)',
  },
  tabActive: {
    color: 'var(--aurora-text-primary)',
  },
  underline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    background: 'var(--aurora-gradient-primary)',
    borderRadius: 'var(--aurora-radius-full)',
  },
  content: {
    paddingTop: 'var(--aurora-space-4)',
  },
};

export function AuroraTabs({ tabs = [], value, onChange, children, ...props }) {
  return (
    <div style={styles.container} {...props}>
      <div style={styles.tabList} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === value;
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              style={{ ...styles.tab, ...(isActive ? styles.tabActive : {}) }}
              onClick={() => onChange(tab.id)}
              whileHover={{ color: 'var(--aurora-text-primary)' }}
              whileTap={{ scale: 0.98 }}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="aurora-tab-underline"
                  style={styles.underline}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <div style={styles.content}>{children}</div>
    </div>
  );
}

export function AuroraTabPanel({ id, value, children }) {
  if (id !== value) return null;
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default AuroraTabs;
