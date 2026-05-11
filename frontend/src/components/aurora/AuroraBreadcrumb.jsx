import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-1)',
    fontSize: 'var(--aurora-text-sm)',
  },
  link: {
    color: 'var(--aurora-text-muted)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-1)',
    transition: 'color var(--aurora-duration-fast) var(--aurora-ease)',
  },
  linkHover: {
    color: 'var(--aurora-violet)',
  },
  chevron: {
    color: 'var(--aurora-text-muted)',
    opacity: 0.5,
  },
  current: {
    color: 'var(--aurora-text-primary)',
    fontWeight: 600,
  },
};

export function AuroraBreadcrumb({ items = [], showHome = true, ...props }) {
  const allItems = showHome ? [{ label: 'Accueil', href: '/', icon: Home }, ...items] : items;

  return (
    <nav aria-label="Breadcrumb" style={styles.container} {...props}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const Icon = item.icon;

        return (
          <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-1)' }}>
            {index > 0 && <ChevronRight size={14} style={styles.chevron} />}
            {isLast ? (
              <span style={styles.current}>
                {Icon && <Icon size={14} />}
                {item.label}
              </span>
            ) : (
              <motion.span whileHover={{ color: 'var(--aurora-violet)' }}>
                <Link to={item.href} style={styles.link}>
                  {Icon && <Icon size={14} />}
                  {item.label}
                </Link>
              </motion.span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default AuroraBreadcrumb;
