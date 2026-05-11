import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--aurora-space-1)',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 36,
    padding: '0 var(--aurora-space-2)',
    border: '1px solid var(--aurora-border-soft)',
    borderRadius: 'var(--aurora-radius-md)',
    backgroundColor: 'var(--aurora-bg-surface)',
    color: 'var(--aurora-text-secondary)',
    fontSize: 'var(--aurora-text-sm)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--aurora-duration-fast) var(--aurora-ease)',
  },
  buttonActive: {
    background: 'var(--aurora-gradient-primary)',
    borderColor: 'transparent',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 36,
    color: 'var(--aurora-text-muted)',
  },
};

const getPageNumbers = (current, total) => {
  const pages = [];
  const maxVisible = 7;
  
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  
  if (current > 3) pages.push('...');
  
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  
  for (let i = start; i <= end; i++) pages.push(i);
  
  if (current < total - 2) pages.push('...');
  
  pages.push(total);
  
  return pages;
};

export function AuroraPagination({ page, total, onChange, ...props }) {
  if (total <= 1) return null;

  const pages = getPageNumbers(page, total);

  return (
    <nav aria-label="Pagination" style={styles.container} {...props}>
      <motion.button
        style={{ ...styles.button, ...(page === 1 ? styles.buttonDisabled : {}) }}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
        whileHover={page > 1 ? { scale: 1.05, borderColor: 'var(--aurora-border-base)' } : {}}
        whileTap={page > 1 ? { scale: 0.95 } : {}}
      >
        <ChevronLeft size={18} />
      </motion.button>

      {pages.map((p, i) => (
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={styles.ellipsis}>...</span>
        ) : (
          <motion.button
            key={p}
            style={{ ...styles.button, ...(p === page ? styles.buttonActive : {}) }}
            onClick={() => onChange(p)}
            whileHover={p !== page ? { scale: 1.05, borderColor: 'var(--aurora-border-base)' } : {}}
            whileTap={{ scale: 0.95 }}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </motion.button>
        )
      ))}

      <motion.button
        style={{ ...styles.button, ...(page === total ? styles.buttonDisabled : {}) }}
        onClick={() => page < total && onChange(page + 1)}
        disabled={page === total}
        whileHover={page < total ? { scale: 1.05, borderColor: 'var(--aurora-border-base)' } : {}}
        whileTap={page < total ? { scale: 0.95 } : {}}
      >
        <ChevronRight size={18} />
      </motion.button>
    </nav>
  );
}

export default AuroraPagination;
