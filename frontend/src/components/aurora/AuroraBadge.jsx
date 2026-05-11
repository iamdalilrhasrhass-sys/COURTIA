import { motion } from 'framer-motion';

const variantStyles = {
  violet: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: 'var(--aurora-violet)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  pink: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    color: 'var(--aurora-pink)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  cyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    color: 'var(--aurora-cyan)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  emerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--aurora-emerald)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  amber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--aurora-amber)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rose: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    color: 'var(--aurora-rose)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  neutral: {
    backgroundColor: 'var(--aurora-bg-surface-hover)',
    color: 'var(--aurora-text-secondary)',
    borderColor: 'var(--aurora-border-soft)',
  },
};

const sizeStyles = {
  sm: {
    padding: '2px 8px',
    fontSize: 'var(--aurora-text-xs)',
    gap: '4px',
  },
  md: {
    padding: '4px 12px',
    fontSize: 'var(--aurora-text-sm)',
    gap: '6px',
  },
};

const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 'var(--aurora-radius-full)',
  fontWeight: 500,
  border: '1px solid',
  whiteSpace: 'nowrap',
};

export function AuroraBadge({ children, variant = 'violet', size = 'sm', icon: Icon, onClick, ...props }) {
  const Component = onClick ? motion.button : motion.span;
  
  return (
    <Component
      onClick={onClick}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        cursor: onClick ? 'pointer' : 'default',
        background: onClick ? variantStyles[variant].backgroundColor : undefined,
      }}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {children}
    </Component>
  );
}

export default AuroraBadge;
