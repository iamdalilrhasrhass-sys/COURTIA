import { motion } from 'framer-motion';

const sizes = {
  sm: { dimension: 32, fontSize: 'var(--aurora-text-xs)', statusSize: 8 },
  md: { dimension: 40, fontSize: 'var(--aurora-text-sm)', statusSize: 10 },
  lg: { dimension: 56, fontSize: 'var(--aurora-text-base)', statusSize: 14 },
};

const statusColors = {
  online: 'var(--aurora-emerald)',
  offline: 'var(--aurora-text-muted)',
  busy: 'var(--aurora-rose)',
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const styles = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
  },
  avatar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--aurora-radius-full)',
    background: 'var(--aurora-gradient-primary)',
    color: 'white',
    fontWeight: 600,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  status: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 'var(--aurora-radius-full)',
    border: '2px solid var(--aurora-bg-surface)',
  },
};

export function AuroraAvatar({ name, src, size = 'md', status, alt, ...props }) {
  const sizeConfig = sizes[size] || sizes.md;
  const initials = getInitials(name);

  return (
    <motion.div
      style={styles.container}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      <div
        style={{
          ...styles.avatar,
          width: sizeConfig.dimension,
          height: sizeConfig.dimension,
          fontSize: sizeConfig.fontSize,
        }}
      >
        {src ? (
          <img src={src} alt={alt || name || 'Avatar'} style={styles.image} />
        ) : (
          initials
        )}
      </div>
      {status && (
        <span
          style={{
            ...styles.status,
            width: sizeConfig.statusSize,
            height: sizeConfig.statusSize,
            backgroundColor: statusColors[status] || statusColors.offline,
          }}
        />
      )}
    </motion.div>
  );
}

export default AuroraAvatar;
