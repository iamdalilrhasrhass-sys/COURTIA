import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const styles = {
  card: {
    padding: 'var(--aurora-space-4)',
    backgroundColor: 'var(--aurora-bg-surface)',
    border: '1px solid var(--aurora-border-soft)',
    borderRadius: 'var(--aurora-radius-lg)',
    transition: 'border-color var(--aurora-duration-fast) var(--aurora-ease), box-shadow var(--aurora-duration-fast) var(--aurora-ease)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--aurora-space-3)',
  },
  label: {
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-muted)',
    fontWeight: 500,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--aurora-radius-md)',
    background: 'var(--aurora-gradient-primary)',
    color: 'white',
  },
  value: {
    fontSize: 'var(--aurora-text-2xl)',
    fontWeight: 700,
    color: 'var(--aurora-text-primary)',
    marginBottom: 'var(--aurora-space-1)',
  },
  trend: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--aurora-space-1)',
    fontSize: 'var(--aurora-text-xs)',
    fontWeight: 500,
  },
  trendPositive: {
    color: 'var(--aurora-emerald)',
  },
  trendNegative: {
    color: 'var(--aurora-rose)',
  },
};

export function AuroraStat({ value, label, trend, icon: Icon, ...props }) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      style={styles.card}
      whileHover={{
        scale: 1.02,
        y: -2,
        boxShadow: 'var(--aurora-shadow-glow)',
        borderColor: 'var(--aurora-border-base)',
      }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      <div style={styles.header}>
        <span style={styles.label}>{label}</span>
        {Icon && (
          <div style={styles.iconWrapper}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div style={styles.value}>{value}</div>
      {trend !== undefined && trend !== null && (
        <div
          style={{
            ...styles.trend,
            ...(isPositive ? styles.trendPositive : {}),
            ...(isNegative ? styles.trendNegative : {}),
          }}
        >
          <TrendIcon size={14} />
          <span>{isPositive ? '+' : ''}{trend}%</span>
          <span style={{ color: 'var(--aurora-text-muted)', marginLeft: 4 }}>vs mois dernier</span>
        </div>
      )}
    </motion.div>
  );
}

export default AuroraStat;
