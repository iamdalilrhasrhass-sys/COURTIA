/* ═══════════════════════════════════════════════════════════════════════════
   AuroraTableMobile — Responsive Table/Cards Component
   COURTIA V2 • Desktop table, mobile stacked cards
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────────
   useMediaQuery Hook (inline)
   ───────────────────────────────────────────────────────────────────────────── */

function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animation Variants
   ───────────────────────────────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Default Mobile Card Renderer
   ───────────────────────────────────────────────────────────────────────────── */

function DefaultMobileCard({ row, columns, onClick }) {
  return (
    <motion.div
      className="aurora-mobile-card aurora-touch-feedback"
      variants={cardVariants}
      onClick={() => onClick?.(row)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {columns.map((col, index) => {
        const value = col.render
          ? col.render(row[col.key], row)
          : row[col.key];

        // First column gets prominence
        if (index === 0) {
          return (
            <div
              key={col.key}
              style={{
                marginBottom: 'var(--aurora-space-sm)',
                paddingBottom: 'var(--aurora-space-sm)',
                borderBottom: '1px solid var(--aurora-border)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--aurora-text-base)',
                  fontWeight: 600,
                  color: 'var(--aurora-text)',
                }}
              >
                {value}
              </div>
              {col.sublabel && (
                <div
                  style={{
                    fontSize: 'var(--aurora-text-sm)',
                    color: 'var(--aurora-text-muted)',
                  }}
                >
                  {col.sublabel}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={col.key} className="aurora-mobile-card-row">
            <span className="aurora-mobile-card-label">{col.label}</span>
            <span className="aurora-mobile-card-value">{value}</span>
          </div>
        );
      })}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Desktop Table Renderer
   ───────────────────────────────────────────────────────────────────────────── */

function DesktopTable({
  columns,
  data,
  onRowClick,
  sortable,
  sortConfig,
  onSort,
  className,
}) {
  return (
    <motion.table
      className={`aurora-table aurora-desktop-table ${className}`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <thead className="aurora-table-header">
        <tr className="aurora-table-row">
          {columns.map((col) => (
            <th
              key={col.key}
              className="aurora-table-header-cell"
              style={{
                width: col.width,
                cursor: sortable && col.sortable !== false ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (sortable && col.sortable !== false && onSort) {
                  onSort(col.key);
                }
              }}
            >
              {col.label}
              {sortable && sortConfig?.key === col.key && (
                <span style={{ marginLeft: 4 }}>
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="aurora-table-body">
        {data.map((row, rowIndex) => (
          <motion.tr
            key={row.id || rowIndex}
            className="aurora-table-row"
            variants={rowVariants}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            whileHover={
              onRowClick
                ? { backgroundColor: 'var(--aurora-surface-hover)' }
                : undefined
            }
          >
            {columns.map((col) => (
              <td key={col.key} className="aurora-table-cell">
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </motion.table>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Mobile Cards Renderer
   ───────────────────────────────────────────────────────────────────────────── */

function MobileCards({
  columns,
  data,
  onRowClick,
  renderMobileCard,
  className,
}) {
  return (
    <motion.div
      className={`aurora-mobile-card-stack ${className}`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {data.map((row, index) =>
        renderMobileCard ? (
          <motion.div key={row.id || index} variants={cardVariants}>
            {renderMobileCard(row, index)}
          </motion.div>
        ) : (
          <DefaultMobileCard
            key={row.id || index}
            row={row}
            columns={columns}
            onClick={onRowClick}
          />
        )
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────────────── */

export function AuroraTableMobile({
  columns,
  data,
  onRowClick,
  renderMobileCard,
  sortable = false,
  sortConfig,
  onSort,
  emptyState,
  loading = false,
  loadingRows = 5,
  className = '',
  tableClassName = '',
  cardsClassName = '',
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Empty state
  if (!loading && (!data || data.length === 0)) {
    return (
      <div className={className} {...props}>
        {emptyState || (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--aurora-space-2xl)',
              color: 'var(--aurora-text-muted)',
            }}
          >
            Aucune donnée à afficher
          </div>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={className} {...props}>
        {isMobile ? (
          <div className="aurora-mobile-card-stack">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <div
                key={i}
                className="aurora-mobile-card"
                style={{ minHeight: 120 }}
              >
                <div
                  className="aurora-skeleton"
                  style={{ height: 20, width: '60%', marginBottom: 12 }}
                />
                <div
                  className="aurora-skeleton"
                  style={{ height: 16, width: '80%', marginBottom: 8 }}
                />
                <div
                  className="aurora-skeleton"
                  style={{ height: 16, width: '40%' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <table className={`aurora-table aurora-desktop-table ${tableClassName}`}>
            <thead className="aurora-table-header">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="aurora-table-header-cell">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="aurora-table-body">
              {Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="aurora-table-row">
                  {columns.map((col) => (
                    <td key={col.key} className="aurora-table-cell">
                      <div
                        className="aurora-skeleton"
                        style={{ height: 16, width: '70%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      {isMobile ? (
        <MobileCards
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          renderMobileCard={renderMobileCard}
          className={cardsClassName}
        />
      ) : (
        <DesktopTable
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          sortable={sortable}
          sortConfig={sortConfig}
          onSort={onSort}
          className={tableClassName}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Exports
   ───────────────────────────────────────────────────────────────────────────── */

export default AuroraTableMobile;
