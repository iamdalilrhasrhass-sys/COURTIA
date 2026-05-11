import { motion } from 'framer-motion';

const baseStyle = {
  backgroundColor: 'var(--aurora-bg-surface-hover)',
  overflow: 'hidden',
  position: 'relative',
};

const shimmerStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.08), transparent)',
};

export function AuroraSkeleton({ width = '100%', height = 20, circle = false, className, style, ...props }) {
  const computedStyle = {
    ...baseStyle,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? 'var(--aurora-radius-full)' : 'var(--aurora-radius-md)',
    ...style,
  };

  return (
    <div style={computedStyle} className={className} {...props}>
      <motion.div
        style={shimmerStyle}
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

export function AuroraSkeletonText({ lines = 3, lastLineWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-2)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <AuroraSkeleton
          key={i}
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

export function AuroraSkeletonCard() {
  return (
    <div
      style={{
        padding: 'var(--aurora-space-4)',
        backgroundColor: 'var(--aurora-bg-surface)',
        borderRadius: 'var(--aurora-radius-lg)',
        border: '1px solid var(--aurora-border-soft)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--aurora-space-3)', marginBottom: 'var(--aurora-space-4)' }}>
        <AuroraSkeleton width={48} height={48} circle />
        <div style={{ flex: 1 }}>
          <AuroraSkeleton height={18} width="60%" style={{ marginBottom: 8 }} />
          <AuroraSkeleton height={14} width="40%" />
        </div>
      </div>
      <AuroraSkeletonText lines={2} />
    </div>
  );
}

export default AuroraSkeleton;
